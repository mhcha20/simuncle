import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addCartItem,
  adminListProducts,
  clearCart,
  createOrder,
  getCartItems,
  getOrderById,
  getOrderByStripeSession,
  getOrderByEmailAndId,
  getProductById,
  getProducts,
  getProductsCount,
  getUserOrders,
  removeCartItem,
  toggleProductActive,
  updateProductCustomFields,
  exportProductsForCsv,
  bulkUpdateProductCustomFields,
  updateCartItemQty,
  updateOrderStatus,
  updateProductTranslation,
  upsertProduct,
  getAllSettings,
  getSetting,
  setSetting,
  getSettingsLatestUpdatedAt,
  getActiveAnnouncement,
  listAnnouncements,
  upsertAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  savePushSubscription,
  deletePushSubscription,
  getAllPushSubscriptions,
  getPushSubscriptionByUser,
  adminListOrders,
  adminGetOrderById,
  adminDeleteOrder,
  getCustomerEmailByUserId,
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  recordSearchAnalytic,
  getTopSearches,
  getSimilarProducts,
  getUserTopupOrders,
  adminListTopupOrders,
  getCompletedTopupOrdersByParent,
  getQueuedTopupOrdersByParent,
  getOrdersByIds,
  createEmailLog,
  getEmailLogsByOrderId,
  getRecentEmailLogs,
  insertSyncHistory,
  getRecentSyncHistory,
} from "./db";
import { sendPushToAll } from "./push";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import {
  createTopupOrder as createVizlyncTopupOrder,
  createVizlyncOrder,
  fetchAllProducts,
  getTopupPlans,
  getVizlyncOrder,
  getVizlyncUsage,
  extractTopupPlans,
  computeTopupPriceHkd,
  selectMainTopupPlans,
  combineUsage,
  terminateVizlyncOrder,
} from "./vizlync";
import { buildSupportContext } from "./supportContext";
import { appendQuery, refundOrderPayment, createCheckoutSession, createTopupCheckoutSession, confirmAndFulfillBySession, resumeTopupCheckout } from "./stripe";
import { fetchAllTgtProducts, normalizeTgtProduct, createTgtOrder, queryTgtUsage } from "./tgt";
import { sendOrderConfirmationEmail, sendCustomEmailToCustomer, sendTerminationEmail } from "./email";
import { articlesRouter } from "./routers/articles";
import { referralRouter } from "./routers/referral";
import { serankingRouter } from "./routers/seranking";
import { submitAllPages, submitToIndexNow, DESTINATION_URLS, CORE_URLS } from "./indexnow";

// ---- AI Support Router ----
const aiRouter = router({
  supportChat: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
        language: z.string().optional(), // "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th"
      }),
    )
    .mutation(async ({ input }) => {
      const lang = input.language ?? "zh-TW";
      const systemPromptMap: Record<string, string> = {
        "zh-TW": `您是 SIM uncle eSIM 的客服助理，SIM uncle 是一家全球 eSIM 服務供應商。
請只回答關於我們 eSIM 產品、服務、安裝、相容性和訂單的問題。
我們的網站銷售 200 多個國家/地區的 eSIM 數據方案，購買後透過 QR Code 啟動。
如果被問及與 eSIM 或我們服務無關的話題，請禮貌地引導回 eSIM 相關主題。
請簡潔、友善、有幫助地回答。請使用繁體中文回覆。
重要資訊：
- eSIM 需要相容裝置（大多數現代 iPhone、Samsung Galaxy、Google Pixel 等）
- 方案僅提供數據（除非特別說明，不含通話/簡訊）
- 啟動方式：掃描 QR Code，到達目的地後選擇方案
- 有效期從首次使用開始計算（除非另有說明）
- 24/7 WhatsApp 客服：+852 98885159`,
        "zh-CN": `您是 SIM uncle eSIM 的客服助理，SIM uncle 是一家全球 eSIM 服务提供商。
请只回答关于我们 eSIM 产品、服务、安装、兼容性和订单的问题。
我们的网站销售 200 多个国家/地区的 eSIM 数据套餐，购买后通过 QR 码激活。
如果被问及与 eSIM 或我们服务无关的话题，请礼貌地引导回 eSIM 相关主题。
请简洁、友善、有帮助地回答。请使用简体中文回复。
重要信息：
- eSIM 需要兼容设备（大多数现代 iPhone、Samsung Galaxy、Google Pixel 等）
- 套餐仅提供数据（除非特别说明，不含通话/短信）
- 激活方式：扫描 QR 码，到达目的地后选择套餐
- 有效期从首次使用开始计算（除非另有说明）
- 24/7 WhatsApp 客服：+852 98885159`,
        "ja": `あなたは SIM uncle eSIM のカスタマーサポートアシスタントです。SIM uncle はグローバル eSIM サービスプロバイダーです。
eSIM 製品、サービス、インストール、互換性、注文に関する質問のみにお答えください。
当サイトでは 200 以上の国・地域の eSIM データプランを販売しており、購入後は QR コードで有効化されます。
eSIM や当サービスと無関係な話題については、丁寧に eSIM 関連のトピックに誘導してください。
簡潔で、親切で、役立つ回答を日本語でお願いします。
重要事項：
- eSIM は対応デバイスが必要です（最新の iPhone、Samsung Galaxy、Google Pixel など）
- プランはデータのみです（特に記載がない限り、通話/SMS は含まれません）
- 有効化：QR コードをスキャンし、目的地到着後にプランを選択
- 有効期限は初回使用から開始（特に記載がない限り）
- 24/7 WhatsApp サポート：+852 98885159`,
        "ko": `저는 SIM uncle eSIM의 고객 지원 어시스턴트입니다. SIM uncle은 글로벌 eSIM 서비스 제공업체입니다.
eSIM 제품, 서비스, 설치, 호환성, 주문에 관한 질문에만 답변해 드립니다.
저희 웹사이트는 200개 이상의 국가/지역의 eSIM 데이터 플랜을 판매하며, 구매 후 QR 코드로 활성화됩니다.
eSIM이나 저희 서비스와 관련 없는 주제에 대해서는 정중하게 eSIM 관련 주제로 안내해 드립니다.
간결하고 친절하며 도움이 되는 답변을 한국어로 제공해 주세요.
주요 정보：
- eSIM은 호환 기기가 필요합니다（최신 iPhone, Samsung Galaxy, Google Pixel 등）
- 플랜은 데이터 전용입니다（특별히 명시되지 않는 한 통화/SMS 미포함）
- 활성화：QR 코드 스캔 후 목적지 도착 시 플랜 선택
- 유효 기간은 첫 사용부터 시작（특별히 명시되지 않는 한）
- 24/7 WhatsApp 지원：+852 98885159`,
        "th": `คุณคือผู้ช่วยฝ่ายบริการลูกค้าของ SIM uncle eSIM ผู้ให้บริการ eSIM ระดับโลก
กรุณาตอบเฉพาะคำถามเกี่ยวกับผลิตภัณฑ์ บริการ การติดตั้ง ความเข้ากันได้ และคำสั่งซื้อ eSIM ของเราเท่านั้น
เว็บไซต์ของเราจำหน่ายแผน eSIM สำหรับกว่า 200 ประเทศ/ภูมิภาค เปิดใช้งานหลังซื้อผ่าน QR Code
หากถูกถามเรื่องที่ไม่เกี่ยวกับ eSIM หรือบริการของเรา กรุณาแนะนำกลับไปยังหัวข้อที่เกี่ยวข้องอย่างสุภาพ
กรุณาตอบอย่างกระชับ เป็นมิตร และเป็นประโยชน์ ตอบเป็นภาษาไทย
ข้อมูลสำคัญ：
- eSIM ต้องใช้อุปกรณ์ที่รองรับ（iPhone รุ่นใหม่ส่วนใหญ่, Samsung Galaxy, Google Pixel ฯลฯ）
- แผนเป็นข้อมูลเท่านั้น（ไม่รวมโทรศัพท์/SMS หากไม่ระบุ）
- การเปิดใช้งาน：สแกน QR Code เลือกแผนเมื่อถึงปลายทาง
- ระยะเวลาเริ่มนับจากการใช้งานครั้งแรก（หากไม่ระบุเป็นอย่างอื่น）
- WhatsApp ตลอด 24/7：+852 98885159`,
        "en": `You are a helpful customer support assistant for SIM uncle eSIM, a global eSIM service provider.
Answer questions ONLY about our eSIM products, services, installation, compatibility, and orders.
Our website sells eSIM data plans for 200+ countries/regions. Plans are activated after purchase and delivered via QR code.
If asked about topics unrelated to eSIM or our service, politely redirect to eSIM-related topics.
Be concise, friendly, and helpful. Always reply in English.
Key facts:
- eSIM requires a compatible device (most modern iPhones, Samsung Galaxy, Google Pixel, etc.)
- Plans are data-only (no calls/SMS unless specified)
- Activation: scan QR code, select plan when in destination country
- Validity starts from first use (unless stated otherwise)
- 24/7 support available via WhatsApp: +852 98885159`,
      };
      const systemPrompt = systemPromptMap[lang] ?? systemPromptMap["zh-TW"];
      // Ground the answer in this shop's real facts and, when a destination is named, its live plans.
      const lastUserText = [...input.messages].reverse().find(m => m.role === "user")?.content ?? "";
      const context = await buildSupportContext(lastUserText, { getProducts, getSetting }).catch(error => {
        console.warn("[SupportChat] could not build shop context:", error instanceof Error ? error.message : error);
        return "";
      });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: context ? `${systemPrompt}\n\n${context}` : systemPrompt },
          ...input.messages.slice(-12),
        ],
        max_tokens: 1024,
      });
      const content = response.choices?.[0]?.message?.content;
      return { reply: typeof content === "string" ? content.trim() : "Sorry, I could not generate a response. Please try again." };
    }),
});

