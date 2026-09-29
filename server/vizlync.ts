import axios from "axios";

const VIZLYNC_BASE = "https://api.vizlync.net/api/v1";

function getHeaders() {
  const apiKey = process.env.VIZLYNC_API_KEY;
  const partnerId = process.env.VIZLYNC_PARTNER_ID;
  if (!apiKey || !partnerId) {
    throw new Error("Vizlync API credentials not configured");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Partner-ID": partnerId,
    "Content-Type": "application/json",
  };
}

// Combine a parent eSIM order's usage with the usage of its completed top-up
// orders. Vizlync tracks each top-up as a separate order (same ICCID) and does
// NOT aggregate the data into the parent's dataAllowance/dataUsage, so we sum
// them here to present a single combined balance to the customer.
export interface UsageLike {
  dataAllowance?: unknown;
  dataUsage?: unknown;
  [key: string]: unknown;
}

export interface BreakdownCard {
  label: string; // "__main__" for main card, or topup product name
  dataAllowance: number;
  dataUsage: number;
  status?: string;
  expiryDate?: string | null;
  vizlyncOrderId?: string | null; // Vizlync order ID for this card
  topupOrderId?: number | null; // Our system's topup order ID
}

export function combineUsage(
  base: UsageLike,
  topupUsages: UsageLike[],
  topupLabels?: string[],
  topupVizlyncIds?: string[],
  topupOrderIds?: number[]
) {
  const baseAllowance = Number(base?.dataAllowance ?? 0);
  const baseUsage = Number(base?.dataUsage ?? 0);
  let addonAllowance = 0;
  let addonUsage = 0;
  const breakdown: BreakdownCard[] = [];

  // Main card entry — always include so the breakdown shows the main card
  // alongside any top-ups, even when Vizlync returns no usage data for it
  // (e.g. day-pass plans). The front-end shows "暫無用量數據" when allowance is 0.
  const mainHasData = baseAllowance > 0;
  breakdown.push({
    label: "__main__",
    dataAllowance: baseAllowance,
    dataUsage: baseUsage,
    status: String(base?.status ?? ""),
    expiryDate: base?.expiryDate != null ? String(base.expiryDate) : null,
    vizlyncOrderId: null,
  });

  for (let i = 0; i < topupUsages.length; i++) {
    const u = topupUsages[i];
    if (!u) continue;
    const allow = Number(u.dataAllowance ?? 0);
    const used = Number(u.dataUsage ?? 0);
    if (Number.isFinite(allow) && allow > 0) addonAllowance += allow;
    if (Number.isFinite(used) && used > 0) addonUsage += used;
    breakdown.push({
      label: topupLabels?.[i] ?? `Add-on ${i + 1}`,
      dataAllowance: allow,
      dataUsage: used,
      status: String(u?.status ?? ""),
      expiryDate: u?.expiryDate != null ? String(u.expiryDate) : null,
      vizlyncOrderId: topupVizlyncIds?.[i] ?? null,
      topupOrderId: topupOrderIds?.[i] ?? null,
    });
  }

  return {
    ...base,
    dataAllowance: (Number.isFinite(baseAllowance) ? baseAllowance : 0) + addonAllowance,
    dataUsage: (Number.isFinite(baseUsage) ? baseUsage : 0) + addonUsage,
    topupCount: topupUsages.length,
    addonAllowance,
    addonUsage,
    // Whether the main card itself returned usable usage data.
    mainHasData,
    // Include breakdown whenever there are multiple cards (main + at least one
    // top-up) so each card can be shown with its own allowance/usage/status.
    breakdown: breakdown.length > 1 ? breakdown : null,
    // When the main card has no data but top-ups do, surface the best top-up
    // status as the top-level status so the widget shows something meaningful.
    status: !mainHasData && addonAllowance > 0
      ? String(topupUsages.find((u) => Number(u?.dataAllowance ?? 0) > 0)?.status ?? base?.status ?? "")
      : base?.status,
  };
}

