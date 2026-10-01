import { and, eq, isNotNull, sql } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { getDb } from "./db";
import { queryTgtOrder, type TgtOrderInfo } from "./tgt";
import { completeTgtOrder, type TgtOrderInfoPayload } from "./tgtCallback";

/**
 * TGT delivers the QR code by callback to simuncle.com. If that callback never
 * reaches this server (a hiccup, or the domain pointing at another host during
 * a migration) the order would stay "processing" for ever. This job asks TGT
 * directly for recent processing orders and completes any that already have a QR.
 * Recovered orders leave the query, so each is finished once.
 */

const MIN_AGE_MS = 3 * 60 * 1000;
const LOOKBACK_MS = 48 * 60 * 60 * 1000;
const BATCH = 20;

export type TgtRecoveryDeps = {
  findOrders: () => Promise<number[]>;
  queryTgt: (channelOrderNo: string) => Promise<TgtOrderInfo | null>;
  complete: (orderId: number, info: TgtOrderInfoPayload) => Promise<void>;
};

export function toCallbackInfo(channelOrderNo: string, info: TgtOrderInfo): TgtOrderInfoPayload {
  return {
    orderNo: info.orderNo,
    channelOrderNo,
    qrCode: info.qrCode,
    iccid: info.cardInfo?.iccid,
    imsi: info.cardInfo?.imsi,
    msisdn: info.cardInfo?.msisdn,
    activatedStartTime: info.activatedStartTime,
    activatedEndTime: info.activatedEndTime,
    latestActivationTime: info.latestActivationTime,
    renewExpirationTime: info.renewExpirationTime,
    createdTime: info.createdTime,
    orderType: info.orderType,
  };
}

export async function recoverTgtOrders(deps: TgtRecoveryDeps = realDeps) {
  const ids = await deps.findOrders();
  let recovered = 0;
  let stillPending = 0;

  for (const id of ids) {
    const channelOrderNo = `SU${id}`;
    try {
      const info = await deps.queryTgt(channelOrderNo);
      if (!info?.qrCode) {
        stillPending++;
        continue;
      }
      await deps.complete(id, toCallbackInfo(channelOrderNo, info));
      recovered++;
    } catch (error) {
      console.warn(`[TgtRecovery] Order #${id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { checked: ids.length, recovered, stillPending };
}

const realDeps: TgtRecoveryDeps = {
  async findOrders() {
    const db = await getDb();
    if (!db) return [];
    const now = Date.now();
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.supplier, "tgt"),
          eq(orders.status, "processing"),
          isNotNull(orders.supplierOrderId),
          sql`${orders.createdAt} < ${new Date(now - MIN_AGE_MS)}`,
          sql`${orders.createdAt} > ${new Date(now - LOOKBACK_MS)}`,
        ),
      )
      .limit(BATCH);
    return rows.map(r => r.id);
  },
  queryTgt: queryTgtOrder,
  complete: completeTgtOrder,
};