// ---- Products Router ----
const productsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        countries: z.array(z.string()).optional(),
        minData: z.number().optional(),
        maxData: z.number().optional(),
        dailyOnly: z.boolean().optional(),
        topUpOnly: z.boolean().optional(),
        minDays: z.number().optional(),
        maxDays: z.number().optional(),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
        sortBy: z.enum(["price_asc", "price_desc", "validity", "data"]).default("price_asc"),
      })
    )
    .query(async ({ input }) => {
      return getProducts(input);
    }),

  getById: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      const product = await getProductById(input.productId);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return product;
    }),

  count: publicProcedure.query(async () => {
    return getProductsCount();
  }),

  // Sync products from Vizlync API (admin only)
  sync: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const { products } = await fetchAllProducts();
      let synced = 0;
      const errors: { productId: string; error: string }[] = [];
      // Process in batches of 50
      for (let i = 0; i < products.length; i += 50) {
        const batch = products.slice(i, i + 50);
        const results = await Promise.allSettled(
          batch.map((p) =>
            upsertProduct({
              productId: p.productId,
              name: p.name,
              description: p.description,
              planInfo: p.planInfo,
              price: p.price,
              validityDays: p.validityDays,
              countries: p.countries,
              region: p.region,
              dataAmount: p.dataAmount,
              dataUnit: p.dataUnit,
              speed: p.speed,
              planType: p.planType,
              category: p.category,
              networkName: p.networkName,
              networkType: p.networkType,
              isVoiceAvailable: p.isVoiceAvailable,
              isSmsAvailable: p.isSmsAvailable,
              hotspotAvailable: p.hotspotAvailable,
              topUpAvailable: p.topUpAvailable,
              profile: p.profile,
              activationPolicy: p.activationPolicy,
              startDateEnabled: p.startDateEnabled,
              voiceMin: p.voiceMin,
              sms: p.sms,
              rawData: p,
            })
          )
        );
        results.forEach((result, idx) => {
          if (result.status === "rejected") {
            const p = batch[idx];
            errors.push({
              productId: p.productId,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          } else {
            synced++;
          }
        });
      }
      // Record sync history
      await insertSyncHistory({
        triggeredBy: "manual",
        status: errors.length === 0 ? "success" : "failed",
        totalProducts: products.length,
        added: 0, // manual sync doesn't track added/removed
        removed: 0,
        priceChanged: 0,
        failedCount: errors.length,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).map(e => `[${e.productId}] ${e.error}`).join("\n") : null,
      }).catch(() => {});
      return { synced, total: products.length, errors };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await insertSyncHistory({
        triggeredBy: "manual",
        status: "failed",
        totalProducts: 0,
        added: 0,
        removed: 0,
        priceChanged: 0,
        failedCount: 0,
        errorMessage: errorMsg,
      }).catch(() => {});
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errorMsg });
    }
  }),

  // Get recent sync history (admin only)
  getSyncHistory: adminProcedure.query(async () => {
    return getRecentSyncHistory(5);
  }),

  // Sync products from TGT API (admin only)
  syncTgt: adminProcedure.mutation(async () => {
    try {
      const { products } = await fetchAllTgtProducts();
      let synced = 0;
      let parsedFromNameCount = 0;
      const errors: { productId: string; error: string }[] = [];
      for (let i = 0; i < products.length; i += 50) {
        const batch = products.slice(i, i + 50);
        const normalizedBatch = batch.map((p) => normalizeTgtProduct(p));
        parsedFromNameCount += normalizedBatch.filter(n => n.parsedFromName).length;
        const results = await Promise.allSettled(
          normalizedBatch.map((normalized) => {
            return upsertProduct({
              productId: normalized.productId,
              name: normalized.name,
              description: normalized.description,
              price: normalized.price,
              validityDays: normalized.validityDays,
              countries: normalized.countries,
              dataAmount: normalized.dataAmount,
              dataUnit: normalized.dataUnit,
              networkType: normalized.networkType,
              planType: normalized.planType,
              topUpAvailable: normalized.topUpAvailable,
              activationPolicy: normalized.activationPolicy,
              startDateEnabled: normalized.startDateEnabled,
              rawData: normalized.rawData,
              supplier: "tgt",
            });
          })
        );
        results.forEach((result, idx) => {
          if (result.status === "rejected") {
            const p = batch[idx];
            errors.push({
              productId: `tgt_${p.productCode}`,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          } else {
            synced++;
          }
        });
      }
      await insertSyncHistory({
        triggeredBy: "manual",
        supplier: "tgt",
        status: errors.length === 0 ? "success" : "failed",
        totalProducts: products.length,
        added: 0,
        removed: 0,
        priceChanged: 0,
        failedCount: errors.length,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).map(e => `[${e.productId}] ${e.error}`).join("\n") : null,
      }).catch(() => {});
      return { synced, total: products.length, parsedFromNameCount, errors };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await insertSyncHistory({
        triggeredBy: "manual",
        supplier: "tgt",
        status: "failed",
        totalProducts: 0,
        added: 0,
        removed: 0,
        priceChanged: 0,
        failedCount: 0,
        errorMessage: errorMsg,
      }).catch(() => {});
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errorMsg });
    }
  }),

  // On-demand translation: translate description to ZhTW and ZhCN, cache in DB
  translateDescription: publicProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ input }) => {
      const product = await getProductById(input.productId);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if all translations are already done
      const descAlreadyDone = !!(product.descriptionZhTW && product.descriptionZhCN);
      const planInfoAlreadyDone = !!(product.planInfoZhTW && product.planInfoZhCN);
      const descJaAlreadyDone = !!product.descriptionJa;
      const descKoAlreadyDone = !!product.descriptionKo;
      const descThAlreadyDone = !!product.descriptionTh;
      const piJaAlreadyDone = !!product.planInfoJa;
      const piKoAlreadyDone = !!product.planInfoKo;
      const piThAlreadyDone = !!product.planInfoTh;
      const allDone = descAlreadyDone && planInfoAlreadyDone && descJaAlreadyDone && descKoAlreadyDone && descThAlreadyDone && piJaAlreadyDone && piKoAlreadyDone && piThAlreadyDone;
      if (allDone) {
        return {
          descriptionZhTW: product.descriptionZhTW,
          descriptionZhCN: product.descriptionZhCN,
          descriptionJa: product.descriptionJa,
          descriptionKo: product.descriptionKo,
          descriptionTh: product.descriptionTh,
          planInfoZhTW: product.planInfoZhTW,
          planInfoZhCN: product.planInfoZhCN,
          planInfoJa: product.planInfoJa,
          planInfoKo: product.planInfoKo,
          planInfoTh: product.planInfoTh,
        };
      }

      type SupportedLang = "zh-TW" | "zh-CN" | "ja" | "ko" | "th";
      const translateText = async (sourceHtml: string, targetLang: SupportedLang): Promise<string | null> => {
        const langLabels: Record<SupportedLang, string> = {
          "zh-TW": "Traditional Chinese (Hong Kong style, use 繁體中文)",
          "zh-CN": "Simplified Chinese (Mainland China style, use 简体中文)",
          "ja": "Japanese (use natural Japanese for telecom/travel context)",
          "ko": "Korean (use natural Korean for telecom/travel context)",
          "th": "Thai (use natural Thai for telecom/travel context)",
        };
        const naturalDayTerms: Record<SupportedLang, string> = {
          "zh-TW": "日曆天",
          "zh-CN": "日历天",
          "ja": "暦日",
          "ko": "달력일",
          "th": "วันปฏิทิน",
        };
        const langLabel = langLabels[targetLang];
        // Strip HTML tags for translation
        const plainText = sourceHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        // Truncate very long text to avoid token limits (max ~1500 chars)
        const truncated = plainText.length > 1500 ? plainText.slice(0, 1500) + "..." : plainText;
        if (!truncated) return null;
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a professional translator for eSIM and telecom products. Translate the given text into ${langLabel}. Return ONLY the translated text, no explanations, no JSON, no markdown. Important terminology rules: always translate "Natural Day" or "Natural Days" as "${naturalDayTerms[targetLang]}". Keep technical terms like GB, MB, kbps, Mbps, APN, 4G, 5G, eSIM unchanged.`,
              },
              { role: "user", content: truncated },
            ],
            max_tokens: 2048,
          });
          const content = response.choices?.[0]?.message?.content;
          return typeof content === "string" && content.trim() ? content.trim() : null;
        } catch (err) {
          console.error(`[Translation] ${targetLang} failed:`, err);
          return null;
        }
      };

      try {
        const descSource = product.description || "";
        const planInfoSource = product.planInfo || "";

        // Translate description (if not done yet)
        const [descZhTW, descZhCN] = descAlreadyDone
          ? [product.descriptionZhTW, product.descriptionZhCN]
          : descSource.trim()
            ? await Promise.all([translateText(descSource, "zh-TW"), translateText(descSource, "zh-CN")])
            : [null, null];

        // Translate description to ja/ko/th
        const descJa = descJaAlreadyDone ? product.descriptionJa : (descSource.trim() ? await translateText(descSource, "ja") : null);
        const descKo = descKoAlreadyDone ? product.descriptionKo : (descSource.trim() ? await translateText(descSource, "ko") : null);
        const descTh = descThAlreadyDone ? product.descriptionTh : (descSource.trim() ? await translateText(descSource, "th") : null);

        // Translate planInfo (if not done yet)
        const [piZhTW, piZhCN] = planInfoAlreadyDone
          ? [product.planInfoZhTW, product.planInfoZhCN]
          : planInfoSource.trim()
            ? await Promise.all([translateText(planInfoSource, "zh-TW"), translateText(planInfoSource, "zh-CN")])
            : [null, null];

        // Translate planInfo to ja/ko/th
        const piJa = piJaAlreadyDone ? product.planInfoJa : (planInfoSource.trim() ? await translateText(planInfoSource, "ja") : null);
        const piKo = piKoAlreadyDone ? product.planInfoKo : (planInfoSource.trim() ? await translateText(planInfoSource, "ko") : null);
        const piTh = piThAlreadyDone ? product.planInfoTh : (planInfoSource.trim() ? await translateText(planInfoSource, "th") : null);

        // Save to DB
        await updateProductTranslation(
          input.productId,
          descZhTW ?? null,
          descZhCN ?? null,
          piZhTW ?? null,
          piZhCN ?? null,
          descJa ?? null,
          descKo ?? null,
          descTh ?? null,
          piJa ?? null,
          piKo ?? null,
          piTh ?? null,
        );

        return {
          descriptionZhTW: descZhTW ?? null,
          descriptionZhCN: descZhCN ?? null,
          descriptionJa: descJa ?? null,
          descriptionKo: descKo ?? null,
          descriptionTh: descTh ?? null,
          planInfoZhTW: piZhTW ?? null,
          planInfoZhCN: piZhCN ?? null,
          planInfoJa: piJa ?? null,
          planInfoKo: piKo ?? null,
          planInfoTh: piTh ?? null,
        };
      } catch (err) {
        console.error("[Translation] Failed:", err);
        return { descriptionZhTW: null, descriptionZhCN: null, descriptionJa: null, descriptionKo: null, descriptionTh: null, planInfoZhTW: null, planInfoZhCN: null, planInfoJa: null, planInfoKo: null, planInfoTh: null };
      }
    }),

  // Public sync for initial load (fetches directly from Vizlync, no auth)
  fetchDirect: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // Try DB cache first
      const count = await getProductsCount();
      if (count > 0) {
        return getProducts(input);
      }
      // Fallback: fetch from Vizlync directly
      try {
        const { products, total } = await fetchAllProducts();
        return {
          products: products.slice(input.offset, input.offset + input.limit).map((p) => ({
            productId: p.productId,
            name: p.name,
            description: p.description,
            price: p.price.toFixed(2),
            validityDays: p.validityDays,
            countries: p.countries,
            region: p.region,
            dataAmount: p.dataAmount?.toFixed(3),
            dataUnit: p.dataUnit,
            isDailyPlan: p.isDailyPlan,
            speed: p.speed,
            networkType: p.networkType,
            networkName: p.networkName,
            hotspotAvailable: p.hotspotAvailable,
            isVoiceAvailable: p.isVoiceAvailable,
            isSmsAvailable: p.isSmsAvailable,
            topUpAvailable: p.topUpAvailable,
            profile: p.profile,
            activationPolicy: p.activationPolicy,
            category: p.category,
          })),
          total,
        };
      } catch {
        return { products: [], total: 0 };
      }
    }),
});

// ---- Cart Router ----
const cartRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCartItems(ctx.user.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        productName: z.string(),
        productData: z.record(z.string(), z.unknown()),
        unitPrice: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await addCartItem(
        ctx.user.id,
        input.productId,
        input.productName,
        input.productData,
        input.unitPrice
      );
      return { id };
    }),

  updateQty: protectedProcedure
    .input(z.object({ cartItemId: z.number(), quantity: z.number().min(0).max(99) }))
    .mutation(async ({ ctx, input }) => {
      await updateCartItemQty(input.cartItemId, ctx.user.id, input.quantity);
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeCartItem(input.cartItemId, ctx.user.id);
      return { success: true };
    }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    await clearCart(ctx.user.id);
    return { success: true };
  }),
});

// ---- Orders Router ----
const ordersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orders = await getUserOrders(ctx.user.id);
    // For completed orders with a vizlyncOrderId, fetch usage status in parallel
    // to support the "unused" filter (status = Not Available means not yet activated).
    const completedWithId = orders.filter(
      (o) => (o.status === "completed" || o.status === "paid") && o.vizlyncOrderId
    );
    const usageResults = await Promise.allSettled(
      completedWithId.map((o) => getVizlyncUsage(o.vizlyncOrderId!))
    );
    const vizlyncStatusMap = new Map<number, string>();
    completedWithId.forEach((o, idx) => {
      const result = usageResults[idx];
      if (result.status === "fulfilled" && result.value) {
        const status = String((result.value as Record<string, unknown>).status ?? "");
        vizlyncStatusMap.set(o.id, status);
      }
    });

    // For terminated orders, check whether they still have a usable (completed)
    // top-up plan. If so, the order should still be presented as "completed"
    // because the customer can keep using the add-on data.
    const terminatedOrders = orders.filter((o) => o.status === "terminated");
    const usableTopupSet = new Set<number>();
    if (terminatedOrders.length > 0) {
      const topupResults = await Promise.allSettled(
        terminatedOrders.map((o) => getCompletedTopupOrdersByParent(o.id))
      );
      terminatedOrders.forEach((o, idx) => {
        const r = topupResults[idx];
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          const hasUsable = r.value.some((t) => (t.vizlyncTopupOrderId ?? "").trim().length > 0);
          if (hasUsable) usableTopupSet.add(o.id);
        }
      });
    }

    // For completed orders, check whether the user has a queued top-up
    // (topupOrders.status = "paid" = paid but not yet activated).
    // Only when a queued top-up exists should the "提前啟動 Top-up" button appear.
    const activeOrCompletedOrders = orders.filter(
      (o) => o.status === "completed"
    );
    const queuedTopupSet = new Set<number>();
    if (activeOrCompletedOrders.length > 0) {
      const queuedResults = await Promise.allSettled(
        activeOrCompletedOrders.map((o) => getQueuedTopupOrdersByParent(o.id))
      );
      activeOrCompletedOrders.forEach((o, idx) => {
        const r = queuedResults[idx];
        if (r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0) {
          queuedTopupSet.add(o.id);
        }
      });
    }

    // For TGT completed orders, fetch real-time usage in parallel.
    // We use queryTgtUsage which requires the TGT system orderNo stored in supplierOrderId.
    // Also fetch order status (profileStatus) via queryTgtOrder to detect NOTACTIVE (unused).
    const { queryTgtOrder: _queryTgtOrder } = await import("./tgt");
    const tgtCompletedOrders = orders.filter(
      (o) => o.supplier === "tgt" && (o.status === "completed" || o.status === "terminated")
    );
    type TgtUsageRow = { dataTotal?: string; dataUsage?: string; dataResidual?: string; qtaconsumption?: string; refuelingTotal?: string } | null;
    const tgtUsageMap = new Map<number, TgtUsageRow>();
    const tgtProfileStatusMap = new Map<number, string>();
    let tgtFetchedAt: string | null = null;
    if (tgtCompletedOrders.length > 0) {
      tgtFetchedAt = new Date().toISOString();
      const channelOrderNos = tgtCompletedOrders.map((o) => `SU${o.id}`);
      // Fetch order info (for profileStatus) and usage in parallel
      const [orderInfoResults, usageResults2] = await Promise.all([
        Promise.allSettled(channelOrderNos.map((c) => _queryTgtOrder(c))),
        Promise.allSettled(
          tgtCompletedOrders.map((o) => {
            // supplierOrderId holds the TGT system orderNo (e.g. SE...)
            const tgtOrderNo = (o.supplierOrderId ?? "").trim();
            if (!tgtOrderNo) return Promise.resolve(null);
            return queryTgtUsage(tgtOrderNo);
          })
        ),
      ]);
      tgtCompletedOrders.forEach((o, idx) => {
        const infoResult = orderInfoResults[idx];
        if (infoResult.status === "fulfilled" && infoResult.value) {
          const profileStatus = String(infoResult.value.profileStatus ?? "");
          if (profileStatus) tgtProfileStatusMap.set(o.id, profileStatus);
        }
        const usageResult = usageResults2[idx];
        if (usageResult.status === "fulfilled" && usageResult.value) {
          tgtUsageMap.set(o.id, usageResult.value as TgtUsageRow);
        } else {
          tgtUsageMap.set(o.id, null);
        }
      });
    }

    return orders.map((o) => ({
      ...o,
      vizlyncStatus: vizlyncStatusMap.get(o.id) ?? null,
      hasUsableTopup: usableTopupSet.has(o.id),
      hasQueuedTopup: queuedTopupSet.has(o.id),
      tgtUsage: tgtUsageMap.get(o.id) ?? null,
      tgtProfileStatus: tgtProfileStatusMap.get(o.id) ?? null,
      tgtFetchedAt: (o.supplier === "tgt" && (o.status === "completed" || o.status === "terminated")) ? tgtFetchedAt : null,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  getEsimDetails: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const productData = order.productData as Record<string, unknown>;
      const topUpAvailable = Boolean(productData?.topUpAvailable);
      const supplier = order.supplier ?? "vizlync";
      if (!order.vizlyncOrderId) return { esimData: order.esimData, topUpAvailable, productData, supplier };
      // Fetch latest from Vizlync
      try {
        const data = await getVizlyncOrder(order.vizlyncOrderId);
        return { esimData: data, topUpAvailable, productData, supplier };
      } catch {
        return { esimData: order.esimData, topUpAvailable, productData, supplier };
      }
    }),

  getUsage: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order not yet fulfilled" });

      // Base usage from the parent eSIM order.
      const base = (await getVizlyncUsage(order.vizlyncOrderId)) as Record<string, unknown>;

      // Vizlync tracks each top-up as a SEPARATE order that shares the same
      // physical eSIM (ICCID) but is NOT aggregated into the parent's
      // dataAllowance/dataUsage. To show the customer their *combined* balance,
      // fetch the usage of every completed top-up for this order and sum the
      // allowance + usage on top of the base figures.
      const topups = await getCompletedTopupOrdersByParent(input.orderId);
      // Only keep topups that have a vizlync order ID, preserving index alignment
      const validTopups = topups.filter((t) => (t.vizlyncTopupOrderId ?? "").trim().length > 0);
      const topupVizlyncIds = validTopups.map((t) => t.vizlyncTopupOrderId!.trim());
      const topupLabels = validTopups.map((t) => t.topupProductName ?? "Add-on");
      const topupOrderIds = validTopups.map((t) => t.id);
      const topupUsages: Record<string, unknown>[] = [];
      if (topupVizlyncIds.length > 0) {
        const results = await Promise.allSettled(
          topupVizlyncIds.map((id) => getVizlyncUsage(id))
        );
        for (const r of results) {
          topupUsages.push(r.status === "fulfilled" && r.value ? r.value as Record<string, unknown> : {});
        }
      }
      // Combine parent + add-on usage into a single balance for display.
      // Also returns breakdown[] for per-card display when topups exist.
      return combineUsage(base, topupUsages, topupLabels, topupVizlyncIds, topupOrderIds);
    }),

  getTopupPlans: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST" });
      const raw = await getTopupPlans(order.vizlyncOrderId);
      // Vizlync returns { originalOrder, topupPlans: [...] }. Normalize to a
      // clean array and apply the same markup + HKD conversion used elsewhere
      // so the price shown/charged is consistent with regular products.
      const allPlans = extractTopupPlans(raw);
      // Return all available top-up plans; UI handles filtering/sorting via sliders
      const rawPlans = allPlans;
      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      return rawPlans.map((p) => ({
        productId: p.productId,
        name: p.name,
        price: computeTopupPriceHkd(p.price, markupPct, hkdRate),
        validityDays: p.validityDays ?? null,
        dataAmount: p.dataAmount ?? null,
        dataUnit: p.dataUnit ?? null,
        planType: p.planType ?? null,
      }));
    }),

  purchaseTopup: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      topupProductId: z.string(),
      topupProductName: z.string(),
      priceHkd: z.number(),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order not fulfilled" });
      // Never trust the client-supplied price. Re-fetch the plan from Vizlync
      // by productId and recompute the HKD price server-side.
      const raw = await getTopupPlans(order.vizlyncOrderId);
      const plan = extractTopupPlans(raw).find((p) => p.productId === input.topupProductId);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Top-up plan no longer available" });
      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      const priceHkd = computeTopupPriceHkd(plan.price, markupPct, hkdRate);
      const result = await createTopupCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email ?? undefined,
        userName: ctx.user.name ?? undefined,
        parentOrderId: input.orderId,
        vizlyncOrderId: order.vizlyncOrderId,
        topupProductId: input.topupProductId,
        topupProductName: plan.name ?? input.topupProductName,
        priceHkd,
        preferredLang: "zh-TW",
        successUrl: `${input.origin}/orders?topup_success=true`,
        cancelUrl: `${input.origin}/orders`,
      });
      return { url: result.url };
    }),

  /** Finish paying for a top-up that was started but not paid (reuses the same top-up order). */
  retryTopupCheckout: protectedProcedure
    .input(z.object({ topupOrderId: z.number().int(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resumeTopupCheckout({
          topupOrderId: input.topupOrderId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          successUrl: `${input.origin}/orders?topup_success=true`,
          cancelUrl: `${input.origin}/orders`,
          preferredLang: "zh-TW",
          getParentVizlyncOrderId: async (parentOrderId) => (await getOrderById(parentOrderId, ctx.user.id))?.vizlyncOrderId ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Top-up order not found" });
        if (message === "NOT_PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "This top-up is not waiting for payment" });
        if (message === "PARENT_NOT_READY") throw new TRPCError({ code: "BAD_REQUEST", message: "The main eSIM is not ready for a top-up yet" });
        throw error;
      }
    }),

  getMyTopupOrders: protectedProcedure.query(async ({ ctx }) => {
    const topups = await getUserTopupOrders(ctx.user.id);
    if (topups.length === 0) return [];

    // Batch-fetch parent orders to get their status and product name
    const parentIds = Array.from(new Set(topups.map((t) => t.parentOrderId)));
    const parentOrders = await getOrdersByIds(parentIds);
    const parentMap = new Map(parentOrders.map((o) => [o.id, o]));

    // Fetch Vizlync usage for each completed topup (in parallel, best-effort)
    const enriched = await Promise.all(
      topups.map(async (item) => {
        const parent = parentMap.get(item.parentOrderId);
        let usage: { dataAllowance: number; dataUsage: number; status: string } | null = null;
        if (item.vizlyncTopupOrderId && (item.status === "completed" || item.status === "paid")) {
          try {
            const raw = (await getVizlyncUsage(item.vizlyncTopupOrderId)) as Record<string, unknown>;
            usage = {
              dataAllowance: Number(raw?.dataAllowance ?? 0),
              dataUsage: Number(raw?.dataUsage ?? 0),
              status: String(raw?.status ?? ""),
            };
          } catch {
            // ignore – usage is optional
          }
        }
        return {
          ...item,
          parentStatus: parent?.status ?? null,
          parentProductName: parent?.productName ?? null,
          usage,
        };
      })
    );
    return enriched;
  }),

  // Confirm a top-up payment immediately on the success redirect, without
  // waiting for the Stripe webhook or the reconciliation cron. Idempotent.
  confirmTopupPayment: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await confirmAndFulfillBySession(input.sessionId);
      return { result: result.status };
    }),

  getSimilarProducts: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const productData = order.productData as Record<string, unknown>;
      const countries = (productData?.countries as { id: string; name: string }[] | null) ?? [];
      const countryIds = countries.map((c) => c.id);
      const dataAmountGb = parseFloat(String(productData?.dataAmount ?? 0));
      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      const products = await getSimilarProducts({
        countryIds,
        dataAmountGb,
        excludeProductId: order.productId,
        limit: 6,
      });
      return products.map((p) => {
        const costPrice = parseFloat(String(p.price ?? 0));
        const withMarkup = markupPct > 0 ? costPrice * (1 + markupPct / 100) : costPrice;
        const priceHkd = Math.round(withMarkup * hkdRate);
        return {
          productId: p.productId,
          name: p.customName ?? p.name,
          price: priceHkd,
          validityDays: p.validityDays,
          dataAmount: p.dataAmount,
          dataUnit: p.dataUnit,
          countries: p.countries,
          networkType: p.networkType,
          topUpAvailable: p.topUpAvailable,
        };
      });
    }),

  // Retry payment for a pending_payment order — creates a new Stripe Checkout session
  retryCheckout: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        successUrl: z.string(),
        cancelUrl: z.string(),
        locale: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "pending_payment") throw new TRPCError({ code: "BAD_REQUEST", message: "Order is not pending payment" });
      // Re-use the stored unit price (already in HKD)
      const unitPriceHkd = Math.round(parseFloat(String(order.unitPrice ?? 0)));
      const result = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        userName: ctx.user.name,
        productId: order.productId,
        productName: order.productName,
        productData: order.productData as Record<string, unknown>,
        unitPrice: unitPriceHkd,
        quantity: order.quantity ?? 1,
        startDate: order.startDate ?? undefined,
        locale: input.locale,
        preferredLang: input.locale ?? order.preferredLang ?? "zh-TW",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return result;
    }),

  terminatePlan: protectedProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status === "terminated") throw new TRPCError({ code: "BAD_REQUEST", message: "Order already terminated" });
      if (order.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only active (completed) orders can be terminated" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order not yet fulfilled" });
      // Check if product supports top-up (terminate-plan only works when a queued top-up exists)
      const productData = order.productData as Record<string, unknown> | null;
      const topUpAvailable = Boolean(productData?.topUpAvailable);
      if (!topUpAvailable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "TOPUP_NOT_SUPPORTED: This product does not support early plan termination. Only products with top-up support can use this feature.",
        });
      }
      try {
        await terminateVizlyncOrder(order.vizlyncOrderId);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };
        const errData = axiosErr?.response?.data as Record<string, unknown> | undefined;
        const errCode = (errData?.error as Record<string, unknown> | undefined)?.code as string | undefined;
        console.log(`[terminatePlan] Vizlync error status=${axiosErr?.response?.status} code=${errCode} data=${JSON.stringify(errData)}`);
        if (errCode === "NO_TOPUP_ORDER") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "NO_TOPUP_ORDER: Please purchase a top-up plan first before activating early termination.",
          });
        }
        // Re-throw all other errors
        throw err;
      }
      const { getDb } = await import("./db");
      const db = await getDb();
      if (db) {
        const { eq } = await import("drizzle-orm");
        const { orders: ordersTable } = await import("../drizzle/schema");
        await db.update(ordersTable).set({ status: "terminated", updatedAt: new Date() }).where(eq(ordersTable.id, input.orderId));
      }
      // Send termination email
      const customerEmail = order.guestEmail ?? (order.userId ? await getCustomerEmailByUserId(order.userId) : null);
      if (customerEmail) {
        const terminationOk = await sendTerminationEmail({
          customerEmail,
          customerName: ctx.user.name ?? customerEmail,
          orderId: order.id,
          productName: order.productName,
          terminatedAt: new Date(),
          preferredLang: order.preferredLang ?? "zh-TW",
        });
        await createEmailLog({
          orderId: order.id,
          userId: order.userId ?? undefined,
          toEmail: customerEmail,
          emailType: "termination_confirmation",
          subject: `❌ Plan Terminated - Order #${order.id}`,
          status: terminationOk ? "sent" : "failed",
        });
      }
      return { success: true };
    }),
  batchClearPending: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { eq, and } = await import("drizzle-orm");
      const { orders: ordersTable } = await import("../drizzle/schema");
      const result = await db
        .update(ordersTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(ordersTable.userId, ctx.user.id), eq(ordersTable.status, "pending_payment")));
      return { success: true, affected: (result as { rowsAffected?: number }).rowsAffected ?? 0 };
    }),
  batchCancelFailed: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { eq, and } = await import("drizzle-orm");
      const { orders: ordersTable } = await import("../drizzle/schema");
      const deleteResult = await db
        .delete(ordersTable)
        .where(and(eq(ordersTable.userId, ctx.user.id), eq(ordersTable.status, "failed")));
      return { success: true, affected: (deleteResult as { rowsAffected?: number }).rowsAffected ?? 0 };
    }),
  batchRetryCheckout: protectedProcedure
    .input(
      z.object({
        orderIds: z.array(z.number().int()).min(1).max(20),
        successUrl: z.string(),
        cancelUrl: z.string(),
        locale: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderList = await Promise.all(
        input.orderIds.map((id) => getOrderById(id, ctx.user.id))
      );
      const validOrders = orderList.filter(
        (o) => o && o.status === "pending_payment"
      ) as NonNullable<Awaited<ReturnType<typeof getOrderById>>>[];
      if (validOrders.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid pending orders found" });
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);
      const lineItems = validOrders.map((order) => ({
        price_data: {
          currency: "hkd",
          product_data: {
            name: order.productName ?? "eSIM Plan",
            metadata: { orderId: String(order.id), productId: order.productId ?? "" },
          },
          unit_amount: Math.round(parseFloat(String(order.unitPrice ?? 0))) * 100,
        },
        quantity: order.quantity ?? 1,
      }));
      const orderIdsStr = validOrders.map((o) => o.id).join(",");
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          batch_order_ids: orderIdsStr,
          is_batch: "true",
        },
        success_url: appendQuery(input.successUrl, `batch_order_ids=${encodeURIComponent(orderIdsStr)}`),
        cancel_url: input.cancelUrl,
        locale: (input.locale as "zh" | "en" | "ja" | "ko" | "th" | undefined) ?? "zh",
        allow_promotion_codes: true,
      });
      return { url: session.url, orderIds: validOrders.map((o) => o.id) };
    }),

  /**
   * Query TGT order status and real-time data usage.
   * Only works for TGT orders (supplier = 'tgt').
   * Calls API 4.8 (order/query) first to get orderNo + status info,
   * then calls API 4.10 (order/usage) for real-time data usage.
   */
  getTgtOrderStatus: protectedProcedure
    .input(z.object({ orderId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId, ctx.user.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.supplier !== "tgt") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This query is only available for TGT orders" });
      }

      const { queryTgtOrder, queryTgtUsage } = await import("./tgt");
      const channelOrderNo = `SU${order.id}`;

      // Step 1: Get order status and card info (API 4.8)
      const orderInfo = await queryTgtOrder(channelOrderNo);
      if (!orderInfo) {
        return {
          found: false,
          orderStatus: null,
          profileStatus: null,
          activatedStartTime: null,
          activatedEndTime: null,
          iccid: null,
          usage: null,
          usageSupported: false,
        };
      }

      // Step 2: Get real-time usage (API 4.10) — requires TGT orderNo
      let usage: { dataTotal?: string; dataUsage?: string; dataResidual?: string; refuelingTotal?: string; qtaconsumption?: string } | null = null;
      let usageSupported = false;
      if (orderInfo.orderNo) {
        try {
          usage = await queryTgtUsage(orderInfo.orderNo);
          usageSupported = usage !== null;
        } catch {
          // Usage query failed — not critical, still return order status
          usageSupported = false;
        }
      }

      // Extract high-speed cap from productData (stored as GB)
      const productData = order.productData as Record<string, unknown> | null;
      const productDataAmountGb = productData?.dataAmount != null
        ? parseFloat(String(productData.dataAmount))
        : null;

      return {
        found: true,
        orderNo: orderInfo.orderNo,
        orderStatus: orderInfo.orderStatus,
        profileStatus: orderInfo.profileStatus,
        activatedStartTime: orderInfo.activatedStartTime ?? null,
        activatedEndTime: orderInfo.activatedEndTime ?? null,
        latestActivationTime: orderInfo.latestActivationTime ?? null,
        renewExpirationTime: orderInfo.renewExpirationTime ?? null,
        iccid: orderInfo.cardInfo?.iccid ?? null,
        orderType: orderInfo.orderType ?? null,
        usage,
        usageSupported,
        productDataAmountGb: productDataAmountGb && productDataAmountGb > 0 ? productDataAmountGb : null,
      };
    }),
});

