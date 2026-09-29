import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { PageSEO } from "@/components/SEO";
import { translateCountry, translateRegion, translatePlanName, translateSearchQuery, countryNameMap, getCountriesByRegion } from "@/lib/countryNames";
import { toDisplayChinese } from "@/lib/zhConvert";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Wifi, X, Check, ChevronDown } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { encodeProductSlug } from "@shared/productSlug";
import { trackAddToCart } from "@/lib/gtm";

const REGIONS = ["Asia", "Middle East", "Europe", "North America", "South America", "Africa", "Oceania", "Asia Pacific", "Caribbean", "Worldwide"];

const DURATION_OPTIONS = [
  { label: "1 天", labelEn: "1 Day", labelCN: "1 天", labelJa: "1 日", labelKo: "1일", labelTh: "1 วัน", min: 1, max: 1 },
  { label: "2–3 天", labelEn: "2–3 Days", labelCN: "2–3 天", labelJa: "2–3 日", labelKo: "2–3일", labelTh: "2–3 วัน", min: 2, max: 3 },
  { label: "4–7 天", labelEn: "4–7 Days", labelCN: "4–7 天", labelJa: "4–7 日", labelKo: "4–7일", labelTh: "4–7 วัน", min: 4, max: 7 },
  { label: "8–15 天", labelEn: "8–15 Days", labelCN: "8–15 天", labelJa: "8–15 日", labelKo: "8–15일", labelTh: "8–15 วัน", min: 8, max: 15 },
  { label: "16–30 天", labelEn: "16–30 Days", labelCN: "16–30 天", labelJa: "16–30 日", labelKo: "16–30일", labelTh: "16–30 วัน", min: 16, max: 30 },
  { label: "30+ 天", labelEn: "30+ Days", labelCN: "30+ 天", labelJa: "30日以上", labelKo: "30일 이상", labelTh: "30+ วัน", min: 31, max: undefined },
];

