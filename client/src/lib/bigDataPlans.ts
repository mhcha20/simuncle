/** Plans with lots of data (50GB+), for the "big data" rows on the home and destination pages. */
export const BIG_DATA_MIN_GB = 50;

type Plan = Record<string, unknown>;

/** byRegion: one plan per region (home page); otherwise one per coverage area. */
export function pickBigDataPlans<T extends Plan>(products: T[], count: number, opts: { byRegion?: boolean } = {}): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const p of products) {
    const gb = parseFloat(String(p.dataAmount ?? ""));
    const name = String(p.name ?? "");
    const unit = String(p.dataUnit ?? "").toLowerCase();
    if (!(gb >= BIG_DATA_MIN_GB)) continue;
    // Name says less than the data field (e.g. "Global 18GB" listed as 200GB): unclear, leave it out
    const named = name.match(/(\d+(?:\.\d+)?)\s*GB/i);
    if (named && parseFloat(named[1]) < gb * 0.9) continue;
    if (/^\s*top\s*-?\s*up\b/i.test(name) || p.isTopUp === true) continue;
    if (unit.includes("/day") || unit.includes("/天")) continue;
    // One plan per coverage area, so the row is not two near-identical UK plans
    const ids = Array.isArray(p.countries) ? (p.countries as { id?: string }[]).map((c) => String(c?.id ?? "")).sort().join(",") : "";
    const countryCount = Array.isArray(p.countries) ? p.countries.length : 0;
    const region = countryCount >= 60 ? "global" : Array.isArray(p.region) && p.region.length > 0 ? String(p.region[0]) : "";
    const key = opts.byRegion && region ? `region:${regionGroup(region)}` : ids || name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(p);
    if (picked.length >= count) break;
  }
  return picked;
}

function regionGroup(region: string): string {
  if (/asia|oceania/i.test(region)) return "asia";
  if (/america|caribbean/i.test(region)) return "americas";
  if (/global|world/i.test(region)) return "global";
  return region.toLowerCase();
}

export const BIG_DATA_TITLE: Record<string, string> = {
  "zh-TW": "大數據之選",
  "zh-CN": "大流量之选",
  en: "Big data plans",
  ja: "大容量プラン",
  ko: "대용량 요금제",
  th: "แพ็กเน็ตจุใจ",
};

export const BIG_DATA_SUBTITLE: Record<string, string> = {
  "zh-TW": "50GB 或以上，長旅程、工作或分享熱點都夠用",
  "zh-CN": "50GB 或以上，长途旅行、工作或开热点都够用",
  en: "50GB or more: plenty for long trips, work and sharing a hotspot",
  ja: "50GB以上。長期旅行・仕事・テザリングにも十分",
  ko: "50GB 이상, 장기 여행·업무·핫스팟 공유에 충분",
  th: "50GB ขึ้นไป พอสำหรับทริปยาว งาน และแชร์ฮอตสปอต",
};