// ---- Checkout Router ----
const checkoutRouter = router({
  // Create a pending order and return Stripe session URL
  createSession: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1).max(10).default(1),
        startDate: z.string().optional(),
        locale: z.string().optional(), // app language: 'en', 'zh-TW', 'zh-CN'
        successUrl: z.string(),
        cancelUrl: z.string(),
        referralCode: z.string().optional(), // optional referral code for 10% discount
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Look up product from DB to avoid sending huge product object from client
      const resolvedProduct = await getProductById(input.productId);
      if (!resolvedProduct) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      const productName = resolvedProduct.name;
      // Build a lean product snapshot for the order (exclude rawData, translations, DB metadata)
      const productData: Record<string, unknown> = {
        productId: resolvedProduct.productId,
        name: resolvedProduct.name,
        description: resolvedProduct.description,
        price: resolvedProduct.price,
        validityDays: resolvedProduct.validityDays,
        countries: resolvedProduct.countries,
        region: resolvedProduct.region,
        dataAmount: resolvedProduct.dataAmount,
        dataUnit: resolvedProduct.dataUnit,
        speed: resolvedProduct.speed,
        planType: resolvedProduct.planType,
        networkType: resolvedProduct.networkType,
        isVoiceAvailable: resolvedProduct.isVoiceAvailable,
        isSmsAvailable: resolvedProduct.isSmsAvailable,
        hotspotAvailable: resolvedProduct.hotspotAvailable,
        topUpAvailable: resolvedProduct.topUpAvailable,
        activationPolicy: resolvedProduct.activationPolicy,
        supplier: resolvedProduct.supplier,
      };
      const unitPriceCost = parseFloat(String(resolvedProduct.price ?? 0));

      // Convert USD cost price to HKD with markup
      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      const withMarkup = markupPct > 0 ? unitPriceCost * (1 + markupPct / 100) : unitPriceCost;
      let unitPriceHkd = Math.round(withMarkup * hkdRate);

      // Validate referral code and apply discount
      let referralCodeId: number | null = null;
      if (input.referralCode) {
        const { getDb: getDbFn } = await import("./db");
        const dbConn = await getDbFn();
        if (dbConn) {
          const { referralCodes: rc } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const [codeRow] = await dbConn.select().from(rc).where(eq(rc.code, input.referralCode.toUpperCase())).limit(1);
          if (codeRow && codeRow.isActive && codeRow.userId !== ctx.user.id) {
            // Apply discount (e.g. 10% off = multiply by 0.9)
            unitPriceHkd = Math.round(unitPriceHkd * (1 - codeRow.discountPct / 100));
            referralCodeId = codeRow.id;
          }
        }
      }

      const result = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        userName: ctx.user.name,
        productId: resolvedProduct.productId,
        productName,
        productData,
        unitPrice: unitPriceHkd,
        quantity: input.quantity,
        startDate: input.startDate,
        locale: input.locale,
        preferredLang: input.locale ?? "zh-TW",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        referralCodeId: referralCodeId ?? undefined,
      });
      return result;
    }),

  // Create checkout from cart items
  createCartSession: protectedProcedure
    .input(
      z.object({
        successUrl: z.string(),
        cancelUrl: z.string(),
        locale: z.string().optional(), // app language: 'en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'th'
        referralCode: z.string().optional(), // optional referral code for 10% discount
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cartItemsList = await import("./db").then(m => m.getCartItems(ctx.user.id));
      if (cartItemsList.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty" });
      }
      // Get markup percentage and HKD rate from settings
      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      const toHkd = (usdPrice: number) => {
        const withMarkup = markupPct > 0 ? usdPrice * (1 + markupPct / 100) : usdPrice;
        return Math.round(withMarkup * hkdRate); // integer HKD (consistent with frontend display)
      };

      // Validate referral code and apply discount
      let referralCodeId: number | null = null;
      const firstItem = cartItemsList[0];
      const basePrice = parseFloat(String(firstItem.unitPrice));
      let unitPrice = toHkd(basePrice);
      if (input.referralCode) {
        const { getDb: getDbFn } = await import("./db");
        const dbConn = await getDbFn();
        if (dbConn) {
          const { referralCodes: rc } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const [codeRow] = await dbConn.select().from(rc).where(eq(rc.code, input.referralCode.toUpperCase())).limit(1);
          if (codeRow && codeRow.isActive && codeRow.userId !== ctx.user.id) {
            unitPrice = Math.round(unitPrice * (1 - codeRow.discountPct / 100));
            referralCodeId = codeRow.id;
          }
        }
      }

      // For simplicity, create separate orders for each cart item
      // and redirect to first item's checkout (multi-item checkout can be added later)
      // Resolve full productId (slug may have tgt_ prefix stripped)
      const resolvedCartProduct = await getProductById(firstItem.productId);
      const resolvedCartProductId = resolvedCartProduct?.productId ?? firstItem.productId;

      const result = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        userName: ctx.user.name,
        productId: resolvedCartProductId,
        productName: firstItem.productName,
        productData: firstItem.productData as Record<string, unknown>,
        unitPrice,
        quantity: firstItem.quantity,
        locale: input.locale,
        preferredLang: input.locale ?? "zh-TW",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        referralCodeId: referralCodeId ?? undefined,
      });
      return result;
    }),

  // Guest checkout: no login required, email is collected at checkout
  guestCreateSession: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1).max(10).default(1),
        startDate: z.string().optional(),
        locale: z.string().optional(), // app language: 'en', 'zh-TW', 'zh-CN'
        successUrl: z.string(),
        cancelUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Look up product from DB to avoid sending huge product object from client
      const resolvedProduct = await getProductById(input.productId);
      if (!resolvedProduct) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      const productName = resolvedProduct.name;
      // Build a lean product snapshot for the order (exclude rawData, translations, DB metadata)
      const productData: Record<string, unknown> = {
        productId: resolvedProduct.productId,
        name: resolvedProduct.name,
        description: resolvedProduct.description,
        price: resolvedProduct.price,
        validityDays: resolvedProduct.validityDays,
        countries: resolvedProduct.countries,
        region: resolvedProduct.region,
        dataAmount: resolvedProduct.dataAmount,
        dataUnit: resolvedProduct.dataUnit,
        speed: resolvedProduct.speed,
        planType: resolvedProduct.planType,
        networkType: resolvedProduct.networkType,
        isVoiceAvailable: resolvedProduct.isVoiceAvailable,
        isSmsAvailable: resolvedProduct.isSmsAvailable,
        hotspotAvailable: resolvedProduct.hotspotAvailable,
        topUpAvailable: resolvedProduct.topUpAvailable,
        activationPolicy: resolvedProduct.activationPolicy,
        supplier: resolvedProduct.supplier,
      };
      const unitPriceCost = parseFloat(String(resolvedProduct.price ?? 0));

      const [markupSetting, hkdRateSetting] = await Promise.all([
        getSetting("markup_percentage"),
        getSetting("hkd_rate"),
      ]);
      const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
      const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
      const withMarkup = markupPct > 0 ? unitPriceCost * (1 + markupPct / 100) : unitPriceCost;
      const unitPriceHkd = Math.round(withMarkup * hkdRate);

      const result = await createCheckoutSession({
        userId: null,
        guestEmail: null, // Stripe will collect email at checkout
        userEmail: null,
        userName: null,
        productId: resolvedProduct.productId,
        productName,
        productData,
        unitPrice: unitPriceHkd,
        quantity: input.quantity,
        startDate: input.startDate,
        locale: input.locale,
        preferredLang: input.locale ?? "zh-TW",
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return result;
    }),

  getOrderBySession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderByStripeSession(input.sessionId);
      if (!order || order.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  // Called by the checkout success page to confirm payment immediately,
  // without waiting for the Stripe webhook (which can be missed on cold starts)
  // or the periodic reconciliation cron. Idempotent and safe to call repeatedly.
  confirmPayment: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await confirmAndFulfillBySession(input.sessionId);
      const order = await getOrderByStripeSession(input.sessionId);
      return { result: result.status, order: order ?? null };
    }),

  // Guest can look up their order by session ID (no auth required)
  getGuestOrderBySession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const order = await getOrderByStripeSession(input.sessionId);
      if (!order || order.userId !== null) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  // Track order by email + orderId (guests without account)
  resendConfirmationEmail: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      const email = order.guestEmail;
      if (!email) throw new Error("No email for this order (registered user orders do not support resend yet)");
      const esimData = order.esimData as Record<string, string> | null;
      await sendOrderConfirmationEmail({
        customerEmail: email,
        customerName: email.split("@")[0],
        orderId: order.id,
        productName: order.productName,
        totalAmount: `HK$${Math.round(parseFloat(order.totalAmount))}`,
        lpaString: esimData?.lpaString,
        activationCode: esimData?.activationCode,
        iccid: esimData?.iccid,
        smdpAddress: esimData?.smdpAddress,
      });
      return { success: true };
    }),

  trackOrder: publicProcedure
    .input(z.object({
      email: z.string().email(),
      orderId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const order = await getOrderByEmailAndId(input.email, input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found. Please check your email and order number." });

      // If order is completed but esimData lacks lpaString, fetch from Vizlync and persist
      let esimData = order.esimData as Record<string, unknown> | null;
      if (order.status === "completed" && order.vizlyncOrderId && !esimData?.lpaString) {
        try {
          const fullOrder = await getVizlyncOrder(order.vizlyncOrderId);
          if (fullOrder?.lpaString || fullOrder?.iccid) {
            esimData = { ...(esimData ?? {}), ...fullOrder };
            // Persist back to DB so future lookups are fast
            await updateOrderStatus(order.id, order.status, { esimData });
          }
        } catch (e) {
          console.warn(`[trackOrder] Could not fetch Vizlync details for order ${order.id}:`, e);
        }
      }

      // Return safe subset of order data (no internal IDs)
      return {
        id: order.id,
        productName: order.productName,
        status: order.status,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        currency: order.currency,
        esimData,
        createdAt: order.createdAt,
      };
    }),
});

