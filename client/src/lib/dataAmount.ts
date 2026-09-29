// Helpers for displaying an eSIM plan's data volume in order cards.
//
// Problem: many orders have `productData.dataAmount = null` while `dataUnit`
// defaults to "GB", which naively renders as a misleading "0GB". The real
// volume is encoded in the plan name (e.g. "Greater China-daily 500MB",
// "China ...-SGIP-500MB/day", "...-fixed 20GB (3 days)").
//
// `formatDataAmount` returns a clean display string (e.g. "500MB", "20GB"),
// or `null` when no reliable volume can be determined — in which case the UI
// should omit the data-volume segment entirely rather than show "0GB".

interface DataSource {
  dataAmount?: unknown;
  dataUnit?: unknown;
}

/**
 * Try to extract a human-readable data volume.
 * 1. Prefer structured fields (dataAmount + dataUnit) when dataAmount is a
 *    positive number.
 * 2. Otherwise parse the plan name for a token like "500MB" / "20GB" / "1.5GB".
 *    "Unlimited / 無限" daily plans usually still carry a daily cap (e.g.
 *    "500MB/day"), which is the most meaningful number to show.
 * 3. Return null when nothing reliable is found.
 */
export function formatDataAmount(
  source: DataSource | null | undefined,
  planName?: string | null,
): string | null {
  const rawAmount = source?.dataAmount;
  const amount =
    rawAmount === null || rawAmount === undefined || rawAmount === ""
      ? NaN
      : parseFloat(String(rawAmount));
  const unit = String(source?.dataUnit ?? "GB").toUpperCase();

  if (Number.isFinite(amount) && amount > 0) {
    // Normalise unit casing (GB/MB/TB) but keep the value as-is.
    const cleanUnit = ["GB", "MB", "TB"].includes(unit) ? unit : "GB";
    // Drop trailing ".0" for whole numbers.
    const valueStr = Number.isInteger(amount) ? String(amount) : String(amount);
    return `${valueStr}${cleanUnit}`;
  }

  // Fallback: parse the plan name. Match e.g. 5GB, 20 GB, 500MB, 1.5GB, 1TB,
  // but avoid network tokens like "4G/5G" (those have no B suffix).
  if (planName) {
    const re = /(\d+(?:\.\d+)?)\s*(GB|MB|TB)\b/gi;
    let match: RegExpExecArray | null;
    let best: { value: number; unit: string } | null = null;
    while ((match = re.exec(planName)) !== null) {
      const value = parseFloat(match[1]);
      const u = match[2].toUpperCase();
      if (!Number.isFinite(value)) continue;
      // Convert to MB for comparison so we can pick the largest token,
      // which is the plan's headline allowance (vs. a kbps speed note).
      const mb = u === "TB" ? value * 1024 * 1024 : u === "GB" ? value * 1024 : value;
      if (!best || mb > (best.unit === "TB" ? best.value * 1024 * 1024 : best.unit === "GB" ? best.value * 1024 : best.value)) {
        best = { value, unit: u };
      }
    }
    if (best) {
      const valueStr = Number.isInteger(best.value) ? String(best.value) : String(best.value);
      return `${valueStr}${best.unit}`;
    }
  }

  return null;
}
