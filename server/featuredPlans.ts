/**
 * Home page "popular plans": one representative plan per popular destination
 * (e.g. Japan 7 days 5 GB) instead of the cheapest plans overall, which are all 1-day plans.
 */

type PlanRow = {
  countries?: unknown;
  validityDays?: number | null;
  dataAmount?: string | number | null;
  dataUnit?: string | null;
  planType?: string | null;
  name?: string | null;
};

export const DEFAULT_FEATURED_COUNTRIES = ["JP", "KR", "TH", "GB", "US", "AU", "FR", "TW"];

function isDaily(p: PlanRow): boolean {
  const unit = String(p.dataUnit ?? "");
  return p.planType === "daily" || /\/(天|day)/i.test(unit) || /\/(natural\s+)?day|daily/i.test(String(p.name ?? ""));
}

function dataGb(p: PlanRow): number {
  const amount = Number(p.dataAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return /^MB/i.test(String(p.dataUnit ?? "")) ? amount / 1024 : amount;
}

function countryCount(p: PlanRow): number {
  return Array.isArray(p.countries) ? p.countries.length : 0;
}

/**
 * From a destination's plans (cheapest first), pick a typical trip plan:
 * single country, fixed data of 3 GB or more, 5–10 days. Falls back to the cheapest
 * single-country fixed-data plan, then to the cheapest plan.
 */
export function pickFeaturedPlan<T extends PlanRow>(plans: T[]): T | null {
  const single = plans.filter((p) => countryCount(p) === 1 && !isDaily(p));
  const typical = single.find((p) => {
    const days = Number(p.validityDays ?? 0);
    return days >= 5 && days <= 10 && dataGb(p) >= 3;
  });
  return typical ?? single[0] ?? plans[0] ?? null;
}

/** Country codes for the featured list: the admin's popular destinations (ISO codes only). */
export function featuredCountryCodes(setting: string | null | undefined, max = 8): string[] {
  let codes: unknown = null;
  if (setting) {
    try {
      codes = JSON.parse(setting);
    } catch {
      codes = null;
    }
  }
  const list = Array.isArray(codes) ? codes : DEFAULT_FEATURED_COUNTRIES;
  return list.filter((c): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c)).slice(0, max);
}