// ---- Admin Products Router ----
const adminProductsRouter = router({
  translationStats: adminProcedure.query(async () => {
    const { getTranslationStats } = await import("./db");
    return getTranslationStats();
  }),

  batchTranslate: adminProcedure
    .input(
      z.object({
        lang: z.enum(["ja", "ko", "th", "zh-TW"]),
        batchSize: z.number().min(1).max(20).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const { getUntranslatedProductIds, getTranslationStats } = await import("./db");
      const productIds = await getUntranslatedProductIds(input.lang, input.batchSize);
      if (productIds.length === 0) {
        const stats = await getTranslationStats();
        const remaining = stats.total - (input.lang === "ja" ? stats.translatedJa : input.lang === "ko" ? stats.translatedKo : input.lang === "th" ? stats.translatedTh : stats.translatedZh);
        return { translated: 0, remaining };
      }
      type BatchLang = "ja" | "ko" | "th" | "zh-TW";
      const langLabels: Record<BatchLang, string> = {
        "ja": "Japanese (use natural Japanese for telecom/travel context)",
        "ko": "Korean (use natural Korean for telecom/travel context)",
        "th": "Thai (use natural Thai for telecom/travel context)",
        "zh-TW": "Traditional Chinese (Hong Kong style, use 繁體中文, Hong Kong conventions)",
      };
      const naturalDayTerms: Record<BatchLang, string> = {
        "ja": "暦日", "ko": "달력일", "th": "วันปฏิทิน", "zh-TW": "日曆日",
      };
      const translateText = async (sourceHtml: string, targetLang: BatchLang): Promise<string | null> => {
        const plainText = sourceHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const truncated = plainText.length > 1500 ? plainText.slice(0, 1500) + "..." : plainText;
        if (!truncated) return null;
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a professional translator for eSIM and telecom products. Translate the given text into ${langLabels[targetLang]}. Return ONLY the translated text, no explanations, no JSON, no markdown. Important terminology rules: always translate "Natural Day" or "Natural Days" as "${naturalDayTerms[targetLang]}". Keep technical terms like GB, MB, kbps, Mbps, APN, 4G, 5G, eSIM unchanged.` },
              { role: "user", content: truncated },
            ],
            max_tokens: 2048,
          });
          const content = response.choices?.[0]?.message?.content;
          return typeof content === "string" && content.trim() ? content.trim() : null;
        } catch { return null; }
      };
      const { getDb } = await import("./db");
      const db = await getDb();
      let translated = 0;
      for (const productId of productIds) {
        try {
          const product = await getProductById(productId, true);
          if (!product) continue;
          const lang = input.lang;
          const descSource = product.description || "";
          const planInfoSource = product.planInfo || "";
          const descTranslated = descSource.trim() ? await translateText(descSource, lang) : null;
          const piTranslated = planInfoSource.trim() ? await translateText(planInfoSource, lang) : null;
          if (db) {
            // Use empty string as sentinel when source had no content (avoids re-selecting on next batch)
            const toVal = (translated: string | null, source: string) =>
              translated ?? (source.trim() ? null : "");
            const updateFields: Record<string, string | null | Date> = { updatedAt: new Date() };
            if (lang === "ja") {
              updateFields.descriptionJa = toVal(descTranslated, descSource);
              updateFields.planInfoJa = toVal(piTranslated, planInfoSource);
            } else if (lang === "ko") {
              updateFields.descriptionKo = toVal(descTranslated, descSource);
              updateFields.planInfoKo = toVal(piTranslated, planInfoSource);
            } else if (lang === "th") {
              updateFields.descriptionTh = toVal(descTranslated, descSource);
              updateFields.planInfoTh = toVal(piTranslated, planInfoSource);
            } else {
              updateFields.descriptionZhTW = toVal(descTranslated, descSource);
              updateFields.planInfoZhTW = toVal(piTranslated, planInfoSource);
            }
            const { eq } = await import("drizzle-orm");
            const { productsCache } = await import("../drizzle/schema");
            await db.update(productsCache).set(updateFields).where(eq(productsCache.productId, productId));
          }
          translated++;
        } catch (err) {
          console.error(`[BatchTranslate] Failed for ${productId}:`, err);
        }
      }
      const stats = await getTranslationStats();
      const remaining = stats.total - (input.lang === "ja" ? stats.translatedJa : input.lang === "ko" ? stats.translatedKo : input.lang === "th" ? stats.translatedTh : stats.translatedZh);
      return { translated, remaining };
    }),

  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        supplier: z.enum(["vizlync", "tgt"]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return adminListProducts(input);
    }),

  toggle: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await toggleProductActive(input.productId, input.isActive);
      return { success: true };
    }),

  updateCustom: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        customName: z.string().max(255).nullable(),
        customDescription: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await updateProductCustomFields(input.productId, input.customName, input.customDescription);
      return { success: true };
    }),

  exportCsv: adminProcedure
    .query(async () => {
      return exportProductsForCsv();
    }),

  bulkUpdateCustom: adminProcedure
    .input(
      z.object({
        rows: z.array(z.object({
          productId: z.string(),
          customName: z.string().max(255).nullable(),
          customDescription: z.string().nullable(),
        })).max(5000),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await bulkUpdateProductCustomFields(input.rows);
      return { success: true, updated };
    }),

  getProductTranslations: adminProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      const product = await getProductById(input.productId, true);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      return {
        productId: product.productId,
        name: product.name,
        description: product.description ?? "",
        planInfo: product.planInfo ?? "",
        descriptionZhTW: product.descriptionZhTW ?? "",
        descriptionZhCN: product.descriptionZhCN ?? "",
        descriptionJa: product.descriptionJa ?? "",
        descriptionKo: product.descriptionKo ?? "",
        descriptionTh: product.descriptionTh ?? "",
        planInfoZhTW: product.planInfoZhTW ?? "",
        planInfoZhCN: product.planInfoZhCN ?? "",
        planInfoJa: product.planInfoJa ?? "",
        planInfoKo: product.planInfoKo ?? "",
        planInfoTh: product.planInfoTh ?? "",
      };
    }),

  updateProductTranslations: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        descriptionZhTW: z.string().nullable(),
        descriptionZhCN: z.string().nullable(),
        descriptionJa: z.string().nullable(),
        descriptionKo: z.string().nullable(),
        descriptionTh: z.string().nullable(),
        planInfoZhTW: z.string().nullable(),
        planInfoZhCN: z.string().nullable(),
        planInfoJa: z.string().nullable(),
        planInfoKo: z.string().nullable(),
        planInfoTh: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { eq } = await import("drizzle-orm");
      const { productsCache } = await import("../drizzle/schema");
      await db.update(productsCache).set({
        descriptionZhTW: input.descriptionZhTW,
        descriptionZhCN: input.descriptionZhCN,
        descriptionJa: input.descriptionJa,
        descriptionKo: input.descriptionKo,
        descriptionTh: input.descriptionTh,
        planInfoZhTW: input.planInfoZhTW,
        planInfoZhCN: input.planInfoZhCN,
        planInfoJa: input.planInfoJa,
        planInfoKo: input.planInfoKo,
        planInfoTh: input.planInfoTh,
        updatedAt: new Date(),
      }).where(eq(productsCache.productId, input.productId));
      return { success: true };
    }),

  retranslateProduct: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        lang: z.enum(["zh-TW", "zh-CN", "ja", "ko", "th"]),
      })
    )
    .mutation(async ({ input }) => {
      const product = await getProductById(input.productId, true);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      type RtLang = "zh-TW" | "zh-CN" | "ja" | "ko" | "th";
      const langLabels: Record<RtLang, string> = {
        "zh-TW": "Traditional Chinese (Hong Kong style, use 繁體中文, Hong Kong conventions)",
        "zh-CN": "Simplified Chinese (use 简体中文)",
        "ja": "Japanese (use natural Japanese for telecom/travel context)",
        "ko": "Korean (use natural Korean for telecom/travel context)",
        "th": "Thai (use natural Thai for telecom/travel context)",
      };
      const naturalDayTerms: Record<RtLang, string> = {
        "zh-TW": "日曆日", "zh-CN": "日历日", "ja": "暦日", "ko": "달력일", "th": "วันปฏิทิน",
      };
      const translateText = async (sourceHtml: string): Promise<string | null> => {
        const plainText = sourceHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const truncated = plainText.length > 1500 ? plainText.slice(0, 1500) + "..." : plainText;
        if (!truncated) return null;
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a professional translator for eSIM and telecom products. Translate the given text into ${langLabels[input.lang]}. Return ONLY the translated text, no explanations, no JSON, no markdown. Important terminology rules: always translate "Natural Day" or "Natural Days" as "${naturalDayTerms[input.lang]}". Keep technical terms like GB, MB, kbps, Mbps, APN, 4G, 5G, eSIM unchanged.` },
              { role: "user", content: truncated },
            ],
            max_tokens: 2048,
          });
          const content = response.choices?.[0]?.message?.content;
          return typeof content === "string" && content.trim() ? content.trim() : null;
        } catch { return null; }
      };
      const descSource = product.description || "";
      const planInfoSource = product.planInfo || "";
      const descTranslated = descSource.trim() ? await translateText(descSource) : "";
      const piTranslated = planInfoSource.trim() ? await translateText(planInfoSource) : "";
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { eq } = await import("drizzle-orm");
      const { productsCache } = await import("../drizzle/schema");
      const descField = input.lang === "zh-TW" ? "descriptionZhTW" : input.lang === "zh-CN" ? "descriptionZhCN" : input.lang === "ja" ? "descriptionJa" : input.lang === "ko" ? "descriptionKo" : "descriptionTh";
      const piField = input.lang === "zh-TW" ? "planInfoZhTW" : input.lang === "zh-CN" ? "planInfoZhCN" : input.lang === "ja" ? "planInfoJa" : input.lang === "ko" ? "planInfoKo" : "planInfoTh";
      const updateFields: Record<string, string | null | Date> = {
        [descField]: descTranslated ?? "",
        [piField]: piTranslated ?? "",
        updatedAt: new Date(),
      };
      await db.update(productsCache).set(updateFields).where(eq(productsCache.productId, input.productId));
      return {
        description: descTranslated ?? "",
        planInfo: piTranslated ?? "",
      };
    }),
});

