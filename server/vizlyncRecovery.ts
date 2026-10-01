import { and, eq, isNotNull, sql } from "drizzle-orm";
import { orders, users } from "../drizzle/schema";
import { createEmailLog, getDb, updateOrderStatus } from "./db";
import { sendOrderConfirmationEmail } from "./email";
import { getVizlyncOrder } from "./vizlync";

/**
 * Vizlync can take 1-5 minutes to provision an eSIM, but checkout only waits
 * ~15 seconds. An order that finished without a QR/LPA stays "completed" with
 * the customer holding a "still processing" email. This job finds those recent
 * orders, fetches the eSIM data once Vizlync has it, saves it and emails the QR.
 * An order drops out of the query as soon as its data is saved, so each order
 * gets exactly one follow-up email.
 */

const LOOKBACK_MS = 48 * 60 * 60 * 1000;
const BATCH = 20;

export type RecoveryOrder = {
  id: number;
  userId: number | null;
  guestEmail: string | null;
  productName: string | null;
  totalAmount: string | null;
  vizlyncOrderId: string | null;
  esimData: Record<string, unknown> | null;
  preferredLang: string | null;
  status: string;
};

export type RecoveryDeps = {
  findOrders: () => Promise<RecoveryOrder[]>;
  customerEmail: (order: RecoveryOrder) => Promise<string | null>;
  fetchVizlyncOrder: (vizlyncOrderId: string) => Promise<Record<string, unknown> | null>;
  saveEsimData: (order: RecoveryOrder, esimData: Record<string, unknown>) => Promise<void>;
  sendEmail: (order: RecoveryOrder, email: string, esimData: Record<string, unknown>) => Promise<boolean>;
  markEmailSent: (order: RecoveryOrder, email: string, sent: boolean) => Promise<void>;
};

export const hasEsimData = (data: Record<string, unknown> | null | undefined) =>
  Boolean(data && (data.lpaString || data.iccid));

export async function recoverVizlyncOrders(deps: RecoveryDeps = realDeps) {
  const candidates = await deps.findOrders();
  let recovered = 0;
  let stillPending = 0;

  for (const order of candidates) {
    if (!order.vizlyncOrderId) continue;
    try {
      const fresh = await deps.fetchVizlyncOrder(order.vizlyncOrderId);
      if (!hasEsimData(fresh)) {
        stillPending++;
        continue;
      }
      const esimData = { ...(order.esimData ?? {}), ...fresh };
      await deps.saveEsimData(order, esimData);
      recovered++;

      const email = await deps.customerEmail(order);
      if (!email) continue;
      const sent = await deps.sendEmail(order, email, esimData);
      await deps.markEmailSent(order, email, sent);
    } catch (error) {
      console.warn(`[VizlyncRecovery] Order #${order.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { checked: candidates.length, recovered, stillPending };
}

const realDeps: RecoveryDeps = {
  async findOrders() {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        guestEmail: orders.guestEmail,
        productName: orders.productName,
        totalAmount: orders.totalAmount,
        vizlyncOrderId: orders.vizlyncOrderId,
        esimData: orders.esimData,
        preferredLang: orders.preferredLang,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.supplier, "vizlync"),
          eq(orders.status, "completed"),
          isNotNull(orders.vizlyncOrderId),
          sql`${orders.createdAt} > ${new Date(Date.now() - LOOKBACK_MS)}`,
          sql`(${orders.esimData} IS NULL OR (JSON_EXTRACT(${orders.esimData}, '$.lpaString') IS NULL AND JSON_EXTRACT(${orders.esimData}, '$.iccid') IS NULL))`,
        ),
      )
      .limit(BATCH);
    return rows as RecoveryOrder[];
  },
  async customerEmail(order) {
    if (order.guestEmail) return order.guestEmail;
    if (!order.userId) return null;
    const db = await getDb();
    if (!db) return null;
    const row = await db.select({ email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1);
    return row[0]?.email ?? null;
  },
  async fetchVizlyncOrder(id) {
    return (await getVizlyncOrder(id)) as Record<string, unknown> | null;
  },
  async saveEsimData(order, esimData) {
    await updateOrderStatus(order.id, order.status, { esimData });
  },
  async sendEmail(order, email, esimData) {
    const hkd = Math.round(parseFloat(String(order.totalAmount ?? "0")));
    const s = (k: string) => (typeof esimData[k] === "string" ? (esimData[k] as string) : undefined);
    return sendOrderConfirmationEmail({
      customerEmail: email,
      customerName: "顧客",
      orderId: order.id,
      productName: String(order.productName ?? ""),
      totalAmount: `HK$${hkd}`,
      lpaString: s("lpaString"),
      iccid: s("iccid"),
      smdpAddress: s("smdpAddress"),
      activationCode: s("activationCode"),
      preferredLang: order.preferredLang ?? "zh-TW",
    });
  },
  async markEmailSent(order, email, sent) {
    await createEmailLog({
      orderId: order.id,
      userId: order.userId ?? null,
      toEmail: email,
      emailType: "order_confirmation",
      subject: `✅ eSIM 已就緒 - 訂單 #${order.id} | SIM uncle`,
      status: sent ? "sent" : "failed",
      errorMessage: sent ? null : "sendOrderConfirmationEmail returned false",
    }).catch(e => console.warn("[VizlyncRecovery] email log failed:", e));
    if (sent) await updateOrderStatus(order.id, order.status, { emailSent: true });
  },
};
