import { trpc } from "@/lib/trpc";
import { useCurrencyContext, CurrencyConfig, CURRENCY_MAP } from "@/contexts/CurrencyContext";

export type { CurrencyConfig };
export { CURRENCY_MAP };

export function useCurrency() {
  // IMPORTANT: destructure selectedCurrency so this hook subscribes to currency
  // changes.  getCurrencyConfig alone is a stable function reference and does NOT
  // cause a re-render when the user switches currency — only reading a state value
  // from the context creates the necessary React subscription.
  const { getCurrencyConfig, selectedCurrency } = useCurrencyContext();
  const settingsQuery = trpc.settings.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // selectedCurrency is read here purely for reactivity; the actual config is
  // obtained via getCurrencyConfig() which closes over the same state.
  const config = getCurrencyConfig();
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");

  // For HKD, rate is 1 (already in HKD)
  // For other currencies, get their rate from settings or use default
  let currencyRate = 1;
  if (config.code !== "HKD") {
    const savedRate = settingsQuery.data?.[config.settingKey];
    currencyRate = savedRate ? parseFloat(savedRate) : config.defaultRate;
  }

  /**
   * Convert USD price to display currency
   * @param usdPrice - price in USD
   * @param markupPct - markup percentage (0-500)
   */
  function formatPrice(usdPrice: number, markupPct = 0): string {
    const withMarkup = markupPct > 0 ? usdPrice * (1 + markupPct / 100) : usdPrice;
    const hkdAmount = Math.round(withMarkup * hkdRate);

    if (config.code === "HKD") {
      return `${config.symbol}${hkdAmount}`;
    }

    // Convert HKD to target currency
    const localAmount = Math.round(hkdAmount * currencyRate);
    return `${config.symbol}${localAmount.toLocaleString()}`;
  }

  /**
   * Get numeric price in display currency
   */
  function getNumericPrice(usdPrice: number, markupPct = 0): number {
    const withMarkup = markupPct > 0 ? usdPrice * (1 + markupPct / 100) : usdPrice;
    const hkdAmount = Math.round(withMarkup * hkdRate);
    if (config.code === "HKD") return hkdAmount;
    return Math.round(hkdAmount * currencyRate);
  }

  return {
    currency: config,
    selectedCurrency, // expose so callers can use it as a dependency if needed
    hkdRate,
    currencyRate,
    formatPrice,
    getNumericPrice,
    isLoading: settingsQuery.isLoading,
  };
}