// ---- Settings Router ----
const settingsRouter = router({
  getAll: publicProcedure.query(async () => {
    return getAllSettings();
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = await getSetting(input.key);
      return { key: input.key, value };
    }),

  set: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await setSetting(input.key, input.value);
      return { success: true };
    }),

  /** Returns the most recent updatedAt for any currency rate setting */
  getCurrencyRatesUpdatedAt: publicProcedure.query(async () => {
    const RATE_KEYS = [
      "hkd_rate", "jpy_rate", "krw_rate", "thb_rate", "twd_rate", "sgd_rate",
      "myr_rate", "php_rate", "idr_rate", "vnd_rate", "inr_rate", "cny_rate",
      "mop_rate", "usd_rate", "eur_rate", "gbp_rate", "aud_rate", "cad_rate",
      "chf_rate", "nzd_rate", "sek_rate", "nok_rate", "dkk_rate",
    ];
    const updatedAt = await getSettingsLatestUpdatedAt(RATE_KEYS);
    return { updatedAt };
  }),

  /** Fetch latest exchange rates from open.er-api.com and persist to site_settings */
  fetchAndUpdateRates: adminProcedure.mutation(async () => {
    // Currency code → settings key mapping (all relative to HKD)
    const CURRENCY_KEY_MAP: Record<string, string> = {
      USD: "usd_rate", JPY: "jpy_rate", KRW: "krw_rate", THB: "thb_rate",
      TWD: "twd_rate", SGD: "sgd_rate", MYR: "myr_rate", PHP: "php_rate",
      IDR: "idr_rate", VND: "vnd_rate", INR: "inr_rate", CNY: "cny_rate",
      MOP: "mop_rate", EUR: "eur_rate", GBP: "gbp_rate", AUD: "aud_rate",
      CAD: "cad_rate", CHF: "chf_rate", NZD: "nzd_rate", SEK: "sek_rate",
      NOK: "nok_rate", DKK: "dkk_rate",
    };
    const res = await fetch("https://open.er-api.com/v6/latest/HKD");
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
    const data = await res.json() as { result: string; rates: Record<string, number> };
    if (data.result !== "success") throw new Error("Exchange rate API returned non-success");
    const updated: string[] = [];
    for (const [currency, key] of Object.entries(CURRENCY_KEY_MAP)) {
      const rate = data.rates[currency];
      if (rate != null) {
        await setSetting(key, String(rate));
        updated.push(currency);
      }
    }
    return { success: true, updatedCount: updated.length, currencies: updated };
  }),
});