const DATA_SIZES = [
  { label: "1 GB", labelEn: "1 GB", labelCN: "1 GB", labelJa: "1 GB", labelKo: "1 GB", labelTh: "1 GB", min: 0, max: 1, daily: false },
  { label: "1–3 GB", labelEn: "1–3 GB", labelCN: "1–3 GB", labelJa: "1–3 GB", labelKo: "1–3 GB", labelTh: "1–3 GB", min: 1, max: 3, daily: false },
  { label: "3–10 GB", labelEn: "3–10 GB", labelCN: "3–10 GB", labelJa: "3–10 GB", labelKo: "3–10 GB", labelTh: "3–10 GB", min: 3, max: 10, daily: false },
  { label: "10–20 GB", labelEn: "10–20 GB", labelCN: "10–20 GB", labelJa: "10–20 GB", labelKo: "10–20 GB", labelTh: "10–20 GB", min: 10, max: 20, daily: false },
  { label: "20+ GB", labelEn: "20+ GB", labelCN: "20+ GB", labelJa: "20+ GB", labelKo: "20+ GB", labelTh: "20+ GB", min: 20, max: undefined, daily: false },
  { label: "Unlimited", labelEn: "Unlimited", labelCN: "无限", labelJa: "無制限", labelKo: "무제한", labelTh: "ไม่จำกัด", min: 99999, max: undefined, daily: false },
  { label: "每日方案", labelEn: "Daily Plans", labelCN: "每日方案", labelJa: "日次プラン", labelKo: "일일 요금제", labelTh: "แผนรายวัน", min: 0, max: undefined, daily: true },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function ProductCard({ product, onAddToCart, onBuyNow, buyNowPending = false, markupPct = 0, hkdRate = 7.8, highlight = "" }: { product: Record<string, unknown>; onAddToCart: (p: Record<string, unknown>) => void; onBuyNow: (p: Record<string, unknown>) => void; buyNowPending?: boolean; markupPct?: number; hkdRate?: number; highlight?: string }) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { formatPrice, currency } = useCurrency();
  const topUpAvailable = Boolean(product.topUpAvailable);
  const isTgt = String(product.productId ?? "").startsWith("tgt_") || String(product.supplier ?? "") === "tgt";
  const costPrice = parseFloat(String(product.price ?? 0));
  const displayPrice = formatPrice(costPrice, markupPct);
  const rawDataAmount = product.dataAmount != null ? parseFloat(String(product.dataAmount)) : null;
  const dataUnit = String(product.dataUnit ?? "GB");
  // -1 = unlimited from Vizlync; 0 = not specified
  const isUnlimited = rawDataAmount !== null && rawDataAmount < 0;
  // Detect daily-quota plans:
  // 1. From dataUnit field: "MB/天" (TGT daily plans stored in DB)
  // 2. From name: "500MB/day", "500MB/Natural day", "daily 500MB"
  const isDbDailyPlan = dataUnit.includes("/天") || dataUnit.toLowerCase().includes("/day");
  // TGT unlimited: daily plan stored in DB (dataUnit contains /天) with positive dataAmount
  // These are "X MB/day high-speed + unlimited reduced speed" plans
  const isTgtUnlimited = isTgt && isDbDailyPlan && rawDataAmount != null && rawDataAmount > 0;
  const productName = String(product.name ?? "");
  // Supports: "500MB/day", "500MB/Natural day", "daily 500MB", "500MB High-Speed Data/Day", "500MB高速/天"
  const dailyRe = /(?:([\d.]+)\s*(GB|MB|TB)[^\/]*\/(?:Natural\s+)?(?:day|天)|daily\s+([\d.]+)\s*(GB|MB|TB))/i;
  const dailyMatch = dailyRe.exec(productName);
  // isDailyPlan: DB unit contains /天 OR name contains daily-quota pattern
  const isDailyPlan = isDbDailyPlan || !!(dailyMatch);
  const dayLabel = language === "en" ? "day" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "日";
  // For DB-stored daily plans (TGT), use dataAmount + base unit directly
  const dailyLabel = isDbDailyPlan && rawDataAmount != null && rawDataAmount > 0
    ? `${rawDataAmount}${dataUnit.replace("/天", "")}/${dayLabel}`
    : (() => {
        const dailyAmt = dailyMatch ? (dailyMatch[1] ?? dailyMatch[3]) : null;
        const dailyUnitStr = dailyMatch ? (dailyMatch[2] ?? dailyMatch[4]).toUpperCase() : null;
        return dailyAmt && dailyUnitStr
          ? `${dailyAmt}${dailyUnitStr}/${dayLabel}`
          : null;
      })();
  const dataDisplayLabel = isUnlimited
    ? (language === "en" ? "Unlimited" : language === "zh-CN" ? "无限" : language === "ja" ? "無制限" : language === "ko" ? "무제한" : language === "th" ? "ไม่จำกัด" : "無限")
    : dailyLabel
    ? dailyLabel
    : rawDataAmount != null && rawDataAmount > 0
    ? `${rawDataAmount}${dataUnit}`
    : (language === "en" ? "N/A" : "N/A");
  const validityDays = Number(product.validityDays ?? 0);
  const countries = (product.countries as { id: string; name: string }[]) ?? [];
  const customName = (product as Record<string, unknown>).customName as string | null | undefined;
  const translatedName = toDisplayChinese(
    customName || translatePlanName(String(product.name ?? ""), language, countries),
    language
  );
  const isTopUpPlan = /topup/i.test(String(product.name ?? ""));

  // Parse throttle speed from product name for daily-quota plans
  // Patterns: "低速384kbps", "throttle to 384kbps", "throttled 10Mbps", "低速128kbps"
  const throttleSpeed = useMemo(() => {
    if (!isDailyPlan) return null;
    const kbpsMatch = productName.match(/(?:低速|throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*kbps/i);
    const mbpsMatch = productName.match(/(?:throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*Mbps/i);
    if (kbpsMatch) return `${kbpsMatch[1]} kbps`;
    if (mbpsMatch) return `${mbpsMatch[1]} Mbps`;
    return null;
  }, [isDailyPlan, productName]);
  // Throttle label for TGT unlimited plans
  const throttleLabel = isTgtUnlimited
    ? (throttleSpeed
        ? (language === "en" ? `+ ${throttleSpeed} Unlimited` : language === "zh-CN" ? `+ 降速${throttleSpeed}不限量` : language === "ja" ? `+ 低速${throttleSpeed}無制限` : language === "ko" ? `+ ${throttleSpeed} 무제한` : language === "th" ? `+ ${throttleSpeed} ไม่จำกัด` : `+ 降速${throttleSpeed}不限量`)
        : (language === "en" ? "+ Unlimited" : language === "zh-CN" ? "+ 降速不限量" : language === "ja" ? "+ 低速無制限" : language === "ko" ? "+ 속도 제한 무제한" : language === "th" ? "+ ไม่จำกัด" : "+ 降速不限量"))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col h-full"
    >
      {/* Supplier indicator dot - subtle, only visible on close inspection */}
      <div className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${isTgt ? 'bg-blue-400' : 'bg-green-400'} opacity-60`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mb-1.5">
              <Highlight text={translatedName} query={highlight} />
            </h3>
            <div className="flex flex-wrap gap-1">
              {countries.slice(0, 2).map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {translateCountry(c, language)}
                </Badge>
              ))}
              {countries.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{countries.length - 2}
                </Badge>
              )}
              {topUpAvailable && (
                <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                  ⚡ {t.topup.canTopUp}
                </Badge>
              )}

            </div>
          </div>
          <div className="text-right ml-3 shrink-0">
            <div className="text-xl font-bold text-primary">{displayPrice}</div>
            <div className="text-xs text-muted-foreground">{currency.code}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-foreground">{dataDisplayLabel}</div>
            {isDailyPlan && (
              <div className="text-xs font-medium text-amber-600">{language === "en" ? "per day" : language === "zh-CN" ? "每日" : language === "ja" ? "毎日" : language === "ko" ? "매일" : language === "th" ? "ต่อวัน" : "每日"}</div>
            )}
            {throttleLabel && (
              <div className="text-xs text-primary/70 font-medium mt-0.5">
                {throttleLabel}
              </div>
            )}
            {isDailyPlan && !isUnlimited && !isTgtUnlimited && throttleSpeed && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {language === "en" ? `then ${throttleSpeed}` : language === "zh-CN" ? `超出后 ${throttleSpeed}` : language === "ja" ? `超過後 ${throttleSpeed}` : language === "ko" ? `초과 후 ${throttleSpeed}` : language === "th" ? `หลังจาก ${throttleSpeed}` : `超出後 ${throttleSpeed}`}
              </div>
            )}
            {!isDailyPlan && (
              <div className="text-xs text-muted-foreground">{t.products.data}</div>
            )}
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-foreground">{validityDays}</div>
            <div className="text-xs text-muted-foreground">{t.common.days}</div>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-foreground truncate">{String(product.networkType ?? "4G")}</div>
            <div className="text-xs text-muted-foreground">{t.products.network}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          {isTopUpPlan && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              ⚡ {t.products.topupOnlyNote}
            </div>
          )}
          <div className="flex gap-2">
            <Link href={`/products/${encodeProductSlug(String(product.productId ?? ""))}`} className="flex-1">
              <Button variant="outline" className="w-full text-sm h-9 border-primary/30 text-primary hover:bg-primary/5">
                {t.products.viewDetails}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="flex-1 text-sm h-9 border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => !isTopUpPlan && onAddToCart(product)}
              disabled={isTopUpPlan}
            >
              {t.products.addToCart}
            </Button>
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white text-sm h-9"
            disabled={buyNowPending || isTopUpPlan}
            onClick={() => onBuyNow(product)}
          >
            {buyNowPending ? t.checkout.redirecting : t.products.buyNow}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Products() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const searchStr = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchStr);

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState(params.get("region") ?? "all");
  const [countries, setCountries] = useState<string[]>(
    params.get("countries") ? params.get("countries")!.split(",").filter(Boolean) : []
  );
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [countryInputSearch, setCountryInputSearch] = useState("");
  const [dataSize, setDataSize] = useState("all");
  const [duration, setDuration] = useState("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "validity" | "data">("price_asc");
  const [page, setPage] = useState(0);
  const LIMIT = 24;

  // Country options filtered by selected region
  const countryOptions = useMemo(() => {
    const codes = (region === "all" || region === "Worldwide") ? Object.keys(countryNameMap) : getCountriesByRegion(region);
    return codes
      .filter((code) => countryNameMap[code])
      .map((code) => {
        const entry = countryNameMap[code];
        let label: string;
        if (language === "zh-TW") label = entry.zhTW;
        else if (language === "zh-CN") label = entry.zhCN;
        else if (language === "ja") label = (entry as Record<string, string>).ja ?? entry.en;
        else if (language === "ko") label = (entry as Record<string, string>).ko ?? entry.en;
        else if (language === "th") label = (entry as Record<string, string>).th ?? entry.en;
        else label = entry.en;
        return { code, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, language === "en" ? "en" : language === "zh-TW" || language === "zh-CN" ? "zh" : language));
  }, [region, language]);

  const filteredCountryOptions = useMemo(() => {
    if (!countryInputSearch.trim()) return countryOptions;
    const q = countryInputSearch.toLowerCase();
    return countryOptions.filter((c) => {
      const names = countryNameMap[c.code];
      return (
        c.code.toLowerCase().includes(q) ||
        (names?.en ?? "").toLowerCase().includes(q) ||
        (names?.zhTW ?? "").includes(q) ||
        (names?.zhCN ?? "").includes(q)
      );
    });
  }, [countryOptions, countryInputSearch]);

  const dataSizeFilter = useMemo(() => {
    if (dataSize === "all") return {};
    const found = DATA_SIZES.find(d => d.label === dataSize);
    if (!found) return {};
    if (found.daily) return { dailyOnly: true };
    return { minData: found.min, maxData: found.max };
  }, [dataSize]);

  const durationFilter = useMemo(() => {
    if (duration === "all") return {};
    const found = DURATION_OPTIONS.find(d => d.label === duration);
    if (!found) return {};
    return { minDays: found.min, maxDays: found.max };
  }, [duration]);

  // Translate Chinese search terms to English for backend matching
  const searchEn = useMemo(() => translateSearchQuery(search, language), [search, language]);

  const queryInput = useMemo(() => ({
    search: searchEn || undefined,
    region: region === "all" ? undefined : region,
    countries: countries.length > 0 ? countries : undefined,
    ...dataSizeFilter,
    ...durationFilter,
    limit: LIMIT,
    offset: page * LIMIT,
    sortBy,
  }), [searchEn, region, countries, dataSizeFilter, durationFilter, sortBy, page]);

  const productsQuery = trpc.products.list.useQuery(queryInput, {
    staleTime: 3 * 60 * 1000,
  });

  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const markupPct = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");

  const recordSearch = trpc.analytics.recordSearch.useMutation();

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => toast.success(t.products.addToCart + " ✓"),
    onError: () => toast.error(t.common.error),
  });

  const checkoutMutation = trpc.checkout.createSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(err.message || t.common.error),
  });

  const guestCheckoutMutation = trpc.checkout.guestCreateSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(err.message || t.common.error),
  });

  const utils = trpc.useUtils();

  const handleAddToCart = (product: Record<string, unknown>) => {
    if (!isAuthenticated) {
      toast.info(t.checkout.loginRequired);
      window.location.href = getLoginUrl();
      return;
    }
    // GTM: add_to_cart event (HKD price)
    const acCost = parseFloat(String(product.price ?? 0));
    const acHkd = Math.round((markupPct > 0 ? acCost * (1 + markupPct / 100) : acCost) * hkdRate);
    trackAddToCart({
      itemId: String(product.productId),
      itemName: String(product.name),
      price: acHkd,
      currency: "HKD",
      quantity: 1,
    });
    addToCartMutation.mutate({
      productId: String(product.productId),
      productName: String(product.name),
      productData: product as Record<string, unknown>,
      unitPrice: parseFloat(String(product.price ?? 0)),
    }, {
      onSuccess: () => utils.cart.list.invalidate(),
    });
  };

  const handleBuyNow = (product: Record<string, unknown>) => {
    // Navigate to ProductDetail page so user can enter referral code before checkout
    setLocation(`/products/${encodeProductSlug(String(product.productId))}`);
  };

  // Reset countries when region changes — but skip the initial mount so that
  // an incoming ?countries=XX param from the home page is preserved.
  const didMountRegion = useRef(false);
  useEffect(() => {
    if (!didMountRegion.current) {
      didMountRegion.current = true;
      return;
    }
    setCountries([]);
  }, [region]);

  // Sync URL params — skip the initial mount so we don't immediately rewrite
  // the incoming URL (which could race with state initialization) or reset page.
  const didMountSync = useRef(false);
  useEffect(() => {
    if (!didMountSync.current) {
      didMountSync.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (region !== "all") p.set("region", region);
    if (countries.length > 0) p.set("countries", countries.join(","));
    if (dataSize !== "all") p.set("data", dataSize);
    if (duration !== "all") p.set("dur", duration);
    const qs = p.toString();
    setLocation(`/products${qs ? `?${qs}` : ""}`, { replace: true });
    setPage(0);
  }, [search, region, countries, dataSize, duration]);

  const regionLabel = (r: string) => translateRegion(r, language);

  const allProducts = productsQuery.data?.products ?? [];
  const products = allProducts.filter((p) => !/topup/i.test(String((p as Record<string, unknown>).name ?? "")));
  const total = products.length;
  const totalPages = Math.ceil((productsQuery.data?.total ?? 0) / LIMIT);

  // Quick country search
  const [qSearch, setQSearch] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [qRecentCodes, setQRecentCodes] = useState<string[]>([]);
  const qContainerRef = useRef<HTMLDivElement>(null);
  const qInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setQRecentCodes(JSON.parse(localStorage.getItem("esim_recent_countries") ?? "[]")); } catch {}
  }, []);

  const qFiltered = useMemo(() => {
    if (!qSearch.trim()) return [];
    const q = qSearch.toLowerCase();
    return Object.entries(countryNameMap)
      .filter(([code, names]) =>
        names.en.toLowerCase().includes(q) ||
        names.zhTW.includes(q) ||
        names.zhCN.includes(q) ||
        ((names as Record<string, string>).ja ?? "").toLowerCase().includes(q) ||
        ((names as Record<string, string>).ko ?? "").toLowerCase().includes(q) ||
        ((names as Record<string, string>).th ?? "").toLowerCase().includes(q) ||
        code.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(([code, names]) => ({ code, en: names.en, zhTW: names.zhTW, zhCN: names.zhCN, ja: (names as Record<string, string>).ja, ko: (names as Record<string, string>).ko, th: (names as Record<string, string>).th }));
  }, [qSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (qContainerRef.current && !qContainerRef.current.contains(e.target as Node)) {
        setQOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function qGetLabel(c: { en: string; zhTW: string; zhCN: string; ja?: string; ko?: string; th?: string }) {
    if (language === "zh-TW") return c.zhTW;
    if (language === "zh-CN") return c.zhCN;
    if (language === "ja") return c.ja ?? c.en;
    if (language === "ko") return c.ko ?? c.en;
    if (language === "th") return c.th ?? c.en;
    return c.en;
  }

  function qHandleSelect(code: string) {
    setQSearch("");
    setQOpen(false);
    const info = countryNameMap[code];
    const label = language === "zh-TW" ? info?.zhTW
      : language === "zh-CN" ? info?.zhCN
      : language === "ja" ? ((info as Record<string, string>)?.ja ?? info?.en)
      : language === "ko" ? ((info as Record<string, string>)?.ko ?? info?.en)
      : language === "th" ? ((info as Record<string, string>)?.th ?? info?.en)
      : info?.en;
    recordSearch.mutate({ query: label || code, countryCode: code });
    // Update recent countries in localStorage
    try {
      const prev: string[] = JSON.parse(localStorage.getItem("esim_recent_countries") ?? "[]");
      const updated = [code, ...prev.filter((c) => c !== code)].slice(0, 5);
      localStorage.setItem("esim_recent_countries", JSON.stringify(updated));
      setQRecentCodes(updated);
    } catch {}
    setCountries([code]);
    setRegion("all");
    setSearch("");
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  function getFlagEmoji(countryCode: string) {
    const codePoints = countryCode.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  const qPlaceholder =
    language === "zh-TW" ? "快速搜尋目的地國家…" :
    language === "zh-CN" ? "快速搜索目的地国家…" :
    language === "ja" ? "目的地を検索…" :
    language === "ko" ? "목적지 검색…" :
    language === "th" ? "ค้นหาประเทศปลายทาง…" :
    "Quick search destination…";

  const popularCodes: string[] = (() => {
    const saved = settingsQuery.data?.["popular_countries"];
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return ["JP", "KR", "TH", "GB", "US", "AU"];
  })();
  const POPULAR_QUICK = popularCodes.map((code) => {
    const codePoints = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
    return { code, flag: String.fromCodePoint(...codePoints) };
  });

  return (
    <div className="min-h-screen bg-background">
      <PageSEO page="products" path="/products" />
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary/8 to-secondary/20 border-b border-border py-10">
        <div className="container">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.products.title}</h1>
          <p className="text-muted-foreground mb-5">{t.products.subtitle}</p>
          {/* Quick country search */}
          <div ref={qContainerRef} className="relative max-w-sm">
            <div className="flex items-center bg-white rounded-xl border border-border h-11 px-3 gap-2 focus-within:ring-2 focus-within:ring-primary/40 shadow-sm transition-all">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={qInputRef}
                type="text"
                value={qSearch}
                onChange={(e) => { setQSearch(e.target.value); setQOpen(true); }}
                onFocus={() => setQOpen(true)}
                onKeyDown={(e) => { if (e.key === "Enter" && qFiltered.length > 0) qHandleSelect(qFiltered[0].code); }}
                placeholder={qPlaceholder}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {qSearch && (
                <button onClick={() => { setQSearch(""); setQOpen(false); qInputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Recent viewed dropdown (no query) */}
            {qOpen && !qSearch.trim() && qRecentCodes.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {language === "zh-TW" ? "最近瀏覽" : language === "zh-CN" ? "最近浏览" : language === "ja" ? "最近視聴した" : language === "ko" ? "최근 본 항목" : language === "th" ? "เมื่อเร็วๆ นี้" : "Recently viewed"}
                  </span>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); localStorage.removeItem("esim_recent_countries"); setQRecentCodes([]); setQOpen(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {language === "en" ? "Clear" : language === "zh-CN" ? "清除" : language === "ja" ? "クリア" : language === "ko" ? "지우기" : language === "th" ? "ล้าง" : "清除"}
                  </button>
                </div>
                {qRecentCodes.map((code) => {
                  const info = countryNameMap[code];
                  const label = language === "zh-TW" ? info?.zhTW
                    : language === "zh-CN" ? info?.zhCN
                    : language === "ja" ? ((info as Record<string, string>)?.ja ?? info?.en)
                    : language === "ko" ? ((info as Record<string, string>)?.ko ?? info?.en)
                    : language === "th" ? ((info as Record<string, string>)?.th ?? info?.en)
                    : info?.en;
                  return (
                    <button key={code} onMouseDown={() => qHandleSelect(code)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left">
                      <span>{getFlagEmoji(code)}</span>
                      <span className="text-sm font-medium text-foreground">{label || code}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{code}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {qOpen && qSearch.trim() && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                {qFiltered.length > 0 ? qFiltered.map((c) => (
                  <button key={c.code} onMouseDown={() => qHandleSelect(c.code)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left">
                    <span>{getFlagEmoji(c.code)}</span>
                    <span className="text-sm font-medium text-foreground">{qGetLabel(c)}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                  </button>
                )) : (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    {language === "zh-TW" ? "找不到此國家" : language === "zh-CN" ? "找不到此国家" : language === "ja" ? "国が見つかりません" : language === "ko" ? "국가를 찾을 수 없습니다" : language === "th" ? "ไม่พบประเทศนี้" : "Country not found"}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Popular quick links */}
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_QUICK.map((p) => {
              const info = countryNameMap[p.code];
              const label = language === "zh-TW" ? info?.zhTW
                : language === "zh-CN" ? info?.zhCN
                : language === "ja" ? ((info as Record<string, string>)?.ja ?? info?.en)
                : language === "ko" ? ((info as Record<string, string>)?.ko ?? info?.en)
                : language === "th" ? ((info as Record<string, string>)?.th ?? info?.en)
                : info?.en;
              const isActive = countries.length === 1 && countries[0] === p.code;
              return (
                <button
                  key={p.code}
                  onClick={() => isActive ? setCountries([]) : qHandleSelect(p.code)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                    isActive
                      ? "bg-primary text-white border-primary"
                      : "bg-white/70 text-foreground border-border hover:border-primary/40 hover:bg-white"
                  }`}
                >
                  <span>{p.flag}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-border p-4 mb-6 shadow-sm">
          {/* Text search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.products.search}
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Region Filter */}
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-full sm:w-44 h-10">
                <SelectValue placeholder={t.products.filterRegion} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.regions.allRegions}</SelectItem>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{regionLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Country Multi-Select Filter */}
            <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full sm:w-44 h-10 justify-between font-normal bg-transparent"
                >
                  <span className="truncate text-left">
                    {countries.length === 0
                      ? t.products.filterCountry
                      : countries.length === 1
                        ? (countryOptions.find(c => c.code === countries[0])?.label ?? countries[0])
                        : `${countries.length} ${language === "en" ? "countries" : language === "zh-CN" ? "个国家" : language === "ja" ? "か国" : language === "ko" ? "개국" : language === "th" ? "ประเทศ" : "個國家"}`
                    }
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={language === "en" ? "Search country..." : language === "zh-CN" ? "搜索国家..." : language === "ja" ? "国を検索..." : language === "ko" ? "국가 검색..." : language === "th" ? "ค้นหาประเทศ..." : "搜尋國家..."}
                    value={countryInputSearch}
                    onValueChange={setCountryInputSearch}
                  />
                  <CommandList className="max-h-56">
                    {filteredCountryOptions.length === 0 && (
                      <CommandEmpty>{language === "en" ? "No country found" : language === "zh-CN" ? "找不到国家" : language === "ja" ? "国が見つかりません" : language === "ko" ? "국가를 찾을 수 없습니다" : language === "th" ? "ไม่พบประเทศ" : "找不到國家"}</CommandEmpty>
                    )}
                    <CommandGroup>
                      {filteredCountryOptions.map((c) => (
                        <CommandItem
                          key={c.code}
                          value={c.code}
                          onSelect={() => {
                            setCountries(prev =>
                              prev.includes(c.code)
                                ? prev.filter(code => code !== c.code)
                                : [...prev, c.code]
                            );
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${countries.includes(c.code) ? "opacity-100" : "opacity-0"}`} />
                          {c.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Duration Filter */}
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder={t.products.filterDuration} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.products.allDuration}</SelectItem>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.label} value={d.label}>
                    {language === "en" ? d.labelEn
                      : language === "zh-CN" ? d.labelCN
                      : language === "ja" ? d.labelJa
                      : language === "ko" ? d.labelKo
                      : language === "th" ? d.labelTh
                      : d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Data Size Filter */}
            <Select value={dataSize} onValueChange={setDataSize}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder={t.products.filterData} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.products.allData}</SelectItem>
                {DATA_SIZES.map((d) => {
                  const displayLabel = language === "en" ? d.labelEn : language === "zh-CN" ? d.labelCN : language === "ja" ? d.labelJa : language === "ko" ? d.labelKo : language === "th" ? d.labelTh : d.label;
                  return <SelectItem key={d.label} value={d.label}>{displayLabel}</SelectItem>;
                })}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-48 h-10">
                <SelectValue placeholder={t.products.sortBy} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">{t.products.sortPrice}</SelectItem>
                <SelectItem value="price_desc">{t.products.sortPriceDesc}</SelectItem>
                <SelectItem value="validity">{t.products.sortDuration}</SelectItem>
                <SelectItem value="data">{t.products.sortData}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          {(search || region !== "all" || countries.length > 0 || dataSize !== "all" || duration !== "all") && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {search && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearch("")}>
                  {search} <X className="w-3 h-3" />
                </Badge>
              )}
              {region !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setRegion("all")}>
                  {regionLabel(region)} <X className="w-3 h-3" />
                </Badge>
              )}
              {countries.map(code => (
                <Badge key={code} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCountries(prev => prev.filter(c => c !== code))}>
                  {countryOptions.find(c => c.code === code)?.label ?? code} <X className="w-3 h-3" />
                </Badge>
              ))}
              {dataSize !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setDataSize("all")}>
                  {dataSize} <X className="w-3 h-3" />
                </Badge>
              )}
              {duration !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setDuration("all")}>
                  {(() => {
                    const d = DURATION_OPTIONS.find(opt => opt.label === duration);
                    if (!d) return duration;
                    if (language === "en") return d.labelEn;
                    if (language === "zh-CN") return d.labelCN;
                    if (language === "ja") return d.labelJa;
                    if (language === "ko") return d.labelKo;
                    if (language === "th") return d.labelTh;
                    return d.label;
                  })()} <X className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {!productsQuery.isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {total} {t.products.results}
          </p>
        )}

        {/* Products Grid */}
        {productsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-5">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[0, 1, 2].map((j) => <Skeleton key={j} className="h-12 rounded-lg" />)}
                </div>
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Wifi className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.products.noResults}</h3>
            <Button variant="outline" onClick={() => { setSearch(""); setRegion("all"); setDataSize("all"); }}>
              {t.common.retry}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {products.map((product) => (
                <ProductCard
                  key={String(product.productId)}
                  product={product as Record<string, unknown>}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  buyNowPending={false}
                  markupPct={markupPct}
                  hkdRate={hkdRate}
                  highlight={search}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  {t.common.back}
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t.common.next}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
