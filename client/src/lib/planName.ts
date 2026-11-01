import type { Language } from "@/contexts/LanguageContext";
import { translateCountry } from "./countryNames";

/**
 * Short, readable plan names built from the plan's own data, e.g.
 *   "日本 7天 5GB", "香港、澳門 1天 每日500MB", "歐洲 33國 7天 50GB".
 * Supplier names mix languages and carry codes ("(Valid for 60 days)(ai1)", "-eSIM Carrier of 90 days"),
 * so the card and page titles use this instead. Returns null when the data amount cannot be worked out,
 * so callers fall back to the translated supplier name.
 */

type PlanLike = {
  name?: unknown;
  countries?: unknown;
  validityDays?: unknown;
  dataAmount?: unknown;
  dataUnit?: unknown;
  planType?: unknown;
};

type Words = {
  days: (n: number) => string;
  daily: (amount: string) => string;
  dailyUnlimited: string;
  unlimited: string;
  countries: (prefix: string, n: number) => string;
  multi: string;
  join: string;
  topUp: string;
};

const WORDS: Record<Language, Words> = {
  "zh-TW": { days: (n) => `${n}天`, daily: (a) => `每日${a}`, dailyUnlimited: "每日無限", unlimited: "無限數據", countries: (p, n) => `${p} ${n}國`, multi: "多國", join: "、", topUp: "加值包" },
  "zh-CN": { days: (n) => `${n}天`, daily: (a) => `每日${a}`, dailyUnlimited: "每日无限", unlimited: "无限流量", countries: (p, n) => `${p} ${n}国`, multi: "多国", join: "、", topUp: "加油包" },
  en: { days: (n) => `${n} ${n === 1 ? "day" : "days"}`, daily: (a) => `${a}/day`, dailyUnlimited: "Unlimited/day", unlimited: "Unlimited", countries: (p, n) => `${p} ${n} countries`, multi: "Multi-country", join: " & ", topUp: "Top-up" },
  ja: { days: (n) => `${n}日間`, daily: (a) => `毎日${a}`, dailyUnlimited: "毎日無制限", unlimited: "無制限", countries: (p, n) => `${p}${n}カ国`, multi: "複数国", join: "・", topUp: "チャージ" },
  ko: { days: (n) => `${n}일`, daily: (a) => `매일 ${a}`, dailyUnlimited: "매일 무제한", unlimited: "무제한", countries: (p, n) => `${p} ${n}개국`, multi: "다국가", join: " & ", topUp: "충전" },
  th: { days: (n) => `${n} วัน`, daily: (a) => `${a}/วัน`, dailyUnlimited: "ไม่จำกัด/วัน", unlimited: "ไม่จำกัด", countries: (p, n) => `${p} ${n} ประเทศ`, multi: "หลายประเทศ", join: " & ", topUp: "เติมเงิน" },
};

// Region keywords found in multi-country supplier names, most specific first.
const REGIONS: Array<[RegExp, Record<Language, string>, boolean?]> = [
  [/greater\s+china/i, { "zh-TW": "大中華", "zh-CN": "大中华", en: "Greater China", ja: "大中華圏", ko: "중화권", th: "จีนแผ่นดินใหญ่และภูมิภาค" }, true],
  [/south\s*east\s+asia/i, { "zh-TW": "東南亞", "zh-CN": "东南亚", en: "Southeast Asia", ja: "東南アジア", ko: "동남아", th: "เอเชียตะวันออกเฉียงใต้" }],
  [/central\s+asia/i, { "zh-TW": "中亞", "zh-CN": "中亚", en: "Central Asia", ja: "中央アジア", ko: "중앙아시아", th: "เอเชียกลาง" }],
  [/north\s+america/i, { "zh-TW": "北美", "zh-CN": "北美", en: "North America", ja: "北米", ko: "북미", th: "อเมริกาเหนือ" }],
  [/south\s+america|latin\s+america/i, { "zh-TW": "南美", "zh-CN": "南美", en: "South America", ja: "南米", ko: "남미", th: "อเมริกาใต้" }],
  [/middle\s+east/i, { "zh-TW": "中東", "zh-CN": "中东", en: "Middle East", ja: "中東", ko: "중동", th: "ตะวันออกกลาง" }],
  [/europe/i, { "zh-TW": "歐洲", "zh-CN": "欧洲", en: "Europe", ja: "ヨーロッパ", ko: "유럽", th: "ยุโรป" }],
  [/asia/i, { "zh-TW": "亞洲", "zh-CN": "亚洲", en: "Asia", ja: "アジア", ko: "아시아", th: "เอเชีย" }],
  [/africa/i, { "zh-TW": "非洲", "zh-CN": "非洲", en: "Africa", ja: "アフリカ", ko: "아프리카", th: "แอฟริกา" }],
  [/oceania/i, { "zh-TW": "大洋洲", "zh-CN": "大洋洲", en: "Oceania", ja: "オセアニア", ko: "오세아니아", th: "โอเชียเนีย" }],
  [/caribbean/i, { "zh-TW": "加勒比", "zh-CN": "加勒比", en: "Caribbean", ja: "カリブ", ko: "카리브", th: "แคริบเบียน" }],
  [/global|world/i, { "zh-TW": "全球", "zh-CN": "全球", en: "Global", ja: "グローバル", ko: "글로벌", th: "ทั่วโลก" }],
];