// ---- Announcements Router ----
const announcementsRouter = router({
  getActive: publicProcedure.query(async () => {
    return getActiveAnnouncement();
  }),

  list: adminProcedure.query(async () => {
    return listAnnouncements();
  }),

  upsert: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      message: z.string().min(1).max(500),
      messageZhTW: z.string().max(500).optional().nullable(),
      messageZhCN: z.string().max(500).optional().nullable(),
      link: z.string().url().optional().nullable(),
      linkText: z.string().max(64).optional().nullable(),
      bgColor: z.string().default("#16a34a"),
      textColor: z.string().default("#ffffff"),
      isActive: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const id = await upsertAnnouncement(input);
      return { success: true, id };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleAnnouncementActive(input.id, input.isActive);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAnnouncement(input.id);
      return { success: true };
    }),
});

// ---- Push Notifications Router ----
const pushRouter = router({
  subscribe: publicProcedure
    .input(z.object({
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;
      await savePushSubscription(userId, input);
      return { success: true };
    }),

  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;
      await deletePushSubscription(userId, input.endpoint);
      return { success: true };
    }),

  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return getPushSubscriptionByUser(ctx.user.id);
  }),

  sendToAll: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      body: z.string().min(1).max(300),
      url: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const subs = await getAllPushSubscriptions();
      if (subs.length === 0) return { sent: 0, expired: 0, failed: 0, total: 0 };
      const result = await sendPushToAll(subs, input);
      return result;
    }),

  subscriberCount: adminProcedure.query(async () => {
    const subs = await getAllPushSubscriptions();
    return { count: subs.length };
  }),
});

