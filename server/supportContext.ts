import { ENV } from "./_core/env";
import { encodeProductSlug } from "../shared/productSlug";

/**
 * Facts and live plan data appended to the AI support assistant's instructions,
 * so answers match this shop (real prices, links, how ordering works) instead of
 * generic eSIM advice.
 */

export const WHATSAPP_SUPPORT = "+852 98885159";

type Destination = { code: string; names: string[] };

// Popular destinations: ISO code plus names people type (lower-cased, any language).
const DESTINATIONS: Destination[] = [
  { code: "JP", names: ["japan", "日本", "일본", "ญี่ปุ่น", "tokyo", "東京", "东京", "osaka", "大阪"] },
  { code: "KR", names: ["korea", "south korea", "韓國", "韩国", "韓国", "한국", "เกาหลี", "seoul", "首爾", "首尔"] },
  { code: "TH", names: ["thailand", "泰國", "泰国", "タイ", "태국", "ไทย", "bangkok", "曼谷", "phuket", "普吉"] },
  { code: "TW", names: ["taiwan", "台灣", "台湾", "대만", "ไต้หวัน", "taipei", "台北"] },
  { code: "SG", names: ["singapore", "新加坡", "シンガポール", "싱가포르", "สิงคโปร์"] },
  { code: "MY", names: ["malaysia", "馬來西亞", "马来西亚", "マレーシア", "말레이시아", "มาเลเซีย", "kuala lumpur"] },
  { code: "VN", names: ["vietnam", "越南", "ベトナム", "베트남", "เวียดนาม"] },
  { code: "PH", names: ["philippines", "菲律賓", "菲律宾", "フィリピン", "필리핀", "ฟิลิปปินส์"] },
  { code: "ID", names: ["indonesia", "印尼", "印度尼西亞", "印度尼西亚", "bali", "峇里", "巴厘"] },
  { code: "IN", names: ["india", "印度", "インド", "인도", "อินเดีย"] },
  { code: "CN", names: ["china", "中國", "中国", "中国大陆", "內地", "内地", "mainland"] },
  { code: "HK", names: ["hong kong", "香港", "홍콩", "ฮ่องกง"] },
  { code: "MO", names: ["macau", "macao", "澳門", "澳门"] },
  { code: "US", names: ["usa", "united states", "america", "美國", "美国", "アメリカ", "미국", "สหรัฐ"] },
  { code: "CA", names: ["canada", "加拿大", "カナダ", "캐나다"] },
  { code: "GB", names: ["uk", "united kingdom", "britain", "england", "英國", "英国", "イギリス", "영국", "อังกฤษ", "london", "倫敦", "伦敦"] },
  { code: "FR", names: ["france", "法國", "法国", "フランス", "프랑스", "paris", "巴黎"] },
  { code: "DE", names: ["germany", "德國", "德国", "ドイツ", "독일"] },
  { code: "IT", names: ["italy", "意大利", "意大利", "イタリア", "이탈리아", "rome", "羅馬", "罗马"] },
  { code: "ES", names: ["spain", "西班牙", "スペイン", "스페인"] },
  { code: "AU", names: ["australia", "澳洲", "澳大利亞", "澳大利亚", "オーストラリア", "호주", "sydney", "悉尼"] },
  { code: "NZ", names: ["new zealand", "新西蘭", "新西兰", "ニュージーランド", "뉴질랜드"] },
  { code: "AE", names: ["uae", "dubai", "杜拜", "迪拜", "阿聯酋", "阿联酋", "ドバイ", "두바이"] },
  { code: "TR", names: ["turkey", "türkiye", "土耳其", "トルコ", "터키"] },
];

/** Country codes mentioned in the text (at most two, in order of appearance). */
export function detectDestinations(text: string): string[] {
  const t = text.toLowerCase();
  const found: Array<{ code: string; at: number }> = [];
  for (const d of DESTINATIONS) {
    const hits = d.names.map(n => t.indexOf(n.toLowerCase())).filter(i => i >= 0);
    if (hits.length > 0) found.push({ code: d.code, at: Math.min(...hits) });
  }
  return found.sort((a, b) => a.at - b.at).slice(0, 2).map(f => f.code);
}

