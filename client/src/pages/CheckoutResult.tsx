import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useEffect, useRef, useState } from "react";
import { trackPurchase } from "@/lib/gtm";

export default function CheckoutResult() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const sessionId = params.get("session_id");
  const success = params.get("success") === "true";
  const cancelled = params.get("cancelled") === "true";

  // Confirm payment immediately on load instead of waiting for the Stripe
  // webhook (which can be missed on cold starts) or the periodic cron.
  const utils = trpc.useUtils();
  const [confirmDone, setConfirmDone] = useState(false);
  const confirmedRef = useRef(false);
  const gtagFiredRef = useRef(false);
  const confirmPayment = trpc.checkout.confirmPayment.useMutation();

  useEffect(() => {
    if (!sessionId || !success || confirmedRef.current) return;
    confirmedRef.current = true;
    confirmPayment.mutate(
      { sessionId },
      {
        onSettled: (data) => {
          // Refresh whichever order query is active so the UI reflects fulfillment.
          utils.checkout.getOrderBySession.invalidate({ sessionId }).catch(() => {});
          utils.checkout.getGuestOrderBySession.invalidate({ sessionId }).catch(() => {});
          setConfirmDone(true);

          // Fire Google Ads purchase conversion (only once)
          if (!gtagFiredRef.current && typeof window !== 'undefined' && (window as any).gtag) {
            gtagFiredRef.current = true;
            const order = data?.order;
            const value = order?.totalAmount ? parseFloat(String(order.totalAmount)) : 1.0;
            const currency = order?.currency ?? 'HKD';
            const transactionId = order?.id ? String(order.id) : sessionId ?? '';
            (window as any).gtag('event', 'conversion', {
              send_to: 'AW-18236820850/Mj5xCMbtm74cEPKa__dD',
              value: isNaN(value) ? 1.0 : value,
              currency: currency,
              transaction_id: transactionId,
            });
            // GTM dataLayer purchase event
            trackPurchase({
              transactionId,
              value: isNaN(value) ? 1.0 : value,
              currency,
              items: [{
                item_id: String((order as any)?.productId ?? ''),
                item_name: String((order as any)?.planName ?? (order as any)?.productId ?? ''),
                price: isNaN(value) ? 1.0 : value,
                quantity: 1,
              }],
            });
          }
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, success]);

  // Authenticated user order query — wait until confirmation finished
  const authOrderQuery = trpc.checkout.getOrderBySession.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId && success && isAuthenticated && confirmDone }
  );

  // Guest order query (no auth required)
  const guestOrderQuery = trpc.checkout.getGuestOrderBySession.useQuery(
    { sessionId: sessionId ?? "" },
    { enabled: !!sessionId && success && !isAuthenticated && confirmDone }
  );

  const queryLoading = isAuthenticated ? authOrderQuery.isLoading : guestOrderQuery.isLoading;
  // Show the processing spinner while confirming OR while the follow-up query runs.
  const isLoading = !confirmDone || queryLoading;

  if (!sessionId && !cancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t.checkout.failed}</h2>
          <p className="text-muted-foreground mb-6">{t.checkout.failedDesc}</p>
          <Link href="/cart">
            <Button variant="outline">{t.checkout.tryAgain}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t.checkout.failed}</h2>
          <p className="text-muted-foreground mb-6">{t.checkout.failedDesc}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/cart">
              <Button variant="outline">{t.checkout.tryAgain}</Button>
            </Link>
            <Link href="/products">
              <Button className="bg-primary hover:bg-primary/90 text-white">{t.cart.browsePlans}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-foreground font-medium mb-3">{t.checkout.processing}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-700 font-medium">
              {language === "en"
                ? "Please wait — do not close this page, refresh, or tap the back button."
                : language === "zh-CN"
                ? "请稍候，正在确认付款 — 请勿关闭本页、刷新或点击返回按钮。"
                : language === "ja"
                ? "しばらくお待ちください。このページを閉じたり、更新したり、戻るボタンを押さないでください。"
                : language === "ko"
                ? "잠시 기다려 주세요. 이 페이지를 닫거나, 새로고침하거나, 뒤로 가지 마세요."
                : language === "th"
                ? "กรุณารอสักครู่ อย่าปิดหน้านี้ รีเฟรช หรือกดปุ่มย้อนกลับ"
                : "請稍候，正在確認付款 — 請勿關閉本頁、重新整理或點擊返回按鈕。"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Guest success page — QR Code sent to email
  if (success && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">{t.checkout.success}</h2>
          <div className="bg-muted/50 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
                {language === "en"
                ? "Your eSIM QR Code has been sent to your email. Please check your inbox (and spam folder) to install your eSIM."
                : language === "zh-CN"
                ? "您的 eSIM QR Code 已发送到您的电子邮件。请检查您的收件箱（及垃圾邮件文件夹）以安装 eSIM。"
                : language === "ja"
                ? "eSIM QRコードがメールに送信されました。受信トレイ（迷惑メールフォルダも）をご確認ください。"
                : language === "ko"
                ? "eSIM QR 코드가 이메일로 발송되었습니다. 받은 편지함(스팸 폴더 포함)을 확인해 주세요."
                : language === "th"
                ? "QR Code eSIM ของคุณถูกส่งไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงสแปม)"
                : "您的 eSIM QR Code 已發送到您的電子郵件。請檢查您的收件箱（及垃圾郵件資料夾）以安裝 eSIM。"}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/track-order">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                {language === "en" ? "Track My Order" : language === "zh-CN" ? "查询我的订单" : language === "ja" ? "注文を追跡する" : language === "ko" ? "주문 추적" : language === "th" ? "ติดตามคำสั่งซื้อ" : "查詢我的訂單"}
              </Button>
            </Link>
            <Link href="/how-to-install">
              <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                {language === "en" ? "How to Install eSIM" : language === "zh-CN" ? "如何安装 eSIM" : language === "ja" ? "eSIMのインストール方法" : language === "ko" ? "eSIM 설치 방법" : language === "th" ? "วิธีติดตั้ง eSIM" : "如何安裝 eSIM"}
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                {t.cart.continueShopping}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user success page
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{t.checkout.success}</h2>
        <p className="text-muted-foreground mb-8">{t.checkout.successDesc}</p>
        <div className="flex flex-col gap-3">
          <Link href="/orders">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white">
              {t.checkout.viewOrders}
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5">
              {t.cart.continueShopping}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