export interface VizlyncProduct {
  productId: string;
  name: string;
  description: string;
  planInfo: string;
  price: number;
  validityDays: number;
  countries: { id: string; name: string }[];
  region: string[];
  dataAmount: number;
  dataUnit: string;
  isDailyPlan: boolean; // true when dataAmount is per-day (parsed from name)
  voiceMin: number | null;
  sms: number | null;
  speed: string;
  planType: string;
  category: string;
  networkName: string;
  networkType: string;
  isVoiceAvailable: boolean;
  isSmsAvailable: boolean;
  hotspotAvailable: boolean;
  topUpAvailable: boolean;
  profile: string;
  activationPolicy: string;
  startDateEnabled: boolean;
}

// In-memory cache: refresh every 30 minutes
let productCache: VizlyncProduct[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let fetchPromise: Promise<VizlyncProduct[]> | null = null;

export async function fetchAllProducts(): Promise<{ products: VizlyncProduct[]; total: number }> {
  const now = Date.now();

  // Return cached data if still fresh
  if (productCache && now - cacheTimestamp < CACHE_TTL) {
    return { products: productCache, total: productCache.length };
  }

  // Deduplicate concurrent fetches
  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const response = await axios.get(`${VIZLYNC_BASE}/products`, {
          headers: getHeaders(),
          timeout: 120000, // 2 minutes for large payload
        });
        const data = response.data.data;
        // Data sanitisation layer: normalise all numeric fields to proper JS numbers
        // regardless of whether Vizlync returns them as strings or numbers.
        const rawProducts: unknown[] = data.products ?? [];
        const products: VizlyncProduct[] = rawProducts.map((p: unknown) => {
          const r = p as Record<string, unknown>;
          // Resolve dataAmount: prefer structured field, fall back to parsing the name
          // for daily-quota plans (e.g. "500MB/day", "1GB/day").
          let resolvedDataAmount: number;
          let resolvedDataUnit: string;
          let isDailyPlan = false;
          if (r.dataAmount != null && Number(r.dataAmount) > 0) {
            resolvedDataAmount = Number(r.dataAmount);
            resolvedDataUnit = String(r.dataUnit ?? "GB");
          } else {
            // Try to parse daily quota from name:
            // Formats: "500MB/day", "500MB/Natural day", "daily 500MB"
            const name = String(r.name ?? "");
            const dailyRe = /(?:([\d.]+)\s*(GB|MB|TB)\/(?:Natural\s+)?day|daily\s+([\d.]+)\s*(GB|MB|TB))/i;
            const dailyMatch = dailyRe.exec(name);
            if (dailyMatch) {
              const amt = dailyMatch[1] ?? dailyMatch[3];
              const unit = (dailyMatch[2] ?? dailyMatch[4]).toUpperCase();
              resolvedDataAmount = parseFloat(amt);
              resolvedDataUnit = unit;
              isDailyPlan = true;
            } else {
              resolvedDataAmount = 0;
              resolvedDataUnit = String(r.dataUnit ?? "GB");
            }
          }
          return {
            ...r,
            price: Number(r.price ?? 0),
            dataAmount: resolvedDataAmount,
            dataUnit: resolvedDataUnit,
            isDailyPlan,
            validityDays: Number(r.validityDays ?? 0),
            voiceMin: r.voiceMin != null ? Number(r.voiceMin) : null,
            sms: r.sms != null ? Number(r.sms) : null,
          } as VizlyncProduct;
        });
        productCache = products;
        cacheTimestamp = Date.now();
        return products;
      } finally {
        fetchPromise = null;
      }
    })();
  }

  const products = await fetchPromise;
  return { products, total: products.length };
}

export function getProductsFromCache(): VizlyncProduct[] {
  return productCache ?? [];
}