// ---- Admin Orders Router ----
const adminOrdersRouter = router({
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return adminListOrders(input);
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const order = await adminGetOrderById(input.id);
      if (!order) throw new Error("Order not found");
      return order;
    }),

  listTopup: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return adminListTopupOrders(input);
    }),

  sendEmailToCustomer: adminProcedure
    .input(z.object({
      orderId: z.number().int(),
      subject: z.string().min(1).max(200),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      // Guest orders have guestEmail; logged-in orders need to look up user email
      let email = order.guestEmail ?? null;
      if (!email && order.userId) {
        email = await getCustomerEmailByUserId(order.userId);
      }
      if (!email) throw new Error("No customer email found for this order");
      const ok = await sendCustomEmailToCustomer({
        to: email,
        subject: input.subject,
        content: input.content,
      });
      // Log the email attempt
      await createEmailLog({
        orderId: input.orderId,
        userId: order.userId ?? null,
        toEmail: email,
        emailType: "custom",
        subject: input.subject,
        status: ok ? "sent" : "failed",
        errorMessage: ok ? null : "Resend API returned failure",
      });
      if (!ok) throw new Error("Failed to send email");
      return { success: true, sentTo: email };
    }),

  getEmailLogs: adminProcedure
    .input(z.object({ orderId: z.number().int().optional() }))
    .query(async ({ input }) => {
      if (input.orderId) {
        return getEmailLogsByOrderId(input.orderId);
      }
      return getRecentEmailLogs(200);
    }),

  deleteOrder: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await adminDeleteOrder(input.orderId);
      return { success: true };
    }),

  refundOrder: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      try {
        return await refundOrderPayment(input.orderId);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Refund failed" });
      }
    }),

  getPendingReminderStats: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const { orders: ordersTable } = await import("../drizzle/schema");
    const { eq: _eq, sql: _sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return { total: 0, byReminderCount: [] as { count: number; orders: number }[] };
    // Get all pending_payment orders grouped by reminder count
    const rows = await db
      .select({
        reminderCount: ordersTable.paymentReminderCount,
        orderCount: _sql<number>`COUNT(*)`,
      })
      .from(ordersTable)
      .where(_eq(ordersTable.status, "pending_payment"))
      .groupBy(ordersTable.paymentReminderCount);
    const byReminderCount = rows.map((r: { reminderCount: number | null; orderCount: number }) => ({
      count: r.reminderCount ?? 0,
      orders: Number(r.orderCount),
    }));
    const total = byReminderCount.reduce((sum: number, r: { count: number; orders: number }) => sum + r.orders, 0);
    return { total, byReminderCount };
  }),

  getUsage: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .query(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order not yet fulfilled" });
      const base = (await getVizlyncUsage(order.vizlyncOrderId)) as Record<string, unknown>;
      const topups = await getCompletedTopupOrdersByParent(input.orderId);
      // Only keep topups that have a vizlync order ID, preserving index alignment
      const validTopups = topups.filter((t) => (t.vizlyncTopupOrderId ?? "").trim().length > 0);
      const topupVizlyncIds = validTopups.map((t) => t.vizlyncTopupOrderId!.trim());
      const topupLabels = validTopups.map((t) => t.topupProductName ?? "Add-on");
      const topupOrderIds = validTopups.map((t) => t.id);
      const topupUsages: Record<string, unknown>[] = [];
      if (topupVizlyncIds.length > 0) {
        const results = await Promise.allSettled(
          topupVizlyncIds.map((id) => getVizlyncUsage(id))
        );
        for (const r of results) {
          topupUsages.push(r.status === "fulfilled" && r.value ? r.value as Record<string, unknown> : {});
        }
      }
      return combineUsage(base, topupUsages, topupLabels, topupVizlyncIds, topupOrderIds);
    }),

  terminatePlan: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status === "terminated") throw new TRPCError({ code: "BAD_REQUEST", message: "Order already terminated" });
      if (!order.vizlyncOrderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order not yet fulfilled" });
      try {
        await terminateVizlyncOrder(order.vizlyncOrderId);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        // 404 from Vizlync means already terminated or not found — treat as success
        if (axiosErr?.response?.status !== 404) throw err;
      }
      const { getDb } = await import("./db");
      const db = await getDb();
      if (db) {
        const { eq } = await import("drizzle-orm");
        const { orders: ordersTable } = await import("../drizzle/schema");
        await db.update(ordersTable).set({ status: "terminated", updatedAt: new Date() }).where(eq(ordersTable.id, input.orderId));
      }
      // Send termination email
      const customerEmail = order.guestEmail ?? (order.userId ? await getCustomerEmailByUserId(order.userId) : null);
      if (customerEmail) {
        const terminationOk = await sendTerminationEmail({
          customerEmail,
          customerName: customerEmail,
          orderId: order.id,
          productName: order.productName,
          terminatedAt: new Date(),
          preferredLang: order.preferredLang ?? "zh-TW",
        });
        await createEmailLog({
          orderId: order.id,
          userId: order.userId ?? undefined,
          toEmail: customerEmail,
          emailType: "termination_confirmation",
          subject: `❌ Plan Terminated - Order #${order.id}`,
          status: terminationOk ? "sent" : "failed",
        });
      }
      return { success: true };
    }),

  reissueEsim: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "processing" && order.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot reissue order in status: ${order.status}` });
      }

      if (order.supplier === "tgt") {
        // TGT async flow: place order and wait for callback
        const productRecord = await getProductById(order.productId, true);
        const rawData = productRecord?.rawData as Record<string, unknown> | undefined;
        const tgtProductCode: string = (rawData?.productCode as string) ?? order.productId.replace(/^tgt_/, "");
        const channelOrderNo = `SU${order.id}`;
        const idempotencyKey = `su-reissue-${order.id}-${Date.now()}`;
        const tgtResult = await createTgtOrder({
          productCode: tgtProductCode,
          channelOrderNo,
          idempotencyKey,
        });
        await updateOrderStatus(order.id, "processing", {
          supplierOrderId: tgtResult.orderNo,
          errorMessage: null, // clear previous error
        });
        await notifyOwner({
          title: `[Reissue] TGT eSIM Order #${order.id}`,
          content: `Product: ${order.productId}\nTGT Order: ${tgtResult.orderNo}\nAwaiting eSIM delivery via callback.`,
        });
        return { success: true, message: `TGT order reissued: ${tgtResult.orderNo}` };
      } else {
        // Vizlync sync flow: place order and get eSIM data immediately
        const vizlyncResult = await createVizlyncOrder(order.productId);
        let esimDetails = vizlyncResult;
        if (vizlyncResult.orderId && !vizlyncResult.lpaString) {
          const MAX_RETRIES = 5;
          const RETRY_DELAY_MS = 3000;
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              const fullOrder = await getVizlyncOrder(vizlyncResult.orderId);
              if (fullOrder?.lpaString || fullOrder?.iccid) {
                esimDetails = { ...vizlyncResult, ...fullOrder };
                break;
              }
            } catch (e) {
              console.warn(`[reissueEsim] Attempt ${attempt} failed:`, e);
            }
          }
        }
        await updateOrderStatus(order.id, "completed", {
          vizlyncOrderId: vizlyncResult.orderId,
          esimData: esimDetails,
          errorMessage: null, // clear previous error
        });
        // Send confirmation email
        const customerEmail = order.guestEmail ?? (order.userId ? await getCustomerEmailByUserId(order.userId) : null);
        if (customerEmail) {
          await sendOrderConfirmationEmail({
            customerEmail,
            customerName: customerEmail,
            orderId: order.id,
            productName: order.productName,
            totalAmount: `HK$${order.totalAmount}`,
            lpaString: esimDetails.lpaString,
            activationCode: esimDetails.activationCode,
            iccid: esimDetails.iccid,
            smdpAddress: esimDetails.smdpAddress,
            preferredLang: order.preferredLang ?? "zh-TW",
          }).catch((e) => console.warn("[reissueEsim] Email failed:", e));
        }
        await notifyOwner({
          title: `[Reissue] Vizlync eSIM Order #${order.id}`,
          content: `Product: ${order.productId}\nVizlync Order: ${vizlyncResult.orderId}\neSIM reissued successfully.`,
        });
        return { success: true, message: `Vizlync order reissued: ${vizlyncResult.orderId}` };
      }
    }),
  getTgtStatus: adminProcedure
    .input(z.object({ orderId: z.number().int() }))
    .query(async ({ input }) => {
      const order = await adminGetOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.supplier !== "tgt") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not a TGT order" });
      }
      const { queryTgtOrder, queryTgtUsage } = await import("./tgt");
      const channelOrderNo = `SU${order.id}`;
      const orderInfo = await queryTgtOrder(channelOrderNo);
      if (!orderInfo) {
        return { found: false, orderStatus: null, profileStatus: null, activatedStartTime: null, activatedEndTime: null, iccid: null, usage: null, usageSupported: false };
      }
      let usage: { dataTotal?: string; dataUsage?: string; dataResidual?: string } | null = null;
      let usageSupported = false;
      if (orderInfo.orderNo) {
        try {
          usage = await queryTgtUsage(orderInfo.orderNo);
          usageSupported = usage !== null;
        } catch {
          usageSupported = false;
        }
      }
      return {
        found: true,
        orderNo: orderInfo.orderNo,
        orderStatus: orderInfo.orderStatus,
        profileStatus: orderInfo.profileStatus,
        activatedStartTime: orderInfo.activatedStartTime ?? null,
        activatedEndTime: orderInfo.activatedEndTime ?? null,
        iccid: orderInfo.cardInfo?.iccid ?? null,
        usage,
        usageSupported,
      };
    }),
});

