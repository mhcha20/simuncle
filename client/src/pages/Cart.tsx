import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { translatePlanName } from "@/lib/countryNames";
import { formatDataAmount } from "@/lib/dataAmount";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getLoginUrl } from "@/const";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Wifi, Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { trackCancelCheckout } from "@/lib/gtm";

export default function Cart() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Referral code state
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem("referralCode") || "";
  });
  const [referralValidation, setReferralValidation] = useState<{
    status: "idle" | "checking" | "valid" | "invalid";
    discountPct?: number;
    message?: string;
  }>({ status: "idle" });
  const validateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trpcUtils = trpc.useUtils();

  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const utils = trpc.useUtils();
  // useCurrency must be before early returns (Rules of Hooks)
  const { currency, currencyRate } = useCurrency();

  // GTM: 偵測從 Stripe 結帳頁取消返回 (?cancelled=true)，只觸發一次
  const searchStr = useSearch();
  const cancelFiredRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    if (params.get("cancelled") === "true" && !cancelFiredRef.current) {
      cancelFiredRef.current = true;
      trackCancelCheckout();
    }
  }, [searchStr]);

  const updateQtyMutation = trpc.cart.updateQty.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
    onError: () => toast.error(t.common.error),
  });

  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
    onError: () => toast.error(t.common.error),
  });

  const checkoutMutation = trpc.checkout.createCartSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.open(data.url, "_blank");
      setIsCheckingOut(false);
    },
    onError: (err) => {
      toast.error(err.message || t.common.error);
      setIsCheckingOut(false);
    },
  });

  // Guest checkout — Stripe collects email at checkout page
  const guestCheckoutMutation = trpc.checkout.guestCreateSession.useMutation({
    onSuccess: (data) => {
      toast.success(t.checkout.redirecting);
      window.open(data.url, "_blank");
      setIsCheckingOut(false);
    },
    onError: (err) => {
      toast.error(err.message || t.common.error);
      setIsCheckingOut(false);
    },
  });

  const handleCheckout = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setIsCheckingOut(true);
    checkoutMutation.mutate({
      successUrl: `${window.location.origin}/checkout/result`,
      cancelUrl: `${window.location.origin}/cart`,
      locale: language,
      referralCode: referralValidation.status === "valid" ? referralCode.trim() : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t.checkout.loginRequired}</h2>
          <p className="text-muted-foreground mb-6">{t.checkout.loginRequiredDesc}</p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            {t.nav.login}
          </Button>
        </div>
      </div>
    );
  }

  const items = cartQuery.data ?? [];
  const markupPct = parseFloat(settingsQuery.data?.["markup_percentage"] ?? "0");
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");
  const toHkd = (usdPrice: number) => {
    const withMarkup = markupPct > 0 ? usdPrice * (1 + markupPct / 100) : usdPrice;
    return Math.round(withMarkup * hkdRate);
  };
  // Convert HKD amount to display currency
  const toDisplay = (hkdAmount: number) => {
    if (currency.code === "HKD") return `${currency.symbol}${hkdAmount}`;
    return `${currency.symbol}${Math.round(hkdAmount * currencyRate).toLocaleString()}`;
  };
  const subtotal = items.reduce((sum, item) => sum + toHkd(parseFloat(String(item.unitPrice))) * item.quantity, 0);

  // Discounted subtotal when referral code is valid
  const discountPct = referralValidation.status === "valid" ? (referralValidation.discountPct ?? 10) : 0;
  const discountedSubtotal = discountPct > 0 ? Math.round(subtotal * (1 - discountPct / 100)) : subtotal;

  if (cartQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t.cart.empty}</h2>
          <p className="text-muted-foreground mb-6">{t.cart.emptyDesc}</p>
          <Link href="/products">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              {t.cart.browsePlans}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/8 to-secondary/20 border-b border-border py-8">
        <div className="container">
          <h1 className="text-2xl font-bold text-foreground">{t.cart.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? t.cart.item : t.cart.items}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const unitPrice = toHkd(parseFloat(String(item.unitPrice)));
              const itemTotal = unitPrice * item.quantity;
              const productData = item.productData as Record<string, unknown>;
              const validityDays = Number(productData?.validityDays ?? 0);
              const dataDisplay = formatDataAmount(
                { dataAmount: productData?.dataAmount, dataUnit: productData?.dataUnit },
                String(item.productName ?? ""),
              );
              const cartItemName = String(item.productName ?? "");
              const cartDailyRe = /(?:[\.\d]+\s*(?:GB|MB|TB)\/(?:Natural\s+)?day|daily\s+[\d.]+\s*(?:GB|MB|TB))/i;
              const cartIsDailyPlan = cartDailyRe.test(cartItemName);
              const cartDailyLabel = language === "en" ? "per day" : language === "zh-CN" ? "每日" : language === "ja" ? "毎日" : language === "ko" ? "매일" : language === "th" ? "ต่อวัน" : "每日";
              const itemCountries = (productData?.countries as { id: string; name: string }[]) ?? [];
              const translatedItemName = translatePlanName(cartItemName, language, itemCountries);

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-border p-5 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Wifi className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">
                      {translatedItemName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {dataDisplay ? (
                        <>{dataDisplay}{cartIsDailyPlan ? <span className="text-amber-600 font-medium">/{cartDailyLabel}</span> : ""} · </>
                      ) : ""}{validityDays} {t.common.days}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {toDisplay(unitPrice)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => removeMutation.mutate({ cartItemId: item.id })}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        onClick={() => updateQtyMutation.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        onClick={() => updateQtyMutation.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-foreground">{toDisplay(itemTotal)}</span>
                  </div>
                </div>
              );
            })}

            <Link href="/products">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                {t.cart.continueShopping}
              </Button>
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-24">
              <h2 className="font-semibold text-foreground mb-4">{t.cart.subtotal}</h2>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">{translatePlanName(String(item.productName ?? ""), language, (item.productData as Record<string, unknown>)?.countries as { id: string; name: string }[] ?? [])}</span>
                    <span className="shrink-0 font-medium">{toDisplay(toHkd(parseFloat(String(item.unitPrice))) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mb-4" />
              <div className="flex flex-col mb-4 gap-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">{t.cart.total}</span>
                  {discountPct > 0 ? (
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground line-through mr-2">{toDisplay(subtotal)}</span>
                      <span className="text-xl font-bold text-green-700">{toDisplay(discountedSubtotal)}</span>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-primary">{toDisplay(subtotal)}</span>
                  )}
                </div>
                {currency.code !== "HKD" && (
                  <div className="flex items-center justify-end gap-1">
                    <p className="text-xs text-muted-foreground">
                      {language === "en" ? `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · Charged in HKD`
                        : language === "zh-CN" ? `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · 以港元结算`
                        : language === "ja" ? `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · HKD で請求`
                        : language === "ko" ? `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · HKD로 청구`
                        : language === "th" ? `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · ชำระเป็น HKD`
                        : `≈ HK$${(discountPct > 0 ? discountedSubtotal : subtotal).toLocaleString()} · 以港元結算`}
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
                            ? "Stripe 以港元结算所有付款。所选货币的显示金额仅供參考，实际收费以您銀行的实时汇率为准。"
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

              {/* Referral code input */}
              <div className="mb-4 space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {language === "en" ? "Referral Code (optional)" : language === "zh-CN" ? "推荐码（可选）" : language === "ja" ? "紹介コード（任意）" : language === "ko" ? "추천 코드 (선택사항)" : language === "th" ? "รหัสแนะนำ (ไม่บังคับ)" : "推薦碼（可選）"}
                </label>
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
                  placeholder=                  {language === "en" ? "Enter referral code" : language === "zh-CN" ? "输入推荐码" : language === "ja" ? "紹介コードを入力" : language === "ko" ? "추천 코드 입력" : language === "th" ? "ใส่รหัสแนะนำ" : "輸入推薦碼"}
                  maxLength={20}
                  className={`w-full h-9 rounded-md border bg-background px-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                    referralValidation.status === "valid"
                      ? "border-green-500 focus:ring-green-400"
                      : referralValidation.status === "invalid"
                      ? "border-red-400 focus:ring-red-300"
                      : "border-input"
                  }`}
                />
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
                      : language === "ja"
                      ? `紹介コード有効！${referralValidation.discountPct ?? 10}%オフ適用`
                      : language === "ko"
                      ? `추천 코드 유효! ${referralValidation.discountPct ?? 10}% 할인 적용`
                      : language === "th"
                      ? `รหัสถูกต้อง! ลด ${referralValidation.discountPct ?? 10}%`
                      : `推薦碼有效！已享受 ${(100 - (referralValidation.discountPct ?? 10)) / 10} 折優惠`}
                  </p>
                )}
                {referralValidation.status === "invalid" && (
                  <p className="text-xs text-red-500">
                    ✗ {referralValidation.message}
                  </p>
                )}
              </div>

              {/* New user promo code hint */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-center">
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
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3">
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
                    ? "หลังชำระเงิน กรุณารอสักครู่ อย่ากดซ้ำหรือย้อนกลับ"
                    : "付款後請耐心等候數秒，期間請勿重複點擊或返回。"}
                </p>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white h-11"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.checkout.processing}
                  </>
                ) : (
                  <>
                    {t.cart.checkout}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <Link href="/products">
                <Button variant="outline" className="w-full h-10 mt-2">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {language === "en" ? "Continue Shopping"
                    : language === "zh-CN" ? "继续购物"
                    : language === "ja" ? "購物を続ける"
                    : language === "ko" ? "쇼핑 계속하기"
                    : language === "th" ? "ช้อปปิ้งต่อ"
                    : "繼續購物"}
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {t.checkout.securePayment}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