export function buildSiteFacts(baseUrl: string): string {
  return `SHOP FACTS (the only source for policies and how things work; do not invent others):
- SIM uncle sells prepaid travel eSIM data plans for 200+ countries and regions at ${baseUrl}. The site is available in Traditional Chinese, Simplified Chinese, English, Japanese, Korean and Thai, and shows prices in several currencies. Checkout is charged in Hong Kong dollars (HKD) through Stripe.
- Ordering: pick a plan on ${baseUrl}/products (search by country, filter by data size, validity and daily plans), then Buy Now or add to cart. Guests can check out without an account; signing in lets customers see all orders and usage.
- Delivery: after payment the eSIM (QR code, LPA string, installation steps) is emailed and also shown under My Orders at ${baseUrl}/orders. Delivery is normally within a few minutes; some plans can take a little longer.
- Guests without an account can look up an order at ${baseUrl}/track-order with the email used at checkout and the order number.
- Installation guide for iPhone and Android: ${baseUrl}/how-to-install. The phone must support eSIM and be carrier-unlocked. Install the eSIM while on Wi-Fi.
- Plans are data-only unless the plan page says otherwise. Many plans start their validity when first used or activated; the plan page states the exact rule.
- Usage and remaining data can be checked under My Orders. Some plans can be topped up with extra data: they show a "Top-up available" badge, and ${baseUrl}/products?topup=1 lists only those.
- The home page may advertise a new-customer discount code; refer customers to the banner for the current offer.
- Referral programme at ${baseUrl}/referral (members get a code and commission).
- Human support on WhatsApp, 24/7: ${WHATSAPP_SUPPORT}.

RULES: Use only these facts and the plan list below for prices, plans, links and policies. For anything not covered (refunds, a specific phone model, the status of a particular order, complaints), do not guess: say you are not sure and give the WhatsApp number. Never invent plans, prices, coupon codes or policies. When useful, include a link as a markdown link. Reply in the language of the customer's message.`;
}

export type ContextDeps = {
  getProducts: (p: { countries: string[]; limit: number; sortBy: string }) => Promise<{ products: Array<Record<string, unknown>> }>;
  getSetting: (key: string) => Promise<string | null>;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function planLine(p: Record<string, unknown>, baseUrl: string, markupPct: number, hkdRate: number): string {
  const cost = num(p.price);
  const withMarkup = markupPct > 0 ? cost * (1 + markupPct / 100) : cost;
  const hkd = Math.round(withMarkup * hkdRate);
  const data = p.dataAmount != null && p.dataAmount !== "" ? `${p.dataAmount} ${p.dataUnit ?? "GB"}`.trim() : "see plan page";
  const days = p.validityDays ? `${p.validityDays} day(s)` : "see plan page";
  const topUp = p.topUpAvailable ? " | top-up available" : "";
  return `- ${String(p.name ?? "").slice(0, 110)} | data: ${data} | validity: ${days} | HK$${hkd}${topUp} | ${baseUrl}/products/${encodeProductSlug(String(p.productId))}`;
}

/** Facts plus, when the customer names a destination, that destination's cheapest live plans. */
export async function buildSupportContext(lastUserText: string, deps: ContextDeps): Promise<string> {
  const baseUrl = (ENV.publicUrl || "https://simuncle.com").replace(/\/+$/, "");
  let out = buildSiteFacts(baseUrl);

  const codes = detectDestinations(lastUserText);
  if (codes.length === 0) return out;

  const [markupSetting, rateSetting] = await Promise.all([deps.getSetting("markup_percentage"), deps.getSetting("hkd_rate")]);
  const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
  const hkdRate = rateSetting ? parseFloat(rateSetting) : 7.8;

  for (const code of codes) {
    const { products } = await deps.getProducts({ countries: [code], limit: 8, sortBy: "price_asc" });
    const plans = products.filter(p => !/topup/i.test(String(p.name ?? ""))).slice(0, 5);
    if (plans.length === 0) continue;
    out += `\n\nCURRENT CHEAPEST PLANS FOR ${code} (live prices in HKD; link to the plan page when recommending):\n${plans
      .map(p => planLine(p, baseUrl, markupPct, hkdRate))
      .join("\n")}\nMore plans: ${baseUrl}/products?countries=${code}`;
  }
  return out;
}
