import Stripe from "stripe";
import type { Request, Response } from "express";
import { createOrder, getOrderById, getOrderByStripeSession, updateOrderStatus, getSetting, createNotification, createTopupOrder, updateTopupOrderStatus, getTopupOrderById, createEmailLog, getProductById } from "./db";
import { createVizlyncOrder, getVizlyncOrder, createTopupOrder as createVizlyncTopup } from "./vizlync";
import { createTgtOrder, getTgtOrderByChannelNo } from "./tgt";
import { notifyOwner } from "./_core/notification";
import { sendOrderConfirmationEmail } from "./email";
// Self-reference so that reconcilePendingOrders calls handleCheckoutCompleted
// through the module namespace. This lets tests spy on the exported function
// (vi.spyOn(stripeMod, "handleCheckoutCompleted")) intercept the call.
import * as self from "./stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export { stripe };

// Current Stripe key mode. A live key cannot retrieve `cs_test_*` sessions and
// vice-versa; the reconcile job uses this to skip sessions from the other mode
// (e.g. legacy test orders in production) instead of erroring on every run.
const STRIPE_KEY_MODE: "live" | "test" | "unknown" = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_")
  ? "live"
  : (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")
    ? "test"
    : "unknown";

/** True when the session id belongs to a different Stripe mode than the active key. */
function isSessionModeMismatch(sessionId: string): boolean {
  if (STRIPE_KEY_MODE === "live") return sessionId.startsWith("cs_test_");
  if (STRIPE_KEY_MODE === "test") return sessionId.startsWith("cs_live_");
  return false;
}

/** Add query parameters to a URL that may already have some ("?" vs "&"). */
export function appendQuery(url: string, query: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

// ---- Top-up Checkout ----
export interface CreateTopupCheckoutInput {
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  parentOrderId: number;
  vizlyncOrderId: string;
  topupProductId: string;
  topupProductName: string;
  priceHkd: number;
  preferredLang?: string;
  successUrl: string;
  cancelUrl: string;
}

type TopupSessionParams = CreateTopupCheckoutInput & { topupOrderId: number };

async function buildTopupStripeSession(input: TopupSessionParams) {
  const amountCents = Math.round(input.priceHkd * 100);
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.userEmail ?? undefined,
    line_items: [{
      price_data: {
        currency: "hkd",
        product_data: {
          name: `[Top Up] ${input.topupProductName}`,
          description: "eSIM 加值方案 · Top Up Add-on",
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    client_reference_id: input.userId?.toString() ?? "guest",
    metadata: {
      topup: "true",
      topup_order_id: input.topupOrderId.toString(),
      parent_order_id: input.parentOrderId.toString(),
      vizlync_order_id: input.vizlyncOrderId,
      topup_product_id: input.topupProductId,
      topup_product_name: input.topupProductName.substring(0, 500),
      user_id: input.userId?.toString() ?? "",
      customer_email: input.userEmail ?? "",
      customer_name: input.userName ?? "",
      preferred_lang: input.preferredLang ?? "zh-TW",
    },
    success_url: appendQuery(input.successUrl, "topup_session_id={CHECKOUT_SESSION_ID}&topup_success=true"),
    cancel_url: appendQuery(input.cancelUrl, "topup_cancelled=true"),
    allow_promotion_codes: true,
    custom_text: {
      submit: {
        message: "加值後請耗心等候數秒，期間請勿重複點擊或返回。 / Please wait a few seconds after payment — do not tap repeatedly or go back.",
      },
    },
  });
}

export async function createTopupCheckoutSession(input: CreateTopupCheckoutInput): Promise<{ sessionId: string; url: string }> {
  const amountCents = Math.round(input.priceHkd * 100);
  if (amountCents < 400) throw new Error("Minimum top-up amount is HK$4");

  const topupOrderId = await createTopupOrder({
    parentOrderId: input.parentOrderId,
    userId: input.userId ?? null,
    topupProductId: input.topupProductId,
    topupProductName: input.topupProductName,
    priceHkd: input.priceHkd,
  });

  const session = await buildTopupStripeSession({ ...input, topupOrderId });

  await updateTopupOrderStatus(topupOrderId, "pending_payment", {
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string | undefined,
  });

  return { sessionId: session.id, url: session.url! };
}

export type ResumeTopupResult =
  | { kind: "pay"; url: string }
  | { kind: "paid"; sessionId: string };

/**
 * Let a customer finish a top-up they started but did not pay: reuse the open
 * Stripe page if it is still valid, otherwise open a new one for the SAME
 * top-up order (no second order, same price). A session that was already paid
 * is reported so the caller can complete it immediately.
 */
export async function resumeTopupCheckout(input: {
  topupOrderId: number;
  userId: number;
  userEmail?: string | null;
  userName?: string | null;
  successUrl: string;
  cancelUrl: string;
  preferredLang?: string;
  getParentVizlyncOrderId: (parentOrderId: number) => Promise<string | null>;
}): Promise<ResumeTopupResult> {
  const topup = await getTopupOrderById(input.topupOrderId);
  if (!topup || topup.userId !== input.userId) throw new Error("NOT_FOUND");
  if (topup.status !== "pending_payment") throw new Error("NOT_PENDING");

  if (topup.stripeSessionId && !isSessionModeMismatch(topup.stripeSessionId)) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(topup.stripeSessionId);
      if (existing.payment_status === "paid") return { kind: "paid", sessionId: existing.id };
      if (existing.status === "open" && existing.url) return { kind: "pay", url: existing.url };
    } catch (error) {
      console.warn("[Stripe] Could not reuse top-up session, creating a new one:", error instanceof Error ? error.message : error);
    }
  }

  const vizlyncOrderId = await input.getParentVizlyncOrderId(topup.parentOrderId);
  if (!vizlyncOrderId) throw new Error("PARENT_NOT_READY");

  const priceHkd = Math.round(parseFloat(String(topup.priceHkd ?? 0)));
  if (Math.round(priceHkd * 100) < 400) throw new Error("Minimum top-up amount is HK$4");

  const session = await buildTopupStripeSession({
    topupOrderId: topup.id,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    parentOrderId: topup.parentOrderId,
    vizlyncOrderId,
    topupProductId: topup.topupProductId,
    topupProductName: topup.topupProductName ?? "Top-up",
    priceHkd,
    preferredLang: input.preferredLang,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });
  await updateTopupOrderStatus(topup.id, "pending_payment", {
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string | undefined,
  });
  return { kind: "pay", url: session.url! };
}

export interface CreateCheckoutInput {
  userId?: number | null;
  guestEmail?: string | null; // for guest checkout
  userEmail?: string | null;
  userName?: string | null;
  productId: string;
  productName: string;
  productData: Record<string, unknown>;
  unitPrice: number; // already in HKD (integer)
  quantity: number;
  startDate?: string;
  preferredLang?: string;
  locale?: string; // Stripe checkout page locale: 'en', 'zh-HK', 'zh'
  successUrl: string;
  cancelUrl: string;
  supplier?: "vizlync" | "tgt"; // which supplier this product comes from
  referralCodeId?: number; // referral code id for commission tracking
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<{ sessionId: string; url: string }> {
  const totalAmount = input.unitPrice * input.quantity;
  // HKD is a zero-decimal currency in Stripe — amount is in cents (1 HKD = 100 cents)
  const amountCents = Math.round(totalAmount * 100);

  if (amountCents < 400) {
    // Minimum ~HK$4 (roughly $0.50 USD)
    throw new Error("Minimum order amount is HK$4");
  }

  // Determine supplier from productId prefix or explicit input
  const supplier: "vizlync" | "tgt" = input.supplier ?? (input.productId.startsWith("tgt_") ? "tgt" : "vizlync");

  // Create a pending order first
  const orderId = await createOrder({
    userId: input.userId ?? null,
    guestEmail: input.guestEmail ?? null,
    productId: input.productId,
    productName: input.productName,
    productData: input.productData,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    totalAmount,
    startDate: input.startDate,
    preferredLang: input.preferredLang ?? "zh-TW",
    supplier,
  });

  // Map app language to Stripe locale
  const stripeLocaleMap: Record<string, string> = {
    "en": "en",
    "zh-TW": "zh-HK",
    "zh-CN": "zh",
    "ja": "ja",
    "ko": "ko",
    "th": "th",
  };
  const stripeLocale = stripeLocaleMap[input.locale ?? "zh-TW"] ?? "en";

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: stripeLocale as "en" | "zh-HK" | "zh" | "ja" | "ko" | "th",
    customer_email: input.userEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "hkd",
          product_data: {
            name: input.productName,
            description: `eSIM Plan · ${input.productData.dataAmount ?? ""}${input.productData.dataUnit ?? ""} · ${input.productData.validityDays ?? ""} days`,
          },
          unit_amount: Math.round(input.unitPrice * 100), // HKD cents
        },
        quantity: input.quantity,
      },
    ],
    client_reference_id: input.userId?.toString() ?? "guest",
    metadata: {
      user_id: input.userId?.toString() ?? "",
      guest_email: input.guestEmail ?? "",
      order_id: orderId.toString(),
      product_id: input.productId,
      product_name: input.productName.substring(0, 500), // Stripe metadata value max 500 chars
      customer_email: input.userEmail ?? input.guestEmail ?? "",
      customer_name: input.userName ?? "",
      preferred_lang: input.preferredLang ?? "zh-TW",
      supplier, // track which supplier for post-payment fulfillment
      referral_code_id: input.referralCodeId?.toString() ?? "",
      start_date: input.startDate ?? "", // for ACTIVATE_ON_ORDER TGT products
    },
    success_url: appendQuery(input.successUrl, "session_id={CHECKOUT_SESSION_ID}&success=true"),
    cancel_url: appendQuery(input.cancelUrl, "cancelled=true"),
    allow_promotion_codes: true,
    // Collect billing email for guest checkout (when no customer_email is prefilled)
    billing_address_collection: "auto",
    // Custom reminder shown above the pay button on Stripe's checkout page
    custom_text: {
      submit: {
        message:
          "付款後請耐心等候數秒，期間請勿重複點擊或返回。 / Please wait a few seconds after payment — do not tap repeatedly or go back.",
      },
    },
  });

  // Update order with stripe session id
  await updateOrderStatus(orderId, "pending_payment", {
    stripePaymentIntentId: session.payment_intent as string | undefined,
  });

  // Store session id in order
  const db = await import("./db").then(m => m.getDb());
  if (db) {
    const { orders } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, orderId));
  }

  return { sessionId: session.id, url: session.url! };
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret!);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe] Payment failed: ${pi.id}`);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  res.json({ received: true });
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Route to topup handler if this is a top-up payment
  if (session.metadata?.topup === "true") {
    await handleTopupCheckoutCompleted(session);
    return;
  }

  // Handle batch order payment (multiple orders in one checkout)
  if (session.metadata?.is_batch === "true" && session.metadata?.batch_order_ids) {
    await handleBatchCheckoutCompleted(session);
    return;
  }

  const orderId = parseInt(session.metadata?.order_id ?? "0");
  const productId = session.metadata?.product_id ?? "";

  if (!orderId || !productId) {
    console.error("[Stripe] Missing order_id or product_id in session metadata");
    return;
  }

  // Idempotency guard: if this session's order is already completed, skip.
  // Makes the function safe to call from both the webhook and the reconciliation job.
  const existingOrder = await getOrderByStripeSession(session.id);
  if (existingOrder && existingOrder.status === "completed") {
    console.log(`[Stripe] Order ${orderId} already completed, skipping re-fulfillment`);
    return;
  }

  // Get customer email from Stripe session (Stripe collects it during checkout for guest orders)
  // Priority: customer_details.email (most reliable) > metadata fields
  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.customer_email ||
    session.metadata?.guest_email ||
    null;

  console.log(`[Stripe] Order ${orderId} - customer email: ${customerEmail ?? "(none)"}`);

  // Mark order as paid and update guestEmail so track-order lookup works
  await updateOrderStatus(orderId, "paid", {
    stripePaymentIntentId: session.payment_intent as string | undefined,
    guestEmail: customerEmail ?? undefined,
  });

  // Determine supplier from order metadata (fallback: productId prefix)
  const orderSupplier: "vizlync" | "tgt" = (session.metadata?.supplier as "vizlync" | "tgt") ?? (productId.startsWith("tgt_") ? "tgt" : "vizlync");

  console.log(`[Stripe] Order ${orderId} marked as paid, creating ${orderSupplier} order for product ${productId}`);

  // ── TGT order fulfillment (async: eSIM delivered via callback) ──────────
  if (orderSupplier === "tgt") {
    try {
      // Fetch the product from DB to get the original TGT productCode from rawData
      // (productId has slashes replaced with underscores, so we can't just strip the prefix)
      const productRecord = await getProductById(productId, true);
      const rawData = productRecord?.rawData as Record<string, unknown> | undefined;
      const tgtProductCode: string = (rawData?.productCode as string) ?? productId.replace(/^tgt_/, ""); // fallback to stripped prefix
      const channelOrderNo = `SU${orderId}`; // unique channel order number
      const idempotencyKey = `su-order-${orderId}`;
      const tgtResult = await createTgtOrder({
        productCode: tgtProductCode,
        channelOrderNo,
        idempotencyKey,
        // Do NOT pass email — prevents TGT from sending supplier emails directly to customers
        // eSIM info will be sent by our own email system (Resend) after callback
        startDate: session.metadata?.start_date ?? undefined,
      });
      console.log(`[TGT] Order created: orderNo=${tgtResult.orderNo}, channelOrderNo=${channelOrderNo}`);
      // Mark as processing — eSIM data will arrive via TGT callback
      await updateOrderStatus(orderId, "processing", {
        supplierOrderId: tgtResult.orderNo,
        guestEmail: customerEmail ?? undefined,
      });
      // Notify owner
      await notifyOwner({
        title: `New TGT eSIM Order #${orderId}`,
        content: `Product: ${productId}\nTGT Order: ${tgtResult.orderNo}\nAmount: HK$${Math.round((session.amount_total ?? 0) / 100)}\nAwaiting eSIM delivery via callback.`,
      });
    } catch (err) {
      console.error(`[TGT] Failed to create order for order ${orderId}:`, err);
      await updateOrderStatus(orderId, "processing", { errorMessage: err instanceof Error ? err.message : String(err) }); // Will be retried or manually fulfilled
    }
    return; // TGT is async — email will be sent when callback arrives
  }

  // ── Vizlync order fulfillment (sync) ────────────────────────────────────
  // Create Vizlync order
  try {
    const vizlyncResult = await createVizlyncOrder(productId);
    console.log(`[Stripe] Vizlync order created: ${vizlyncResult.orderId}`);

    // Fetch full eSIM details from Vizlync (the create endpoint may not return lpaString/iccid immediately)
    // Retry up to 5 times with 3s delay to wait for Vizlync to provision the eSIM
    let esimDetails = vizlyncResult;
    if (vizlyncResult.orderId && !vizlyncResult.lpaString) {
      const MAX_RETRIES = 5;
      const RETRY_DELAY_MS = 3000;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Stripe] Fetching eSIM details attempt ${attempt}/${MAX_RETRIES} for Vizlync order ${vizlyncResult.orderId}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          const fullOrder = await getVizlyncOrder(vizlyncResult.orderId);
          if (fullOrder?.lpaString || fullOrder?.iccid) {
            esimDetails = { ...vizlyncResult, ...fullOrder };
            console.log(`[Stripe] Got eSIM details on attempt ${attempt}: lpaString=${fullOrder.lpaString}, iccid=${fullOrder.iccid}`);
            break;
          } else {
            console.log(`[Stripe] Attempt ${attempt}: lpaString not yet available, retrying...`);
          }
        } catch (e) {
          console.warn(`[Stripe] Attempt ${attempt} failed to fetch Vizlync order details:`, e);
        }
      }
      if (!esimDetails.lpaString) {
        console.warn(`[Stripe] lpaString still not available after ${MAX_RETRIES} retries for Vizlync order ${vizlyncResult.orderId}`);
      }
    }

    await updateOrderStatus(orderId, "completed", {
      vizlyncOrderId: vizlyncResult.orderId,
      esimData: esimDetails,
      guestEmail: customerEmail ?? undefined,
    });
    console.log(`[Stripe] Order ${orderId} updated with eSIM data`);

    // Notify owner
    await notifyOwner({
      title: `New eSIM Order #${orderId}`,
      content: `Product: ${productId}\nVizlync Order: ${vizlyncResult.orderId}\nAmount: HK$${Math.round((session.amount_total ?? 0) / 100)}`,
    });

    // Create in-app notification for logged-in users
    const orderUserId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
    if (orderUserId && !isNaN(orderUserId)) {
      const productName = session.metadata?.product_name || productId;
      const hkdAmt = Math.round((session.amount_total ?? 0) / 100);
      await createNotification({
        userId: orderUserId,
        title: `訂單 #${orderId} 已完成`,
        content: `您的 eSIM「${productName}」已成功啟用，請查收確認電郵取得 QR Code。`,
        type: "order",
        link: `/orders`,
      }).catch((e) => console.warn("[Notification] Failed to create in-app notification:", e));
    }

    // Send confirmation email to customer
    const preferredLang = session.metadata?.preferred_lang || "zh-TW";
    const customerNameMap: Record<string, string> = {
      "zh-TW": "顧客",
      "zh-CN": "顾客",
      "en": "Customer",
      "ja": "お客様",
      "ko": "고객님",
      "th": "ลูกค้า",
    };
    const customerName = session.metadata?.customer_name || customerNameMap[preferredLang] || "顧客";
    if (customerEmail) {
      const hkdAmount = Math.round((session.amount_total ?? 0) / 100);
      const emailSent = await sendOrderConfirmationEmail({
        customerEmail,
        customerName,
        orderId,
        productName: session.metadata?.product_name || productId,
        totalAmount: `HK$${hkdAmount}`,
        lpaString: esimDetails.lpaString,
        activationCode: esimDetails.activationCode,
        iccid: esimDetails.iccid,
        smdpAddress: esimDetails.smdpAddress,
        preferredLang,
      }).catch((e) => { console.warn("[Email] Failed:", e); return false; });
      // Record email sent status in DB
      await updateOrderStatus(orderId, "completed", { emailSent: !!emailSent });
      // Log email attempt
      const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
      const subjectMap: Record<string, string> = {
        "zh-TW": `✅ 付款成功 - 訂單 #${orderId} | SIM uncle`,
        "zh-CN": `✅ 付款成功 - 订单 #${orderId} | SIM uncle`,
        "en": `✅ Payment Confirmed - Order #${orderId} | SIM uncle`,
        "ja": `✅ お支払い確認 - 注文 #${orderId} | SIM uncle`,
        "ko": `✅ 결제 확인 - 주문 #${orderId} | SIM uncle`,
        "th": `✅ ยืนยันการชำระเงิน - คำสั่งซื้อ #${orderId} | SIM uncle`,
      };
      await createEmailLog({
        orderId,
        userId: userId && !isNaN(userId) ? userId : null,
        toEmail: customerEmail,
        emailType: "order_confirmation",
        subject: subjectMap[preferredLang] ?? subjectMap["en"],
        status: emailSent ? "sent" : "failed",
        errorMessage: emailSent ? null : "sendOrderConfirmationEmail returned false",
      }).catch((e) => console.warn("[EmailLog] Failed to write log:", e));
    }
  } catch (err) {
    console.error(`[Stripe] Failed to create Vizlync order for order ${orderId}:`, err);
    await updateOrderStatus(orderId, "processing", { errorMessage: err instanceof Error ? err.message : String(err) }); // Will retry or manual intervention
  }

  // ── Referral commission recording ────────────────────────────────────────
  // Fire-and-forget: record commission if a referral code was used at checkout
  const referralCodeId = session.metadata?.referral_code_id
    ? parseInt(session.metadata.referral_code_id)
    : null;
  const orderUserId2 = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
  if (referralCodeId && !isNaN(referralCodeId)) {
    try {
      const dbConn = await import("./db").then((m) => m.getDb());
      if (dbConn) {
        const { referralCodes: rc, referralCommissions: rcom } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [codeRow] = await dbConn.select().from(rc).where(eq(rc.id, referralCodeId)).limit(1);
        if (codeRow && codeRow.isActive) {
          // Prevent self-referral
          if (codeRow.userId !== orderUserId2) {
            const amountHkd = Math.round((session.amount_total ?? 0) / 100);
            const commissionHkd = Math.round(amountHkd * (codeRow.commissionPct / 100));
            await dbConn.insert(rcom).values({
              referrerId: codeRow.userId,
              refereeOrderId: orderId,
              referralCodeId: codeRow.id,
              orderAmountHkd: amountHkd,
              commissionHkd,
              status: "pending",
            });
            console.log(`[Referral] Commission HK$${commissionHkd} recorded for referrer userId=${codeRow.userId} on order #${orderId}`);
          } else {
            console.log(`[Referral] Self-referral detected for userId=${orderUserId2}, skipping commission`);
          }
        }
      }
    } catch (e) {
      console.warn("[Referral] Failed to record commission:", e);
    }
  }
}

