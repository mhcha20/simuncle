import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search, RefreshCw, Mail, ChevronLeft, ChevronRight, MessageCircle, Wifi, AlertCircle, CheckCircle2, Copy, ExternalLink, Trash2, Zap, BarChart2, CalendarClock, Clock, History, CheckCheck, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";

// ---- Admin Usage Panel (shown inside the usage dialog) ----
function AdminUsagePanel({ orderId }: { orderId: number }) {
  const usageQuery = trpc.adminOrders.getUsage.useQuery({ orderId });
  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };
  const getStatusColor = (s: string) =>
    s === "Active" ? "text-green-600" :
    s === "Expired" ? "text-red-500" :
    s === "Data Depleted" ? "text-orange-600" :
    s === "Not Available" ? "text-amber-600" : "text-gray-500";
  const getStatusLabel = (s: string, isAddon: boolean) =>
    s === "Active" ? "使用中" :
    s === "Expired" ? "已到期" :
    s === "Data Depleted" ? "數據已耗盡" :
    s === "Not Available" ? (isAddon ? "增值準備中" : "未啟用") : "未啟用";

  if (usageQuery.isLoading) return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin" />載入用量中...</div>;
  if (usageQuery.isError) return <div className="text-sm text-red-500 py-4">{usageQuery.error.message === "Order not yet fulfilled" ? "此訂單尚未開通 eSIM，無法查詢用量。" : `查詢失敗：${usageQuery.error.message}`}</div>;
  if (!usageQuery.data) return null;

  const d = usageQuery.data as Record<string, unknown>;
  const totalBytes = Number(d.dataAllowance ?? 0);
  const usedBytes = Number(d.dataUsage ?? 0);
  const breakdown = Array.isArray(d.breakdown) ? d.breakdown as Array<{
    label: string; dataAllowance: number; dataUsage: number; status?: string; expiryDate?: string | null; vizlyncOrderId?: string | null; topupOrderId?: number | null;
  }> : null;
  const esimStatus = String(d.status ?? "");
  const topupCount = Number(d.topupCount ?? 0);

  if (breakdown && breakdown.length > 1) {
    return (
      <div className="space-y-3">
        {breakdown.map((card, idx) => {
          const cardPct = card.dataAllowance > 0 ? Math.min(100, (card.dataUsage / card.dataAllowance) * 100) : 0;
          const cardRemaining = Math.max(0, card.dataAllowance - card.dataUsage);
          const cardStatus = card.status ?? "";
          const cardLabel = card.label === "__main__" ? "主卡" : card.label;
          return (
            <div key={idx} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-foreground">{cardLabel}</span>
                <span className={`text-xs font-medium ${getStatusColor(cardStatus)}`}>{getStatusLabel(cardStatus, idx > 0)}</span>
              </div>
              <Progress value={cardPct} className={`h-2 ${cardPct > 80 ? "[&>div]:bg-red-500" : cardPct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"}`} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>已使用: <span className="font-medium text-foreground">{formatBytes(card.dataUsage)}</span></span>
                <span>剩餘: <span className="font-medium text-foreground">{formatBytes(cardRemaining)}</span></span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">總量: <span className="font-medium text-foreground">{formatBytes(card.dataAllowance)}</span></div>
              {card.expiryDate ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <CalendarClock className="w-3 h-3 text-primary" />
                  到期日: <span className="font-medium text-foreground ml-0.5">{formatDateTime(card.expiryDate)}</span>
                </div>
              ) : null}
              {idx > 0 && card.topupOrderId ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className="text-muted-foreground">客戶訂單號:</span>
                  <span className="font-mono font-medium text-foreground">#{String(card.topupOrderId).padStart(6, "0")}</span>
                </div>
              ) : null}
              {idx > 0 && card.vizlyncOrderId ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className="text-muted-foreground">商業訂單號:</span>
                  <span className="font-mono font-medium text-foreground">{card.vizlyncOrderId}</span>
                </div>
              ) : null}
            </div>
          );
        })}
        {esimStatus === "Data Depleted" && topupCount > 0 && (
          <div className="flex items-start gap-1 text-xs text-orange-600">
            <Clock className="w-3 h-3 mt-0.5 shrink-0" />
            <span>母方案已耗盡，有 {topupCount} 個加值方案排隊備用，網絡營運商確認後將自動切換啟用。</span>
          </div>
        )}
      </div>
    );
  }

  // Single card
  const pct = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;
  const remaining = Math.max(0, totalBytes - usedBytes);
  if (totalBytes === 0) return <div className="text-sm text-muted-foreground py-4">暫無用量數據</div>;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-primary" />數據用量</span>
        <span className={`text-xs font-medium ${getStatusColor(esimStatus)}`}>{getStatusLabel(esimStatus, false)}</span>
      </div>
      <Progress value={pct} className={`h-2 ${pct > 80 ? "[&>div]:bg-red-500" : pct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"}`} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>已使用: <span className="font-medium text-foreground">{formatBytes(usedBytes)}</span></span>
        <span>剩餘: <span className="font-medium text-foreground">{formatBytes(remaining)}</span></span>
      </div>
      <div className="text-xs text-muted-foreground">總量: <span className="font-medium text-foreground">{formatBytes(totalBytes)}</span></div>
      {d.expiryDate ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="w-3 h-3 text-primary" />
          到期日: <span className="font-medium text-foreground ml-0.5">{formatDateTime(String(d.expiryDate))}</span>
        </div>
      ) : null}
    </div>
  );
}

