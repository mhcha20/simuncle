import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { CustomSEO } from "@/components/SEO";
import { translateCountry, translateRegion, translatePlanName, translateProductValue, translateSearchQuery, countryNameMap, nameToEntry, countryRegionMap } from "@/lib/countryNames";
import { toDisplayChinese } from "@/lib/zhConvert";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getLoginUrl } from "@/const";
import {
  Wifi,
  Clock,
  Signal,
  Smartphone,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ShoppingCart,
  CreditCard,
  Globe,
  Zap,
  Loader2,
  Info,
  QrCode,
  Apple,
  ArrowRight,
  Gauge,
  Share2,
  Database,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductInfoCard } from "@/components/ProductInfoCard";
import { useState, useEffect, useRef, useCallback } from "react";
import { trackViewItem, trackBeginCheckout, trackAddToCart } from "@/lib/gtm";
import { toast } from "sonner";
import { encodeProductSlug } from "@shared/productSlug";

export default function ProductDetail() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [qty, setQty] = useState(1);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    // Pre-fill from URL ?ref= param or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("ref") || localStorage.getItem("referralCode") || "";
  });
  const [referralValidation, setReferralValidation] = useState<{
    status: "idle" | "checking" | "valid" | "invalid";
    discountPct?: number;
    message?: string;
  }>({ status: "idle" });
  const validateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const trpcUtils = trpc.useUtils();

  const productQuery = trpc.products.getById.useQuery(
    { productId: params.id ?? "" },
    { enabled: !!params.id }
  );

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success(t.products.addToCart + " ✓");
    },
    onError: () => toast.error(t.common.error),
  });

  const checkoutMutation = trpc.checkout.createSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message || t.common.error),
  });

  const guestCheckoutMutation = trpc.checkout.guestCreateSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message || t.common.error),
  });

  const utils = trpc.useUtils();

  // On-demand translation mutation
  const translateMutation = trpc.products.translateDescription.useMutation();

  // Translation state — must be declared before any early returns (React hooks rules)
  const [localZhTW, setLocalZhTW] = useState<string | null>(null);
  const [localZhCN, setLocalZhCN] = useState<string | null>(null);
  const [localJa, setLocalJa] = useState<string | null>(null);
  const [localKo, setLocalKo] = useState<string | null>(null);
  const [localTh, setLocalTh] = useState<string | null>(null);
  const [localPlanInfoZhTW, setLocalPlanInfoZhTW] = useState<string | null>(null);
  const [localPlanInfoZhCN, setLocalPlanInfoZhCN] = useState<string | null>(null);
  const [localPlanInfoJa, setLocalPlanInfoJa] = useState<string | null>(null);
  const [localPlanInfoKo, setLocalPlanInfoKo] = useState<string | null>(null);
  const [localPlanInfoTh, setLocalPlanInfoTh] = useState<string | null>(null);
  const [translatedProductId, setTranslatedProductId] = useState<string | null>(null);

  const product = productQuery.data;

  // Trigger translation if any content is missing for the current language
  const needsTranslation =
    !!product &&
    (
      // Chinese: description or planInfo not yet translated
      ((language === "zh-TW" || language === "zh-CN") && (
        (!!product.description && !product.descriptionZhTW && !product.descriptionZhCN) ||
        (!!product.planInfo && !product.planInfoZhTW && !product.planInfoZhCN)
      )) ||
      // Japanese: description or planInfo not yet translated
      (language === "ja" && (
        (!!product.description && !product.descriptionJa) ||
        (!!product.planInfo && !product.planInfoJa)
      )) ||
      // Korean: description or planInfo not yet translated
      (language === "ko" && (
        (!!product.description && !product.descriptionKo) ||
        (!!product.planInfo && !product.planInfoKo)
      )) ||
      // Thai: description or planInfo not yet translated
      (language === "th" && (
        (!!product.description && !product.descriptionTh) ||
        (!!product.planInfo && !product.planInfoTh)
      ))
    );

  // Use useEffect to trigger translation safely
  useEffect(() => {
    if (
      needsTranslation &&
      product &&
      !translateMutation.isPending &&
      translatedProductId !== product.productId
    ) {
      setTranslatedProductId(product.productId);
      translateMutation.mutate(
        { productId: product.productId },
        {
          onSuccess: (data) => {
            setLocalZhTW(data.descriptionZhTW ?? null);
            setLocalZhCN(data.descriptionZhCN ?? null);
            setLocalJa(data.descriptionJa ?? null);
            setLocalKo(data.descriptionKo ?? null);
            setLocalTh(data.descriptionTh ?? null);
            setLocalPlanInfoZhTW(data.planInfoZhTW ?? null);
            setLocalPlanInfoZhCN(data.planInfoZhCN ?? null);
            setLocalPlanInfoJa(data.planInfoJa ?? null);
            setLocalPlanInfoKo(data.planInfoKo ?? null);
            setLocalPlanInfoTh(data.planInfoTh ?? null);
          },
        }
      );
    }
  }, [needsTranslation, product?.productId, language]);

  // Must be before any early returns (React hooks rules)
  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // useCurrency must also be before early returns (Rules of Hooks)
  const { formatPrice, currency, currencyRate } = useCurrency();

  // GTM: track view_item once per product (must be before early returns)
  const viewItemFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product) return;
    if (viewItemFiredRef.current === product.productId) return;
    viewItemFiredRef.current = product.productId;
    const _markupPct = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
    const _hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");
    const _costPrice = parseFloat(String(product.price ?? 0));
    const _priceUsd = _markupPct > 0 ? _costPrice * (1 + _markupPct / 100) : _costPrice;
    const _price = Math.round(_priceUsd * _hkdRate);
    const _countries = (product.countries as { id: string; name: string }[]) ?? [];
    const _customName = (product as Record<string, unknown>).customName as string | null | undefined;
    const _name = toDisplayChinese(
      _customName || translatePlanName(String(product.name ?? ""), language, _countries),
      language
    );
    trackViewItem({
      itemId: product.productId,
      itemName: _name,
      price: _price,
      currency: "HKD",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.productId, settingsQuery.data]);

  if (productQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wifi className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t.common.error}</h2>
          <Link href="/products">
            <Button variant="outline">{t.common.back}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const markupPct = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");
  const costPrice = parseFloat(String(product.price ?? 0));
  const priceUsd = markupPct > 0 ? costPrice * (1 + markupPct / 100) : costPrice;
  const price = Math.round(priceUsd * hkdRate); // HKD integer
  const rawDataAmount = product.dataAmount != null ? parseFloat(String(product.dataAmount)) : null;
  const dataUnit = String(product.dataUnit ?? "GB");
  const isUnlimited = rawDataAmount !== null && rawDataAmount < 0;
  // Detect daily-quota plans:
  // 1. From dataUnit field: "MB/天" (TGT daily plans stored in DB)
  // 2. From name: "500MB/day", "500MB/Natural day", "daily 500MB"
  const pdIsDbDailyPlan = dataUnit.includes("/天") || dataUnit.toLowerCase().includes("/day");
  const pdProductName = String(product.name ?? "");
  // Supports: "500MB/day", "500MB/Natural day", "daily 500MB", "500MB High-Speed Data/Day", "500MB高速/天"
  const pdDailyRe = /(?:([\d.]+)\s*(GB|MB|TB)[^\/]*\/(?:Natural\s+)?(?:day|天)|daily\s+([\d.]+)\s*(GB|MB|TB))/i;
  const pdDailyMatch = pdDailyRe.exec(pdProductName);
  const pdIsDailyPlan = pdIsDbDailyPlan || !!(pdDailyMatch);
  const pdDayLabel = language === "en" ? "day" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "日";
  const pdDailyLabel = pdIsDbDailyPlan && rawDataAmount != null && rawDataAmount > 0
    ? `${rawDataAmount}${dataUnit.replace("/天", "")}/${pdDayLabel}`
    : (() => {
        const pdDailyAmt = pdDailyMatch ? (pdDailyMatch[1] ?? pdDailyMatch[3]) : null;
        const pdDailyUnit = pdDailyMatch ? (pdDailyMatch[2] ?? pdDailyMatch[4]).toUpperCase() : null;
        return pdDailyAmt && pdDailyUnit
          ? `${pdDailyAmt}${pdDailyUnit}/${pdDayLabel}`
          : null;
      })();
  // Helper function to extract data amount from product name
  const extractDataFromName = (name: string): { amount: string; unit: string } | null => {
    // Match patterns like "3GB", "12-3GB", "500MB", "1GB", etc.
    const match = name.match(/(\d+(?:[.-]\d+)?)[\s-]*(GB|MB|TB)(?![a-z])/i);
    if (match) {
      return { amount: match[1], unit: match[2].toUpperCase() };
    }
    return null;
  };

  const dataDisplayLabel = isUnlimited
    ? (language === "en" ? "Unlimited" : language === "zh-CN" ? "无限" : language === "ja" ? "無制限" : language === "ko" ? "무제한" : language === "th" ? "ไม่จำกัด" : "無限")
    : pdDailyLabel
    ? pdDailyLabel
    : rawDataAmount != null && rawDataAmount > 0
    ? `${rawDataAmount} ${dataUnit}`
    : (() => {
        // Try to extract data amount from product name
        const extracted = extractDataFromName(pdProductName);
        return extracted ? `${extracted.amount}${extracted.unit}` : (language === "en" ? "N/A" : "N/A");
      })();
  const validityDays = Number(product.validityDays ?? 0);
  const isNaturalDay = /natural/i.test(String(product.name ?? ""));
  const countries = (product.countries as { id: string; name: string }[]) ?? [];
  const regions = (product.region as string[]) ?? [];
  // Use customName if set, otherwise fall back to translated plan name
  const customName = (product as Record<string, unknown>).customName as string | null | undefined;
  const customDescription = (product as Record<string, unknown>).customDescription as string | null | undefined;
  const translatedPlanName = toDisplayChinese(
    customName || translatePlanName(String(product.name ?? ""), language, countries),
    language
  );
  const displayPrice = formatPrice(costPrice, markupPct);
  const total = price * qty; // HKD integer total
  const displayTotal = currency.code === "HKD"
    ? `${currency.symbol}${total.toLocaleString()}`
    : `${currency.symbol}${Math.round(total * currencyRate).toLocaleString()}`;

  // Determine which description to display (customDescription takes priority)
  const displayDescription = (() => {
    let raw: string | null;
    if (customDescription) raw = customDescription;
    else if (language === "zh-TW") {
      raw = product.descriptionZhTW || localZhTW || product.description || null;
    } else if (language === "zh-CN") {
      raw = product.descriptionZhCN || localZhCN || product.description || null;
    } else if (language === "ja") {
      raw = product.descriptionJa || localJa || product.description || null;
    } else if (language === "ko") {
      raw = product.descriptionKo || localKo || product.description || null;
    } else if (language === "th") {
      raw = product.descriptionTh || localTh || product.description || null;
    } else {
      raw = product.description || null;
    }
    return raw ? toDisplayChinese(raw, language) : null;
  })();

  // Determine which planInfo to display
  const displayPlanInfo = (() => {
    if (language === "zh-TW") {
      return product.planInfoZhTW || localPlanInfoZhTW || product.planInfo || null;
    } else if (language === "zh-CN") {
      return product.planInfoZhCN || localPlanInfoZhCN || product.planInfo || null;
    } else if (language === "ja") {
      return product.planInfoJa || localPlanInfoJa || product.planInfo || null;
    } else if (language === "ko") {
      return product.planInfoKo || localPlanInfoKo || product.planInfo || null;
    } else if (language === "th") {
      return product.planInfoTh || localPlanInfoTh || product.planInfo || null;
    }
    return product.planInfo || null;
  })();

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.info(t.checkout.loginRequired);
      window.location.href = getLoginUrl();
      return;
    }
    // GTM: add_to_cart event (HKD unit price * qty)
    trackAddToCart({
      itemId: product.productId,
      itemName: translatedPlanName,
      price,
      currency: "HKD",
      quantity: qty,
    });
    addToCartMutation.mutate({
      productId: product.productId,
      productName: product.name,
      productData: product as unknown as Record<string, unknown>,
      unitPrice: priceUsd, // store USD price with markup applied; HKD conversion done at checkout
    }, {
      onSuccess: () => utils.cart.list.invalidate(),
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    // GTM: begin_checkout event
    trackBeginCheckout({
      value: total,
      currency: "HKD",
      itemName: translatedPlanName,
      itemId: product.productId,
    });
    // Build startDate for ACTIVATE_ON_ORDER products
    const startDateParam = product.activationPolicy === 'ACTIVATE_ON_ORDER' && selectedStartDate
      ? (() => {
          // Convert local date (YYYY-MM-DD) to GMT+0 ISO string at midnight
          const d = new Date(selectedStartDate + 'T00:00:00Z');
          return d.toISOString();
        })()
      : undefined;
    if (isAuthenticated) {
      checkoutMutation.mutate({
        productId: product.productId,
        quantity: qty,
        startDate: startDateParam,
        locale: language,
        successUrl: `${window.location.origin}/checkout/result`,
        cancelUrl: `${window.location.origin}/products/${encodeProductSlug(product.productId)}`,
        referralCode: referralCode.trim() || undefined,
      });
    } else {
      // Guest checkout: Stripe will collect email at checkout page
      guestCheckoutMutation.mutate({
        productId: product.productId,
        quantity: qty,
        startDate: startDateParam,
        locale: language,
        successUrl: `${window.location.origin}/checkout/result`,
        cancelUrl: `${window.location.origin}/products/${encodeProductSlug(product.productId)}`,
      });
    }
  };

  const FeatureRow = ({ icon, label, value, positive }: { icon: React.ReactNode; label: string; value?: string; positive?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {positive !== undefined ? (
          positive ? (
            <CheckCircle className="w-4 h-4 text-primary" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          )
        ) : null}
        <span className={`text-sm font-medium ${positive === false ? "text-muted-foreground" : "text-foreground"}`}>
          {value ?? (positive ? t.productDetail.available : t.productDetail.notAvailable)}
        </span>
      </div>
    </div>
  );

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": translatedPlanName,
    "description": displayDescription || (language === "en" ? `eSIM plan for ${countries.map(c => c.name).join(", ")}` : `eSIM 方案：${countries.map(c => c.name).join("、")}`),
    "brand": { "@type": "Brand", "name": "SIM uncle" },
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "HKD",
      "availability": "https://schema.org/InStock",
      "url": `https://simuncle.com/products/${encodeProductSlug(product.productId)}`
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": language === "en" ? "Home" : language === "zh-CN" ? "首页" : language === "ja" ? "ホーム" : language === "ko" ? "홈" : language === "th" ? "หน้าแรก" : "首頁",
        "item": "https://simuncle.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": language === "en" ? "eSIM Plans" : language === "zh-CN" ? "eSIM 方案" : language === "ja" ? "eSIM プラン" : language === "ko" ? "eSIM 요금제" : language === "th" ? "แผน eSIM" : "eSIM 方案",
        "item": "https://simuncle.com/products"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": translatedPlanName,
        "item": `https://simuncle.com/products/${encodeProductSlug(product.productId)}`
      }
    ]
  };

  // Build a unique SEO title: "<PlanName> <Data> <Days>天" to differentiate similar products
  const seoTitle = (() => {
    const parts = [translatedPlanName];
    if (dataDisplayLabel && dataDisplayLabel !== "N/A") parts.push(dataDisplayLabel);
    if (validityDays > 0) {
      parts.push(language === "en" ? `${validityDays} Days` : language === "ja" ? `${validityDays}日間` : language === "ko" ? `${validityDays}일` : language === "th" ? `${validityDays} วัน` : `${validityDays}天`);
    }
    return parts.join(" ");
  })();

  // Build a concise fallback description (≤158 chars handled by CustomSEO)
  const seoDescription = displayDescription ||
    (language === "en"
      ? `Buy ${translatedPlanName} eSIM — ${dataDisplayLabel} data, ${validityDays} days. Instant QR activation. No SIM swap. HKD pricing.`
      : language === "zh-CN"
      ? `购买 ${translatedPlanName} eSIM 方案 — ${dataDisplayLabel}数据，${validityDays}天有效，扫码即激活，无需换 SIM 卡，港币结算。`
      : language === "ja"
      ? `${translatedPlanName} eSIMを購入 — ${dataDisplayLabel}データ、${validityDays}日間有効。QRコードで即時開通、SIM交換不要。`
      : language === "ko"
      ? `${translatedPlanName} eSIM 구매 — ${dataDisplayLabel} 데이터, ${validityDays}일 유효. QR코드로 즉시 개통, SIM 교체 불필요.`
      : language === "th"
      ? `ซื้อ ${translatedPlanName} eSIM — ข้อมูล ${dataDisplayLabel}, ${validityDays} วัน เปิดใช้งานทันทีผ่าน QR Code ไม่ต้องเปลี่ยนซิม`
      : `購買 ${translatedPlanName} eSIM 方案 — ${dataDisplayLabel}數據，${validityDays}天有效，掃碼即激活，無需換 SIM 卡，港幣結算。`);

  return (
    <div className="min-h-screen bg-background">
      <CustomSEO
        title={seoTitle}
        description={seoDescription}
        path={`/products/${encodeProductSlug(product.productId)}`}
        keywords={[...countries.map(c => `${c.name} eSIM`), "eSIM", "travel eSIM", "SIM uncle"]}
        jsonLd={[productJsonLd, breadcrumbJsonLd] as unknown as object}
      />
      <div className="container py-8">
        {/* Breadcrumb */}
        <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {t.products.title}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Product Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {regions.map((r) => (
                  <Badge key={r} className="bg-primary/10 text-primary border-0">{translateRegion(r, language)}</Badge>
                ))}
                {product.networkType && (
                  <Badge variant="outline">{String(product.networkType)}</Badge>
                )}

              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{translatedPlanName}</h1>
              {translateMutation.isPending && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{language === "zh-TW" ? "翻譯中..." : language === "zh-CN" ? "翻译中..." : language === "ja" ? "翻訳中..." : language === "ko" ? "번역 중..." : language === "th" ? "กำลังแปล..." : "Translating..."}</span>
                </div>
              )}
            </div>

            {/* Product Info Card */}
            {(() => {
              // Parse throttle speed from description for the info card
              const enRaw2 = String(product.description ?? "");
              const plain2 = enRaw2.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              const throttleMatch2 = plain2.match(/(\d+(?:\.\d+)?)\s*kbps/i) || plain2.match(/(\d+(?:\.\d+)?)\s*Mbps/i);
              const cardThrottle = throttleMatch2 ? throttleMatch2[0].replace(/\s+/g, "") : null;
              const cardCountryNames = countries.slice(0, 12).map(c => translateCountry(c, language));
              return (
                <ProductInfoCard
                  planName={translatedPlanName}
                  dataLabel={dataDisplayLabel}
                  validityDays={validityDays}
                  isNaturalDay={isNaturalDay}
                  networkType={String(product.networkType ?? "4G/5G")}
                  countriesCount={countries.length}
                  throttleSpeed={cardThrottle}
                  hotspotAvailable={product.hotspotAvailable ?? null}
                  language={language as "zh-TW" | "zh-CN" | "en"}
                  countryNames={cardCountryNames}
                />
              );
            })()}

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Wifi className="w-5 h-5 text-primary" />, label: pdIsDailyPlan ? (language === "en" ? "per day" : language === "zh-CN" ? "每日" : language === "ja" ? "毎日" : language === "ko" ? "매일" : language === "th" ? "ต่อวัน" : "每日") : t.productDetail.dataAmount, value: dataDisplayLabel, sublabel: pdIsDailyPlan && isUnlimited ? (language === "en" ? "+ Unlimited" : language === "zh-CN" ? "+ 降速不限量" : language === "ja" ? "+ 低速無制限" : language === "ko" ? "+ 속도 제한 무제한" : language === "th" ? "+ ไม่จำกัด" : "+ 降速不限量") : undefined },
                { icon: <Clock className="w-5 h-5 text-primary" />, label: t.productDetail.validity, value: isNaturalDay
                    ? (language === "en" ? `${validityDays} Calendar Days` : language === "zh-CN" ? `${validityDays} 日历天` : language === "ja" ? `${validityDays} カレンダー日` : language === "ko" ? `${validityDays} 달력 일수` : language === "th" ? `${validityDays} วันตามปฏิทิน` : `${validityDays} 日曆天`)
                    : `${validityDays} ${t.common.days}`,
                  sublabel: product.activationPolicy === 'ACTIVATE_ON_ORDER'
                    ? (language === "en" ? "Starts from purchase" : language === "zh-CN" ? "下单后开始计时" : language === "ja" ? "注文後即座開始" : language === "ko" ? "주문 후 즉시 시작" : language === "th" ? "เริ่มหลังสั่งซื้อ" : "下單後開始計時")
                    : product.activationPolicy === 'AUTO_ACTIVATE'
                    ? (language === "en" ? "Starts on first use" : language === "zh-CN" ? "首次使用时开始" : language === "ja" ? "初回使用時に開始" : language === "ko" ? "첫 사용 시 시작" : language === "th" ? "เริ่มเมื่อใช้ครั้งแรก" : "首次使用時開始")
                    : undefined },
                { icon: <Signal className="w-5 h-5 text-primary" />, label: t.productDetail.network, value: String(product.networkType ?? "4G") },
                { icon: <Globe className="w-5 h-5 text-primary" />, label: t.productDetail.countries, value: `${countries.length}` },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-border p-4 text-center">
                  <div className="flex justify-center mb-2">{stat.icon}</div>
                  <div className="font-bold text-foreground">{stat.value}</div>
                  {'sublabel' in stat && stat.sublabel && (
                    <div className="text-xs text-primary/70 font-medium">{stat.sublabel}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tabbed Info Sections */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="overview">{t.productDetail.tabOverview}</TabsTrigger>
                <TabsTrigger value="coverage">{t.productDetail.tabCoverage} ({countries.length})</TabsTrigger>
                <TabsTrigger value="howToUse">{t.productDetail.tabHowToUse}</TabsTrigger>
              </TabsList>

              {/* Tab 1: Overview — description (or planInfo as fallback) + features */}
              <TabsContent value="overview" className="space-y-4">
                {(() => {
                  // Parse structured attributes from the raw source (product.description).
                  // The provider data may be in English OR Chinese, e.g.:
                  //   EN: "Daily high speed data cap 500MB，... throttled into 384kbps ... Hotspot sharing:support"
                  //   CN: "每日高速流量3GB，之后降速为128kbps；支持热点分享"
                  // We render our own tri-lingual labels so the cards stay correct in every language.
                  const enRaw = String(product.description ?? "");
                  const enHead = enRaw.split(/Coverage and Operator|覆蓋範圍及營運商|覆盖范围及运营商|本产品覆盖|本產品覆蓋/i)[0];
                  const plain = enHead.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

                  // --- Data cap (daily vs total) ---
                  let isDaily = false;
                  let dataCap: string | null = null;
                  const enCap = plain.match(/(daily|total)\s+high\s+speed\s+data\s+cap\s+([\d.]+\s*[GMK]?B)/i);
                  if (enCap) {
                    isDaily = /daily/i.test(enCap[1]);
                    dataCap = enCap[2].replace(/\s+/g, "");
                  } else {
                    // Chinese: 每日高速流量3GB / 每日高速數據上限500MB / 总高速流量20GB / 高速數據總量20GB
                    const cnDaily = plain.match(/每日(?:高速)?(?:流量|數據|数据)(?:上限)?\s*([\d.]+\s*[GMK]?B)/i);
                    const cnTotal = plain.match(/(?:总|總)(?:高速)?(?:流量|數據|数据)(?:上限|總量|总量)?\s*([\d.]+\s*[GMK]?B)/i)
                      || plain.match(/高速(?:流量|數據|数据)(?:總量|总量)\s*([\d.]+\s*[GMK]?B)/i);
                    if (cnDaily) { isDaily = true; dataCap = cnDaily[1].replace(/\s+/g, ""); }
                    else if (cnTotal) { isDaily = false; dataCap = cnTotal[1].replace(/\s+/g, ""); }
                  }

                  // --- Throttle speed after cap ---
                  const throttleMatch = plain.match(/([\d.]+)\s*kbps/i) || plain.match(/([\d.]+)\s*Mbps/i);
                  const throttle = throttleMatch ? throttleMatch[0].replace(/\s+/g, "") : null;

                  // --- Hotspot sharing ---
                  const hotspot = /hotspot\s*sharing\s*[:：]?\s*support|(?:支持|支援)(?:热点|熱點)(?:分享|共享)?|(?:热点|熱點)(?:分享|共享)\s*[:：]?\s*(?:支持|支援)/i.test(plain)
                    ? true
                    : /hotspot\s*sharing\s*[:：]?\s*(no|not)|不(?:支持|支援)(?:热点|熱點)/i.test(plain) ? false : null;

                  const L_MAP = {
                    "zh-TW": {
                      dailyCap: "每日高速數據上限", totalCap: "高速數據總量", throttle: "限速後速度", hotspot: "熱點分享",
                      support: "支援", noSupport: "不支援", afterCap: "高速用完後",
                    },
                    "zh-CN": {
                      dailyCap: "每日高速数据上限", totalCap: "高速数据总量", throttle: "限速后速度", hotspot: "热点共享",
                      support: "支持", noSupport: "不支持", afterCap: "高速用完后",
                    },
                    en: {
                      dailyCap: "Daily high-speed data", totalCap: "Total high-speed data", throttle: "Speed after cap", hotspot: "Hotspot sharing",
                      support: "Supported", noSupport: "Not supported", afterCap: "after high-speed used up",
                    },
                    ja: {
                      dailyCap: "日ごとの高速データ上限", totalCap: "高速データ総量", throttle: "制限後の速度", hotspot: "テザリング",
                      support: "対応", noSupport: "非対応", afterCap: "高速容量使用後",
                    },
                    ko: {
                      dailyCap: "일일 고속 데이터 한도", totalCap: "고속 데이터 총량", throttle: "제한 후 속도", hotspot: "핫스팟 공유",
                      support: "지원", noSupport: "미지원", afterCap: "고속 소진 후",
                    },
                    th: {
                      dailyCap: "ข้อมูลความเร็วรายวัน", totalCap: "ข้อมูลความเร็วทั้งหมด", throttle: "ความเร็วหลังจำกัด", hotspot: "แชร์ฮอตสปอต",
                      support: "รองรับ", noSupport: "ไม่รองรับ", afterCap: "หลังใช้ความเร็วหมด",
                    },
                  };
                  const L = L_MAP[language] ?? L_MAP["en"];

                  const cards: { icon: React.ReactNode; label: string; value: string; sub?: string }[] = [];
                  if (dataCap) cards.push({ icon: <Database className="w-5 h-5" />, label: isDaily ? L.dailyCap : L.totalCap, value: dataCap });
                  if (throttle) cards.push({ icon: <Gauge className="w-5 h-5" />, label: L.throttle, value: throttle, sub: L.afterCap });
                  if (hotspot !== null) cards.push({ icon: <Share2 className="w-5 h-5" />, label: L.hotspot, value: hotspot ? L.support : L.noSupport });

                  // If we couldn't parse anything meaningful, fall back to the translated blurb.
                  if (cards.length === 0) {
                    const fallback = displayDescription ||
                      (language === "zh-TW"
                        ? product.planInfoZhTW || localPlanInfoZhTW
                        : language === "zh-CN"
                        ? product.planInfoZhCN || localPlanInfoZhCN
                        : null);
                    if (!fallback) return null;
                    const fbHead = String(fallback).split(/Coverage and Operator|覆蓋範圍及營運商|覆盖范围及运营商/i)[0];
                    return (
                      <div className="bg-white rounded-2xl border border-border p-5">
                        <div
                          className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: fbHead }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {cards.map((card, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-border p-4 flex flex-col gap-2">
                          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">{card.icon}</span>
                          <p className="text-xs text-muted-foreground">{card.label}</p>
                          <p className="text-lg font-semibold text-foreground leading-tight">{card.value}</p>
                          {card.sub && <p className="text-[11px] text-muted-foreground -mt-1">{card.sub}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="bg-white rounded-2xl border border-border p-5">
                  <h2 className="font-semibold text-foreground mb-3">{t.productDetail.features}</h2>
                  <FeatureRow
                    icon={<Zap className="w-4 h-4" />}
                    label={t.productDetail.hotspot}
                    positive={product.hotspotAvailable ?? false}
                  />
                  <FeatureRow
                    icon={<Smartphone className="w-4 h-4" />}
                    label={t.productDetail.voice}
                    positive={product.isVoiceAvailable ?? false}
                    value={product.voiceMin ? `${product.voiceMin} min` : undefined}
                  />
                  <FeatureRow
                    icon={<Signal className="w-4 h-4" />}
                    label="SMS"
                    positive={product.isSmsAvailable ?? false}
                    value={product.sms ? `${product.sms}` : undefined}
                  />
                  {product.speed && (
                    <FeatureRow
                      icon={<Wifi className="w-4 h-4" />}
                      label={t.productDetail.speed}
                      value={translateProductValue(String(product.speed), language)}
                    />
                  )}
                  {product.activationPolicy && (
                    <FeatureRow
                      icon={<CheckCircle className="w-4 h-4" />}
                      label={t.productDetail.activation}
                      value={translateProductValue(String(product.activationPolicy), language)}
                    />
                  )}
                  {product.activationPolicy === 'ACTIVATE_ON_ORDER' && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-1">
                      <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {language === 'en' ? 'You can choose your preferred activation date at checkout. Leave blank to start immediately after payment.'
                          : language === 'zh-CN' ? '可在结账时选择启用日期，留空则付款后立即开始计时。'
                          : language === 'ja' ? 'チェックアウト時に開始日を選べます。空白のままにすると支払い後すぐ開始します。'
                          : language === 'ko' ? '결제 시 원하는 활성화 날짜를 선택할 수 있습니다. 비워두면 결제 후 즉시 시작됩니다.'
                          : language === 'th' ? 'เลือกวันเริ่มใช้งานได้เมื่อชำระเงิน เว้นว่างไว้เพื่อเริ่มทันทีหลังชำระเงิน'
                          : '可於結帳時選擇啟用日期，留空則付款後立即開始計時。'}
                      </p>
                    </div>
                  )}
                  {product.profile && (
                    <FeatureRow
                      icon={<Smartphone className="w-4 h-4" />}
                      label={t.productDetail.profile}
                      value={translateProductValue(String(product.profile), language)}
                    />
                  )}
                  {isNaturalDay && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      {language === 'en'
                        ? '* Calendar Days: validity is counted by calendar date from the day of activation, regardless of the time of day.'
                        : language === 'zh-CN'
                        ? '* 日历天：有效期以开卡当天起按日历天数计算，无论何时开卡均从当天起算。'
                        : language === 'ja'
                        ? '* カレンダー日：有効期間は開通日から暦日で計算されます。'
                        : language === 'ko'
                        ? '* 달력 일수：유효기간은 개통일부터 달력 일수로 계산됩니다.'
                        : language === 'th'
                        ? '* วันตามปฏิทิน：ระยะเวลามีผลนับจากวันที่เปิดใช้งานตามปฏิทิน'
                        : '* 日曆天：有效期從開卡當天起按日曆天數計算，無論何時開卡均從當天起算。'}
                    </p>
                  )}
                  {product.speed && String(product.speed).toLowerCase() === 'restricted' && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      {language === 'en'
                        ? '* Speed is throttled after the daily high-speed data allowance is used up. See Overview tab for throttle speed details.'
                        : language === 'zh-CN'
                        ? '* 每日高速数据用完后，网速将降至限制速度（具体限速详见概览）。'
                        : language === 'ja'
                        ? '* 毎日の高速データ使用後、速度が制限されます（詳細は概要タブをご確認ください）。'
                        : language === 'ko'
                        ? '* 일일 고속 데이터 소진 후 속도가 제한됩니다（자세한 내용은 개요 탭 참조）。'
                        : language === 'th'
                        ? '* หลังจากใช้ข้อมูลความเร็วสูงรายวันหมด ความเร็วจะถูกจำกัด（ดูรายละเอียดในแท็บภาพรวม）'
                        : '* 每日高速數據用完後，網速將降至限制速度（具體限速詳見概覽）。'}
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Coverage — countries as table if operators available, else badges */}
              <TabsContent value="coverage">
                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                  {/* Search box */}
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input
                        type="text"
                        value={coverageSearch}
                        onChange={e => setCoverageSearch(e.target.value)}
                        placeholder={t.productDetail.coverageSearch}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  {(() => {
                    // Parse coverage rows from description.
                    // Raw format example (entries separated by ；/; and littered with <br>):
                    //   ...Coverage and Operator：<br>Australia-Telstra，Network-4G/5G，APN-mobile.three.com.hk；
                    //   <br>Hong Kong (China)-3，Network-4G，APN-mobile.three.com.hk；<br>Japan-Rakuten Mobile，...
                    const rawDesc = product.description ?? "";
                    // 1) Strip HTML tags (<br>, <br/>, etc.) and normalise whitespace
                    const cleaned = rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
                    // 2) Only look at the part after the "Coverage and Operator" marker if present
                    const markerMatch = cleaned.match(/(?:Coverage and Operator|覆蓋範圍及營運商|覆盖范围及运营商)[：:]\s*(.*)$/i);
                    const coverageText = markerMatch ? markerMatch[1] : cleaned;
                    // 3) Split into entries by ；/; and parse each "Country-Operator，Network-X，APN-Y"
                    const entryRegex = /^\s*(.+?)-(.+?)[，,]\s*Network-([^，,]+)[，,]\s*APN-(.+?)\s*$/i;
                    const rows: { country: string; countryId: string; operator: string; network: string; apn: string }[] = [];
                    const seen = new Set<string>();
                    for (const part of coverageText.split(/[；;]/)) {
                      const seg = part.trim();
                      if (!seg) continue;
                      const em = seg.match(entryRegex);
                      if (!em) continue;
                      const countryRaw = em[1].trim();
                      // Reject obvious non-country segments (speed/data sentences)
                      const lc = countryRaw.toLowerCase();
                      if (!countryRaw || countryRaw.length > 32 || lc.includes("kbps") || lc.includes("speed") || lc.includes("hotspot") || lc.includes("data ") || lc.includes("after") || lc.includes("cap")) continue;
                      // Match country id by english name (strip trailing " (China)" etc. for lookup)
                      const lookupKey = countryRaw.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();
                      const nameEntryLookup = nameToEntry[lookupKey] ?? nameToEntry[lc];
                      const dedupeKey = lookupKey || lc;
                      if (seen.has(dedupeKey)) continue;
                      seen.add(dedupeKey);
                      rows.push({
                        country: countryRaw,
                        countryId: nameEntryLookup ? nameEntryLookup.id : "",
                        operator: em[2].trim(),
                        network: em[3].trim(),
                        apn: em[4].trim(),
                      });
                    }
                    const sqRaw = coverageSearch.trim();
                    // Translate local-language search terms to English for matching
                    const sqEn = translateSearchQuery(sqRaw, language).toLowerCase();
                    const sq = sqEn;
                    if (rows.length > 0) {
                      const filteredRows = sq
                        ? rows.filter(row => {
                            const name = translateCountry({ id: row.countryId, name: row.country }, language).toLowerCase();
                            return name.includes(sqRaw.toLowerCase()) || row.country.toLowerCase().includes(sq) || row.operator.toLowerCase().includes(sq);
                          })
                        : rows;
                      return (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead className="font-semibold">{t.productDetail.coverageCountry}</TableHead>
                                <TableHead className="font-semibold">{t.productDetail.coverageOperator}</TableHead>
                                <TableHead className="font-semibold">{t.productDetail.coverageNetwork}</TableHead>
                                <TableHead className="font-semibold">{t.productDetail.coverageApn}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRows.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">{t.productDetail.coverageNoResults}</TableCell></TableRow>
                              ) : filteredRows.map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">
                                    {(() => {
                                      const flag = row.countryId && row.countryId.length === 2
                                        ? String.fromCodePoint(...[...row.countryId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
                                        : "";
                                      return <>{flag && <span className="mr-1">{flag}</span>}{translateCountry({ id: row.countryId, name: row.country }, language)}</>;
                                    })()}
                                  </TableCell>
                                  <TableCell>{row.operator}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{row.network}</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-xs font-mono">{row.apn}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    }
                    // Fallback: show country badges grouped by continent
                    const filteredCountries = sq
                      ? countries.filter(c => translateCountry(c, language).toLowerCase().includes(sqRaw.toLowerCase()) || c.name.toLowerCase().includes(sq))
                      : countries;
                    const continentOrder = ["Asia", "Europe", "North America", "South America", "Caribbean", "Oceania", "Africa"];
                    const continentLabel: Record<string, Record<string, string>> = {
                      Asia: { "zh-TW": "亞洲", "zh-CN": "亚洲", en: "Asia", ja: "アジア", ko: "아시아", th: "เอเชีย" },
                      Europe: { "zh-TW": "歐洲", "zh-CN": "欧洲", en: "Europe", ja: "ヨーロッパ", ko: "유럽", th: "ยุโรป" },
                      "North America": { "zh-TW": "北美洲", "zh-CN": "北美洲", en: "North America", ja: "北アメリカ", ko: "북아메리카", th: "อเมริกาเหนือ" },
                      "South America": { "zh-TW": "南美洲", "zh-CN": "南美洲", en: "South America", ja: "南アメリカ", ko: "남아메리카", th: "อเมริกาใต้" },
                      Caribbean: { "zh-TW": "加勒比海及中美洲", "zh-CN": "加勒比海及中美洲", en: "Caribbean & Central America", ja: "カリブ海・中央アメリカ", ko: "카리브해 및 중앙아메리카", th: "แคริบเบียนและอเมริกากลาง" },
                      Oceania: { "zh-TW": "大洋洲", "zh-CN": "大洋洲", en: "Oceania", ja: "オセアニア", ko: "오세아니아", th: "โอเชียเนีย" },
                      Africa: { "zh-TW": "非洲", "zh-CN": "非洲", en: "Africa", ja: "アフリカ", ko: "아프리카", th: "แอฟริกา" },
                    };
                    // Group by continent
                    const grouped: Record<string, typeof filteredCountries> = {};
                    const ungrouped: typeof filteredCountries = [];
                    for (const c of filteredCountries) {
                      const cont = countryRegionMap[c.id] ?? "";
                      if (cont && continentOrder.includes(cont)) {
                        if (!grouped[cont]) grouped[cont] = [];
                        grouped[cont].push(c);
                      } else {
                        ungrouped.push(c);
                      }
                    }
                    if (ungrouped.length > 0) grouped["Other"] = ungrouped;
                    const groupKeys = [...continentOrder.filter(k => grouped[k]), ...(grouped["Other"] ? ["Other"] : [])];
                    return (
                      <div className="p-5 space-y-5">
                        {filteredCountries.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{language === "zh-TW" ? "找不到符合的國家" : language === "zh-CN" ? "找不到符合的国家" : language === "ja" ? "該当する国が見つかりません" : language === "ko" ? "해당 국가를 찾을 수 없습니다" : language === "th" ? "ไม่พบประเทศที่ตรงกัน" : "No results found"}</p>
                        ) : groupKeys.map(cont => (
                          <div key={cont}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              {cont === "Other" ? (language === "zh-TW" ? "其他" : language === "zh-CN" ? "其他" : language === "ja" ? "その他" : language === "ko" ? "기타" : language === "th" ? "อื่นๆ" : "Other") : (continentLabel[cont]?.[language] ?? continentLabel[cont]?.en ?? cont)}
                              <span className="ml-1 font-normal">({grouped[cont].length})</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {grouped[cont].map((c) => {
                                const flag = c.id && c.id.length === 2
                                  ? String.fromCodePoint(...[...c.id.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65))
                                  : "";
                                return (
                                  <Badge key={c.id} variant="secondary" className="text-xs py-1 px-2">
                                    {flag && <span className="mr-1">{flag}</span>}{translateCountry(c, language)}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              {/* Tab 3: How to Use — planInfo HTML (translated if available) */}
              <TabsContent value="howToUse">
                {(() => {
                  const installCopy: Record<string, { intro: string; iphoneTitle: string; androidTitle: string; iphone: string[]; android: string[]; tip: string; full: string }> = {
                    "zh-TW": {
                      intro: "購買後，QR Code 會即時顯示於訂單頁面並發送至您的電郵。依以下步驟即可安裝 eSIM：",
                      iphoneTitle: "iPhone 安裝步驟",
                      androidTitle: "Android 安裝步驟",
                      iphone: [
                        "前往「設定 > 行動網路」，點擊「加入 eSIM」",
                        "選擇「使用 QR Code」並掃描訂單頁面的 QR Code",
                        "點擊「繼續」完成安裝（約 1–2 分鐘）",
                        "抵達目的地後，開啟「資料漫遊」即可上網",
                      ],
                      android: [
                        "前往「設定 > 網路與網際網路 > SIM 卡」",
                        "點擊「新增 eSIM」或「+」按鈕",
                        "掃描訂單頁面的 QR Code 並確認安裝",
                        "將新 eSIM 設為行動數據，並開啟漫遊",
                      ],
                      tip: "提示：請於出發前、有 Wi-Fi 時先安裝 eSIM。安裝後抵達當地才開啟漫遊即可。",
                      full: "查看完整安裝教學",
                    },
                    "zh-CN": {
                      intro: "购买后，QR Code 会即时显示于订单页面并发送至您的邮箱。按以下步骤即可安装 eSIM：",
                      iphoneTitle: "iPhone 安装步骤",
                      androidTitle: "Android 安装步骤",
                      iphone: [
                        "前往「设置 > 蜂窝网络」，点击「添加 eSIM」",
                        "选择「使用 QR 码」并扫描订单页面的 QR Code",
                        "点击「继续」完成安装（约 1–2 分钟）",
                        "抵达目的地后，开启「数据漫游」即可上网",
                      ],
                      android: [
                        "前往「设置 > 网络和互联网 > SIM 卡」",
                        "点击「添加 eSIM」或「+」按钮",
                        "扫描订单页面的 QR Code 并确认安装",
                        "将新 eSIM 设为移动数据，并开启漫游",
                      ],
                      tip: "提示：请于出发前、有 Wi-Fi 时先安装 eSIM。安装后抵达当地再开启漫游即可。",
                      full: "查看完整安装教程",
                    },
                    en: {
                      intro: "After purchase, your QR Code appears instantly on the order page and is emailed to you. Follow these steps to install your eSIM:",
                      iphoneTitle: "iPhone Installation",
                      androidTitle: "Android Installation",
                      iphone: [
                        'Go to Settings > Cellular, tap "Add eSIM"',
                        'Choose "Use QR Code" and scan the QR on your order page',
                        'Tap "Continue" to finish (about 1–2 minutes)',
                        "On arrival, turn on Data Roaming to get online",
                      ],
                      android: [
                        "Go to Settings > Network & internet > SIMs",
                        'Tap "Add eSIM" or the "+" button',
                        "Scan the QR on your order page and confirm install",
                        "Set the new eSIM as mobile data and enable roaming",
                      ],
                      tip: "Tip: Install the eSIM before departure while on Wi-Fi. Enable roaming only after you arrive.",
                      full: "View full installation guide",
                    },
                  };
                  const installCopyExtra: typeof installCopy = {
                    ja: {
                      intro: "ご購入後、QRコードは即座に注文ページに表示され、メールでも送信されます。以下の手順でeSIMをインストールしてください：",
                      iphoneTitle: "iPhone インストール手順",
                      androidTitle: "Android インストール手順",
                      iphone: [
                        "「設定 > モバイル通信」に移動し、「eSIMを追加」をタップ",
                        "「QRコードを使用」を選択し、注文ページのQRコードをスキャン",
                        "「続ける」をタップしてインストール完了（約1〜2分）",
                        "目的地に到着後、「データローミング」をオンにして接続",
                      ],
                      android: [
                        "「設定 > ネットワークとインターネット > SIM」に移動",
                        "「eSIMを追加」または「+」ボタンをタップ",
                        "注文ページのQRコードをスキャンしてインストールを確認",
                        "新しいeSIMをモバイルデータに設定し、ローミングを有効化",
                      ],
                      tip: "ヒント：出発前にWi-Fi環境でeSIMをインストールしてください。現地到着後にローミングを有効にするだけで接続できます。",
                      full: "完全なインストールガイドを見る",
                    },
                    ko: {
                      intro: "구매 후 QR 코드가 주문 페이지에 즉시 표시되고 이메일로도 전송됩니다. 다음 단계에 따라 eSIM을 설치하세요：",
                      iphoneTitle: "iPhone 설치 방법",
                      androidTitle: "Android 설치 방법",
                      iphone: [
                        "'설정 > 셀룰러'로 이동하여 'eSIM 추가'를 탭",
                        "'QR 코드 사용'을 선택하고 주문 페이지의 QR 코드를 스캔",
                        "'계속'을 탭하여 설치 완료（약 1~2분）",
                        "목적지 도착 후 '데이터 로밍'을 켜서 인터넷 연결",
                      ],
                      android: [
                        "'설정 > 네트워크 및 인터넷 > SIM'으로 이동",
                        "'eSIM 추가' 또는 '+' 버튼을 탭",
                        "주문 페이지의 QR 코드를 스캔하고 설치 확인",
                        "새 eSIM을 모바일 데이터로 설정하고 로밍 활성화",
                      ],
                      tip: "팁：출발 전 Wi-Fi 환경에서 eSIM을 미리 설치하세요. 현지 도착 후 로밍만 켜면 바로 사용 가능합니다.",
                      full: "전체 설치 가이드 보기",
                    },
                    th: {
                      intro: "หลังจากซื้อแล้ว QR Code จะแสดงบนหน้าคำสั่งซื้อทันทีและส่งไปยังอีเมลของคุณ ทำตามขั้นตอนเหล่านี้เพื่อติดตั้ง eSIM：",
                      iphoneTitle: "ขั้นตอนการติดตั้ง iPhone",
                      androidTitle: "ขั้นตอนการติดตั้ง Android",
                      iphone: [
                        "ไปที่ 'การตั้งค่า > เซลลูลาร์' และ 'เพิ่ม eSIM'",
                        "เลือก 'ใช้ QR Code' และสแกน QR Code ในหน้าคำสั่งซื้อ",
                        "แตะ 'ดำเนินการต่อ' เพื่อติดตั้งให้เสร็จสิ้น（ประมาณ 1-2 นาที）",
                        "เมื่อถึงปลายทาง เปิด 'Data Roaming' เพื่อเชื่อมต่ออินเทอร์เน็ต",
                      ],
                      android: [
                        "ไปที่ 'การตั้งค่า > เครือข่ายและอินเทอร์เน็ต > ซิมการ์ด'",
                        "แตะ 'เพิ่ม eSIM' หรือปุ่ม '+'",
                        "สแกน QR Code ในหน้าคำสั่งซื้อและยืนยันการติดตั้ง",
                        "ตั้งค่า eSIM ใหม่เป็นข้อมูลมือถือและเปิดใช้งานโรมมิ่ง",
                      ],
                      tip: "เคล็ดลับ：ติดตั้ง eSIM ก่อนออกเดินทางขณะที่มี Wi-Fi เปิดโรมมิ่งเมื่อถึงปลายทางเท่านั้น",
                      full: "ดูคู่มือการติดตั้งฉบับเต็ม",
                    },
                  };
                  const allInstallCopy = { ...installCopy, ...installCopyExtra };
                  const c = allInstallCopy[language] ?? allInstallCopy["zh-TW"];
                  const StepList = ({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: string[] }) => (
                    <div className="bg-white rounded-2xl border border-border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">{icon}</span>
                        <h4 className="font-semibold text-foreground">{title}</h4>
                      </div>
                      <ol className="space-y-3">
                        {steps.map((s, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">{i + 1}</span>
                            <span className="text-sm text-muted-foreground leading-relaxed">{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/15 p-4">
                        <QrCode className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.intro}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <StepList title={c.iphoneTitle} icon={<Apple className="w-5 h-5" />} steps={c.iphone} />
                        <StepList title={c.androidTitle} icon={<Smartphone className="w-5 h-5" />} steps={c.android} />
                      </div>
                      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4">
                        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">{c.tip}</p>
                      </div>
                      <Link href="/how-to-install" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                        {c.full}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Purchase Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-24">
              <div className="text-3xl font-bold text-primary mb-1">{displayPrice}</div>
              <div className="text-sm text-muted-foreground mb-4">{currency.code}</div>

              <Separator className="mb-4" />

              {/* Qty */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-foreground">{t.productDetail.qty}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setQty(q => Math.min(10, q + 1))}
                    disabled={qty >= 10}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex flex-col mb-6 bg-muted rounded-xl p-3 gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{t.productDetail.total}</span>
                  <span className="text-lg font-bold text-primary">{displayTotal}</span>
                </div>
                {currency.code !== "HKD" && (
                  <div className="flex items-center justify-end gap-1">
                    <p className="text-xs text-muted-foreground">
                      {language === "en" ? `≈ HK$${total.toLocaleString()} · Charged in HKD`
                        : language === "zh-CN" ? `≈ HK$${total.toLocaleString()} · 以港元结算`
                        : language === "ja" ? `≈ HK$${total.toLocaleString()} · HKD で請求`
                        : language === "ko" ? `≈ HK$${total.toLocaleString()} · HKD로 청구`
                        : language === "th" ? `≈ HK$${total.toLocaleString()} · ชำระเป็น HKD`
                        : `≈ HK$${total.toLocaleString()} · 以港元結算`}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {language === "en"
                            ? "Stripe processes all payments in HKD. The displayed amount in your selected currency is an estimate. Your bank will apply its own exchange rate."
                            : language === "zh-CN"
                            ? "Stripe 以港元结算所有付款。所选货币的显示金额仅供参考，实际收费以您銀行的实时汇率为准。"
                            : language === "ja"
                            ? "Stripe はすべての支払いを HKD で処理します。表示金額は目安であり、実際の請求はお客様の銀行の為替レートにより異なる場合があります。"
                            : language === "ko"
                            ? "Stripe는 모든 결제를 HKD로 처리합니다. 표시된 금액은 참고용이며, 실제 청구 금액은 은행 환율에 따라 다를 수 있습니다."
                            : language === "th"
                            ? "Stripe ชำระเงินทั้งหมดเป็น HKD ยอดเงินที่แสดงเป็นการประมาณเท่านั้น"
                            : "Stripe 以港元結算所有付款。所選貨幣的顯示金額僅供參考，實際收費以您銀行的即時匯率為準。"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* New user promo code hint */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-1 text-center">
                <p className="text-xs text-green-700 leading-relaxed">
                  🎁 {language === "en"
                    ? <>New user? Enter code <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> <span className="font-medium">on the Stripe checkout page</span> for 10% off</>
                    : language === "zh-CN"
                    ? <>新用户优惠：在 Stripe <span className="font-medium">付款页面</span>输入 <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> 享9折</>
                    : language === "ja"
                    ? <>新規ユーザー：Stripe <span className="font-medium">決済ページ</span>で <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> を入力して10%オフ</>
                    : language === "ko"
                    ? <>신규 회원: Stripe <span className="font-medium">결제 페이지</span>에서 <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> 입력 시 10% 할인</>
                    : language === "th"
                    ? <>สมาชิกใหม่: ใส่ <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> ใน<span className="font-medium">หน้าชำระเงิน Stripe</span> ลด 10%</>
                    : <>新用戶優惠：在 Stripe <span className="font-medium">付款頁面</span>輸入 <span className="font-bold tracking-widest bg-green-100 px-1.5 py-0.5 rounded text-green-800">NEW10</span> 享9折</>}
                </p>
              </div>
              {/* Actions */}
              <div className="space-y-3">
                {/* Referral code input */}
                {isAuthenticated && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {language === "en" ? "Referral Code (optional)" : language === "zh-CN" ? "推荐码（可选）" : language === "ja" ? "紹介コード（任意）" : language === "ko" ? "추천 코드 (선택)" : language === "th" ? "รหัสแนะนำ (ไม่บังคับ)" : "推薦碼（可選）"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setReferralCode(val);
                          setReferralValidation({ status: val.trim() ? "checking" : "idle" });
                          if (validateTimeoutRef.current) clearTimeout(validateTimeoutRef.current);
                          if (!val.trim()) return;
                          validateTimeoutRef.current = setTimeout(async () => {
                            try {
                              const result = await trpcUtils.referral.validate.fetch({ code: val.trim() });
                              if (result.valid) {
                                setReferralValidation({ status: "valid", discountPct: result.discountPct });
                              } else {
                                setReferralValidation({
                                  status: "invalid",
                                  message: language === "en" ? "Invalid or inactive referral code" : language === "zh-CN" ? "推荐码无效或已停用" : language === "ja" ? "紹介コードが無効または無効化されています" : language === "ko" ? "유효하지 않거나 비활성화된 추천 코드" : language === "th" ? "รหัสแนะนำไม่ถูกต้องหรือถูกปิดใช้งาน" : "推薦碼無效或已停用",
                                });
                              }
                            } catch {
                              setReferralValidation({ status: "invalid", message: language === "en" ? "Unable to verify code" : language === "zh-CN" ? "无法验证推荐码" : language === "ja" ? "コードを確認できません" : language === "ko" ? "코드를 확인할 수 없습니다" : language === "th" ? "ไม่สามารถตรวจสอบรหัสได้" : "無法驗證推薦碼" });
                            }
                          }, 600);
                        }}
                        placeholder={language === "en" ? "Enter referral code" : language === "zh-CN" ? "输入推荐码" : language === "ja" ? "紹介コードを入力" : language === "ko" ? "추천 코드 입력" : language === "th" ? "ใส่รหัสแนะนำ" : "輸入推薦碼"}
                        maxLength={20}
                        className={`flex-1 h-9 rounded-md border bg-background px-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                          referralValidation.status === "valid"
                            ? "border-green-500 focus:ring-green-400"
                            : referralValidation.status === "invalid"
                            ? "border-red-400 focus:ring-red-300"
                            : "border-input"
                        }`}
                      />
                    </div>
                    {referralValidation.status === "checking" && (
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {language === "en" ? "Checking..." : language === "zh-CN" ? "验证中..." : language === "ja" ? "確認中..." : language === "ko" ? "확인 중..." : language === "th" ? "กำลังตรวจสอบ..." : "驗證中..."}
                      </p>
                    )}
                    {referralValidation.status === "valid" && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ {language === "en"
                          ? `Valid! ${100 - (referralValidation.discountPct ?? 10)}% off applied`
                          : language === "zh-CN"
                          ? `推荐码有效！已享受${100 - (referralValidation.discountPct ?? 10)}折优惠`
                          : language === "ja" ? `紹介コード有効！${referralValidation.discountPct ?? 10}%オフ適用中`
                          : language === "ko" ? `추천 코드 유효! ${referralValidation.discountPct ?? 10}% 할인 적용`
                          : language === "th" ? `รหัสถูกต้อง! ลด ${referralValidation.discountPct ?? 10}%`
                          : `推薦碼有效！已享受 ${(100 - (referralValidation.discountPct ?? 10)) / 10} 折優惠`}
                      </p>
                    )}
                    {referralValidation.status === "invalid" && (
                      <p className="text-xs text-red-500">
                        ✗ {referralValidation.message}
                      </p>
                    )}
                  </div>
                )}
                {/* Start date picker for ACTIVATE_ON_ORDER products */}
                {product.activationPolicy === 'ACTIVATE_ON_ORDER' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-medium text-blue-700">
                        {language === 'en' ? 'Select Activation Date (Optional)'
                          : language === 'zh-CN' ? '选择启用日期（可选）'
                          : language === 'ja' ? '開始日を選択（任意）'
                          : language === 'ko' ? '활성화 날짜 선택 (선택사항)'
                          : language === 'th' ? 'เลือกวันเริ่มใช้งาน (ไม่บังคับ)'
                          : '選擇啟用日期（可選）'}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={selectedStartDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setSelectedStartDate(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      className="w-full h-9 rounded-md border border-blue-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <p className="text-xs text-blue-600">
                      {language === 'en' ? 'Leave blank to activate immediately after payment'
                        : language === 'zh-CN' ? '留空则付款后立即开始计时'
                        : language === 'ja' ? '空白のままにすると、支払い後すぐに開始します'
                        : language === 'ko' ? '비워두면 결제 후 즉시 시작됩니다'
                        : language === 'th' ? 'เว้นว่างไว้เพื่อเริ่มทันทีหลังชำระเงิน'
                        : '留空則付款後立即開始計時'}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {language === "en"
                      ? "After payment, please wait a few seconds. Do not tap repeatedly or go back."
                      : language === "zh-CN"
                      ? "付款后请耐心等候数秒，期间请勿重复点击或返回。"
                      : language === "ja"
                      ? "お支払い後、数秒お待ちください。繰り返しタップしたり戻ったりしないでください。"
                      : language === "ko"
                      ? "결제 후 잠시 기다려 주세요. 반복 탭하거나 뒤로 가지 마세요."
                      : language === "th"
                      ? "หลังชำระเงิน กรุณารอสักครู่ อย่ากดซ้ำหรือกลับหน้าก่อน"
                      : "付款後請耐心等候數秒，期間請勿重複點擊或返回。"}
                  </p>
                </div>
                {/* Discount breakdown when referral code is valid */}
                {referralValidation.status === "valid" && (() => {
                  const discountPct = referralValidation.discountPct ?? 10;
                  const discountedTotal = Math.round(price * qty * (1 - discountPct / 100));
                  const displayOriginal = currency.code === "HKD"
                    ? `${currency.symbol}${(price * qty).toLocaleString()}`
                    : `${currency.symbol}${Math.round(price * qty * currencyRate).toLocaleString()}`;
                  const displayDiscounted = currency.code === "HKD"
                    ? `${currency.symbol}${discountedTotal.toLocaleString()}`
                    : `${currency.symbol}${Math.round(discountedTotal * currencyRate).toLocaleString()}`;
                  return (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground line-through">{displayOriginal}</span>
                        <span className="text-sm font-bold text-green-700">{displayDiscounted}</span>
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        {language === "en" ? `${100 - discountPct}% off` : language === "ja" ? `${100 - discountPct}%オフ` : language === "ko" ? `${100 - discountPct}% 할인` : language === "th" ? `ลด ${100 - discountPct}%` : `${(100 - discountPct) / 10} 折`}
                      </span>
                    </div>
                  );
                })()}
                <Button
                  type="button"
                  className="w-full bg-primary hover:bg-primary/90 text-white h-11"
                  onClick={handleBuyNow}
                  disabled={checkoutMutation.isPending || addToCartMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.checkout.processing}</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" />{t.productDetail.buyNow}</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t.productDetail.addToCart}
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                {[t.home.feature1Title, t.home.feature4Title].map((label) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
