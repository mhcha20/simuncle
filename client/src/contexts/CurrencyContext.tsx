import { createContext, useContext, useState, ReactNode } from "react";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string; // English name
  nameCN: string; // Chinese name
  settingKey: string;
  defaultRate: number; // rate relative to HKD (1 HKD = X currency)
}

// All supported currencies with their HKD rates
export const ALL_CURRENCIES: CurrencyConfig[] = [
  // HKD group (default)
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", nameCN: "港元", settingKey: "hkd_rate", defaultRate: 1 },
  // Major Asian
  { code: "JPY", symbol: "¥", name: "Japanese Yen", nameCN: "日圓", settingKey: "jpy_rate", defaultRate: 19.5 },
  { code: "KRW", symbol: "₩", name: "South Korean Won", nameCN: "韓元", settingKey: "krw_rate", defaultRate: 175 },
  { code: "THB", symbol: "฿", name: "Thai Baht", nameCN: "泰銖", settingKey: "thb_rate", defaultRate: 4.5 },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar", nameCN: "新台幣", settingKey: "twd_rate", defaultRate: 4.1 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", nameCN: "新加坡元", settingKey: "sgd_rate", defaultRate: 0.17 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", nameCN: "馬來西亞令吉", settingKey: "myr_rate", defaultRate: 0.60 },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", nameCN: "菲律賓披索", settingKey: "php_rate", defaultRate: 7.8 },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", nameCN: "印尼盾", settingKey: "idr_rate", defaultRate: 2100 },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", nameCN: "越南盾", settingKey: "vnd_rate", defaultRate: 3400 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", nameCN: "印度盧比", settingKey: "inr_rate", defaultRate: 11.3 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", nameCN: "人民幣", settingKey: "cny_rate", defaultRate: 0.93 },
  { code: "MOP", symbol: "MOP$", name: "Macanese Pataca", nameCN: "澳門元", settingKey: "mop_rate", defaultRate: 1.03 },
  // Major Western
  { code: "USD", symbol: "$", name: "US Dollar", nameCN: "美元", settingKey: "usd_rate", defaultRate: 0.128 },
  { code: "EUR", symbol: "€", name: "Euro", nameCN: "歐元", settingKey: "eur_rate", defaultRate: 0.118 },
  { code: "GBP", symbol: "£", name: "British Pound", nameCN: "英鎊", settingKey: "gbp_rate", defaultRate: 0.101 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", nameCN: "澳元", settingKey: "aud_rate", defaultRate: 0.197 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", nameCN: "加拿大元", settingKey: "cad_rate", defaultRate: 0.177 },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", nameCN: "瑞士法郎", settingKey: "chf_rate", defaultRate: 0.115 },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", nameCN: "新西蘭元", settingKey: "nzd_rate", defaultRate: 0.215 },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", nameCN: "瑞典克朗", settingKey: "sek_rate", defaultRate: 1.33 },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", nameCN: "挪威克朗", settingKey: "nok_rate", defaultRate: 1.38 },
  { code: "DKK", symbol: "kr", name: "Danish Krone", nameCN: "丹麥克朗", settingKey: "dkk_rate", defaultRate: 0.88 },
  // Middle East
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", nameCN: "阿聯酋迪拉姆", settingKey: "aed_rate", defaultRate: 0.47 },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", nameCN: "沙烏地里亞爾", settingKey: "sar_rate", defaultRate: 0.48 },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal", nameCN: "卡塔爾里亞爾", settingKey: "qar_rate", defaultRate: 0.466 },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", nameCN: "科威特丁那", settingKey: "kwd_rate", defaultRate: 0.039 },
  { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar", nameCN: "巴林迪納", settingKey: "bhd_rate", defaultRate: 0.048 },
  { code: "JOD", symbol: "JD", name: "Jordanian Dinar", nameCN: "約旦第納爾", settingKey: "jod_rate", defaultRate: 0.091 },
  // Other
  { code: "BRL", symbol: "R$", name: "Brazilian Real", nameCN: "巴西黑奧", settingKey: "brl_rate", defaultRate: 0.72 },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", nameCN: "墨西哥披索", settingKey: "mxn_rate", defaultRate: 2.55 },
  { code: "ZAR", symbol: "R", name: "South African Rand", nameCN: "南非蘭特", settingKey: "zar_rate", defaultRate: 2.35 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", nameCN: "新土耳其里拉", settingKey: "try_rate", defaultRate: 4.4 },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", nameCN: "波蘭茲羅提", settingKey: "pln_rate", defaultRate: 0.52 },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", nameCN: "捷克克朗", settingKey: "czk_rate", defaultRate: 2.95 },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", nameCN: "匈牙利福林", settingKey: "huf_rate", defaultRate: 47 },
  { code: "RON", symbol: "lei", name: "Romanian Leu", nameCN: "羅馬尼亞列伊", settingKey: "ron_rate", defaultRate: 0.59 },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev", nameCN: "保加利亞列弗", settingKey: "bgn_rate", defaultRate: 0.23 },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona", nameCN: "冰島克朗", settingKey: "isk_rate", defaultRate: 17.5 },
  { code: "EGP", symbol: "£", name: "Egyptian Pound", nameCN: "埃及鎊", settingKey: "egp_rate", defaultRate: 6.3 },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham", nameCN: "摩洛哥迪拉姆", settingKey: "mad_rate", defaultRate: 1.28 },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel", nameCN: "柬埔寨瑞爾", settingKey: "khr_rate", defaultRate: 520 },
  { code: "LAK", symbol: "₭", name: "Lao Kip", nameCN: "老撾基普", settingKey: "lak_rate", defaultRate: 2750 },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat", nameCN: "緬甸元", settingKey: "mmk_rate", defaultRate: 268 },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", nameCN: "孟加拉塔卡", settingKey: "bdt_rate", defaultRate: 14 },
  { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee", nameCN: "斯里蘭卡盧比", settingKey: "lkr_rate", defaultRate: 41 },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee", nameCN: "尼泊爾盧比", settingKey: "npr_rate", defaultRate: 17 },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", nameCN: "巴基斯坦盧比", settingKey: "pkr_rate", defaultRate: 35 },
  { code: "ILS", symbol: "₪", name: "Israeli New Shekel", nameCN: "以色列新謝克爾", settingKey: "ils_rate", defaultRate: 0.47 },
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar", nameCN: "斐濟元", settingKey: "fjd_rate", defaultRate: 0.29 },
  { code: "MUR", symbol: "₨", name: "Mauritian Rupee", nameCN: "毛里裘斯盧比", settingKey: "mur_rate", defaultRate: 5.9 },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary", nameCN: "馬達加斯加阿里亞里", settingKey: "mga_rate", defaultRate: 575 },
  { code: "OMR", symbol: "﷼", name: "Omani Rial", nameCN: "阿曼里亞爾", settingKey: "omr_rate", defaultRate: 0.049 },
];

export const CURRENCY_MAP: Record<string, CurrencyConfig> = Object.fromEntries(
  ALL_CURRENCIES.map((c) => [c.code, c])
);

interface CurrencyContextType {
  selectedCurrency: string; // currency code e.g. "HKD", "JPY"
  setCurrency: (code: string) => void;
  getCurrencyConfig: () => CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>(() => {
    return localStorage.getItem("esim-uncle-currency") ?? "HKD";
  });

  function setCurrency(code: string) {
    setSelectedCurrencyState(code);
    localStorage.setItem("esim-uncle-currency", code);
  }

  function getCurrencyConfig(): CurrencyConfig {
    return CURRENCY_MAP[selectedCurrency] ?? CURRENCY_MAP["HKD"];
  }

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setCurrency, getCurrencyConfig }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrencyContext must be used within CurrencyProvider");
  return ctx;
}