async function handleBatchCheckoutCompleted(session: Stripe.Checkout.Session) {
  const batchOrderIdsStr = session.metadata?.batch_order_ids ?? "";
  const orderIds = batchOrderIdsStr.split(",").map(Number).filter(Boolean);
  if (orderIds.length === 0) {
    console.error("[Stripe Batch] No order IDs in batch_order_ids metadata");
    return;
  }
  console.log(`[Stripe Batch] Processing batch payment for orders: ${orderIds.join(", ")}`);
  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.customer_email ||
    null;
  const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
  // Process each order sequentially to avoid Vizlync rate limits
  for (const orderId of orderIds) {
    try {
      const existingOrder = await getOrderById(orderId, userId ?? 0);
      if (!existingOrder) {
        console.warn(`[Stripe Batch] Order ${orderId} not found, skipping`);
        continue;
      }
      if (existingOrder.status === "completed") {
        console.log(`[Stripe Batch] Order ${orderId} already completed, skipping`);
        continue;
      }
      const productId = existingOrder.productId ?? "";
      if (!productId) {
        console.error(`[Stripe Batch] Order ${orderId} has no productId, skipping`);
        continue;
      }
      await updateOrderStatus(orderId, "paid", {
        stripePaymentIntentId: session.payment_intent as string | undefined,
        guestEmail: customerEmail ?? undefined,
      });
      const vizlyncResult = await createVizlyncOrder(productId);
      let esimDetails = vizlyncResult;
      if (vizlyncResult.orderId && !vizlyncResult.lpaString) {
        for (let attempt = 1; attempt <= 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          try {
            const fullOrder = await getVizlyncOrder(vizlyncResult.orderId);
            if (fullOrder?.lpaString || fullOrder?.iccid) {
              esimDetails = { ...vizlyncResult, ...fullOrder };
              break;
            }
          } catch (e) {
            console.warn(`[Stripe Batch] Attempt ${attempt} failed for order ${orderId}:`, e);
          }
        }
      }
      await updateOrderStatus(orderId, "completed", {
        vizlyncOrderId: vizlyncResult.orderId,
        esimData: esimDetails,
        guestEmail: customerEmail ?? undefined,
      });
      console.log(`[Stripe Batch] Order ${orderId} completed`);
      // In-app notification
      if (userId && !isNaN(userId)) {
        await createNotification({
          userId,
          title: `訂單 #${orderId} 已完成`,
          content: `您的 eSIM「${existingOrder.productName ?? productId}」已成功啟用。`,
          type: "order",
          link: `/orders`,
        }).catch((e) => console.warn("[Notification] Batch order notification failed:", e));
      }
    } catch (err) {
      console.error(`[Stripe Batch] Failed to fulfill order ${orderId}:`, err);
      await updateOrderStatus(orderId, "processing");
    }
  }
  await notifyOwner({
    title: `Batch Payment - ${orderIds.length} Orders`,
    content: `Order IDs: ${orderIds.join(", ")}\nAmount: HK$${Math.round((session.amount_total ?? 0) / 100)}`,
  });
}