export async function createVizlyncOrder(
  productId: string,
  startDate?: string
): Promise<{ orderId: string; qrCodeUrl?: string; activationCode?: string; lpaString?: string; iccid?: string; smdpAddress?: string }> {
  const body: Record<string, unknown> = { productId };
  if (startDate) body.startDate = startDate;
  const response = await axios.post(`${VIZLYNC_BASE}/order`, body, {
    headers: getHeaders(),
    timeout: 30000,
  });
  return response.data.data ?? response.data;
}

export async function getVizlyncOrder(orderId: string) {
  const response = await axios.get(`${VIZLYNC_BASE}/order/${orderId}`, {
    headers: getHeaders(),
    timeout: 30000,
  });
  return response.data.data ?? response.data;
}

export async function getVizlyncUsage(orderId: string) {
  const response = await axios.get(`${VIZLYNC_BASE}/usage/${orderId}`, {
    headers: getHeaders(),
    timeout: 30000,
  });
  return response.data.data ?? response.data;
}

export async function terminateVizlyncOrder(orderId: string) {
  console.log(`[Vizlync][Terminate] Sending request for orderId=${orderId}`);
  try {
    const response = await axios.post(`${VIZLYNC_BASE}/order/${orderId}/terminate-plan`, {}, {
      headers: getHeaders(),
      timeout: 30000,
    });
    console.log(`[Vizlync][Terminate] SUCCESS status=${response.status} body=${JSON.stringify(response.data)}`);
    return response.data.data ?? response.data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: unknown; headers?: unknown }; message?: string; code?: string };
    if (axiosErr?.response) {
      console.error(`[Vizlync][Terminate] ERROR status=${axiosErr.response.status} body=${JSON.stringify(axiosErr.response.data)}`);
    } else {
      console.error(`[Vizlync][Terminate] NETWORK ERROR code=${axiosErr?.code} message=${axiosErr?.message}`);
    }
    throw err;
  }
}

export async function getTopupPlans(orderId: string) {
  const response = await axios.get(`${VIZLYNC_BASE}/order/${orderId}/topup-plans`, {
    headers: getHeaders(),
    timeout: 30000,
  });
  return response.data.data ?? response.data;
}

// Shape of a single top-up plan we care about (Vizlync returns more fields).
export interface VizlyncTopupPlan {
  productId: string;
  name: string;
  price: number;
  validityDays?: number | null;
  dataAmount?: string | number | null;
  dataUnit?: string | null;
  planType?: string | null;
}

// Vizlync's topup-plans response is { originalOrder, topupPlans: [...] } but the
// shape has varied historically. Defensively extract the plan array from any of
// the known shapes and always return a clean array (never throws on bad input).
export function extractTopupPlans(raw: unknown): VizlyncTopupPlan[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as VizlyncTopupPlan[];
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidate =
      (Array.isArray(obj.topupPlans) && obj.topupPlans) ||
      (Array.isArray(obj.plans) && obj.plans) ||
      (obj.data && Array.isArray((obj.data as Record<string, unknown>).topupPlans) && (obj.data as Record<string, unknown>).topupPlans) ||
      null;
    if (Array.isArray(candidate)) return candidate as VizlyncTopupPlan[];
  }
  return [];
}

// Apply markup + HKD conversion consistently with the rest of the catalog.
export function computeTopupPriceHkd(rawPrice: unknown, markupPct: number, hkdRate: number): number {
  const cost = Number(rawPrice ?? 0);
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  const withMarkup = markupPct > 0 ? cost * (1 + markupPct / 100) : cost;
  return Math.round(withMarkup * hkdRate);
}

