import { useLanguage } from "@/contexts/LanguageContext";
import { trackSearch } from "@/lib/gtm";
import { PageSEO } from "@/components/SEO";
import { translateCountry, translateRegion, translatePlanName, countryNameMap } from "@/lib/countryNames";
import { toDisplayChinese } from "@/lib/zhConvert";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import {
  Wifi,
  Globe,
  Zap,
  Shield,
  ChevronRight,
  MapPin,
  Clock,
  Signal,
  Smartphone,
  Search,
  FileText,
  Calendar,
  Gift,
  Users,
  TrendingUp,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { encodeProductSlug } from "@shared/productSlug";

const REGION_CONFIG = [
  { key: "Asia", img: "/manus-storage/region-asia_1405db75.webp" },
  { key: "Europe", img: "/manus-storage/region-europe_5a2fa9b6.webp" },
  { key: "Americas", img: "/manus-storage/region-americas_25af5dc0.webp" },
  { key: "Middle East", img: "/manus-storage/region-middle-east_76c28d37.webp" },
  { key: "Africa", img: "/manus-storage/region-africa_90ede2f9.webp" },
  { key: "Oceania", img: "/manus-storage/region-oceania_f31a2c90.webp" },
];

const REGION_TRANSLATION_KEY: Record<string, keyof ReturnType<typeof useLanguage>["t"]["regions"]> = {
  Asia: "asia",
  Europe: "europe",
  Americas: "americas",
  "Middle East": "middleEast",
  Africa: "africa",
  Oceania: "oceania",
};

function ProductCard({ product, markupPct = 0 }: { product: Record<string, unknown>; markupPct?: number; hkdRate?: number }) {
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const topUpAvailable = Boolean(product.topUpAvailable);
  const costPrice = parseFloat(String(product.price ?? 0));
  const rawDataAmount = product.dataAmount != null ? parseFloat(String(product.dataAmount)) : null;
  const dataUnit = String(product.dataUnit ?? "GB");
  const isUnlimited = rawDataAmount !== null && rawDataAmount < 0;
  const isTgt = String(product.productId ?? "").startsWith("tgt_") || String(product.supplier ?? "") === "tgt";
  const isDbDailyPlan = dataUnit.includes("/天") || dataUnit.toLowerCase().includes("/day");
  // Detect daily-quota plans from name:
  // Formats: "500MB/day", "500MB/Natural day", "daily 500MB"
  const homeProductName = String(product.name ?? "");
  const homeDailyRe = /(?:([\d.]+)\s*(GB|MB|TB)\/(?:Natural\s+)?day|daily\s+([\d.]+)\s*(GB|MB|TB))/i;
  const homeDailyMatch = homeDailyRe.exec(homeProductName);
  const homeIsDailyPlan = isDbDailyPlan || !!(homeDailyMatch);
  const homeDailyAmt = isDbDailyPlan && rawDataAmount != null && rawDataAmount > 0
    ? String(rawDataAmount)
    : homeDailyMatch ? (homeDailyMatch[1] ?? homeDailyMatch[3]) : null;
  const homeDailyUnit = isDbDailyPlan
    ? dataUnit.replace("/天", "").replace("/day", "")
    : homeDailyMatch ? (homeDailyMatch[2] ?? homeDailyMatch[4]).toUpperCase() : null;
  const homeDailyLabel = homeIsDailyPlan && homeDailyAmt && homeDailyUnit
    ? `${homeDailyAmt}${homeDailyUnit}/${language === "en" ? "day" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "日"}`
    : null;
  const dataDisplayLabel = isUnlimited
    ? (language === "en" ? "Unlimited" : language === "zh-CN" ? "无限" : language === "ja" ? "無制限" : language === "ko" ? "무제한" : language === "th" ? "ไม่จำกัด" : "無限")
    : homeDailyLabel
    ? homeDailyLabel
    : rawDataAmount != null && rawDataAmount > 0
    ? `${rawDataAmount} ${dataUnit}`
    : (language === "en" ? "N/A" : "N/A");
  // TGT unlimited: daily plan with positive dataAmount (high-speed cap + unlimited reduced speed)
  const isTgtUnlimited = isTgt && isDbDailyPlan && rawDataAmount != null && rawDataAmount > 0;
  // Parse throttle speed from product name
  const homeThrottleSpeed = (() => {
    const kbpsMatch = homeProductName.match(/(?:低速|throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*kbps/i);
    const mbpsMatch = homeProductName.match(/(?:throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*Mbps/i);
    if (kbpsMatch) return `${kbpsMatch[1]} kbps`;
    if (mbpsMatch) return `${mbpsMatch[1]} Mbps`;
    return null;
  })();
  const homeThrottleLabel = isTgtUnlimited
    ? (homeThrottleSpeed
        ? (language === "en" ? `+ ${homeThrottleSpeed} Unlimited` : language === "zh-CN" ? `+ 降速${homeThrottleSpeed}不限量` : language === "ja" ? `+ 低速${homeThrottleSpeed}無制限` : language === "ko" ? `+ ${homeThrottleSpeed} 무제한` : language === "th" ? `+ ${homeThrottleSpeed} ไม่จำกัด` : `+ 降速${homeThrottleSpeed}不限量`)
        : (language === "en" ? "+ Unlimited" : language === "zh-CN" ? "+ 降速不限量" : language === "ja" ? "+ 低速無制限" : language === "ko" ? "+ 속도 제한 무제한" : language === "th" ? "+ ไม่จำกัด" : "+ 降速不限量"))
    : null;
  const validityDays = Number(product.validityDays ?? 0);
  const countries = (product.countries as { id: string; name: string }[]) ?? [];
  const customName = (product as Record<string, unknown>).customName as string | null | undefined;
  const translatedName = toDisplayChinese(
    customName || translatePlanName(String(product.name ?? ""), language, countries),
    language
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group h-full"
    >
      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mb-1">
              {translatedName}
            </h3>
            <div className="flex flex-wrap gap-1">
              {countries.slice(0, 3).map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {translateCountry(c, language)}
                </Badge>
              ))}
              {countries.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{countries.length - 3}
                </Badge>
              )}
              {topUpAvailable && (
                <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                  ⚡ {t.topup?.canTopUp ?? (language === "en" ? "Top-up" : language === "zh-CN" ? "可充值" : language === "ja" ? "チャージ可" : language === "ko" ? "충전가능" : language === "th" ? "เติมเงินได้" : "可充值")}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right ml-3 shrink-0">
            <div className="text-xs text-muted-foreground">{t.home.from}</div>
            <div className="text-xl font-bold text-primary">
              {formatPrice(costPrice, markupPct)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-foreground">
              {dataDisplayLabel}
            </div>
            {homeIsDailyPlan ? (
              <div className="text-xs font-medium text-amber-600">{language === "en" ? "per day" : language === "zh-CN" ? "每日" : language === "ja" ? "毎日" : language === "ko" ? "매일" : language === "th" ? "ต่อวัน" : "每日"}</div>
            ) : (
              <div className="text-xs text-muted-foreground">{t.products.data}</div>
            )}
            {homeThrottleLabel && (
              <div className="text-xs text-primary/70 font-medium mt-0.5">{homeThrottleLabel}</div>
            )}
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-foreground">{validityDays}</div>
            <div className="text-xs text-muted-foreground">{t.common.days}</div>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-foreground truncate">
              {String(product.networkType ?? "4G")}
            </div>
            <div className="text-xs text-muted-foreground">{t.products.network}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Link href={`/products/${encodeProductSlug(String(product.productId ?? ""))}`}>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white text-sm h-9 group-hover:shadow-sm transition-shadow">
              {t.products.viewDetails}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const RECENT_KEY = "esim_recent_countries";
const MAX_RECENT = 5;

function getRecentCountries(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function addRecentCountry(code: string) {
  const prev = getRecentCountries().filter((c) => c !== code);
  localStorage.setItem(RECENT_KEY, JSON.stringify([code, ...prev].slice(0, MAX_RECENT)));
}

function CountrySearchBar({ language, popularCodes }: { language: string; popularCodes: string[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recordSearch = trpc.analytics.recordSearch.useMutation();

  useEffect(() => {
    setRecentCodes(getRecentCountries());
  }, []);

  // Capture referral code from URL ?ref= and persist to localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref.toUpperCase());
    }
  }, []);

  const allCountries = useMemo(() => {
    return Object.entries(countryNameMap).map(([code, names]) => ({
      code,
      en: names.en,
      zhTW: names.zhTW,
      zhCN: names.zhCN,
      ja: names.ja,
      ko: names.ko,
      th: names.th,
    }));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allCountries
      .filter((c) =>
        c.en.toLowerCase().includes(q) ||
        c.zhTW.includes(q) ||
        c.zhCN.includes(q) ||
        c.ja.includes(q) ||
        c.ko.includes(q) ||
        c.th.includes(q) ||
        c.code.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, allCountries]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getLabel(c: { en: string; zhTW: string; zhCN: string; ja: string; ko: string; th: string }) {
    if (language === "zh-TW") return c.zhTW;
    if (language === "zh-CN") return c.zhCN;
    if (language === "ja") return c.ja;
    if (language === "ko") return c.ko;
    if (language === "th") return c.th;
    return c.en;
  }

  function handleSelect(code: string, label?: string) {
    const displayLabel = label || code;
    setQuery("");
    setOpen(false);
    addRecentCountry(code);
    setRecentCodes(getRecentCountries());
    recordSearch.mutate({ query: displayLabel, countryCode: code });
    // GTM: track search event
    trackSearch(displayLabel);
    // Special region shortcuts
    if (code === "EU33") {
      navigate(`/products?region=Europe`);
    } else if (code === "GL") {
      navigate(`/products`);
    } else {
      navigate(`/products?countries=${code}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filtered.length > 0) {
      handleSelect(filtered[0].code);
    }
  }

  const placeholder =
    language === "zh-TW" ? "搜尋目的地國家…" :
    language === "zh-CN" ? "搜索目的地国家…" :
    language === "ja" ? "目的地を検索…" :
    language === "ko" ? "목적지 검색…" :
    language === "th" ? "ค้นหาประเทศปลายทาง…" :
    "Search destination country…";

  const noResultLabel =
    language === "zh-TW" ? "找不到此國家？" :
    language === "zh-CN" ? "找不到此国家？" :
    language === "ja" ? "国が見つかりません？" :
    language === "ko" ? "국가를 찾을 수 없나요？" :
    language === "th" ? "ไม่พบประเทศ？" :
    "Country not found?";

  const browseAllLabel =
    language === "zh-TW" ? "瀏覽全部方案 →" :
    language === "zh-CN" ? "浏览全部方案 →" :
    language === "ja" ? "すべてのプランを見る →" :
    language === "ko" ? "모든 플랜 보기 →" :
    language === "th" ? "ดูแพ็กเกจทั้งหมด →" :
    "Browse all plans →";

  const popularLabel =
    language === "zh-TW" ? "熱門目的地" :
    language === "zh-CN" ? "热门目的地" :
    language === "ja" ? "人気の目的地" :
    language === "ko" ? "인기 목적지" :
    language === "th" ? "จุดหมายยอดนิยม" :
    "Popular destinations";

  const POPULAR = popularCodes.map((code) => {
    // Special codes that don't map to ISO country flags
    if (code === "EU33") return { code, flag: "🇪🇺" };
    if (code === "GL") return { code, flag: "🌐" };
    const codePoints = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
    return { code, flag: String.fromCodePoint(...codePoints) };
  });

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-2xl shadow-lg border border-border overflow-hidden h-14 px-4 gap-3 focus-within:ring-2 focus-within:ring-primary/40 transition-all">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        {/* Recent searches dropdown (shown when focused with no query) */}
        {open && !query.trim() && recentCodes.length > 0 && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {language === "zh-TW" ? "最近瀏覽" : language === "zh-CN" ? "最近浏览" : language === "ja" ? "最近見た" : language === "ko" ? "최근 본 항목" : language === "th" ? "ดูล่าสุด" : "Recently viewed"}
              </span>
              <button
                onMouseDown={(e) => { e.preventDefault(); localStorage.removeItem(RECENT_KEY); setRecentCodes([]); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {language === "en" ? "Clear" : language === "ja" ? "クリア" : language === "ko" ? "지우기" : language === "th" ? "ล้าง" : "清除"}
              </button>
            </div>
            {recentCodes.map((code) => {
              const info = countryNameMap[code];
              const label = language === "zh-TW" ? info?.zhTW : language === "zh-CN" ? info?.zhCN : language === "ja" ? info?.ja : language === "ko" ? info?.ko : language === "th" ? info?.th : info?.en;
              return (
                <button
                  key={code}
                  onMouseDown={() => handleSelect(code, label || code)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left"
                >
                  <span className="text-lg">{getFlagEmoji(code)}</span>
                  <span className="text-sm font-medium text-foreground">{label || code}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{code}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Dropdown results */}
        {open && query.trim() && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.code}
                  onMouseDown={() => handleSelect(c.code, getLabel(c))}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left"
                >
                  <span className="text-lg">{getFlagEmoji(c.code)}</span>
                  <span className="text-sm font-medium text-foreground">{getLabel(c)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{noResultLabel}</span>
                  <a
                    href="/products"
                    className="text-sm text-primary font-medium hover:underline"
                    onMouseDown={(e) => { e.preventDefault(); navigate("/products"); setOpen(false); }}
                  >
                    {browseAllLabel}
                  </a>
                </div>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-xl bg-primary/8 hover:bg-primary/15 px-3 py-2.5 text-left transition-colors"
                >
                  <Search className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-primary font-medium">
                    {language === "zh-TW" ? `搜尋「${query.trim()}」` :
                     language === "zh-CN" ? `搜索「${query.trim()}」` :
                     language === "ja" ? `「${query.trim()}」を検索` :
                     language === "ko" ? `「${query.trim()}」 검색` :
                     language === "th" ? `ค้นหา「${query.trim()}」` :
                     `Search "${query.trim()}"`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {language === "zh-TW" ? "方案/產品 ID" :
                     language === "zh-CN" ? "方案/产品 ID" :
                     language === "ja" ? "プラン/製品 ID" :
                     language === "ko" ? "요금제/제품 ID" :
                     language === "th" ? "แพ็กเกจ/Product ID" :
                     "Plan / Product ID"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popular destinations */}
      <div className="mt-4">
        <p className="text-xs text-white/80 mb-2 text-center">{popularLabel}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR.map((p) => {
            const info = countryNameMap[p.code];
            const label = language === "zh-TW" ? info?.zhTW : language === "zh-CN" ? info?.zhCN : language === "ja" ? info?.ja : language === "ko" ? info?.ko : language === "th" ? info?.th : info?.en;
            // Map country code to destination slug
            const DEST_SLUG: Record<string, string> = {
              JP: "japan", KR: "korea", TH: "thailand", GB: "europe",
              US: "usa", AU: "australia", FR: "europe", TW: "taiwan",
              EU33: "europe", SG: "singapore",
            };
            const slug = DEST_SLUG[p.code];
            const ButtonContent = (
              <>
                <span>{p.flag}</span>
                <span>{label}</span>
              </>
            );
            return slug ? (
              <Link
                key={p.code}
                href={`/esim/${slug}`}
                className="flex items-center gap-1.5 bg-white/80 hover:bg-white border border-border hover:border-primary/40 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:shadow-sm active:scale-95"
              >
                {ButtonContent}
              </Link>
            ) : (
              <button
                key={p.code}
                onClick={() => handleSelect(p.code, label || p.code)}
                className="flex items-center gap-1.5 bg-white/80 hover:bg-white border border-border hover:border-primary/40 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:shadow-sm active:scale-95"
              >
                {ButtonContent}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function Home() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const productsQuery = trpc.products.list.useQuery(
    { limit: 8, offset: 0, sortBy: "price_asc" },
    { staleTime: 5 * 60 * 1000 }
  );
  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const latestArticlesQuery = trpc.articles.list.useQuery({ limit: 3, offset: 0 }, { staleTime: 5 * 60 * 1000 });
  const markupPct = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t.home.feature1Title,
      desc: t.home.feature1Desc,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: t.home.feature2Title,
      desc: t.home.feature2Desc,
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: <Signal className="w-6 h-6" />,
      title: t.home.feature3Title,
      desc: t.home.feature3Desc,
      color: "bg-primary/10 text-primary",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t.home.feature4Title,
      desc: t.home.feature4Desc,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SIM uncle",
    "url": "https://simuncle.com",
    "description": language === "en"
      ? "Buy global eSIM for 200+ countries. Instant activation, no SIM swap needed."
      : "全球 eSIM 即買即用，覆蓋 200+ 國家地區，無需換 SIM 卡。",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://simuncle.com/products?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://www.esimuncle.com",
      "https://esimuncle.com",
      "https://simuncle.com"
    ]
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SIM uncle",
    "alternateName": ["SIM uncle eSIM", "eSIM 叔叔", "SIMuncle"],
    "url": "https://simuncle.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://simuncle.com/manus-storage/simuncle-logo-new_0fbd503a.webp",
      "width": 260,
      "height": 80,
      "caption": "SIM uncle eSIM"
    },
    "image": "https://simuncle.com/manus-storage/simuncle-logo-new_0fbd503a.webp",
    "description": language === "en"
      ? "SIM uncle provides instant global eSIM data plans for 200+ countries. No SIM swap needed, QR code activation, HKD pricing."
      : language === "zh-CN"
      ? "SIM uncle 提供全球 200+ 国家 eSIM 数据方案，无需换 SIM 卡，扫码即用，港币结算。"
      : "SIM uncle 提供全球 200+ 國家 eSIM 數據方案，無需換 SIM 卡，掃碼即用，港幣結算。",
    "foundingDate": "2024",
    "areaServed": "Worldwide",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "HK",
      "addressLocality": "Hong Kong"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+852-9888-5159",
        "contactType": "customer service",
        "contactOption": "TollFree",
        "availableLanguage": ["Chinese", "English"],
        "areaServed": "HK"
      },
      {
        "@type": "ContactPoint",
        "url": "https://wa.me/85298885159",
        "contactType": "customer service",
        "contactOption": "TollFree",
        "availableLanguage": ["Chinese", "English"]
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": language === "en" ? "Global eSIM Plans" : "全球 eSIM 方案",
      "url": "https://simuncle.com/products",
      "numberOfItems": 9140
    },
    "sameAs": [
      "https://www.esimuncle.com",
      "https://esimuncle.com",
      "https://www.simuncle.com"
    ]
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": language === "en" ? "What is an eSIM?" : "eSIM 係咩嚟？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": language === "en"
            ? "An eSIM (embedded SIM) is a digital SIM card built into your device. Instead of a physical SIM card, you scan a QR code to activate a data plan instantly — no SIM swap needed."
            : "eSIM（嵌入式 SIM）係內置於裝置的數碼 SIM 卡。你只需掃描 QR Code 即可即時啟用數據方案，無需換 SIM 卡。"
        }
      },
      {
        "@type": "Question",
        "name": language === "en" ? "How do I activate my eSIM?" : "點樣啟用 eSIM？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": language === "en"
            ? "After purchase, you will receive a QR code by email. Go to your phone Settings > Mobile Data > Add eSIM, then scan the QR code. Your eSIM will be activated instantly."
            : "購買後，你會收到一封包含 QR Code 的電郵。前往手機設定 > 流動數據 > 新增 eSIM，掃描 QR Code 即可即時啟用。"
        }
      },
      {
        "@type": "Question",
        "name": language === "en" ? "Which devices support eSIM?" : "哪些裝置支援 eSIM？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": language === "en"
            ? "Most modern smartphones support eSIM, including iPhone XS and later, Samsung Galaxy S20 and later, Google Pixel 3 and later, and many other Android devices."
            : "大多數現代智能手機支援 eSIM，包括 iPhone XS 及以後型號、Samsung Galaxy S20 及以後、Google Pixel 3 及以後。"
        }
      },
      {
        "@type": "Question",
        "name": language === "en" ? "How many countries does SIM uncle cover?" : "SIM uncle 覆蓋幾多個國家？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": language === "en"
            ? "SIM uncle offers eSIM plans for 200+ countries and regions worldwide, including Japan, South Korea, Europe, USA, Thailand, Singapore, Australia, and more."
            : "SIM uncle 提供覆蓋全球 200+ 個國家及地區的 eSIM 方案，包括日本、韓國、歐洲、美國、泰國、新加坡、澳洲等。"
        }
      },
      {
        "@type": "Question",
        "name": language === "en" ? "Can I use eSIM and my local SIM at the same time?" : "可以同時使用 eSIM 和本地 SIM 卡嗎？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": language === "en"
            ? "Yes! Most dual-SIM devices let you use your local SIM for calls and SMS while using the eSIM for data abroad. This way you never miss calls from home."
            : "可以！大多數雙 SIM 裝置讓你同時使用本地 SIM 卡接聽電話和短訊，同時使用 eSIM 在海外上網。"
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO page="home" path="/" jsonLd={[homeJsonLd, orgJsonLd, faqJsonLd] as unknown as object} />
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Full-width background image */}
        <div className="absolute inset-0">
          <img
            src="/manus-storage/hero-banner-bg_ada89b8e.webp"
            alt="Global eSIM connectivity — traveller using smartphone with world map network overlay"
            width={1920}
            height={1080}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
        </div>

        <div className="container relative z-10 py-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col items-start gap-2 mb-6">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-1.5 text-sm font-medium border border-white/30">
                  <Wifi className="w-4 h-4" />
                  <span>200+ {t.regions.allRegions}</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm">
                  <span className="text-white">🎁</span>
                  <span className="text-white font-medium">{language === "en" ? "New user exclusive:" : language === "zh-CN" ? "新用户独家：" : language === "ja" ? "新規ユーザー限定：" : language === "ko" ? "신규 회원 전용：" : language === "th" ? "สำหรับสมาชิกใหม่：" : "新用戶專屬："}</span>
                  <span className="font-bold tracking-widest text-amber-900 bg-white px-2 py-0.5 rounded-full text-xs">NEW10</span>
                  <span className="text-white font-medium">{language === "en" ? "10% off" : language === "ja" ? "10%割引" : language === "ko" ? "10% 할인" : language === "th" ? "ลด 10%" : "享9折"}</span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                {t.home.heroTitle}
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-xl">
                {t.home.heroSubtitle}
              </p>
              <CountrySearchBar language={language} popularCodes={(() => {
                const saved = settingsQuery.data?.["popular_countries"];
                if (saved) { try { return JSON.parse(saved); } catch {} }
                return ["JP", "KR", "TH", "GB", "US", "AU", "FR", "TW", "EU33"];
              })()} />
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-3 gap-6 mt-12 max-w-sm"
            >
              {[
                { value: "200+", label: t.regions.allRegions },
                { value: "18K+", label: t.home.popularPlans },
                { value: "24/7", label: t.home.feature4Title },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white drop-shadow">{stat.value}</div>
                  <div className="text-xs text-white/70 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Browse by Region */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">{t.home.browseByRegion}</h2>
            <Link href="/products" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              {t.home.viewAll} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {REGION_CONFIG.map((region, i) => {
              const label = translateRegion(region.key, language);
              return (
                <motion.div
                  key={region.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/products?region=${encodeURIComponent(region.key)}`}>
                    <div className="group cursor-pointer rounded-2xl border border-border bg-white hover:border-primary/30 hover:shadow-md transition-all duration-200 p-4 text-center">
                      <div className="w-12 h-12 mx-auto rounded-xl overflow-hidden mb-3 group-hover:scale-110 transition-transform shadow-sm">
                          <img src={region.img} alt={region.key} width={400} height={300} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Plans */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">{t.home.popularPlans}</h2>
            <Link href="/products" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              {t.home.viewAll} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {productsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
          ) : productsQuery.data?.products.length === 0 ? (
            <div className="text-center py-12">
              <Wifi className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t.products.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {(productsQuery.data?.products ?? []).map((product) => (
                <ProductCard key={String(product.productId)} product={product as Record<string, unknown>} markupPct={markupPct} hkdRate={hkdRate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-3">{t.home.whyUs}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.home.whyUsDesc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl border border-border hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Device Compatibility Quick Check */}
      <section className="py-12 bg-muted/40 border-y border-border">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">
                  {language === "en" ? "Does my device support eSIM?"
                    : language === "zh-CN" ? "我的手机支持 eSIM 吗？"
                    : language === "ja" ? "私のデバイスはeSIMに対応していますか？"
                    : language === "ko" ? "내 기기가 eSIM을 지원하나요?"
                    : language === "th" ? "อุปกรณ์ของฉันรองรับ eSIM หรือไม่?"
                    : "我的裝置支援 eSIM 嗎？"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {language === "en" ? "Check compatibility before you buy."
                    : language === "zh-CN" ? "购买前先确认装置是否兼容。"
                    : language === "ja" ? "購入前にデバイスの対応をご確認ください。"
                    : language === "ko" ? "구매 전에 기기 호환성을 확인하세요."
                    : language === "th" ? "ตรวจสอบความเข้ากันได้ก่อนซื้อ"
                    : "購買前先確認裝置是否相容。"}
                </p>
              </div>
            </div>
            <Link href="/how-to-install#compat">
              <Button variant="outline" className="shrink-0 border-primary text-primary hover:bg-primary/5 font-semibold px-6">
                {language === "en" ? "Check Compatibility →"
                  : language === "zh-CN" ? "查询兼容性 →"
                  : language === "ja" ? "対応確認 →"
                  : language === "ko" ? "호환성 확인 →"
                  : language === "th" ? "ตรวจสอบความเข้ากันได้ →"
                  : "查詢相容性 →"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tips & Info (Latest Articles) */}
      <section className="py-14 bg-white border-y border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <span>✍️</span>
                <span>{language === "en" ? "Travel Tips" : language === "zh-CN" ? "旅游攻略" : language === "ja" ? "旅行ガイド" : language === "ko" ? "여행 가이드" : language === "th" ? "เคล็ดลับท่องเที่ยว" : "旅遊攻略"}</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {language === "en" ? "Tips & Info" : language === "zh-CN" ? "实用资讯" : language === "ja" ? "お役立ち情報" : language === "ko" ? "유용한 정보" : language === "th" ? "ข้อมูลที่เป็นประโยชน์" : "實用資訊"}
              </h2>
            </div>
            <Link href="/blog" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 shrink-0">
              {language === "en" ? "View all" : language === "zh-CN" ? "查看全部" : language === "ja" ? "すべて見る" : language === "ko" ? "전체 보기" : language === "th" ? "ดูทั้งหมด" : "查看全部"} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {latestArticlesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <Skeleton className="aspect-[16/9] w-full" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !latestArticlesQuery.data || latestArticlesQuery.data.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {language === "en" ? "Articles coming soon. Stay tuned!" : language === "zh-CN" ? "文章即将上线，敬请期待！" : language === "ja" ? "記事は近日公開予定です。お楽しみに！" : language === "ko" ? "곧 게시물이 올라올 예정입니다!" : language === "th" ? "บทความกำลังจะมาเร็วๆ นี้!" : "文章即將上線，敬請期待！"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestArticlesQuery.data.map((article, i) => {
                const langMap: Record<string, string> = { "zh-TW": "ZhTW", "zh-CN": "ZhCN", en: "En", ja: "Ja", ko: "Ko", th: "Th" };
                const suffix = langMap[language] ?? "ZhTW";
                const title = (article as any)[`title${suffix}`] || (article as any).titleZhTW || (article as any).titleEn || article.slug;
                const excerpt = (article as any)[`excerpt${suffix}`] || (article as any).excerptZhTW || (article as any).excerptEn || "";
                const readMoreLabel = language === "en" ? "Read more" : language === "zh-CN" ? "阅读更多" : language === "ja" ? "続きを読む" : language === "ko" ? "더 읽기" : language === "th" ? "อ่านเพิ่มเติม" : "閱讀更多";
                return (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="group cursor-pointer bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => window.location.href = `/blog/${article.slug}`}
                  >
                    {article.coverImage ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={400}
                          height={225}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-primary/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {title}
                      </h3>
                      {excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{excerpt}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {article.publishedAt && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(article.publishedAt).toLocaleDateString(language === "en" ? "en-US" : language, { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                        <span className="text-xs text-primary font-medium flex items-center gap-0.5 ml-auto">
                          {readMoreLabel} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50 border-y border-emerald-100">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Gift className="w-4 h-4" />
                {language === "en" ? "Referral Program" : language === "zh-CN" ? "推荐计划" : language === "ja" ? "紹介プログラム" : language === "ko" ? "추천 프로그램" : language === "th" ? "โปรแกรมแนะนำเพื่อน" : "推薦計劃"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                {language === "en" ? "Refer a Friend & Earn Commission"
                  : language === "zh-CN" ? "推荐朋友，双方共赢"
                  : language === "ja" ? "友達を紹介して報酬を獲得"
                  : language === "ko" ? "친구 추천하고 커미션 받기"
                  : language === "th" ? "แนะนำเพื่อน รับค่าคอมมิชชั่น"
                  : "推薦朋友，雙方共贏"}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {language === "en"
                  ? "Share your referral code with friends. They get 10% off, and you earn 10% commission on every successful purchase."
                  : language === "zh-CN"
                  ? "分享您的推荐码给朋友，朋友享9折优惠，您获得成交金额10%佣金，无限次数，无上限。"
                  : language === "ja"
                  ? "紹介コードを友達にシェアしよう。友達は10%オフ、あなたは成約金額の10%コミッションを獲得。回数無制限。"
                  : language === "ko"
                  ? "추천 코드를 친구에게 공유하세요. 친구는 10% 할인, 당신은 결제 금액의 10% 커미션 획득. 횟수 무제한."
                  : language === "th"
                  ? "แชร์รหัสแนะนำให้เพื่อน เพื่อนได้ส่วนลด 10% คุณได้รับค่าคอมมิชชั่น 10% ไม่จำกัดจำนวนครั้ง"
                  : "分享您的推薦碼給朋友，朋友享 9 折優惠，您獲得成交金額 10% 佣金，無限次數，無上限。"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === "en" ? "Friend Gets 10% Off" : language === "zh-CN" ? "朋友享9折" : language === "ja" ? "友達が10%オフ" : language === "ko" ? "친구 10% 할인" : language === "th" ? "เพื่อนได้ส่วนลด 10%" : "朋友享 9 折"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en" ? "Your friend saves on their first eSIM purchase"
                    : language === "zh-CN" ? "朋友首次购买即享折扣优惠"
                    : language === "ja" ? "友達が購入時に割引を受けられます"
                    : language === "ko" ? "친구가 구매 시 즉시 할인 혜택 적용"
                    : language === "th" ? "เพื่อนได้รับส่วนลดทันทีเมื่อซื้อ"
                    : "朋友購買時即享折扣優惠"}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === "en" ? "You Earn 10% Commission" : language === "zh-CN" ? "您赚10%佣金" : language === "ja" ? "10%コミッション獲得" : language === "ko" ? "10% 커미션 획득" : language === "th" ? "คุณได้รับ 10% ค่าคอมมิชชั่น" : "您賺 10% 佣金"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en" ? "Earn 10% of every order your referrals make"
                    : language === "zh-CN" ? "每筆成功推荐均可获得10%佣金"
                    : language === "ja" ? "紹介による注文ごとに10%を獲得"
                    : language === "ko" ? "추천을 통한 모든 주문에서 10% 획득"
                    : language === "th" ? "รับ 10% จากทุกคำสั่งซื้อของเพื่อนที่แนะนำ"
                    : "每筆成功推薦均可獲得 10% 佣金"}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === "en" ? "No Limits" : language === "zh-CN" ? "无限次数" : language === "ja" ? "回数無制限" : language === "ko" ? "횟수 무제한" : language === "th" ? "ไม่จำกัดจำนวนครั้ง" : "無限次數"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en" ? "Refer as many friends as you like, no cap"
                    : language === "zh-CN" ? "推荐人数无上限，佣金无上限"
                    : language === "ja" ? "紹介人数に上限なし、コミッションも無制限"
                    : language === "ko" ? "추천 인원 무제한, 커미션도 무제한"
                    : language === "th" ? "แนะนำได้ไม่จำกัด ค่าคอมมิชชั่นไม่จำกัด"
                    : "推薦人數無上限，佣金無上限"}
                </p>
              </div>
            </div>
            <div className="text-center">
              <Link href="/referral">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base font-semibold">
                  <Gift className="w-5 h-5 mr-2" />
                  {language === "en" ? "Get My Referral Code"
                    : language === "zh-CN" ? "获取我的推荐码"
                    : language === "ja" ? "紹介コードを取得"
                    : language === "ko" ? "추천 코드 받기"
                    : language === "th" ? "รับรหัสแนะนำของฉัน"
                    : "取得我的推薦碼"}
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">
                {language === "en" ? "Commissions paid via bank transfer when balance reaches HK$100"
                  : language === "zh-CN" ? "佣金累积达HK$100后，通过银行转账支付"
                  : language === "ja" ? "残高がHK$100に達したら銀行振込で支払い"
                  : language === "ko" ? "잔액이 HK$100 이상이면 계좌이체로 지급"
                  : language === "th" ? "คอมมิชชั่นจ่ายผ่านโอนเงินเมื่อยอดถึง HK$100"
                  : "佣金累積達 HK$100 後，透過銀行轉帳支付"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80">
        <div className="container text-center">
          <Smartphone className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">{t.home.heroTitle}</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">{t.home.heroSubtitle}</p>
          <Link href="/products">
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90 border-white px-8 h-12 text-base font-semibold">
              {t.home.heroBtn}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/5 border-t border-border py-10">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img
                src="/manus-storage/logo-optimized_e921ee9c.webp"
                alt="SIM uncle"
                width={200}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2026 SIM uncle. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/products" className="hover:text-primary transition-colors">{t.nav.products}</Link>
              <Link href="/blog" className="hover:text-primary transition-colors">
                {language === "en" ? "Tips & Info" : language === "zh-CN" ? "实用资讯" : language === "ja" ? "お役立ち情報" : language === "ko" ? "유용한 정보" : language === "th" ? "ข้อมูลที่เป็นประโยชน์" : "實用資訊"}
              </Link>
              <Link href="/orders" className="hover:text-primary transition-colors">{t.nav.orders}</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                {language === "zh-TW" ? "私隱政策" : language === "zh-CN" ? "隐私政策" : "Privacy"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
