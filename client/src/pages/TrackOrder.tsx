import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageSEO } from "@/components/SEO";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Package, CheckCircle, Clock, XCircle, Loader2, Copy, Check } from "lucide-react";
import { EsimQRCode } from "@/components/EsimQRCode";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";

type OrderResult = {
  id: number;
  productName: string;
  status: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  esimData: unknown;
  createdAt: Date;
};

type EsimData = {
  lpaString?: string;
  iccid?: string;
  smdpAddress?: string;
  activationCode?: string;
};

const StatusBadge = ({ status, language }: { status: string; language: string }) => {
  const statusLabels: Record<string, Record<string, string>> = {
    completed: { en: "Completed", "zh-TW": "完成", "zh-CN": "完成", ja: "完了", ko: "완료", th: "เสร็จสิ้น" },
    processing: { en: "Processing", "zh-TW": "處理中", "zh-CN": "处理中", ja: "処理中", ko: "처리 중", th: "กำลังดำเนินการ" },
    paid: { en: "Paid", "zh-TW": "已付款", "zh-CN": "已付款", ja: "支払済み", ko: "결제 완료", th: "ชำระเงินแล้ว" },
    pending_payment: { en: "Pending Payment", "zh-TW": "待付款", "zh-CN": "待付款", ja: "支払待ち", ko: "결제 대기", th: "รอชำระเงิน" },
    failed: { en: "Failed", "zh-TW": "失敗", "zh-CN": "失败", ja: "失敗", ko: "실패", th: "ล้มเหลว" },
  };
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default", processing: "secondary", paid: "secondary", pending_payment: "outline", failed: "destructive",
  };
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="w-3 h-3" />, processing: <Clock className="w-3 h-3" />, paid: <Clock className="w-3 h-3" />, pending_payment: <Clock className="w-3 h-3" />, failed: <XCircle className="w-3 h-3" />,
  };
  const label = statusLabels[status]?.[language] ?? statusLabels[status]?.["zh-TW"] ?? status;
  const variant = variants[status] ?? "outline";
  const icon = icons[status] ?? null;
  const c = { label, variant, icon };
  return (
    <Badge variant={c.variant} className="flex items-center gap-1 w-fit">
      {c.icon}
      {c.label}
    </Badge>
  );
};