async function handleTopupCheckoutCompleted(session: Stripe.Checkout.Session) {
  const topupOrderId = parseInt(session.metadata?.topup_order_id ?? "0");
  const vizlyncOrderId = session.metadata?.vizlync_order_id ?? "";
  const topupProductId = session.metadata?.topup_product_id ?? "";

  if (!topupOrderId || !vizlyncOrderId || !topupProductId) {
    console.error("[Stripe Topup] Missing metadata fields", session.metadata);
    return;
  }

  // Idempotency guard: skip if this topup order is already completed.
  const existingTopup = await getTopupOrderById(topupOrderId);
  if (existingTopup && existingTopup.status === "completed") {
    console.log(`[Stripe Topup] topup_order #${topupOrderId} already completed, skipping`);
    return;
  }

  await updateTopupOrderStatus(topupOrderId, "paid", {
    stripePaymentIntentId: session.payment_intent as string | undefined,
  });
  console.log(`[Stripe Topup] topup_order #${topupOrderId} paid, calling Vizlync createTopupOrder`);

  try {
    const result = await createVizlyncTopup(vizlyncOrderId, topupProductId);
    console.log(`[Stripe Topup] Vizlync topup created:`, result);
    // Vizlync's topup response uses `topupOrderId` (not `orderId`/`id`).
    // Fall back to the older keys defensively in case the API shape changes.
    const r = result as Record<string, unknown> | undefined;
    const vizlyncTopupOrderId = String(
      r?.topupOrderId ?? r?.orderId ?? r?.id ?? ""
    );
    await updateTopupOrderStatus(topupOrderId, "completed", {
      vizlyncTopupOrderId,
    });

    // In-app notification
    const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
    if (userId && !isNaN(userId)) {
      const topupProductName = session.metadata?.topup_product_name || topupProductId;
      const hkdAmt = Math.round((session.amount_total ?? 0) / 100);
      await createNotification({
        userId,
        title: "加值成功",
        content: `您的 eSIM 加值方案「${topupProductName}」已成功處理，額外流量即將生效。`,
        type: "order",
        link: "/orders",
      }).catch((e) => console.warn("[Notification] Topup notification failed:", e));
    }

    await notifyOwner({
      title: `Top Up 加值 #${topupOrderId}`,
      content: `Parent Order: ${session.metadata?.parent_order_id}\nProduct: ${topupProductId}\nAmount: HK$${Math.round((session.amount_total ?? 0) / 100)}`,
    });
  } catch (err) {
    console.error(`[Stripe Topup] Failed to create Vizlync topup:`, err);
    await updateTopupOrderStatus(topupOrderId, "failed");
  }
}