// Parse the data volume (in GB) from a top-up plan. Vizlync encodes the volume
// either in structured fields (dataAmount/dataUnit) or only inside the name
// (e.g. "Greater China-fixed 5GB (3 days)", "... 500MB/day"). Returns GB as a
// number, or null when it cannot be determined.
export function parsePlanDataGb(plan: VizlyncTopupPlan): number | null {
  // 1) Prefer structured fields when present and numeric.
  const amt = Number(plan.dataAmount ?? NaN);
  if (Number.isFinite(amt) && amt > 0) {
    const unit = String(plan.dataUnit ?? "GB").toUpperCase();
    if (unit.startsWith("M")) return amt / 1024;
    if (unit.startsWith("T")) return amt * 1024;
    return amt; // GB (default)
  }
  // 2) Fall back to parsing the name. Pick the LAST volume-looking token to
  //    avoid matching things like "4G/5G". Match e.g. 5GB, 20 GB, 500MB, 1.5GB.
  const name = String(plan.name ?? "");
  const re = /(\d+(?:\.\d+)?)\s*(GB|MB|TB)\b/gi;
  let match: RegExpExecArray | null;
  let last: { value: number; unit: string } | null = null;
  while ((match = re.exec(name)) !== null) {
    last = { value: parseFloat(match[1]), unit: match[2].toUpperCase() };
  }
  if (last && Number.isFinite(last.value) && last.value > 0) {
    if (last.unit === "MB") return last.value / 1024;
    if (last.unit === "TB") return last.value * 1024;
    return last.value;
  }
  return null;
}

// Parse the validity (in days) of a top-up plan. Vizlync encodes this either in
// the structured `validityDays` field or only inside the name (e.g.
// "Greater China-fixed 5GB (3 days)", "... 30 天", "Monthly"). Returns the number
// of days, or null when it cannot be determined.
export function parsePlanValidityDays(plan: VizlyncTopupPlan): number | null {
  // 1) Prefer the structured field when present and positive.
  const v = Number(plan.validityDays ?? NaN);
  if (Number.isFinite(v) && v > 0) return v;

  const name = String(plan.name ?? "");
  // 2) Match "N day(s)" / "N 天" / "N 日" patterns (take the LAST match).
  //    English uses a word boundary; Chinese day units (天/日) do not rely on
  //    \b because word boundaries are unreliable around CJK characters.
  let last: number | null = null;
  const reEn = /(\d+)\s*days?\b/gi;
  const reCjk = /(\d+)\s*[\u5929\u65e5]/g;
  for (const re of [reEn, reCjk]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(name)) !== null) {
      const n = parseInt(match[1], 10);
      if (Number.isFinite(n) && n > 0) last = n;
    }
  }
  if (last !== null) return last;
  // 3) Word-based hints.
  if (/monthly|\u6708\u8cbb|\u4e00\u500b\u6708|\u6bcf\u6708/i.test(name)) return 30;
  if (/weekly|\u9031\u8cbb|\u4e00\u9031|\u6bcf\u9031/i.test(name)) return 7;
  if (/daily|\u65e5\u8cbb|\u6bcf\u65e5|\/day/i.test(name)) return 1;
  return null;
}