// ---- In-app Notifications Router ----
const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return getUserNotifications(ctx.user.id, input.limit);
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await getUnreadNotificationCount(ctx.user.id);
    return { count };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

// ---- IndexNow Router ----
const indexNowRouter = router({
  /**
   * Manually submit all pages to Bing IndexNow (admin only).
   * Useful after publishing new content or making structural changes.
   */
  submitAll: adminProcedure.mutation(async () => {
    const result = await submitAllPages();
    return result;
  }),

  /**
   * Submit specific URLs to IndexNow (admin only).
   */
  submitUrls: adminProcedure
    .input(z.object({ urls: z.array(z.string().url()).min(1).max(100) }))
    .mutation(async ({ input }) => {
      return submitToIndexNow(input.urls);
    }),

  /**
   * Get the list of all pages that will be submitted.
   */
  getPageList: adminProcedure.query(async () => {
    return {
      destinationUrls: DESTINATION_URLS,
      coreUrls: CORE_URLS,
      total: DESTINATION_URLS.length + CORE_URLS.length,
    };
  }),
});

// ---- Analytics Router ----
const analyticsRouter = router({
  recordSearch: publicProcedure
    .input(z.object({
      query: z.string().max(255),
      countryCode: z.string().max(8).optional(),
      resultCount: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      await recordSearchAnalytic(input.query, input.countryCode, input.resultCount);
      return { success: true };
    }),

  topSearches: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return getTopSearches(input.limit);
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  products: productsRouter,
  adminProducts: adminProductsRouter,
  cart: cartRouter,
  orders: ordersRouter,
  checkout: checkoutRouter,
  settings: settingsRouter,
  announcements: announcementsRouter,
  push: pushRouter,
  adminOrders: adminOrdersRouter,
  notifications: notificationsRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  articles: articlesRouter,
  seranking: serankingRouter,
  indexNow: indexNowRouter,
  referral: referralRouter,
});

export type AppRouter = typeof appRouter;