// ---- Reconciliation Job ----
// Scans stale pending orders, checks Stripe for actual payment status,
// and auto-fulfills any that were paid but missed by the webhook.
export interface ReconcileResult {
  checked: number;
  fulfilled: number;
  errors: number;
  details: Array<{ type: "order" | "topup"; id: number; sessionId: string; action: string }>;
}

export async function reconcilePendingOrders(olderThanMinutes = 5): Promise<ReconcileResult> {
  const { getStalePendingOrders, getStalePendingTopupOrders } = await import("./db");
  const result: ReconcileResult = { checked: 0, fulfilled: 0, errors: 0, details: [] };

  // 1) Regular eSIM orders
  const staleOrders = await getStalePendingOrders(olderThanMinutes);
  for (const order of staleOrders) {
    if (!order.stripeSessionId) continue;
    if (isSessionModeMismatch(order.stripeSessionId)) {
      result.details.push({ type: "order", id: order.id, sessionId: order.stripeSessionId, action: `skipped (mode-mismatch:${STRIPE_KEY_MODE})` });
      continue;
    }
    result.checked++;
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_status === "paid") {
        console.log(`[Reconcile] Order #${order.id} paid in Stripe but not fulfilled — fulfilling now`);
        await self.handleCheckoutCompleted(session);
        result.fulfilled++;
        result.details.push({ type: "order", id: order.id, sessionId: order.stripeSessionId, action: "fulfilled" });
      } else {
        result.details.push({ type: "order", id: order.id, sessionId: order.stripeSessionId, action: `skipped (${session.payment_status})` });
      }
    } catch (err) {
      console.error(`[Reconcile] Error reconciling order #${order.id}:`, err);
      result.errors++;
      result.details.push({ type: "order", id: order.id, sessionId: order.stripeSessionId, action: "error" });
    }
  }

  // 2) Top-up orders
  const staleTopups = await getStalePendingTopupOrders(olderThanMinutes);
  for (const topup of staleTopups) {
    if (!topup.stripeSessionId) continue;
    if (isSessionModeMismatch(topup.stripeSessionId)) {
      result.details.push({ type: "topup", id: topup.id, sessionId: topup.stripeSessionId, action: `skipped (mode-mismatch:${STRIPE_KEY_MODE})` });
      continue;
    }
    result.checked++;
    try {
      const session = await stripe.checkout.sessions.retrieve(topup.stripeSessionId);
      if (session.payment_status === "paid") {
        console.log(`[Reconcile] Topup #${topup.id} paid in Stripe but not completed — fulfilling now`);
        // handleCheckoutCompleted routes to the topup handler via metadata.topup
        await self.handleCheckoutCompleted(session);
        result.fulfilled++;
        result.details.push({ type: "topup", id: topup.id, sessionId: topup.stripeSessionId, action: "fulfilled" });
      } else {
        result.details.push({ type: "topup", id: topup.id, sessionId: topup.stripeSessionId, action: `skipped (${session.payment_status})` });
      }
    } catch (err) {
      console.error(`[Reconcile] Error reconciling topup #${topup.id}:`, err);
      result.errors++;
      result.details.push({ type: "topup", id: topup.id, sessionId: topup.stripeSessionId, action: "error" });
    }
  }

  console.log(`[Reconcile] Done. Checked=${result.checked} Fulfilled=${result.fulfilled} Errors=${result.errors}`);
  return result;
}

// ---- On-demand confirmation (called from the checkout success page) ----
// When a customer returns from Stripe Checkout, the success page calls this to
// confirm payment immediately instead of waiting for the (possibly missed)
// webhook or the periodic reconciliation job. If Stripe reports the session as
// paid, the order is fulfilled right away via the idempotent handler.
export interface ConfirmPaymentResult {
  status: "fulfilled" | "already_fulfilled" | "unpaid" | "not_found" | "mode_mismatch" | "error";
}

export async function confirmAndFulfillBySession(sessionId: string): Promise<ConfirmPaymentResult> {
  if (!sessionId) return { status: "not_found" };
  // Guard against checking a session that belongs to the other Stripe mode.
  if (isSessionModeMismatch(sessionId)) return { status: "mode_mismatch" };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      // handleCheckoutCompleted is idempotent — safe even if the webhook already ran.
      await self.handleCheckoutCompleted(session);
      return { status: "fulfilled" };
    }
    return { status: "unpaid" };
  } catch (err) {
    console.error(`[ConfirmPayment] Error confirming session ${sessionId}:`, err);
    return { status: "error" };
  }
}