const AMOUNT = String.raw`(\d+(?:\.\d+)?)\s*(GB|MB|TB)`;
const DAILY_RE = new RegExp(`${AMOUNT}\\s*(?:high\\s*speed\\s*)?\\/\\s*(?:natural\\s+)?day|daily\\s+${AMOUNT}`, "i");
const FIXED_RE = new RegExp(`${AMOUNT}(?!\\s*(?:high\\s*speed\\s*)?\\/\\s*(?:natural\\s+)?day)`, "i");

function amountLabel(value: number | string, unit: string): string {
  const n = Number(value);
  return `${Number.isFinite(n) ? String(+n.toFixed(2)) : value}${unit.toUpperCase()}`;
}

function destination(name: string, countries: Array<{ id: string; name: string }>, lang: Language, w: Words): string | null {
  if (countries.length === 0) return null;
  if (countries.length <= 3) return countries.map((c) => translateCountry(c, lang)).join(w.join);
  for (const [re, label, noCount] of REGIONS) {
    if (re.test(name)) return noCount ? label[lang] : w.countries(label[lang], countries.length);
  }
  return w.countries(w.multi, countries.length).replace(/\s+/g, " ");
}

function dataPart(p: PlanLike, name: string, w: Words): string | null {
  const unit = String(p.dataUnit ?? "GB");
  const field = Number(p.dataAmount);
  if (Number.isFinite(field) && field < 0) return w.unlimited;
  const isDaily = p.planType === "daily" || /\/\s*(天|day)/i.test(unit) || DAILY_RE.test(name) || /unlimited\s*\/\s*day/i.test(name);
  if (isDaily) {
    if (/unlimited\s*\/\s*day/i.test(name)) return w.dailyUnlimited;
    const m = DAILY_RE.exec(name);
    if (m) return w.daily(amountLabel(m[1] ?? m[3], m[2] ?? m[4]));
    if (Number.isFinite(field) && field > 0) return w.daily(amountLabel(field, unit.replace(/\/.*$/, "")));
    return null;
  }
  const m = FIXED_RE.exec(name);
  if (m) return amountLabel(m[1], m[2]);
  if (Number.isFinite(field) && field > 0) return amountLabel(field, unit);
  return null;
}

export function shortPlanName(p: PlanLike | null | undefined, lang: Language): string | null {
  if (!p) return null;
  const w = WORDS[lang] ?? WORDS["zh-TW"];
  const name = String(p.name ?? "");
  const countries = Array.isArray(p.countries) ? (p.countries as Array<{ id: string; name: string }>) : [];
  const dest = destination(name, countries, lang, w);
  const data = dataPart(p, name, w);
  const days = Number(p.validityDays);
  if (!dest || !data || !Number.isFinite(days) || days <= 0) return null;
  const prefix = /^\s*top\s*-?\s*up\b/i.test(name) ? `${w.topUp} ` : "";
  return `${prefix}${dest} ${w.days(days)} ${data}`;
}

/** Fixed data amount written in a plan name ("Italy-fixed 5GB (7 Days)" -> "5GB"), ignoring per-day amounts. */
export function dataFromName(name: unknown): string | null {
  const m = FIXED_RE.exec(String(name ?? ""));
  return m ? amountLabel(m[1], m[2]) : null;
}

/** "Unlimited/day" plans (no fixed amount): the localised "unlimited per day" label, else null. */
export function unlimitedDailyFromName(name: unknown, lang: Language): string | null {
  return /unlimited\s*\/\s*day/i.test(String(name ?? "")) ? (WORDS[lang] ?? WORDS["zh-TW"]).dailyUnlimited : null;
}
