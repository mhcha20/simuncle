import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Settings, Percent, RefreshCw, ShieldAlert, Package, Bell, ShoppingBag, MessageCircle, MapPin, X, TrendingUp, ChevronLeft, ChevronRight, Download, AlertCircle, CheckCircle2, FileText, Gift } from "lucide-react";
import { countryNameMap } from "@/lib/countryNames";
import { useLanguage } from "@/contexts/LanguageContext";

// Safe flag emoji generator — handles special codes (EU33, GL, etc.) that don't map to ISO flags
function getCountryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "EU33" || upper === "EU") return "🇪🇺";
  if (upper === "GL" || upper === "GLOBAL") return "🌐";
  if (upper.length !== 2) return "🌐";
  try {
    const codePoints = upper.split("").map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}

function SearchAnalyticsCard({ language }: { language: string }) {
  const topSearchesQuery = trpc.analytics.topSearches.useQuery({ limit: 20 }, { staleTime: 60 * 1000 });
  const data = topSearchesQuery.data ?? [];
  const maxCount = data.length > 0 ? data[0].count : 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {language === "en" ? "Search Analytics" : language === "zh-CN" ? "搜索分析" : "搜尋分析"}
        </CardTitle>
        <CardDescription>
          {language === "en"
            ? "Top searched destinations by users. Helps you understand demand and adjust your product selection."
            : language === "zh-CN"
            ? "用户最常搜索的目的地，帮助了解需求并调整选品。"
            : "用戶最常搜尋的目的地，幫助了解需求並調整選品。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topSearchesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">{language === "en" ? "Loading..." : "載入中..."}</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">{language === "en" ? "No search data yet." : language === "zh-CN" ? "暂无搜索数据。" : "暫無搜尋資料。"}</div>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => (
              <div key={item.query} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.countryCode ? `${getCountryFlag(item.countryCode)} ` : ''}{item.query}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.count}x</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [markupValue, setMarkupValue] = useState("");
  const [hkdRateValue, setHkdRateValue] = useState("");
  const [whatsappValue, setWhatsappValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<Record<string, string>>({ jpy_rate: "19.5", krw_rate: "175", thb_rate: "4.5" });
  const [isSavingCurrency, setIsSavingCurrency] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<{ productId: string; error: string }[]>([]);
  const [isSyncingTgt, setIsSyncingTgt] = useState(false);
  const [syncTgtErrors, setSyncTgtErrors] = useState<{ productId: string; error: string }[]>([]);
  const [popularCountries, setPopularCountries] = useState<string[]>(["JP", "KR", "TH", "GB", "US", "AU"]);
  const [popularInput, setPopularInput] = useState("");
  const [popularSuggestions, setPopularSuggestions] = useState<{code: string; label: string}[]>([]);
  const [isSavingPopular, setIsSavingPopular] = useState(false);

  const settingsQuery = trpc.settings.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const setSettingMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Setting saved" : language === "zh-CN" ? "设置已保存" : "設定已儲存");
      settingsQuery.refetch();
      setIsSaving(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsSaving(false);
    },
  });

  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const currencyRatesUpdatedAtQuery = trpc.settings.getCurrencyRatesUpdatedAt.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const fetchRatesMutation = trpc.settings.fetchAndUpdateRates.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "en"
          ? `Updated ${data.updatedCount} exchange rates`
          : language === "zh-CN"
          ? `已更新 ${data.updatedCount} 個匯率`
          : `已更新 ${data.updatedCount} 個匯率`
      );
      settingsQuery.refetch();
      currencyRatesUpdatedAtQuery.refetch();
      setIsFetchingRates(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsFetchingRates(false);
    },
  });

  const syncHistoryQuery = trpc.products.getSyncHistory.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    staleTime: 30 * 1000,
  });
  const syncTgtMutation = trpc.products.syncTgt.useMutation({
    onSuccess: (data: { synced: number; total: number; parsedFromNameCount?: number; errors: { productId: string; error: string }[] }) => {
      const errs = data.errors ?? [];
      const parsed = data.parsedFromNameCount ?? 0;
      setSyncTgtErrors(errs);
      const parsedNote = parsed > 0
        ? (language === "en" ? ` (${parsed} data amounts parsed from name)` : ` （${parsed} 個產品數據量從名稱解析）`)
        : "";
      if (errs.length > 0) {
        toast.warning(
          language === "en"
            ? `TGT: Synced ${data.synced}/${data.total} products (${errs.length} failed)${parsedNote}`
            : `TGT：已同步 ${data.synced}/${data.total} 個產品（${errs.length} 個失敗）${parsedNote}`
        );
      } else {
        toast.success(
          language === "en"
            ? `TGT: Synced ${data.synced} products successfully${parsedNote}`
            : `TGT：已成功同步 ${data.synced} 個產品${parsedNote}`
        );
      }
      setIsSyncingTgt(false);
      syncHistoryQuery.refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(`TGT: ${err.message}`);
      setIsSyncingTgt(false);
      syncHistoryQuery.refetch();
    },
  });

  const syncMutation = trpc.products.sync.useMutation({
    onSuccess: (data: { synced: number; total: number; errors: { productId: string; error: string }[] }) => {
      const errs = data.errors ?? [];
      setSyncErrors(errs);
      if (errs.length > 0) {
        toast.warning(
          language === "en"
            ? `Synced ${data.synced}/${data.total} products (${errs.length} failed)`
            : language === "zh-CN"
            ? `已同步 ${data.synced}/${data.total} 个产品（${errs.length} 个失败）`
            : `已同步 ${data.synced}/${data.total} 個產品（${errs.length} 個失敗）`
        );
      } else {
        toast.success(
          language === "en"
            ? `Synced ${data.synced} products successfully`
            : language === "zh-CN"
            ? `已成功同步 ${data.synced} 个产品`
            : `已成功同步 ${data.synced} 個產品`
        );
      }
      setIsSyncing(false);
      syncHistoryQuery.refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsSyncing(false);
      syncHistoryQuery.refetch();
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setMarkupValue(settingsQuery.data["markup_percentage"] ?? "0");
      setHkdRateValue(settingsQuery.data["hkd_rate"] ?? "7.8");
      setWhatsappValue(settingsQuery.data["whatsapp_number"] ?? "");
      setCurrencyRates({
        jpy_rate: settingsQuery.data["jpy_rate"] ?? "19.5",
        krw_rate: settingsQuery.data["krw_rate"] ?? "175",
        thb_rate: settingsQuery.data["thb_rate"] ?? "4.5",
      });
      const saved = settingsQuery.data["popular_countries"];
      if (saved) {
        try { setPopularCountries(JSON.parse(saved)); } catch {}
      }
    }
  }, [settingsQuery.data]);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {language === "en" ? "Admin Access Required" : language === "zh-CN" ? "需要管理员权限" : "需要管理員權限"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en"
            ? "You must be an admin to access this page."
            : language === "zh-CN"
            ? "您必须是管理员才能访问此页面。"
            : "您必須是管理員才能訪問此頁面。"}
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === "en" ? "Back to Home" : language === "zh-CN" ? "返回首页" : "返回首頁"}
          </Button>
        </Link>
      </div>
    );
  }

  const handleSaveMarkup = () => {
    const val = parseFloat(markupValue);
    if (isNaN(val) || val < 0 || val > 500) {
      toast.error(
        language === "en" ? "Please enter a valid percentage (0–500)" : language === "zh-CN" ? "请输入有效百分比（0–500）" : "請輸入有效百分比（0–500）"
      );
      return;
    }
    setIsSaving(true);
    setSettingMutation.mutate({ key: "markup_percentage", value: String(val) });
  };

  const currentMarkup = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
  const currentHkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");
  const exampleCost = 10;
  const exampleRetail = exampleCost * (1 + currentMarkup / 100);
  const exampleRetailHkd = Math.round(exampleRetail * currentHkdRate);

  const handleSaveHkdRate = () => {
    const val = parseFloat(hkdRateValue);
    if (isNaN(val) || val < 1 || val > 100) {
      toast.error(language === "en" ? "Please enter a valid rate (1–100)" : language === "zh-CN" ? "请输入有效汇率（1–90）" : "請輸入有效匯率（1–90）");
      return;
    }
    setIsSavingRate(true);
    setSettingMutation.mutate({ key: "hkd_rate", value: String(val) }, {
      onSuccess: () => setIsSavingRate(false),
      onError: () => setIsSavingRate(false),
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {language === "en" ? "Admin Settings" : language === "zh-CN" ? "管理员设置" : "管理員設定"}
          </h1>
          <Badge variant="secondary">Admin</Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Markup Setting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              {language === "en" ? "Retail Markup" : language === "zh-CN" ? "零售加成" : "零售加成"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Set the percentage markup applied on top of Vizlync cost prices. This affects all product prices shown to customers."
                : language === "zh-CN"
                ? "设置在 Vizlync 成本价基础上的加成百分比。这会影响向客户显示的所有产品价格。"
                : "設定在 Vizlync 成本價基礎上的加成百分比。這會影響向客戶顯示的所有產品價格。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="markup">
                  {language === "en" ? "Markup Percentage (%)" : language === "zh-CN" ? "加成百分比 (%)" : "加成百分比 (%)"}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    max="500"
                    step="0.1"
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    className="pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <Button onClick={handleSaveMarkup} disabled={isSaving}>
                {isSaving
                  ? (language === "en" ? "Saving..." : language === "zh-CN" ? "保存中..." : "儲存中...")
                  : (language === "en" ? "Save" : language === "zh-CN" ? "保存" : "儲存")}
              </Button>
            </div>

            {/* Live preview */}
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <p className="font-medium text-muted-foreground">
                {language === "en" ? "Preview (example $10 cost)" : language === "zh-CN" ? "预览（示例成本 $10）" : "預覽（示例成本 $10）"}
              </p>
              <div className="flex justify-between">
                <span>{language === "en" ? "Cost price" : language === "zh-CN" ? "成本价" : "成本價"}</span>
                <span className="font-mono">${exampleCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "en" ? "Markup" : language === "zh-CN" ? "加成" : "加成"}</span>
                <span className="font-mono text-amber-600">+{currentMarkup}%</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>{language === "en" ? "Retail price (USD)" : language === "zh-CN" ? "零售价 (USD)" : "零售價 (USD)"}</span>
                <span className="font-mono">${exampleRetail.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{language === "en" ? "Retail price (HKD)" : language === "zh-CN" ? "零售价 (HKD)" : "零售價 (HKD)"}</span>
                <span className="font-mono text-primary">HK${exampleRetailHkd}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HKD Exchange Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">HK$</span>
              {language === "en" ? "HKD Exchange Rate" : language === "zh-CN" ? "HKD 汇率" : "HKD 匯率"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Set the USD to HKD exchange rate used for all customer-facing prices and Stripe checkout."
                : language === "zh-CN"
                ? "设置用于所有客户价格和 Stripe 结账的 USD 对 HKD 汇率。"
                : "設定用於所有客戶價格和 Stripe 結帳的 USD 對 HKD 匯率。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="hkdRate">
                  {language === "en" ? "1 USD = ? HKD" : language === "zh-CN" ? "1 USD = ? HKD" : "1 USD = ? HKD"}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="hkdRate"
                    type="number"
                    min="1"
                    max="100"
                    step="0.01"
                    value={hkdRateValue}
                    onChange={(e) => setHkdRateValue(e.target.value)}
                    className="pr-16"
                    placeholder="7.8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">HKD</span>
                </div>
              </div>
              <Button onClick={handleSaveHkdRate} disabled={isSavingRate}>
                {isSavingRate
                  ? (language === "en" ? "Saving..." : language === "zh-CN" ? "保存中..." : "儲存中...")
                  : (language === "en" ? "Save" : language === "zh-CN" ? "保存" : "儲存")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "en"
                ? `Current rate: 1 USD = ${currentHkdRate} HKD. All prices shown to customers are rounded to the nearest integer.`
                : language === "zh-CN"
                ? `当前汇率：1 USD = ${currentHkdRate} HKD。客户看到的所有价格将四舍五入为整数。`
                : `目前匯率：1 USD = ${currentHkdRate} HKD。客戶看到的所有價格將四捨五入為整數。`}
            </p>
          </CardContent>
        </Card>

        {/* Multi-Currency Display Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">💱</span>
              {language === "en" ? "Multi-Currency Display Rates" : language === "zh-CN" ? "多货币显示汇率" : "多貨幣顯示匯率"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Set display rates for Japanese, Korean, and Thai users. These convert HKD prices for display only — Stripe Adaptive Pricing handles actual payment currency automatically."
                : language === "zh-CN"
                ? "设置日语、韩语、泰语用户的显示汇率。仅用于展示，实际付款货币由 Stripe Adaptive Pricing 自动处理。"
                : "設定日文、韓文、泰文用戶的顯示匯率。僅用於展示，實際付款貨幣由 Stripe Adaptive Pricing 自動處理。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { key: "jpy_rate", label: "日本語 (JPY)", symbol: "¥", placeholder: "19.5" },
              { key: "krw_rate", label: "한국어 (KRW)", symbol: "₩", placeholder: "175" },
              { key: "thb_rate", label: "ภาษาไทย (THB)", symbol: "฿", placeholder: "4.5" },
            ] as const).map(({ key, label, symbol, placeholder }) => {
              const currentRate = parseFloat(currencyRates[key] ?? placeholder);
              const exampleHkd = Math.round(10 * currentHkdRate);
              const exampleLocal = Math.round(exampleHkd * currentRate);
              return (
                <div key={key} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>{label} — 1 HKD = ? {key.replace("_rate", "").toUpperCase()}</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={currencyRates[key] ?? placeholder}
                        onChange={(e) => setCurrencyRates(prev => ({ ...prev, [key]: e.target.value }))}
                        className="pr-16"
                        placeholder={placeholder}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{symbol}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {`${language === "en" ? "e.g." : "例"} USD 10 → HK$${exampleHkd} → ${symbol}${exampleLocal.toLocaleString()}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const val = parseFloat(currencyRates[key] ?? placeholder);
                      if (isNaN(val) || val <= 0) { toast.error(language === "en" ? "Invalid rate" : "無效匯率"); return; }
                      setIsSavingCurrency(key);
                      setSettingMutation.mutate({ key, value: String(val) }, {
                        onSuccess: () => setIsSavingCurrency(null),
                        onError: () => setIsSavingCurrency(null),
                      });
                    }}
                    disabled={isSavingCurrency === key}
                    variant="outline"
                  >
                    {isSavingCurrency === key
                      ? (language === "en" ? "Saving..." : "儲存中...")
                      : (language === "en" ? "Save" : language === "zh-CN" ? "保存" : "儲存")}
                  </Button>
                </div>
              );
            })}
            {/* Auto-fetch rates button */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {language === "en" ? "Auto-fetch Latest Rates" : language === "zh-CN" ? "自动获取最新匯率" : "自动取得最新匯率"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "en"
                      ? "Fetch 22 live exchange rates from open.er-api.com (based on HKD) and update all settings at once."
                      : language === "zh-CN"
                      ? "自 open.er-api.com 获取 22 种实时匯率（以 HKD 为基准）并一次更新所有设置。"
                      : "自 open.er-api.com 取得 22 種即時匯率（以 HKD 為基準）並一次更新所有設定。"}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setIsFetchingRates(true);
                    fetchRatesMutation.mutate();
                  }}
                  disabled={isFetchingRates}
                  variant="outline"
                  className="shrink-0 ml-4"
                >
                  {isFetchingRates ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{language === "en" ? "Fetching..." : language === "zh-CN" ? "获取中..." : "取得中..."}</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />{language === "en" ? "Fetch Rates" : language === "zh-CN" ? "获取匯率" : "取得匯率"}</>
                  )}
                </Button>
              </div>
              {currencyRatesUpdatedAtQuery.data?.updatedAt && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {language === "en" ? "Last updated: " : language === "zh-CN" ? "上次更新：" : "上次更新："}
                  {new Date(currencyRatesUpdatedAtQuery.data.updatedAt).toLocaleString(
                    language === "en" ? "en-HK" : language === "zh-CN" ? "zh-CN" : language === "ja" ? "ja-JP" : language === "ko" ? "ko-KR" : language === "th" ? "th-TH" : "zh-HK",
                    { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Product Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {language === "en" ? "Product Management" : language === "zh-CN" ? "产品管理" : "產品管理"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "View all products, search, and enable or disable individual products from the storefront."
                : language === "zh-CN"
                ? "查看所有产品，搜索并启用或停用单个产品。"
                : "查看所有產品，搜尋並啟用或停用個別產品。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/products">
              <Button className="gap-2">
                <Package className="w-4 h-4" />
                {language === "en" ? "Manage Products" : language === "zh-CN" ? "管理产品" : "管理產品"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notifications Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {language === "en" ? "Notifications" : language === "zh-CN" ? "通知管理" : "通知管理"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Manage website announcement banners and send push notifications to subscribers."
                : language === "zh-CN"
                ? "管理网站公告横幅，并向已订阅用户发送推送通知。"
                : "管理網站公告橫幅，並向已訂閱用戶發送推播通知。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/announcements">
              <Button className="gap-2">
                <Bell className="w-4 h-4" />
                {language === "en" ? "Manage Notifications" : language === "zh-CN" ? "管理通知" : "管理通知"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Article Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {language === "en" ? "Tips & Info Articles" : language === "zh-CN" ? "实用资讯文章" : "實用資訊文章"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Write and manage multilingual articles with one-click AI translation into 6 languages."
                : language === "zh-CN"
                ? "撰写和管理多语言文章，支持一键 AI 翻译成 6 种语言。"
                : "撰寫和管理多語言文章，支援一鍵 AI 翻譯成 6 種語言。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/articles">
              <Button className="gap-2">
                <FileText className="w-4 h-4" />
                {language === "en" ? "Manage Articles" : language === "zh-CN" ? "管理文章" : "管理文章"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Order Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {language === "en" ? "Order Management" : language === "zh-CN" ? "订单管理" : "訂單管理"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "View all orders, search by email or order ID, filter by status, and resend confirmation emails."
                : language === "zh-CN"
                ? "查看所有订单，按电邮或订单号搜索，按状态筛选，并重新发送确认邮件。"
                : "查看所有訂單，按電郵或訂單號搜尋，按狀態篩選，並重新發送確認電郵。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/orders">
              <Button className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                {language === "en" ? "Manage Orders" : language === "zh-CN" ? "管理订单" : "管理訂單"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* SE Ranking SEO Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {language === "en" ? "SEO Dashboard" : language === "zh-CN" ? "SEO 仪表板" : "SEO 儀表板"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Monitor website health score, SEO issues, backlinks, and domain authority powered by SE Ranking."
                : language === "zh-CN"
                ? "由 SE Ranking 提供：監控網站健康分數、SEO 問題、反向連結及域名權威度。"
                : "由 SE Ranking 提供：監控網站健康分數、SEO 問題、反向連結及域名權威度。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/seo">
              <Button className="gap-2">
                <TrendingUp className="w-4 h-4" />
                {language === "en" ? "View SEO Dashboard" : language === "zh-CN" ? "查看 SEO 仪表板" : "查看 SEO 儀表板"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              推薦計劃管理
            </CardTitle>
            <CardDescription>
              查看所有推薦記錄、佣金統計，並標記佣金已付款。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/referral">
              <Button className="gap-2">
                <Gift className="w-4 h-4" />
                查看推薦計劃
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Popular Destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {language === "en" ? "Popular Destinations" : language === "zh-CN" ? "热门目的地" : "熱門目的地"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Customize the quick-access destination buttons shown on the homepage and products page."
                : language === "zh-CN"
                ? "自定义首页和产品页面上显示的热门目的地快捷按钮。"
                : "自訂首頁和產品頁面顯示的熱門目的地快捷按鈕。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground mb-1">
              {language === "en" ? "Drag order: use arrows to reorder" : language === "zh-CN" ? "使用箭头调整顺序" : "使用箭頭調整順序"}
            </p>
            <div className="flex flex-col gap-1.5 min-h-[36px]">
              {popularCountries.map((code, idx) => {
                const info = countryNameMap[code];
                const label = language === "zh-TW" ? info?.zhTW : language === "zh-CN" ? info?.zhCN : language === "ja" ? info?.ja : language === "ko" ? info?.ko : language === "th" ? info?.th : info?.en;
                const codePoints = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
                const flag = String.fromCodePoint(...codePoints);
                return (
                  <div key={code} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                    <span className="text-base">{flag}</span>
                    <span className="text-sm font-medium text-primary flex-1">{label ?? code}</span>
                    <span className="text-xs text-muted-foreground mr-1">#{idx + 1}</span>
                    <button
                      disabled={idx === 0}
                      onClick={() => setPopularCountries(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; })}
                      className="p-1 rounded hover:bg-primary/10 disabled:opacity-30 transition-colors"
                      title={language === "en" ? "Move up" : "向前移"}
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button
                      disabled={idx === popularCountries.length - 1}
                      onClick={() => setPopularCountries(prev => { const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; })}
                      className="p-1 rounded hover:bg-primary/10 disabled:opacity-30 transition-colors"
                      title={language === "en" ? "Move down" : "向後移"}
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <button onClick={() => setPopularCountries(prev => prev.filter(c => c !== code))} className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors" title={language === "en" ? "Remove" : "移除"}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {popularCountries.length === 0 && (
                <span className="text-sm text-muted-foreground">{language === "en" ? "No destinations added" : "尚未加入目的地"}</span>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder={language === "en" ? "Type country name to add..." : language === "zh-CN" ? "输入国家名称添加..." : "輸入國家名稱新增..."}
                value={popularInput}
                onChange={(e) => {
                  const q = e.target.value;
                  setPopularInput(q);
                  if (!q.trim()) { setPopularSuggestions([]); return; }
                  const ql = q.toLowerCase();
                  const results = Object.entries(countryNameMap)
                    .filter(([c, n]) => !popularCountries.includes(c) && (n.en.toLowerCase().includes(ql) || n.zhTW.includes(q) || n.zhCN.includes(q) || n.ja.includes(q) || n.ko.includes(q) || n.th.includes(q) || c.toLowerCase().includes(ql)))
                    .slice(0, 6)
                    .map(([code, n]) => ({ code, label: language === "zh-TW" ? n.zhTW : language === "zh-CN" ? n.zhCN : language === "ja" ? n.ja : language === "ko" ? n.ko : language === "th" ? n.th : n.en }));
                  setPopularSuggestions(results);
                }}
                className="h-9"
              />
              {popularSuggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                  {popularSuggestions.map((s) => {
                    const codePoints = s.code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
                    const flag = String.fromCodePoint(...codePoints);
                    return (
                      <button key={s.code} onMouseDown={() => {
                        setPopularCountries(prev => [...prev, s.code]);
                        setPopularInput("");
                        setPopularSuggestions([]);
                      }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 text-left text-sm">
                        <span>{flag}</span><span>{s.label}</span><span className="text-xs text-muted-foreground ml-auto">{s.code}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setIsSavingPopular(true);
                setSettingMutation.mutate({ key: "popular_countries", value: JSON.stringify(popularCountries) }, {
                  onSettled: () => setIsSavingPopular(false),
                });
              }}
              disabled={isSavingPopular}
              className="w-full sm:w-auto"
            >
              {isSavingPopular ? (language === "en" ? "Saving..." : "儲存中...") : (language === "en" ? "Save Destinations" : language === "zh-CN" ? "保存目的地" : "儲存目的地")}
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              {language === "en" ? "WhatsApp Contact" : language === "zh-CN" ? "WhatsApp 客服" : "WhatsApp 客服"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Set your WhatsApp number to show a floating chat button on the website. Leave empty to hide."
                : language === "zh-CN"
                ? "设置您的 WhatsApp 号码，在网站显示浮动聊天按鈕。留空则隐藏。"
                : "設定您的 WhatsApp 號碼，在網站顯示浮動聊天按鈕。留空則隱藏。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="+852 9123 4567"
                value={whatsappValue}
                onChange={(e) => setWhatsappValue(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  setIsSavingWhatsapp(true);
                  setSettingMutation.mutate({ key: "whatsapp_number", value: whatsappValue.trim() }, {
                    onSettled: () => setIsSavingWhatsapp(false),
                  });
                }}
                disabled={isSavingWhatsapp}
                className="shrink-0"
              >
                {isSavingWhatsapp
                  ? (language === "en" ? "Saving..." : "儲存中...")
                  : (language === "en" ? "Save" : "儲存")}
              </Button>
            </div>
            {settingsQuery.data?.["whatsapp_number"] && (
              <p className="text-xs text-muted-foreground">
                {language === "en" ? "Current: " : "目前："}
                <span className="font-medium text-foreground">{settingsQuery.data["whatsapp_number"]}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search Analytics */}
        <SearchAnalyticsCard language={language} />

        {/* TGT Product Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              {language === "en" ? "TGT Product Sync" : language === "zh-CN" ? "TGT 产品同步" : "TGT 產品同步"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Manually sync products from TGT Technology Global API (Sandbox). Products will be prefixed with 'tgt_'."
                : language === "zh-CN"
                ? "手动从 TGT Technology Global API（沙盒）同步产品。产品 ID 将以 'tgt_' 为前缀。"
                : "手動從 TGT Technology Global API（沙盒）同步產品。產品 ID 將以 'tgt_' 為前綴。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setIsSyncingTgt(true);
                setSyncTgtErrors([]);
                syncTgtMutation.mutate();
              }}
              disabled={isSyncingTgt}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingTgt ? "animate-spin" : ""}`} />
              {isSyncingTgt
                ? (language === "en" ? "Syncing TGT..." : "同步 TGT 中...")
                : (language === "en" ? "Sync TGT Now" : language === "zh-CN" ? "立即同步 TGT" : "立即同步 TGT")}
            </Button>

            {syncTgtErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {language === "en" ? `${syncTgtErrors.length} product(s) failed:` : `${syncTgtErrors.length} 個產品失敗：`}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {syncTgtErrors.map((e) => (
                    <div key={e.productId} className="text-xs font-mono">
                      <span className="text-destructive font-semibold">[{e.productId}]</span>{" "}
                      <span className="text-muted-foreground">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vizlync Product Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              {language === "en" ? "Product Sync" : language === "zh-CN" ? "产品同步" : "產品同步"}
            </CardTitle>
            <CardDescription>
              {language === "en"
                ? "Manually trigger a full sync from Vizlync API to update all products, prices, and availability."
                : language === "zh-CN"
                ? "手动触发从 Vizlync API 的完整同步，更新所有产品、价格和可用性。"
                : "手動觸發從 Vizlync API 的完整同步，更新所有產品、價格及可用性。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setIsSyncing(true);
                setSyncErrors([]);
                syncMutation.mutate();
              }}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing
                ? (language === "en" ? "Syncing..." : language === "zh-CN" ? "同步中..." : "同步中...")
                : (language === "en" ? "Sync Now" : language === "zh-CN" ? "立即同步" : "立即同步")}
            </Button>

            {/* Sync error details */}
            {syncErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {language === "en" ? `${syncErrors.length} product(s) failed:` : language === "zh-CN" ? `${syncErrors.length} 个产品失败：` : `${syncErrors.length} 個產品失敗：`}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {syncErrors.map((e) => (
                    <div key={e.productId} className="text-xs font-mono">
                      <span className="text-destructive font-semibold">[{e.productId}]</span>{" "}
                      <span className="text-muted-foreground">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync history */}
            {syncHistoryQuery.data && syncHistoryQuery.data.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {language === "en" ? "Recent Sync History" : language === "zh-CN" ? "最近同步记录" : "最近同步記錄"}
                </p>
                <div className="space-y-1.5">
                  {syncHistoryQuery.data.map((h) => (
                    <div key={h.id} className="flex items-start gap-2 text-xs">
                      {h.status === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground">
                          <span className="font-medium">{h.supplier === "tgt" ? "TGT" : "Vizlync"}</span> ·{" "}
                          {new Date(h.createdAt).toLocaleString()} ·{" "}
                          {h.triggeredBy === "manual"
                            ? (language === "en" ? "Manual" : "手動")
                            : (language === "en" ? "Scheduled" : "排程")}
                        </span>
                        {h.status === "success" ? (
                          <span className="ml-1 text-green-600">
                            {language === "en"
                              ? `${h.totalProducts} products synced`
                              : `同步 ${h.totalProducts} 個產品`}
                            {h.failedCount > 0 && (
                              <span className="ml-1 text-amber-600">
                                · {language === "en" ? `${h.failedCount} failed` : `失敗 ${h.failedCount} 個`}
                              </span>
                            )}
                          </span>
                        ) : (
                          <>
                            {h.failedCount > 0 && (
                              <span className="ml-1 text-amber-600">
                                {language === "en" ? `${h.failedCount} failed` : `失敗 ${h.failedCount} 個`} ·{" "}
                              </span>
                            )}
                            <span className="ml-1 text-destructive truncate block">{h.errorMessage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