// ---- EsimDialogTabs: eSIM details + usage in one dialog ----
function EsimDialogTabs({
  esimData,
  productName,
  orderId,
  copyToClipboard,
  language,
  supplier,
}: {
  esimData: Record<string, unknown> | null;
  productName: string;
  orderId: number | null;
  copyToClipboard: (text: string, label: string) => void;
  language: string;
  supplier?: string;
}) {
  const [tab, setTab] = useState<"esim" | "usage">("esim");
  const [tgtQueryEnabled, setTgtQueryEnabled] = useState(false);
  const tgtStatusQuery = trpc.adminOrders.getTgtStatus.useQuery(
    { orderId: orderId! },
    { enabled: tgtQueryEnabled && supplier === "tgt" && !!orderId, staleTime: 0 }
  );

  const TGT_ORDER_STATUS_LABELS: Record<string, string> = {
    NOTACTIVE: "未啟用", ACTIVATED: "已開通", INUSE: "使用中",
    USED: "已用完", EXPIRED: "已到期", ABANDON: "已取消", TERMINATION: "已終止",
  };
  const TGT_PROFILE_STATUS_LABELS: Record<string, string> = {
    nodownload: "未下載", activated: "已啟用", downloaded: "已下載",
    downloadfail: "下載失敗", failed: "失敗", ungenerated: "未生成",
  };
  const getOrderStatusCls = (s: string | null) => {
    if (s === "INUSE") return "bg-green-100 text-green-700 border-green-200";
    if (s === "ACTIVATED") return "bg-blue-100 text-blue-700 border-blue-200";
    if (s === "NOTACTIVE" || s === "nodownload") return "bg-amber-100 text-amber-700 border-amber-200";
    if (s === "EXPIRED" || s === "TERMINATION" || s === "ABANDON") return "bg-red-100 text-red-700 border-red-200";
    if (s === "USED") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };
  return (
    <div>
      {/* Tab switcher */}
      <div className="flex border-b border-border mb-3">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "esim"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("esim")}
        >
          <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />eSIM 詳情</span>
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "usage"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("usage")}
        >
          <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" />數據用量</span>
        </button>
      </div>

      {/* eSIM tab */}
      {tab === "esim" && (
        <div className="space-y-3 py-1">
          {!!(esimData?.lpaString) && (
            <>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">產品</p>
                <p className="text-sm text-foreground">{productName}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">LPA 啟動碼</p>
                  <button
                    onClick={() => copyToClipboard(esimData.lpaString as string, "LPA 啟動碼")}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />複製
                  </button>
                </div>
                <code className="text-xs break-all text-foreground bg-background border border-border rounded px-2 py-1.5 block">
                  {esimData.lpaString as string}
                </code>
              </div>
              {esimData?.iccid && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-medium">ICCID</p>
                    <button
                      onClick={() => copyToClipboard(esimData.iccid as string, "ICCID")}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />複製
                    </button>
                  </div>
                  <code className="text-xs break-all text-foreground bg-background border border-border rounded px-2 py-1.5 block">
                    {esimData.iccid as string}
                  </code>
                </div>
              )}
              {esimData?.activationCode && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Activation Code</p>
                    <button
                      onClick={() => copyToClipboard(esimData.activationCode as string, "Activation Code")}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />複製
                    </button>
                  </div>
                  <code className="text-xs break-all text-foreground bg-background border border-border rounded px-2 py-1.5 block">
                    {esimData.activationCode as string}
                  </code>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground font-medium self-start">QR Code</p>
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={esimData.lpaString as string} size={180} />
                </div>
                <p className="text-xs text-muted-foreground text-center">掃描此 QR Code 以安裝 eSIM</p>
              </div>
            </>
          )}

          {/* TGT real-time status query */}
          {supplier === "tgt" && (
            <div className="border border-border rounded-lg p-3 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">TGT 即時狀態</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  disabled={tgtStatusQuery.isFetching}
                  onClick={() => {
                    if (tgtQueryEnabled) {
                      tgtStatusQuery.refetch();
                    } else {
                      setTgtQueryEnabled(true);
                    }
                  }}
                >
                  <RefreshCw className={`w-3 h-3 ${tgtStatusQuery.isFetching ? "animate-spin" : ""}`} />
                  {tgtStatusQuery.isFetching ? "查詢中..." : "查詢 TGT 狀態"}
                </Button>
              </div>
              {tgtStatusQuery.data && (
                <div className="space-y-2">
                  {!tgtStatusQuery.data.found ? (
                    <p className="text-xs text-muted-foreground">TGT 找不到此訂單記錄</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {tgtStatusQuery.data.orderStatus && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">訂單狀態</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusCls(tgtStatusQuery.data.orderStatus)}`}>
                              {TGT_ORDER_STATUS_LABELS[tgtStatusQuery.data.orderStatus] ?? tgtStatusQuery.data.orderStatus}
                            </span>
                          </div>
                        )}
                        {tgtStatusQuery.data.profileStatus && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground">Profile 狀態</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusCls(tgtStatusQuery.data.profileStatus)}`}>
                              {TGT_PROFILE_STATUS_LABELS[tgtStatusQuery.data.profileStatus] ?? tgtStatusQuery.data.profileStatus}
                            </span>
                          </div>
                        )}
                      </div>
                      {tgtStatusQuery.data.activatedEndTime && (
                        <p className="text-xs text-muted-foreground">
                          到期：<span className="text-foreground font-medium">{formatDate(tgtStatusQuery.data.activatedEndTime)}</span>
                        </p>
                      )}
                      {tgtStatusQuery.data.usage && tgtStatusQuery.data.usageSupported && (() => {
                        const u = tgtStatusQuery.data.usage!;
                        const total = parseFloat(u.dataTotal ?? "0");
                        const used = parseFloat(u.dataUsage ?? "0");
                        const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">用量</span>
                              <span className="text-foreground">{used.toFixed(0)} / {total.toFixed(0)} MB ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
              {tgtStatusQuery.error && (
                <p className="text-xs text-red-500">查詢失敗：{tgtStatusQuery.error.message}</p>
              )}
            </div>
          )}

          {!esimData?.lpaString && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div>
                <p className="font-medium text-foreground">eSIM 資料缺失</p>
                <p className="text-sm text-muted-foreground mt-1">此訂單的 eSIM 啟動資料尚未取得。<br />請嘗試重發確認電郵，系統會自動從 Vizlync 補取資料。</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage tab */}
      {tab === "usage" && (
        <div className="py-1">
          {orderId ? (
            <AdminUsagePanel orderId={orderId} />
          ) : (
            <div className="text-sm text-muted-foreground py-4">無訂單資訊</div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "pending_payment", label: "待付款" },
  { value: "paid", label: "已付款" },
  { value: "processing", label: "處理中" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失敗" },
  { value: "refunded", label: "已退款" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800 border-yellow-200",
  paid: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "待付款",
  paid: "已付款",
  processing: "處理中",
  completed: "已完成",
  failed: "失敗",
  refunded: "已退款",
};

interface EmailDialogState {
  open: boolean;
  orderId: number | null;
  customerEmail: string;
  subject: string;
  content: string;
}

interface EsimDialogState {
  open: boolean;
  orderId: number | null;
  esimData: Record<string, unknown> | null;
  productName: string;
  supplier?: string;
  orderStatus?: string;
  errorMessage?: string | null;
}

export default function AdminOrders() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [emailDialog, setEmailDialog] = useState<EmailDialogState>({
    open: false,
    orderId: null,
    customerEmail: "",
    subject: "",
    content: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderId: number | null; orderNum: string }>({
    open: false,
    orderId: null,
    orderNum: "",
  });

  const [esimDialog, setEsimDialog] = useState<EsimDialogState>({
    open: false,
    orderId: null,
    esimData: null,
    productName: "",
  });

  const [usageDialog, setUsageDialog] = useState<{ open: boolean; orderId: number | null; productName: string }>({
    open: false,
    orderId: null,
    productName: "",
  });

  const [emailLogsDialog, setEmailLogsDialog] = useState<{ open: boolean; orderId: number | null; productName: string }>({
    open: false,
    orderId: null,
    productName: "",
  });

  const emailLogsQuery = trpc.adminOrders.getEmailLogs.useQuery(
    { orderId: emailLogsDialog.orderId ?? undefined },
    { enabled: emailLogsDialog.open && emailLogsDialog.orderId !== null }
  );

  const [activeTab, setActiveTab] = useState<"orders" | "topup">("orders");
  const [topupSearch, setTopupSearch] = useState("");
  const [topupSearchInput, setTopupSearchInput] = useState("");
  const [topupStatus, setTopupStatus] = useState("all");
  const [topupPage, setTopupPage] = useState(1);

  const pendingStatsQuery = trpc.adminOrders.getPendingReminderStats.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const ordersQuery = trpc.adminOrders.list.useQuery(
    { search: search || undefined, status: status === "all" ? undefined : status, page, pageSize: PAGE_SIZE },
    { enabled: isAuthenticated && user?.role === "admin" && activeTab === "orders" }
  );
  const topupQuery = trpc.adminOrders.listTopup.useQuery(
    { search: topupSearch || undefined, status: topupStatus === "all" ? undefined : topupStatus, page: topupPage, pageSize: PAGE_SIZE },
    { enabled: isAuthenticated && user?.role === "admin" && activeTab === "topup" }
  );

  const resendEmailMutation = trpc.checkout.resendConfirmationEmail.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Email resent successfully" : "確認電郵已重新發送");
      ordersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [terminateConfirm, setTerminateConfirm] = useState<{ open: boolean; orderId: number | null; orderNum: string }>({ open: false, orderId: null, orderNum: "" });

  const terminatePlanMutation = trpc.adminOrders.terminatePlan.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Plan terminated successfully" : "方案已成功終止");
      setTerminateConfirm({ open: false, orderId: null, orderNum: "" });
      ordersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reissueEsimMutation = trpc.adminOrders.reissueEsim.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? (language === "en" ? "eSIM reissued successfully" : "eSIM 已成功補發"));
      setEsimDialog((d) => ({ ...d, open: false }));
      ordersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteOrderMutation = trpc.adminOrders.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Order deleted" : "訂單已刪除");
      setDeleteConfirm({ open: false, orderId: null, orderNum: "" });
      ordersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendEmailMutation = trpc.adminOrders.sendEmailToCustomer.useMutation({
    onSuccess: (data) => {
      toast.success(language === "en" ? `Email sent to ${data.sentTo}` : `電郵已發送至 ${data.sentTo}`);
      setEmailDialog((d) => ({ ...d, open: false }));
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  const { orders = [], total = 0 } = ordersQuery.data ?? {};
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const openEmailDialog = (orderId: number, customerEmail: string) => {
    setEmailDialog({
      open: true,
      orderId,
      customerEmail,
      subject: "",
      content: "",
    });
  };

  const handleSendEmail = () => {
    if (!emailDialog.orderId || !emailDialog.subject.trim() || !emailDialog.content.trim()) return;
    sendEmailMutation.mutate({
      orderId: emailDialog.orderId,
      subject: emailDialog.subject.trim(),
      content: emailDialog.content.trim(),
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} 已複製`);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {language === "en" ? "Back" : "返回"}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === "en" ? "Order Management" : "訂單管理"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {language === "en" ? "View, manage and contact customers" : "查看、管理訂單及聯絡客戶"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "orders" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {language === "en" ? "Orders" : "訂單"}
          </button>
          <button
            onClick={() => setActiveTab("topup")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "topup" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {language === "en" ? "Top-up Orders" : "加值訂單"}
          </button>
        </div>

        {activeTab === "topup" ? (
          <>
            {/* Topup Filters */}
            <Card className="mb-4 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder={language === "en" ? "Search by product name or order ID..." : "搜尋產品名稱或訂單號..."}
                      value={topupSearchInput}
                      onChange={(e) => setTopupSearchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { setTopupSearch(topupSearchInput); setTopupPage(1); } }}
                      className="flex-1"
                    />
                    <Button onClick={() => { setTopupSearch(topupSearchInput); setTopupPage(1); }} size="sm" className="gap-1 shrink-0">
                      <Search className="w-4 h-4" />
                      {language === "en" ? "Search" : "搜尋"}
                    </Button>
                  </div>
                  <Select value={topupStatus} onValueChange={(v) => { setTopupStatus(v); setTopupPage(1); }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "en" ? "All" : "全部"}</SelectItem>
                      <SelectItem value="pending_payment">{language === "en" ? "Pending" : "待付款"}</SelectItem>
                      <SelectItem value="paid">{language === "en" ? "Paid" : "已付款"}</SelectItem>
                      <SelectItem value="completed">{language === "en" ? "Completed" : "已完成"}</SelectItem>
                      <SelectItem value="failed">{language === "en" ? "Failed" : "失敗"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => topupQuery.refetch()} disabled={topupQuery.isFetching} className="gap-1 shrink-0">
                    <RefreshCw className={`w-4 h-4 ${topupQuery.isFetching ? "animate-spin" : ""}`} />
                    {language === "en" ? "Refresh" : "重新整理"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground mb-3">
              {language === "en" ? `${topupQuery.data?.total ?? 0} top-up orders found` : `共 ${topupQuery.data?.total ?? 0} 筆加值訂單`}
            </div>
            <Card className="shadow-sm overflow-hidden">
              {topupQuery.isLoading ? (
                <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : !topupQuery.data?.items?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Zap className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-lg font-medium">{language === "en" ? "No top-up orders" : "沒有加值訂單"}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "User" : "用戶"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "Top-up Plan" : "加值方案"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "Amount" : "金額"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "Status" : "狀態"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "Parent Order" : "關聯訂單"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{language === "en" ? "Date" : "日期"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topupQuery.data.items.map((item) => {
                        const topupStatusColors: Record<string, string> = {
                          pending_payment: "bg-yellow-100 text-yellow-800 border-yellow-200",
                          paid: "bg-blue-100 text-blue-800 border-blue-200",
                          completed: "bg-green-100 text-green-800 border-green-200",
                          failed: "bg-red-100 text-red-800 border-red-200",
                        };
                        const topupStatusLabels: Record<string, string> = {
                          pending_payment: language === "en" ? "Pending" : "待付款",
                          paid: language === "en" ? "Paid" : "已付款",
                          completed: language === "en" ? "Completed" : "已完成",
                          failed: language === "en" ? "Failed" : "失敗",
                        };
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{item.id}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">User #{item.userId}</td>
                            <td className="px-4 py-3">
                              <span className="text-foreground line-clamp-1 max-w-[200px]">{item.topupProductName}</span>
                              {item.topupProductId && (
                                <span className="text-xs text-muted-foreground block font-mono">{item.topupProductId}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">{item.priceHkd ? `HK$${item.priceHkd}` : "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${topupStatusColors[item.status ?? ""] ?? "bg-gray-100 text-gray-800"}` }>
                                {topupStatusLabels[item.status ?? ""] ?? item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {item.parentOrderId ? `#${item.parentOrderId}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDateTime(item.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            {/* Topup Pagination */}
            {(topupQuery.data?.total ?? 0) > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">{language === "en" ? `Page ${topupPage}` : `第 ${topupPage} 頁`}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={topupPage <= 1} onClick={() => setTopupPage((p) => p - 1)} className="gap-1">
                    <ChevronLeft className="w-4 h-4" />{language === "en" ? "Prev" : "上一頁"}
                  </Button>
                  <Button variant="outline" size="sm" disabled={(topupQuery.data?.total ?? 0) <= topupPage * PAGE_SIZE} onClick={() => setTopupPage((p) => p + 1)} className="gap-1">
                    {language === "en" ? "Next" : "下一頁"}<ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder={language === "en" ? "Search by email, product or order ID..." : "搜尋電郵、產品或訂單號..."}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} size="sm" className="gap-1 shrink-0">
                  <Search className="w-4 h-4" />
                  {language === "en" ? "Search" : "搜尋"}
                </Button>
              </div>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ordersQuery.refetch()}
                disabled={ordersQuery.isFetching}
                className="gap-1 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
                {language === "en" ? "Refresh" : "重新整理"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Reminder Stats Panel */}
        {pendingStatsQuery.data && pendingStatsQuery.data.total > 0 && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                {language === "en"
                  ? `${pendingStatsQuery.data.total} pending payment orders`
                  : `${pendingStatsQuery.data.total} 筆待付款訂單`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((cnt) => {
                const found = pendingStatsQuery.data.byReminderCount.find((r) => r.count === cnt);
                if (!found || found.orders === 0) return null;
                const labels = [
                  language === "en" ? "Not reminded yet" : "尚未提醒",
                  language === "en" ? "Reminded 1×" : "已提醒 1 次",
                  language === "en" ? "Reminded 2×" : "已提醒 2 次",
                  language === "en" ? "Reminded 3×" : "已提醒 3 次",
                  language === "en" ? "Reminded 4× (max)" : "已提醒 4 次（上限）",
                ];
                const colors = [
                  "bg-gray-100 text-gray-700 border-gray-200",
                  "bg-blue-50 text-blue-700 border-blue-200",
                  "bg-orange-50 text-orange-700 border-orange-200",
                  "bg-red-50 text-red-700 border-red-200",
                  "bg-red-100 text-red-800 border-red-300",
                ];
                return (
                  <span key={cnt} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[cnt]}`}>
                    {labels[cnt]}: {found.orders}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-muted-foreground mb-3">
          {language === "en" ? `${total} orders found` : `共 ${total} 筆訂單`}
        </div>

        {/* Orders Table */}
        <Card className="shadow-sm overflow-hidden">
          {ordersQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">{language === "en" ? "No orders found" : "沒有找到訂單"}</p>
              <p className="text-sm mt-1">{language === "en" ? "Try adjusting your search or filters" : "嘗試調整搜尋條件或篩選器"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Order ID" : "訂單號"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Customer" : "客戶"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Product" : "產品"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Amount" : "金額"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Status" : "狀態"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "eSIM / Email" : "eSIM / 電郵"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Date" : "日期"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Reminders" : "提醒次數"}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {language === "en" ? "Actions" : "操作"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => {
                    const email = order.guestEmail ?? (order as Record<string, unknown>).userEmail as string | null ?? null;
                    const displayEmail = email ?? `User #${order.userId}`;
                    const isGuest = !!order.guestEmail;
                    const canResend = order.guestEmail && (order.status === "completed" || order.status === "paid");
                    const hasEmail = !!order.guestEmail || !!order.userId;
                    const esimData = order.esimData as Record<string, unknown> | null;
                    const hasEsim = !!(esimData?.lpaString || esimData?.iccid);
                    const emailSent = order.emailSent;
                    const isCompleted = order.status === "completed";
                    const isProcessingFailed = order.status === "processing" || order.status === "failed";
                    const orderSupplier = (order as Record<string, unknown>).supplier as string | undefined;
                    const orderErrorMessage = (order as Record<string, unknown>).errorMessage as string | null | undefined;

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          #{order.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-foreground truncate max-w-[160px]">{displayEmail}</span>
                            {isGuest && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                                {language === "en" ? "Guest" : "訪客"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-foreground line-clamp-1 max-w-[180px]">{order.productName}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          HK${Math.round(parseFloat(order.totalAmount))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        {/* eSIM + Email status column */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {/* eSIM status */}
                            {(isCompleted || isProcessingFailed) && (
                              <button
                                onClick={() => setEsimDialog({ open: true, orderId: order.id, esimData, productName: order.productName, supplier: orderSupplier, orderStatus: order.status, errorMessage: orderErrorMessage })}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                                  hasEsim
                                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                }`}
                                title={hasEsim ? "點擊查看 eSIM 詳情" : "eSIM 資料缺失，點擊查看"}
                              >
                                <Wifi className="w-3 h-3" />
                                {hasEsim ? "eSIM ✓" : "eSIM ✗"}
                              </button>
                            )}
                            {/* TGT expiry date */}
                            {orderSupplier === "tgt" && isCompleted && (() => {
                              const tgtEsimData = esimData as Record<string, unknown> | null;
                              const activatedEndTime = tgtEsimData?.activatedEndTime as string | null | undefined;
                              if (!activatedEndTime) return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                                  <CalendarClock className="w-3 h-3" />
                                  {formatDate(activatedEndTime, language)}
                                </span>
                              );
                            })()}
                            {/* Email status */}
                            {isCompleted && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                emailSent
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}>
                                {emailSent
                                  ? <><CheckCircle2 className="w-3 h-3" />{language === "en" ? "Email ✓" : "已發郵件"}</>
                                  : <><AlertCircle className="w-3 h-3" />{language === "en" ? "No Email" : "未發郵件"}</>
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {order.status === "pending_payment" ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              (order.paymentReminderCount ?? 0) === 0
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : (order.paymentReminderCount ?? 0) >= 4
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}>
                              {(order.paymentReminderCount ?? 0) === 0 ? (
                                <>{language === "en" ? "None" : "未提醒"}</>
                              ) : (
                                <><CalendarClock className="w-3 h-3" />{order.paymentReminderCount ?? 0}/4</>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Resend confirmation email (guest completed orders) */}
                            {canResend && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`gap-1 text-xs h-7 ${!emailSent ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-primary hover:text-primary/80"}`}
                                disabled={resendEmailMutation.isPending && resendEmailMutation.variables?.orderId === order.id}
                                onClick={() => resendEmailMutation.mutate({ orderId: order.id })}
                                title={language === "en" ? "Resend confirmation email" : "重發確認電郵"}
                              >
                                <RefreshCw className={`w-3 h-3 ${resendEmailMutation.isPending && resendEmailMutation.variables?.orderId === order.id ? "animate-spin" : ""}`} />
                                {language === "en" ? "Resend" : "重發"}
                              </Button>
                            )}

                            {/* Send custom email to customer */}
                            {hasEmail && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openEmailDialog(order.id, displayEmail)}
                                title={language === "en" ? "Send email to customer" : "發送電郵給客戶"}
                              >
                                <Mail className="w-3 h-3" />
                                {language === "en" ? "Email" : "發郵件"}
                              </Button>
                            )}

                            {/* WhatsApp button: only if guestEmail looks like a phone number */}
                            {order.guestEmail && /^\+?[\d\s\-()]{8,}$/.test(order.guestEmail) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => window.open(`https://wa.me/${order.guestEmail!.replace(/\D/g, "")}`, "_blank")}
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WhatsApp
                              </Button>
                            )}

                            {/* Usage button */}
                            {isCompleted && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={() => setUsageDialog({ open: true, orderId: order.id, productName: order.productName })}
                                title={language === "en" ? "View usage" : "查看用量"}
                              >
                                <BarChart2 className="w-3 h-3" />
                                {language === "en" ? "Usage" : "用量"}
                              </Button>
                            )}

                            {/* Email history button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-7 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                              onClick={() => setEmailLogsDialog({ open: true, orderId: order.id, productName: order.productName })}
                              title={language === "en" ? "Email history" : "電郵記錄"}
                            >
                              <History className="w-3 h-3" />
                              {language === "en" ? "Logs" : "記錄"}
                            </Button>

                            {/* Terminate plan - only for completed orders */}
                            {order.status === "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                                onClick={() => setTerminateConfirm({ open: true, orderId: order.id, orderNum: String(order.id) })}
                                title={language === "en" ? "Terminate plan" : "終止方案"}
                              >
                                <XCircle className="w-3 h-3" />
                                {language === "en" ? "Terminate" : "終止"}
                              </Button>
                            )}

                            {/* Delete order */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteConfirm({ open: true, orderId: order.id, orderNum: String(order.id) })}
                              title={language === "en" ? "Delete order" : "刪除訂單"}
                            >
                              <Trash2 className="w-3 h-3" />
                              {language === "en" ? "Delete" : "刪除"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {language === "en" ? `Page ${page} of ${totalPages}` : `第 ${page} / ${totalPages} 頁`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                {language === "en" ? "Prev" : "上一頁"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                {language === "en" ? "Next" : "下一頁"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {language === "en" ? "Delete Order" : "刪除訂單"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-foreground">
              {language === "en"
                ? `Are you sure you want to permanently delete order #${deleteConfirm.orderNum}? This action cannot be undone.`
                : `確定要永久刪除訂單 #${deleteConfirm.orderNum}？此操作無法復原。`}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, orderId: null, orderNum: "" })}
              disabled={deleteOrderMutation.isPending}
            >
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm.orderId && deleteOrderMutation.mutate({ orderId: deleteConfirm.orderId })}
              disabled={deleteOrderMutation.isPending}
              className="gap-2"
            >
              {deleteOrderMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {language === "en" ? "Delete" : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Plan Confirm Dialog */}
      <Dialog open={terminateConfirm.open} onOpenChange={(open) => setTerminateConfirm((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <XCircle className="w-5 h-5" />
              {language === "en" ? "Terminate Plan" : "終止 eSIM 方案"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-foreground">
              {language === "en"
                ? `Are you sure you want to terminate the eSIM plan for order #${terminateConfirm.orderNum}? This will immediately deactivate the eSIM and cannot be undone.`
                : `確定要終止訂單 #${terminateConfirm.orderNum} 的 eSIM 方案？此操作將立即停用 eSIM 且無法復原。`}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateConfirm({ open: false, orderId: null, orderNum: "" })}
              disabled={terminatePlanMutation.isPending}
            >
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => terminateConfirm.orderId && terminatePlanMutation.mutate({ orderId: terminateConfirm.orderId })}
              disabled={terminatePlanMutation.isPending}
            >
              {terminatePlanMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {language === "en" ? "Terminate" : "確認終止"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* eSIM Details + Usage Dialog (combined with tabs) */}
      <Dialog open={esimDialog.open} onOpenChange={(open) => setEsimDialog((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${esimDialog.orderStatus === "processing" || esimDialog.orderStatus === "failed" ? "text-orange-500" : "text-green-600"}`} />
              eSIM 詳情 {esimDialog.orderId ? `#${esimDialog.orderId}` : ""}
            </DialogTitle>
          </DialogHeader>
          {/* Failure reason alert */}
          {(esimDialog.orderStatus === "processing" || esimDialog.orderStatus === "failed") && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <p className="text-sm font-medium text-orange-800">
                  {language === "en" ? "Order processing — eSIM not yet delivered" : "訂單處理中 — eSIM 尚未發出"}
                </p>
              </div>
              {esimDialog.errorMessage && (
                <p className="text-xs text-orange-700 bg-orange-100 rounded px-2 py-1 font-mono break-all">
                  {esimDialog.errorMessage}
                </p>
              )}
              <Button
                size="sm"
                className="mt-1 bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                disabled={reissueEsimMutation.isPending}
                onClick={() => {
                  if (esimDialog.orderId) {
                    reissueEsimMutation.mutate({ orderId: esimDialog.orderId });
                  }
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reissueEsimMutation.isPending ? "animate-spin" : ""}`} />
                {reissueEsimMutation.isPending
                  ? (language === "en" ? "Reissuing..." : "補發中...")
                  : (language === "en" ? "Reissue eSIM" : "補發 eSIM")}
              </Button>
            </div>
          )}
          {/* Tabs */}
          <EsimDialogTabs
            esimData={esimDialog.esimData}
            productName={esimDialog.productName}
            orderId={esimDialog.orderId}
            copyToClipboard={copyToClipboard}
            language={language}
            supplier={esimDialog.supplier}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEsimDialog((d) => ({ ...d, open: false }))}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog (kept for standalone access) */}
      <Dialog open={usageDialog.open} onOpenChange={(open) => setUsageDialog((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-600" />
              用量詳情 {usageDialog.orderId ? `#${usageDialog.orderId}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {usageDialog.orderId && (
              <>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{usageDialog.productName}</p>
                <AdminUsagePanel orderId={usageDialog.orderId} />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialog((d) => ({ ...d, open: false }))}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Logs Dialog */}
      <Dialog open={emailLogsDialog.open} onOpenChange={(open) => setEmailLogsDialog((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {language === "en" ? "Email History" : "電郵發送記錄"}
              {emailLogsDialog.orderId && <span className="text-sm font-normal text-muted-foreground">— 訂單 #{emailLogsDialog.orderId}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {emailLogsQuery.isLoading && (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {language === "en" ? "Loading..." : "載入中..."}
              </div>
            )}
            {emailLogsQuery.isError && (
              <div className="text-sm text-red-500 py-4 text-center">{emailLogsQuery.error.message}</div>
            )}
            {emailLogsQuery.data && emailLogsQuery.data.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {language === "en" ? "No email records found" : "暫無電郵發送記錄"}
              </div>
            )}
            {emailLogsQuery.data && emailLogsQuery.data.length > 0 && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {emailLogsQuery.data.map((log) => (
                  <div key={log.id} className={`rounded-lg border px-4 py-3 text-sm ${
                    log.status === "sent" ? "border-green-100 bg-green-50/50" : "border-red-100 bg-red-50/50"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {log.status === "sent"
                          ? <CheckCheck className="w-4 h-4 text-green-600 shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{log.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3" />{log.toEmail}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {log.status === "sent" ? (language === "en" ? "Sent" : "已發送") : (language === "en" ? "Failed" : "失敗")}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">{formatDateTime(new Date(log.sentAt).getTime())}</div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                        {log.emailType === "order_confirmation" ? (language === "en" ? "Order Confirmation" : "訂單確認") :
                         log.emailType === "payment_reminder" ? (language === "en" ? "Payment Reminder" : "付款提醒") :
                         log.emailType === "expiry_reminder" ? (language === "en" ? "Expiry Reminder" : "到期提醒") :
                         log.emailType === "custom" ? (language === "en" ? "Custom" : "自訂") : log.emailType}
                      </span>
                      {log.errorMessage && (
                        <span className="text-red-500 truncate">{log.errorMessage}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailLogsDialog((d) => ({ ...d, open: false }))}>
              {language === "en" ? "Close" : "關閉"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => setEmailDialog((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {language === "en" ? "Send Email to Customer" : "發送電郵給客戶"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
              {language === "en" ? "To:" : "收件人："} <span className="font-medium text-foreground">{emailDialog.customerEmail}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">
                {language === "en" ? "Subject" : "主題"}
              </Label>
              <Input
                id="email-subject"
                placeholder={language === "en" ? "Email subject..." : "電郵主題..."}
                value={emailDialog.subject}
                onChange={(e) => setEmailDialog((d) => ({ ...d, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-content">
                {language === "en" ? "Message" : "內容"}
              </Label>
              <Textarea
                id="email-content"
                placeholder={language === "en" ? "Write your message here..." : "在此輸入電郵內容..."}
                value={emailDialog.content}
                onChange={(e) => setEmailDialog((d) => ({ ...d, content: e.target.value }))}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialog((d) => ({ ...d, open: false }))}
              disabled={sendEmailMutation.isPending}
            >
              {language === "en" ? "Cancel" : "取消"}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || !emailDialog.subject.trim() || !emailDialog.content.trim()}
              className="gap-2"
            >
              {sendEmailMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {language === "en" ? "Send Email" : "發送電郵"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