// Reduce a long list of top-up plans down to a few representative ones so the UI
// stays simple. We pick across BOTH dimensions:
//   - data volume (GB): low / high tiers (cheapest plan per volume)
//   - validity (days): guarantee a long-validity option (e.g. monthly / 30 days)
//     so users are not limited to only short 1-3 day plans.
// Plans whose volume cannot be parsed are only used as a fallback.
export function selectMainTopupPlans<T extends VizlyncTopupPlan>(plans: T[], count = 4): T[] {
  if (!Array.isArray(plans) || plans.length === 0) return [];
  if (plans.length <= count) return plans;

  // Cheapest plan per data volume (GB), keyed by a rounded GB number.
  const cheapestByGb = new Map<number, T>();
  const unparsed: T[] = [];
  for (const p of plans) {
    const gb = parsePlanDataGb(p);
    if (gb === null) {
      unparsed.push(p);
      continue;
    }
    const key = Math.round(gb * 1024) / 1024; // normalize
    const existing = cheapestByGb.get(key);
    if (!existing || Number(p.price ?? Infinity) < Number(existing.price ?? Infinity)) {
      cheapestByGb.set(key, p);
    }
  }

  const volumes = Array.from(cheapestByGb.keys()).sort((a, b) => a - b);
  if (volumes.length === 0) {
    // No parseable volumes — fall back to the cheapest few overall.
    return [...unparsed]
      .sort((a, b) => Number(a.price ?? Infinity) - Number(b.price ?? Infinity))
      .slice(0, count);
  }

  const selected: T[] = [];
  const pushUnique = (p: T | undefined) => {
    if (p && !selected.some((s) => s.productId === p.productId)) selected.push(p);
  };

  // 1) Reserve the LAST slot for the longest-validity plan available, so users
  //    always get a longer-term option (e.g. monthly / 30 days) in addition to
  //    short-term ones. Pick the longest validity; tie-break by cheapest price.
  let longest: { plan: T; days: number } | null = null;
  for (const p of plans) {
    const days = parsePlanValidityDays(p);
    if (days === null) continue;
    if (
      !longest ||
      days > longest.days ||
      (days === longest.days && Number(p.price ?? Infinity) < Number(longest.plan.price ?? Infinity))
    ) {
      longest = { plan: p, days };
    }
  }

  // 2) Fill the remaining slots with volume tiers spread from low to high.
  const volumeSlots = longest ? Math.max(1, count - 1) : count;
  const pickedVolumes: number[] = [];
  if (volumes.length <= volumeSlots) {
    pickedVolumes.push(...volumes);
  } else if (volumeSlots <= 1) {
    pickedVolumes.push(volumes[0]);
  } else {
    for (let i = 0; i < volumeSlots; i++) {
      const idx = Math.round((i * (volumes.length - 1)) / (volumeSlots - 1));
      if (!pickedVolumes.includes(volumes[idx])) pickedVolumes.push(volumes[idx]);
    }
  }
  for (const v of pickedVolumes) pushUnique(cheapestByGb.get(v));

  // 3) Add a dedicated "least data but longest validity" plan. Among all plans,
  //    prefer the longest validity; tie-break by the SMALLEST data volume, then
  //    cheapest price. This is the long-term/low-data option to display last.
  let longLowData: { plan: T; days: number; gb: number } | null = null;
  for (const p of plans) {
    const days = parsePlanValidityDays(p);
    if (days === null) continue;
    const gb = parsePlanDataGb(p) ?? Infinity;
    if (
      !longLowData ||
      days > longLowData.days ||
      (days === longLowData.days && gb < longLowData.gb) ||
      (days === longLowData.days && gb === longLowData.gb && Number(p.price ?? Infinity) < Number(longLowData.plan.price ?? Infinity))
    ) {
      longLowData = { plan: p, days, gb };
    }
  }
  const tailPlan = longLowData?.plan ?? longest?.plan;

  // If adding the tail plan would exceed `count`, drop the current highest
  //    volume tier to make room, ensuring the tail option is always present.
  if (tailPlan) {
    if (selected.length >= count && !selected.some((s) => s.productId === tailPlan.productId)) {
      selected.pop();
    }
    pushUnique(tailPlan);
  }

  // Order all but the tail by data volume ascending for a stable low→high
  // display, then force the "least data but longest validity" plan to the END.
  const final = selected.slice(0, count);
  if (tailPlan && final.some((s) => s.productId === tailPlan.productId)) {
    const head = final.filter((s) => s.productId !== tailPlan.productId);
    head.sort((a, b) => (parsePlanDataGb(a) ?? Infinity) - (parsePlanDataGb(b) ?? Infinity));
    const tail = final.find((s) => s.productId === tailPlan.productId)!;
    return [...head, tail];
  }
  return final.sort((a, b) => (parsePlanDataGb(a) ?? Infinity) - (parsePlanDataGb(b) ?? Infinity));
}

export async function createTopupOrder(orderId: string, productId: string) {
  const response = await axios.post(
    `${VIZLYNC_BASE}/order/${orderId}/topup`,
    { productId },
    { headers: getHeaders(), timeout: 30000 }
  );
  return response.data.data ?? response.data;
}