export default function TrackOrder() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const urlOrderId = urlParams.get("orderId") ?? "";

  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState(urlOrderId);
  const [submitted, setSubmitted] = useState(false);
  const [copiedLpa, setCopiedLpa] = useState(false);
  const [copiedIccid, setCopiedIccid] = useState(false);

  // Pre-fill orderId from URL param if present
  useEffect(() => {
    if (urlOrderId) setOrderId(urlOrderId);
  }, [urlOrderId]);

  // Auto-fill email from logged-in user
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const labels = {
    en: {
      title: "Track Your Order",
      subtitle: "Enter your email and order number to view your eSIM details.",
      emailLabel: "Email Address",
      emailPlaceholder: "you@example.com",
      orderLabel: "Order Number",
      orderPlaceholder: "e.g. 12345",
      trackBtn: "Track Order",
      orderDetails: "Order Details",
      product: "Product",
      status: "Status",
      quantity: "Quantity",
      total: "Total",
      date: "Date",
      esimTitle: "Your eSIM",
      scanQr: "Scan QR Code to install eSIM",
      lpaString: "LPA String (Manual Install)",
      iccid: "ICCID",
      copy: "Copy",
      copied: "Copied!",
      notFound: "Order not found. Please check your email and order number.",
      processing: "Your eSIM is being processed. Please check back shortly.",
      howToInstall: "How to Install",
      backToShop: "Back to Shop",
    },
    "zh-TW": {
      title: "查詢訂單",
      subtitle: "輸入您的電郵和訂單號碼，查看 eSIM 詳情。",
      emailLabel: "電郵地址",
      emailPlaceholder: "you@example.com",
      orderLabel: "訂單號碼",
      orderPlaceholder: "例如：12345",
      trackBtn: "查詢訂單",
      orderDetails: "訂單詳情",
      product: "產品",
      status: "狀態",
      quantity: "數量",
      total: "總金額",
      date: "日期",
      esimTitle: "您的 eSIM",
      scanQr: "掃描 QR Code 安裝 eSIM",
      lpaString: "LPA 字串（手動安裝）",
      iccid: "ICCID",
      copy: "複製",
      copied: "已複製！",
      notFound: "找不到訂單，請確認電郵和訂單號碼是否正確。",
      processing: "您的 eSIM 正在處理中，請稍後再查詢。",
      howToInstall: "安裝教學",
      backToShop: "返回商店",
    },
    "zh-CN": {
      title: "查询订单",
      subtitle: "输入您的邮筱和订单号码，查看 eSIM 详情。",
      emailLabel: "邮筱地址",
      emailPlaceholder: "you@example.com",
      orderLabel: "订单号码",
      orderPlaceholder: "例如：12345",
      trackBtn: "查询订单",
      orderDetails: "订单详情",
      product: "产品",
      status: "状态",
      quantity: "数量",
      total: "总金额",
      date: "日期",
      esimTitle: "您的 eSIM",
      scanQr: "扫描 QR Code 安装 eSIM",
      lpaString: "LPA 字符串（手动安装）",
      iccid: "ICCID",
      copy: "复制",
      copied: "已复制！",
      notFound: "找不到订单，请确认邮筱和订单号码是否正确。",
      processing: "您的 eSIM 正在处理中，请稍后再查询。",
      howToInstall: "安装教程",
      backToShop: "返回商店",
    },
    ja: {
      title: "注文を追跡",
      subtitle: "メールアドレスと注文番号を入力してeSIMの詳細を確認してください。",
      emailLabel: "メールアドレス",
      emailPlaceholder: "you@example.com",
      orderLabel: "注文番号",
      orderPlaceholder: "例：12345",
      trackBtn: "注文を追跡",
      orderDetails: "注文詳細",
      product: "商品",
      status: "ステータス",
      quantity: "数量",
      total: "合計",
      date: "日付",
      esimTitle: "あなたのeSIM",
      scanQr: "QRコードをスキャンしてeSIMをインストール",
      lpaString: "LPA文字列（手動インストール）",
      iccid: "ICCID",
      copy: "コピー",
      copied: "コピーしました！",
      notFound: "注文が見つかりません。メールと注文番号をご確認ください。",
      processing: "eSIMを処理中です。しばらくしてからご確認ください。",
      howToInstall: "インストール方法",
      backToShop: "ショップに戻る",
    },
    ko: {
      title: "주문 추적",
      subtitle: "이메일과 주문 번호를 입력하여 eSIM 세부 정보를 확인하세요.",
      emailLabel: "이메일 주소",
      emailPlaceholder: "you@example.com",
      orderLabel: "주문 번호",
      orderPlaceholder: "예시: 12345",
      trackBtn: "주문 추적",
      orderDetails: "주문 세부 정보",
      product: "제품",
      status: "상태",
      quantity: "수량",
      total: "합계",
      date: "날짜",
      esimTitle: "나의 eSIM",
      scanQr: "QR 코드를 스캔하여 eSIM 설치",
      lpaString: "LPA 문자열 (수동 설치)",
      iccid: "ICCID",
      copy: "복사",
      copied: "복사됨!",
      notFound: "주문을 찾을 수 없습니다. 이메일과 주문 번호를 확인해 주세요.",
      processing: "eSIM을 처리 중입니다. 잠시 후 다시 확인해 주세요.",
      howToInstall: "설치 방법",
      backToShop: "스토어로 돌아가기",
    },
    th: {
      title: "ติดตามคำสั่งซื้อ",
      subtitle: "กรอกอีเมลและหมายเลขคำสั่งซื้อเพื่อดูรายละเอียด eSIM",
      emailLabel: "ที่อยู่อีเมล",
      emailPlaceholder: "you@example.com",
      orderLabel: "หมายเลขคำสั่งซื้อ",
      orderPlaceholder: "เช่น: 12345",
      trackBtn: "ติดตามคำสั่งซื้อ",
      orderDetails: "รายละเอียดคำสั่งซื้อ",
      product: "สินค้า",
      status: "สถานะ",
      quantity: "จำนวน",
      total: "ยอดรวม",
      date: "วันที่",
      esimTitle: "eSIM ของคุณ",
      scanQr: "สแกน QR Code เพื่อติดตั้ง eSIM",
      lpaString: "LPA String (ติดตั้งด้วยตนเอง)",
      iccid: "ICCID",
      copy: "คัดลอก",
      copied: "คัดลอกแล้ว!",
      notFound: "ไม่พบคำสั่งซื้อ กรุณาตรวจสอบอีเมลและหมายเลขคำสั่งซื้อ",
      processing: "eSIM ของคุณกำลังดำเนินการ กรุณาตรวจสอบอีกครั้งในภายหลัง",
      howToInstall: "วิธีติดตั้ง",
      backToShop: "กลับไปที่ร้านค้า",
    },
  };

  const l = labels[language as keyof typeof labels] ?? labels["zh-TW"];

  const orderIdNum = parseInt(orderId, 10);

  const trackQuery = trpc.checkout.trackOrder.useQuery(
    { email: email.trim(), orderId: orderIdNum },
    {
      enabled: submitted && !!email && !isNaN(orderIdNum) && orderIdNum > 0,
      retry: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !orderId.trim()) return;
    setSubmitted(false);
    setTimeout(() => setSubmitted(true), 0);
  };

  const copyToClipboard = (text: string, type: "lpa" | "iccid") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "lpa") {
        setCopiedLpa(true);
        setTimeout(() => setCopiedLpa(false), 2000);
      } else {
        setCopiedIccid(true);
        setTimeout(() => setCopiedIccid(false), 2000);
      }
      toast.success(l.copied);
    });
  };

  const order = trackQuery.data as OrderResult | undefined;
  const esim = order?.esimData as EsimData | null | undefined;

  return (
    <div className="min-h-screen bg-background">
      <PageSEO page="trackOrder" path="/track-order" />
      <div className="container py-12 max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{l.title}</h1>
          <p className="text-muted-foreground text-sm">{l.subtitle}</p>
        </div>

        {/* Search Form */}
        <Card className="mb-6 border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{l.emailLabel}</label>
                <Input
                  type="email"
                  placeholder={l.emailPlaceholder}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSubmitted(false); }}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{l.orderLabel}</label>
                <Input
                  type="number"
                  placeholder={l.orderPlaceholder}
                  value={orderId}
                  onChange={(e) => { setOrderId(e.target.value); setSubmitted(false); }}
                  required
                  min={1}
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white h-10"
                disabled={trackQuery.isLoading}
              >
                {trackQuery.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {l.trackBtn}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {submitted && trackQuery.isError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-destructive font-medium">{l.notFound}</p>
            </CardContent>
          </Card>
        )}

        {/* Order Result */}
        {order && (
          <div className="space-y-4">
            {/* Order Details */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {l.orderDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">{l.product}</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{order.productName}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{l.status}</span>
                  <StatusBadge status={order.status} language={language} />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{l.quantity}</span>
                  <span className="text-sm font-medium">{order.quantity}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{l.total}</span>
                  <span className="text-sm font-medium">HK$ {Math.round(parseFloat(order.totalAmount))}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{l.date}</span>
                  <span className="text-sm font-medium">{formatDate(order.createdAt, language)}</span>
                </div>
              </CardContent>
            </Card>

            {/* eSIM QR Code */}
            {esim?.lpaString ? (
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    {l.esimTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-border/40">
                      <EsimQRCode value={esim.lpaString} size={180} />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{l.scanQr}</p>
                  </div>

                  <Separator />

                  {/* LPA String */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{l.lpaString}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background border border-border/60 rounded-lg px-3 py-2 font-mono break-all">
                        {esim.lpaString}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8 px-2"
                        onClick={() => copyToClipboard(esim.lpaString!, "lpa")}
                      >
                        {copiedLpa ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* ICCID */}
                  {esim.iccid && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{l.iccid}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-background border border-border/60 rounded-lg px-3 py-2 font-mono">
                          {esim.iccid}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-8 px-2"
                          onClick={() => copyToClipboard(esim.iccid!, "iccid")}
                        >
                          {copiedIccid ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : order.status !== "completed" && (
              <Card className="border-border/60 bg-muted/30">
                <CardContent className="pt-6 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{l.processing}</p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link href="/how-to-install" className="flex-1">
                <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                  {l.howToInstall}
                </Button>
              </Link>
              <Link href="/products" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                  {l.backToShop}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
