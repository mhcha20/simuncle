import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { translatePlanName, translateProductValue, translateCountry } from "@/lib/countryNames";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getLoginUrl } from "@/const";
import { encodeProductSlug } from "@shared/productSlug";
import { formatDataAmount } from "@/lib/dataAmount";
import {
  ShoppingBag,
  QrCode,
  Copy,
  Check,
  Wifi,
  BarChart2,
  Loader2,
  PlusCircle,
  Calendar,
  CalendarClock,
  Clock,
  Zap,
  Bell,
  RefreshCw,
  Share2,
  RotateCcw,
  XCircle,
  Trash2,
  CheckSquare,
  Square,
  Activity,
  Signal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useSearch, useLocation } from "wouter";
import { formatDate, formatTime, formatDateTime } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { EsimQRCode } from "@/components/EsimQRCode";

type OrderStatus = "pending_payment" | "paid" | "processing" | "completed" | "in_use" | "failed" | "refunded" | "terminated";

// ---- Shared helpers ----
const formatHKTime = (raw: string | null | undefined): string => {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString("zh-HK", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return raw;
  }
};

// ---- TGT Order Status Dialog ----
function TgtStatusDialog({ orderId, open, onClose }: { orderId: number; open: boolean; onClose: () => void }) {
  const { t, language } = useLanguage();
  const statusQuery = trpc.orders.getTgtOrderStatus.useQuery(
    { orderId },
    { enabled: open, retry: false, staleTime: 0 }
  );

  const formatTgtStatus = (status: string | null | undefined, _key: "order" | "profile") => {
    if (!status) return "—";
    const n = status.toUpperCase();
    const map: Record<string, string> = {
      NOTACTIVE: t.orders.tgtStatusNOTACTIVE,
      NODOWNLOAD: t.orders.tgtStatusNODOWNLOAD,
      ACTIVATED: t.orders.tgtStatusACTIVATED,
      INUSE: t.orders.tgtStatusINUSE,
      USED: t.orders.tgtStatusUSED,
      EXPIRED: t.orders.tgtStatusEXPIRED,
      ABANDON: t.orders.tgtStatusABANDON,
      TERMINATION: t.orders.tgtStatusTERMINATION,
      DELETED: t.orders.tgtStatusDELETED,
    };
    return map[n] ?? status;
  };

  const getProfileStatusColor = (status: string | null | undefined) => {
    if (!status) return "text-muted-foreground";
    if (status === "INUSE") return "text-green-600";
    if (status === "ACTIVATED") return "text-blue-600";
    if (status === "EXPIRED" || status === "TERMINATION" || status === "ABANDON") return "text-red-500";
    if (status === "USED") return "text-orange-500";
    return "text-muted-foreground";
  };

  const formatMB = (mb: string | undefined) => {
    if (!mb) return "—";
    const n = parseFloat(mb);
    if (isNaN(n)) return mb;
    if (n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
    return `${n.toFixed(0)} MB`;
  };

  const d = statusQuery.data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Signal className="w-5 h-5 text-primary" />
            {t.orders.tgtStatusTitle}
          </DialogTitle>
        </DialogHeader>

        {statusQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : statusQuery.isError ? (
          <div className="text-center py-6 text-sm text-muted-foreground">{t.orders.tgtNotFound}</div>
        ) : !d || !d.found ? (
          <div className="text-center py-6 text-sm text-muted-foreground">{t.orders.tgtNotFound}</div>
        ) : (
          <div className="space-y-4">
            {/* Order & Profile Status */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.orders.tgtOrderStatus}</span>
                <span className="font-medium">{formatTgtStatus(d.orderStatus, "order")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.orders.tgtProfileStatus}</span>
                <span className={`font-medium ${getProfileStatusColor(d.profileStatus)}`}>
                  {formatTgtStatus(d.profileStatus, "profile")}
                </span>
              </div>
              {d.iccid && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.orders.tgtIccid}</span>
                  <span className="font-mono text-xs">{d.iccid}</span>
                </div>
              )}
            </div>

            {/* Activation Period */}
            {(d.activatedStartTime || d.activatedEndTime) && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                {d.activatedStartTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.orders.tgtActivatedStart}</span>
                    <span className="font-medium text-xs">{formatHKTime(d.activatedStartTime)}</span>
                  </div>
                )}
                {d.activatedEndTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.orders.tgtActivatedEnd}</span>
                    <span className="font-medium text-xs">{formatHKTime(d.activatedEndTime)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Real-time Usage */}
            {d.usageSupported && d.usage ? (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1">
                  <Activity className="w-4 h-4" />
                  {t.orders.tgtUsageTitle}
                </div>
                {(() => {
                  const isUnlimitedDialog = d.usage!.dataTotal === "unlimited";
                  // For daily packages: qtaconsumption field exists, or dataTotal is absent but dataUsage exists
                  const isDailyPackageDialog = !!(d.usage!.qtaconsumption !== undefined || (!d.usage!.dataTotal && d.usage!.dataUsage !== undefined));
                  // For daily packages: prefer qtaconsumption over dataUsage
                  const usedMB = d.usage!.qtaconsumption ? parseFloat(d.usage!.qtaconsumption) : (d.usage!.dataUsage ? parseFloat(d.usage!.dataUsage) : 0);
                  // High-speed cap: productDataAmountGb first, then refuelingTotal from API as fallback
                  const refuelingTotalMBDialog = d.usage!.refuelingTotal ? parseFloat(d.usage!.refuelingTotal) : 0;
                  const highSpeedCapGb = (isUnlimitedDialog || isDailyPackageDialog) && d.productDataAmountGb ? d.productDataAmountGb : null;
                  const highSpeedCapMB = highSpeedCapGb
                    ? highSpeedCapGb * 1024
                    : (isDailyPackageDialog && refuelingTotalMBDialog > 0 ? refuelingTotalMBDialog : null);
                  const isThrottledDialog = highSpeedCapMB !== null && usedMB >= highSpeedCapMB;
                  const unlimitedPctDialog = highSpeedCapMB ? Math.min(100, (usedMB / highSpeedCapMB) * 100) : 0;

                  if ((isUnlimitedDialog || isDailyPackageDialog) && highSpeedCapMB) {
                    // Show high-speed cap progress bar
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.orders.tgtHighSpeedLimit}</span>
                          <span className="font-medium">{highSpeedCapGb! % 1 === 0 ? highSpeedCapGb!.toFixed(0) : highSpeedCapGb!.toFixed(1)} GB</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.orders.tgtDataUsage}</span>
                          <span className={`font-medium ${isThrottledDialog ? "text-orange-500" : ""}`}>{formatMB(String(usedMB))}</span>
                        </div>
                        <div className="mt-1">
                          <Progress
                            value={unlimitedPctDialog}
                            className={`h-2 ${isThrottledDialog ? "[&>div]:bg-orange-500" : unlimitedPctDialog > 80 ? "[&>div]:bg-orange-400" : "[&>div]:bg-primary"}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{unlimitedPctDialog.toFixed(1)}% {t.orders.usagePercentUsed}</span>
                            {isThrottledDialog && (
                              <span className="text-orange-500 font-medium">⚡ {t.orders.tgtThrottled}</span>
                            )}
                          </div>
                        </div>
                        {isThrottledDialog && (
                          <div className="text-xs text-orange-500 flex items-center gap-1 mt-0.5">
                            <span>{t.orders.tgtThrottledNote}</span>
                          </div>
                        )}
                        {isThrottledDialog && d.activatedEndTime && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>{t.orders.tgtActivatedEnd}: </span>
                            <span className="font-medium text-foreground">{formatHKTime(d.activatedEndTime)}</span>
                          </div>
                        )}
                      </>
                    );
                  }

                  if (isDailyPackageDialog && !highSpeedCapMB && usedMB > 0) {
                    // Daily package but no high-speed cap info — just show used amount
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.orders.tgtDataUsage}</span>
                        <span className="font-medium">{formatMB(String(usedMB))}</span>
                      </div>
                    );
                  }

                  if (isUnlimitedDialog) {
                    // Fallback: no cap info, show animated unlimited bar
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.orders.tgtDataTotal}</span>
                          <span className="font-medium">{language === "zh-TW" ? "無限流量" : language === "zh-CN" ? "无限流量" : language === "ja" ? "容量無制限" : language === "ko" ? "제한 없음" : language === "th" ? "ไม่จำกัด" : "Unlimited"}</span>
                        </div>
                        {d.usage!.dataUsage && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t.orders.tgtDataUsage}</span>
                            <span className="font-medium">{formatMB(d.usage!.dataUsage)}</span>
                          </div>
                        )}
                        <div className="mt-1">
                          <div className="h-2 rounded-full overflow-hidden bg-muted">
                            <div className="h-full w-full bg-gradient-to-r from-primary via-green-400 to-emerald-500 animate-pulse" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">{language === "zh-TW" ? "無限流量" : language === "zh-CN" ? "无限流量" : language === "ja" ? "容量無制限" : language === "ko" ? "제한 없음" : language === "th" ? "ไม่จำกัด" : "Unlimited"}</p>
                        </div>
                      </>
                    );
                  }

                  // Fixed quota plan
                  if (!d.usage!.dataTotal || !d.usage!.dataUsage) return null;
                  const total = parseFloat(d.usage!.dataTotal!);
                  const used = parseFloat(d.usage!.dataUsage!);
                  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                  return (
                    <>
                      {d.usage!.dataTotal && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.orders.tgtDataTotal}</span>
                          <span className="font-medium">{formatMB(d.usage!.dataTotal)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.orders.tgtDataUsage}</span>
                        <span className="font-medium">{formatMB(d.usage!.dataUsage)}</span>
                      </div>
                      {d.usage!.dataResidual && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t.orders.tgtDataResidual}</span>
                          <span className="font-medium text-green-600">{formatMB(d.usage!.dataResidual)}</span>
                        </div>
                      )}
                      <div className="mt-1">
                        <Progress
                          value={pct}
                          className={`h-2 ${
                            pct > 80 ? "[&>div]:bg-red-500" : pct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{pct.toFixed(1)}% {t.orders.usagePercentUsed}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">{t.orders.tgtUsageNotSupported}</p>
            )}
          </div>
        )}

        {statusQuery.dataUpdatedAt > 0 && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            {language === "zh-TW" || language === "zh-CN" ? "資料更新時間" : language === "ja" ? "データ更新時刻" : language === "ko" ? "데이터 업데이트 시간" : language === "th" ? "เวลาอัปเดต" : "Data updated at"}:
            {" "}{new Date(statusQuery.dataUpdatedAt).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">{t.common.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderUsageMini({ orderId, isTopup = false, orderStatus }: { orderId: number; isTopup?: boolean; orderStatus?: string }) {
  const { t, language } = useLanguage();
  const usageQuery = trpc.orders.getUsage.useQuery({ orderId }, { retry: false, staleTime: 5 * 60 * 1000 });
  if (usageQuery.isLoading) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t.orders.usageLoading}</span>
        </div>
      </div>
    );
  }
  if (usageQuery.isError || !usageQuery.data) return null;
  const usageData = usageQuery.data as Record<string, unknown>;
  const totalBytes = Number(usageData.dataAllowance ?? 0);
  const usedBytes = Number(usageData.dataUsage ?? 0);
  const topupCount = Number(usageData.topupCount ?? 0);
  const breakdown = Array.isArray(usageData.breakdown) ? usageData.breakdown as Array<{
    label: string; dataAllowance: number; dataUsage: number; status?: string; expiryDate?: string | null;
  }> : null;
  // Only hide entirely when there is neither combined data NOR a per-card
  // breakdown to show. With a breakdown (main + top-ups) we still render even
  // if the combined allowance is 0 (e.g. main card returns no Vizlync data).
  const isTerminated = orderStatus === "terminated";
  if (totalBytes === 0 && !(breakdown && breakdown.length > 1)) return null;
  const pct = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;
  const remainingBytes = Math.max(0, totalBytes - usedBytes);
  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };
  const getStatusColor = (s: string) =>
    s === "Active" ? "text-green-600" :
    s === "Expired" ? "text-red-500" :
    s === "Data Depleted" ? "text-orange-600" :
    s === "Not Available" ? "text-amber-600" :
    "text-gray-500";
  const getStatusLabel = (s: string, isTp: boolean, dataUsage?: number) =>
    s === "Active" ? t.orders.statusActive :
    s === "Expired" ? t.orders.statusExpired :
    s === "Data Depleted" ? t.orders.statusDataDepleted :
    s === "Not Available" ? (isTp && dataUsage === 0 ? t.orders.statusUnused : isTp ? t.orders.statusQueued : t.orders.statusNotActivated) :
    t.orders.statusNotActivated;
  const esimStatus = String(usageData.status ?? "");
  const statusColor = getStatusColor(esimStatus);
  const statusLabel = getStatusLabel(esimStatus, isTopup, usedBytes);

  // When breakdown is available (main card + add-ons), render each card separately
  if (breakdown && breakdown.length > 1) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <BarChart2 className="w-3 h-3 text-primary" />
          <span>{t.orders.usageTitle}</span>
        </div>
        {breakdown.map((card, idx) => {
          const cardHasData = card.dataAllowance > 0;
          const cardPct = cardHasData ? Math.min(100, (card.dataUsage / card.dataAllowance) * 100) : 0;
          const cardRemaining = Math.max(0, card.dataAllowance - card.dataUsage);
          const cardStatus = card.status ?? "";
          // Main card is considered "terminated/switched" if:
          // 1. The order DB status is "terminated" (user manually terminated), OR
          // 2. The main card's Vizlync status is "Data Depleted" and there are active top-ups
          //    (Vizlync auto-terminates the main card when data runs out, switching to top-up)
          const mainTerminated = idx === 0 && (isTerminated || (cardStatus === "Data Depleted" && topupCount > 0));
          const cardStatusColor = mainTerminated ? "text-red-500" : getStatusColor(cardStatus);
          const cardStatusLabel = mainTerminated ? (topupCount > 0 ? t.orders.statusTerminatedSwitched : t.orders.statusTerminated) : getStatusLabel(cardStatus, idx > 0, card.dataUsage);
          const cardLabel = card.label === "__main__" ? t.orders.mainCard : card.label;
          return (
            <div key={idx} className="rounded-md bg-muted/40 px-2.5 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground truncate max-w-[60%]">{cardLabel}</span>
                <span className={`text-xs font-medium ${cardStatusColor}`}>{cardStatusLabel}</span>
              </div>
              {cardHasData ? (
                <>
                  <Progress
                    value={cardPct}
                    className={`h-1.5 ${
                      cardPct > 80 ? "[&>div]:bg-red-500" : cardPct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{t.orders.used}: <span className="font-medium text-foreground">{formatBytes(card.dataUsage)}</span></span>
                    <span>{t.orders.remaining}: <span className="font-medium text-foreground">{formatBytes(cardRemaining)}</span></span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.orders.total}: <span className="font-medium text-foreground">{formatBytes(card.dataAllowance)}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground mt-1 italic">{t.orders.usageNotAvailable}</div>
              )}
              {card.expiryDate ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <CalendarClock className="w-3 h-3 text-primary" />
                  <span>{t.orders.expiryDate}: <span className="font-medium text-foreground">{formatDateTime(card.expiryDate, language)}</span></span>
                </div>
               ) : null}
            </div>
          );
        })}
        {isTerminated && topupCount > 0 ? (
          <div className="flex items-start gap-1 text-xs text-primary">
            <Zap className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{t.orders.terminatedTopupNote.replace("{count}", String(topupCount))}</span>
          </div>
        ) : esimStatus === "Data Depleted" && topupCount > 0 ? (
          <div className="flex items-start gap-1 text-xs text-orange-600">
            <Clock className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{t.orders.topupDataDepletedNote.replace("{count}", String(topupCount))}</span>
          </div>
        ) : null}
      </div>
    );
  }

  // Single card (no topups) — original layout
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1">
          <BarChart2 className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">{t.orders.usageTitle}</span>
        </span>
        <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 ${
          pct > 80 ? "[&>div]:bg-red-500" : pct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"
        }`}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{t.orders.used}: <span className="font-medium text-foreground">{formatBytes(usedBytes)}</span></span>
        <span>{t.orders.remaining}: <span className="font-medium text-foreground">{formatBytes(remainingBytes)}</span></span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {t.orders.total}: <span className="font-medium text-foreground">{formatBytes(totalBytes)}</span>
      </div>
      {usageData.expiryDate ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
          <CalendarClock className="w-3 h-3 text-primary" />
          <span>{t.orders.expiryDate}: <span className="font-medium text-foreground">{formatDateTime(String(usageData.expiryDate), language)}</span></span>
        </div>
      ) : null}
      {esimStatus === "Data Depleted" && topupCount > 0 && (
        <div className="flex items-start gap-1 text-xs text-orange-600 mt-1.5">
          <Clock className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t.orders.topupDataDepletedNote.replace("{count}", String(topupCount))}</span>
        </div>
      )}
      {esimStatus === "Not Available" && isTopup && (
        <div className="flex items-start gap-1 text-xs text-amber-600 mt-1.5">
          <Clock className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t.orders.topupQueuedNote}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    pending_payment: { label: t.orders.pending, cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    paid: { label: t.orders.paid, cls: "bg-blue-100 text-blue-700 border-blue-200" },
    processing: { label: t.orders.processing, cls: "bg-purple-100 text-purple-700 border-purple-200" },
    completed: { label: t.orders.completed, cls: "bg-green-100 text-green-700 border-green-200" },
    in_use: { label: t.orders.statusActive, cls: "bg-blue-100 text-blue-700 border-blue-200" },
    failed: { label: t.orders.failed, cls: "bg-red-100 text-red-700 border-red-200" },
    refunded: { label: t.orders.refunded, cls: "bg-gray-100 text-gray-600 border-gray-200" },
    terminated: { label: t.orders.statusTerminated, cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const info = map[status as OrderStatus] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.cls}`}>
      {info.label}
    </span>
  );
}

function EsimDialog({ orderId, open, onClose, initialShowTopup = false, isTopup = false }: { orderId: number; open: boolean; onClose: () => void; initialShowTopup?: boolean; isTopup?: boolean }) {
  const { t, language } = useLanguage();
  const { currency, currencyRate } = useCurrency();
  const toDisplay = (hkdAmount: number) => {
    if (currency.code === "HKD") return `${currency.symbol}${hkdAmount}`;
    return `${currency.symbol}${Math.round(hkdAmount * currencyRate).toLocaleString()}`;
  };
  const [copied, setCopied] = useState(false);
  const [showTopup, setShowTopup] = useState(initialShowTopup);
  const [dataFilter, setDataFilter] = useState<number | null>(null);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const topupSectionRef = useRef<HTMLDivElement | null>(null);

  // When opened via the "Add Data" entry, auto-expand the top-up section and
  // scroll it into view so the plan options are shown immediately.
  useEffect(() => {
    if (open && initialShowTopup) {
      setShowTopup(true);
      const id = setTimeout(() => {
        topupSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
      return () => clearTimeout(id);
    }
  }, [open, initialShowTopup]);

  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const hkdRate = parseFloat(settingsQuery.data?.["hkd_rate"] ?? "7.8");

  const esimQuery = trpc.orders.getEsimDetails.useQuery({ orderId }, { enabled: open });
  const usageQuery = trpc.orders.getUsage.useQuery({ orderId }, { enabled: open, retry: false });
  const topupPlansQuery = trpc.orders.getTopupPlans.useQuery({ orderId }, { enabled: open && showTopup });

  const purchaseTopupMutation = trpc.orders.purchaseTopup.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        toast.success(t.topup.redirecting ?? "正在跳轉至付款頁面...");
        window.open(data.url, "_blank");
      } else {
        toast.success(t.topup.success);
      }
      setShowTopup(false);
    },
    onError: (err) => toast.error(err.message || t.topup.failed),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(t.orders.copied);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async (lpa: string) => {
    const shareData = {
      title: t.orders.shareTitle,
      text: `${t.orders.shareText}${lpa}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(`${t.orders.shareText}${lpa}`).then(() => {
        toast.success(t.orders.copied);
      });
    }
  };

  const esimData = esimQuery.data?.esimData as Record<string, unknown> | null | undefined;
  const topUpAvailable = Boolean(esimQuery.data?.topUpAvailable);
  const qrCodeUrl = esimData?.qrCodeUrl as string | undefined;
  const lpaString = esimData?.lpaString as string | undefined;
  const activationCode = esimData?.activationCode as string | undefined;
  const smdpAddress = esimData?.smdpAddress as string | undefined;
  // Use lpaString for QR code if no qrCodeUrl provided
  const qrCodeValue = lpaString ?? qrCodeUrl;
  const usageData = usageQuery.data as Record<string, unknown> | null | undefined;
  // Compute usage pct to decide whether to show similar plans
  const usagePct = usageData ? (() => {
    const total = Number(usageData.dataAllowance ?? 0);
    const used = Number(usageData.dataUsage ?? 0);
    return total > 0 ? Math.min(100, (used / total) * 100) : 0;
  })() : 0;
  const shouldShowSimilar = !topUpAvailable && usagePct >= 70;
  const similarQuery = trpc.orders.getSimilarProducts.useQuery(
    { orderId },
    { enabled: open && shouldShowSimilar, staleTime: 5 * 60 * 1000 }
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialShowTopup ? (
              <>
                <Zap className="w-5 h-5 text-primary" />
                {language === "en" ? "Top-up Plans" : language === "zh-CN" ? "增值方案" : language === "ja" ? "データチャージ" : language === "ko" ? "데이터 충전" : language === "th" ? "เติมข้อมูล" : "增值方案"}
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5 text-primary" />
                {t.orders.qrCode}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {esimQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top-up Section (moved to top) */}
            {topUpAvailable && (
              <>
                <div ref={topupSectionRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowTopup(!showTopup)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {t.topup.title}
                  </Button>
                    {showTopup && (
                    <div className="mt-3 space-y-3">
                      {topupPlansQuery.isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : !Array.isArray(topupPlansQuery.data) || topupPlansQuery.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">{t.topup.noPlans}</p>
                      ) : (() => {
                        const allPlans = topupPlansQuery.data as Record<string, unknown>[];
                        const toMB = (amt: unknown, unit: unknown, name?: unknown): number => {
                          const n = Number(amt ?? 0);
                          const u = String(unit ?? "").toLowerCase();
                          if (n > 0) {
                            if (u === "gb") return n * 1024;
                            return n;
                          }
                          // Fallback: parse from plan name e.g. "5GB", "500MB", "1.5GB"
                          const nameStr = String(name ?? "");
                          const gbMatch = nameStr.match(/(\d+\.?\d*)\s*GB/i);
                          if (gbMatch) return parseFloat(gbMatch[1]) * 1024;
                          const mbMatch = nameStr.match(/(\d+\.?\d*)\s*MB/i);
                          if (mbMatch) return parseFloat(mbMatch[1]);
                          return 0;
                        };
                        const formatMB = (mb: number) => mb >= 1024 ? `${(mb/1024 % 1 === 0 ? (mb/1024).toFixed(0) : (mb/1024).toFixed(1))} GB` : `${mb} MB`;
                        // Collect sorted unique values
                        const dataSizes = Array.from(new Set(allPlans.map(p => toMB(p.dataAmount, p.dataUnit, p.name)).filter(v => v > 0))).sort((a,b)=>a-b);
                        const daysList = Array.from(new Set(allPlans.map(p => Number(p.validityDays ?? 0)).filter(v => v > 0))).sort((a,b)=>a-b);
                        const minData = dataSizes[0] ?? 0;
                        const maxData = dataSizes[dataSizes.length - 1] ?? 0;
                        const minDays = daysList[0] ?? 0;
                        const maxDays = daysList[daysList.length - 1] ?? 0;
                        // Use actual MB/days as slider value; snap to nearest available option
                        const snapData = (v: number) => dataSizes.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, dataSizes[0] ?? v);
                        const snapDays = (v: number) => daysList.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, daysList[0] ?? v);
                        const defaultData = dataSizes[Math.floor(dataSizes.length / 2)] ?? minData;
                        const defaultDays = daysList[Math.floor(daysList.length / 2)] ?? minDays;
                        const selectedData = snapData(dataFilter ?? defaultData);
                        const selectedDays = snapDays(daysFilter ?? defaultDays);
                        // Score each plan by closeness
                        const dataRange = maxData - minData || 1;
                        const daysRange = maxDays - minDays || 1;
                        const scored = allPlans.map(p => {
                          const planMB = toMB(p.dataAmount, p.dataUnit, p.name);
                          const planDays = Number(p.validityDays ?? 0);
                          const dataDiff = dataSizes.length > 1 ? Math.abs(planMB - selectedData) / dataRange : 0;
                          const daysDiff = daysList.length > 1 ? Math.abs(planDays - selectedDays) / daysRange : 0;
                          return { plan: p, score: dataDiff + daysDiff };
                        });
                        scored.sort((a,b) => a.score - b.score);
                        const filtered = scored.map(s => s.plan);
                        const visiblePlans = showAllPlans ? filtered : filtered.slice(0, 4);
                        const hasMore = filtered.length > 4;
                        return (
                          <>
                            {/* Sliders — always show if there are plans */}
                            {allPlans.length > 0 && (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-4">
                                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5" />
                                  {language === "en" ? "Select Top-up Plan" : language === "zh-CN" ? "选择所需增值方案" : language === "ja" ? "チャージプランを選択" : language === "ko" ? "충전 플랜 선택" : language === "th" ? "เลือกแผนเติมข้อมูล" : "選擇所需增值方案"}
                                </p>
                                {/* Data slider */}
                                {dataSizes.length >= 1 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">{language === "en" ? "📶 Data" : language === "zh-CN" ? "📶 数据容量" : language === "ja" ? "📶 データ容量" : language === "ko" ? "📶 데이터 용량" : language === "th" ? "📶 ปริมาณข้อมูล" : "📶 數據容量"}</span>
                                      <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{formatMB(selectedData)}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={minData}
                                      max={maxData}
                                      step={1}
                                      value={selectedData}
                                      onChange={e => setDataFilter(snapData(Number(e.target.value)))}
                                      className="w-full h-2.5 rounded-full accent-emerald-600 cursor-pointer"
                                      style={{ background: `linear-gradient(to right, #059669 0%, #059669 ${((selectedData - minData) / (maxData - minData || 1)) * 100}%, #d1fae5 ${((selectedData - minData) / (maxData - minData || 1)) * 100}%, #d1fae5 100%)` }}
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                      <span>{formatMB(minData)}</span>
                                      <span>{formatMB(maxData)}</span>
                                    </div>
                                  </div>
                                )}
                                {/* Days slider */}
                                {daysList.length >= 1 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">{language === "en" ? "📅 Validity" : language === "zh-CN" ? "📅 有效天数" : language === "ja" ? "📅 有効日数" : language === "ko" ? "📅 유효 기간" : language === "th" ? "📅 ระยะเวลา" : "📅 有效日數"}</span>
                                      <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{selectedDays} {language === "en" ? "days" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "天"}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={minDays}
                                      max={maxDays}
                                      step={1}
                                      value={selectedDays}
                                      onChange={e => setDaysFilter(snapDays(Number(e.target.value)))}
                                      className="w-full h-2.5 rounded-full accent-emerald-600 cursor-pointer"
                                      style={{ background: `linear-gradient(to right, #059669 0%, #059669 ${((selectedDays - minDays) / (maxDays - minDays || 1)) * 100}%, #d1fae5 ${((selectedDays - minDays) / (maxDays - minDays || 1)) * 100}%, #d1fae5 100%)` }}
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                      <span>{minDays} {language === "en" ? "d" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "ว" : "天"}</span>
                                      <span>{maxDays} {language === "en" ? "d" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "ว" : "天"}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Matched plans */}
                            <p className="text-xs text-muted-foreground">
                              {language === "en" ? `All plans — sorted by best match (${filtered.length})` : language === "zh-CN" ? `全部方案 — 按最接近排序（${filtered.length} 个）` : language === "ja" ? `全プラン — 最適順（${filtered.length}件）` : language === "ko" ? `전체 플랜 — 최적 순서 (${filtered.length}개)` : language === "th" ? `แผนทั้งหมด — เรียงตามความเหมาะสม (${filtered.length})` : `全部方案 — 按最接近排序（${filtered.length} 個）`}
                            </p>
                            <div className="space-y-2">
                              {visiblePlans.map((plan) => {
                                const dataAmt = plan.dataAmount;
                                const hasData = dataAmt !== null && dataAmt !== undefined && String(dataAmt).trim() !== "";
                                const dataLabel = hasData
                                  ? `${String(dataAmt)} ${String(plan.dataUnit ?? "")}`.trim()
                                  : translateProductValue(String(plan.planType ?? ""), language);
                                const vDays = Number(plan.validityDays ?? 0);
                                const validity = vDays > 0
                                  ? ` · +${vDays} ${language === "en" ? "days" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "天"}`
                                  : "";
                                return (
                                  <div key={String(plan.productId)} className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-200 shadow-sm">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{translatePlanName(String(plan.name ?? ""), language, [])}</p>
                                      <p className="text-xs text-muted-foreground">{dataLabel}{validity}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                      disabled={purchaseTopupMutation.isPending}
                                      onClick={() =>
                                        purchaseTopupMutation.mutate({
                                          orderId,
                                          topupProductId: String(plan.productId),
                                          topupProductName: String(plan.name ?? plan.productId),
                                          priceHkd: Math.round(Number(plan.price ?? 0)),
                                          origin: window.location.origin,
                                        })
                                      }
                                    >
                                      {toDisplay(Math.round(Number(plan.price ?? 0)))}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            {hasMore && !showAllPlans && (
                              <button
                                onClick={() => setShowAllPlans(true)}
                                className="w-full py-2 text-sm text-emerald-700 font-medium border border-emerald-200 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              >
                                {language === "en" ? `Show all ${filtered.length} plans` : language === "zh-CN" ? `显示全部 ${filtered.length} 个方案` : language === "ja" ? `全${filtered.length}プランを表示` : language === "ko" ? `전체 ${filtered.length}개 플랜 보기` : language === "th" ? `ดูทั้งหมด ${filtered.length} แผน` : `顯示全部 ${filtered.length} 個方案`}
                              </button>
                            )}
                            {showAllPlans && filtered.length > 4 && (
                              <button
                                onClick={() => setShowAllPlans(false)}
                                className="w-full py-2 text-sm text-muted-foreground border border-border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                {language === "en" ? "Show less" : language === "zh-CN" ? "收起" : language === "ja" ? "折りたたむ" : language === "ko" ? "접기" : language === "th" ? "ย่อลง" : "收起"}
                              </button>
                            )}
                            <p className="text-[11px] leading-relaxed text-muted-foreground px-1">
                              {t.topup.validityNote}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* QR Code */}
            {qrCodeValue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
                  {lpaString ? (
                    <EsimQRCode value={lpaString} size={192} />
                  ) : (
                    <img src={qrCodeUrl} alt="eSIM QR Code" className="w-48 h-48 object-contain" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">{t.orders.qrCode}</p>
                {lpaString && (
                  <div className="flex flex-col gap-2">
                    {/* iPhone Universal Link — one-tap eSIM install for iOS 17.4+ */}
                    <a
                      href={`https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button
                        size="sm"
                        className="w-full bg-black hover:bg-gray-800 text-white text-xs gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        {t.orders.iosInstall}
                      </Button>
                    </a>
                    <p className="text-xs text-muted-foreground text-center -mt-1">{t.orders.iosInstallNote}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 flex-1"
                        onClick={() => handleCopy(lpaString)}
                      >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {t.orders.copyLpa}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 flex-1"
                        onClick={() => handleShare(lpaString)}
                      >
                        <Share2 className="w-3 h-3" />
                        {t.orders.shareEsim}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <QrCode className="w-12 h-12 opacity-30" />
                <p className="text-sm">{t.orders.processing}</p>
              </div>
            )}

            {/* Activation Code */}
            {activationCode && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1.5">{t.orders.activationCode}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all text-foreground bg-white border border-border rounded-lg px-2 py-1.5">
                    {activationCode}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleCopy(activationCode)}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Usage Stats */}
            {(usageData || usageQuery.isLoading) && !usageQuery.isError && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      {t.orders.usageTitle}
                    </span>
                    <button
                      onClick={() => usageQuery.refetch()}
                      disabled={usageQuery.isFetching}
                      className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                      title={t.orders.usageRefresh}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${usageQuery.isFetching ? "animate-spin" : ""}`} />
                    </button>
                  </h4>
                  {usageQuery.isLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">{t.orders.usageLoading}</span>
                    </div>
                  ) : usageData && (() => {
                    // Vizlync API returns dataUsage and dataAllowance in bytes
                    const totalBytes = Number(usageData.dataAllowance ?? 0);
                    const usedBytes = Number(usageData.dataUsage ?? 0);
                    const remainingBytes = Math.max(0, totalBytes - usedBytes);
                    const pct = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;
                    const esimStatus = String(usageData.status ?? "");
                    const isRealtime = Boolean(usageData.isRealtime);
                    const lastUpdated = usageData.lastUpdated
                      ? formatDateTime(String(usageData.lastUpdated), language)
                      : null;
                    const topupCount = Number(usageData.topupCount ?? 0);
                    const addonAllowance = Number(usageData.addonAllowance ?? 0);
                    const expiryDateStr = usageData.expiryDate
                      ? formatDateTime(String(usageData.expiryDate), language)
                      : null;

                    const formatBytes = (bytes: number) => {
                      if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
                      if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
                      return `${(bytes / 1024).toFixed(0)} KB`;
                    };

                    const statusMap: Record<string, { label: string; color: string; dot: string }> = {
                      Active: {
                        label: t.orders.statusActive,
                        color: "bg-green-100 text-green-700 border-green-200",
                        dot: "bg-green-500",
                      },
                      Expired: {
                        label: t.orders.statusExpired,
                        color: "bg-red-100 text-red-700 border-red-200",
                        dot: "bg-red-500",
                      },
                      "Not Available": {
                        label: isTopup && usedBytes === 0 ? t.orders.statusUnused : isTopup ? t.orders.statusQueued : t.orders.statusNotActivated,
                        color: isTopup && usedBytes === 0 ? "bg-gray-100 text-gray-600 border-gray-200" : isTopup ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200",
                        dot: isTopup && usedBytes === 0 ? "bg-gray-400" : isTopup ? "bg-amber-400" : "bg-gray-400",
                      },
                      "Data Depleted": {
                        label: t.orders.statusDataDepleted,
                        color: "bg-orange-100 text-orange-700 border-orange-200",
                        dot: "bg-orange-500",
                      },
                    };
                    const statusInfo = statusMap[esimStatus] ?? {
                      label: esimStatus,
                      color: "bg-gray-100 text-gray-600 border-gray-200",
                      dot: "bg-gray-400",
                    };

                    // Breakdown: show each card separately if available
                    const breakdown = Array.isArray(usageData.breakdown) ? usageData.breakdown as Array<{
                      label: string; dataUsage: number; dataAllowance: number; status?: string; expiryDate?: string | null;
                    }> : null;
                    const getCardStatusInfo = (s: string, isAddon: boolean, cardDataUsage?: number, isMainWithTopup?: boolean) => {
                      if (s === "Active") return { label: t.orders.statusActive, color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" };
                      if (s === "Expired") return { label: t.orders.statusExpired, color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" };
                      if (s === "Data Depleted") {
                        // Main card depleted but has active top-ups → show terminated/switched
                        if (isMainWithTopup) return { label: t.orders.statusTerminatedSwitched, color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" };
                        return { label: t.orders.statusDataDepleted, color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" };
                      }
                      if (s === "Not Available") return isAddon && cardDataUsage === 0
                        ? { label: t.orders.statusUnused, color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" }
                        : { label: isAddon ? t.orders.statusQueued : t.orders.statusNotActivated, color: isAddon ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200", dot: isAddon ? "bg-amber-400" : "bg-gray-400" };
                      return { label: s, color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
                    };

                    if (breakdown && breakdown.length > 1) {
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{isRealtime ? t.orders.usageRealtime : ""}</span>
                          </div>
                          {breakdown.map((card, idx) => {
                            const cardPct = card.dataAllowance > 0 ? Math.min(100, (card.dataUsage / card.dataAllowance) * 100) : 0;
                            const cardRemaining = Math.max(0, card.dataAllowance - card.dataUsage);
                            const cardStatus = card.status ?? "";
                            // Main card (idx===0) with Data Depleted + active top-ups → show terminated/switched
                            const isMainWithTopup = idx === 0 && cardStatus === "Data Depleted" && topupCount > 0;
                            const cardStatusInfo = getCardStatusInfo(cardStatus, idx > 0, card.dataUsage, isMainWithTopup);
                            const cardLabel = card.label === "__main__" ? t.orders.mainCard : card.label;
                            return (
                              <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground truncate max-w-[60%]">{cardLabel}</span>
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cardStatusInfo.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cardStatusInfo.dot}`} />
                                    {cardStatusInfo.label}
                                  </span>
                                </div>
                                <Progress
                                  value={cardPct}
                                  className={`h-2.5 ${cardPct > 80 ? "[&>div]:bg-red-500" : cardPct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"}`}
                                />
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{t.orders.used}: <span className="font-medium text-foreground">{formatBytes(card.dataUsage)}</span></span>
                                  <span className="text-muted-foreground">{t.orders.remaining}: <span className="font-medium text-foreground">{formatBytes(cardRemaining)}</span></span>
                                </div>
                                <div className="text-xs text-muted-foreground">{t.orders.total}: <span className="font-medium text-foreground">{formatBytes(card.dataAllowance)}</span></div>
                                {card.expiryDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarClock className="w-3 h-3 text-primary" />
                                    <span>{t.orders.expiryDate}: <span className="font-medium text-foreground">{formatDateTime(card.expiryDate, language)}</span></span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {lastUpdated && (
                            <p className="text-xs text-muted-foreground text-right">{t.orders.usageUpdated}: {lastUpdated}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {/* Status badge */}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>
                          {isRealtime && (
                            <span className="text-xs text-muted-foreground">{t.orders.usageRealtime}</span>
                          )}
                        </div>
                        {/* Progress bar */}
                        {totalBytes > 0 ? (
                          <div className="space-y-1.5">
                            <Progress
                              value={pct}
                              className={`h-3 ${
                                pct > 80
                                  ? "[&>div]:bg-red-500"
                                  : pct > 60
                                  ? "[&>div]:bg-orange-500"
                                  : "[&>div]:bg-primary"
                              }`}
                            />
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {t.orders.used}:{" "}
                                <span className="font-medium text-foreground">{formatBytes(usedBytes)}</span>
                              </span>
                              <span className="text-muted-foreground">
                                {t.orders.remaining}:{" "}
                                <span className="font-medium text-foreground">{formatBytes(remainingBytes)}</span>
                              </span>
                            </div>
                            <div className="text-center text-xs text-muted-foreground">
                              {t.orders.total}: {formatBytes(totalBytes)}
                              &nbsp;·&nbsp;
                              {pct.toFixed(1)}% {t.orders.usagePercentUsed}
                            </div>
                            {topupCount > 0 && addonAllowance > 0 && (
                              <div className="flex items-center justify-center gap-1 text-xs text-primary">
                                <Zap className="w-3 h-3" />
                                <span>{t.orders.topupIncluded.replace("{amount}", formatBytes(addonAllowance))}</span>
                              </div>
                            )}
                            {esimStatus === "Not Available" && isTopup && (
                              <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{t.orders.topupQueuedNote}</span>
                              </div>
                            )}
                            {esimStatus === "Data Depleted" && topupCount > 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-1">
                                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{t.orders.topupDataDepletedNote.replace("{count}", String(topupCount))}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t.orders.usageNotAvailable}</p>
                        )}
                        {/* Expiry date */}
                        {expiryDateStr && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="w-3 h-3 text-primary" />
                            <span>{t.orders.expiryDate}: <span className="font-medium text-foreground">{expiryDateStr}</span></span>
                          </div>
                        )}
                        {/* Last updated */}
                        {lastUpdated && (
                          <p className="text-xs text-muted-foreground text-right">
                            {t.orders.usageUpdated}: {lastUpdated}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Similar Plans Section (top-up moved to top) */}
            {shouldShowSimilar ? (
              <>
              <Separator />
              <div>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  ⚠️ {t.topup.noTopupSuggest}
                </p>
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-primary" />
                  {t.topup.similarPlans}
                </p>
                {similarQuery.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : !similarQuery.data || (similarQuery.data as unknown[]).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">{t.topup.noPlans}</p>
                ) : (
                  <div className="space-y-2">
                    {(similarQuery.data as Record<string, unknown>[]).map((plan) => (
                      <div key={String(plan.productId)} className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium text-foreground truncate">{translatePlanName(String(plan.name ?? ""), language, [])}</p>
                          <p className="text-xs text-muted-foreground">
                            {String(plan.dataAmount ?? "")} {String(plan.dataUnit ?? "")} · {String(plan.validityDays ?? "")} {t.common.days}
                          </p>
                        </div>
                        <Link href={`/products/${encodeProductSlug(String(plan.productId))}`}>
                          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shrink-0">
                            {toDisplay(Math.round(Number(plan.price ?? 0)))}
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function usePushSubscription() {
  const { t } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const mySubsQuery = trpc.push.getMySubscriptions.useQuery();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
  }, []);

  useEffect(() => {
    if (mySubsQuery.data && mySubsQuery.data.length > 0) {
      setIsSubscribed(true);
    }
  }, [mySubsQuery.data]);

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID key not configured");

      // Convert Base64URL string to Uint8Array (required by pushManager.subscribe)
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
      };

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };
      await subscribeMutation.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      setIsSubscribed(true);
      toast.success(t.orders.pushSuccessToast);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("permission")) {
        toast.error(t.orders.pushErrorPermission);
      } else {
        toast.error(t.orders.pushErrorFailed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      toast.success(t.orders.pushDisabledToast);
    } catch {
      toast.error(t.orders.pushDisabledError);
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}

export default function Orders() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const { currency, currencyRate } = useCurrency();
  const toDisplayMain = (hkdAmount: number) => {
    if (currency.code === "HKD") return `${currency.symbol}${hkdAmount}`;
    return `${currency.symbol}${Math.round(hkdAmount * currencyRate).toLocaleString()}`;
  };
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [topupIntent, setTopupIntent] = useState(false);
  const [tgtStatusOrderId, setTgtStatusOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "topup">("orders");
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const initialStatus = (searchParams.get("status") ?? "unused") as "all" | "pending_payment" | "processing" | "completed" | "in_use" | "failed" | "unused" | "expired";
  const [statusFilter, setStatusFilter] = useState<"all" | "pending_payment" | "processing" | "completed" | "in_use" | "failed" | "unused" | "expired">(initialStatus);
  const [topupStatusFilter, setTopupStatusFilter] = useState<"all" | "pending_payment" | "completed" | "failed">("all");
  const push = usePushSubscription();
  const isTopupSuccess = searchParams.get("topup_success") === "true";
  const topupSessionId = searchParams.get("topup_session_id");

  // Sync statusFilter to URL
  const handleSetStatusFilter = (key: "all" | "pending_payment" | "processing" | "completed" | "in_use" | "failed" | "unused" | "expired") => {
    setStatusFilter(key);
    const params = new URLSearchParams(searchStr);
    if (key === "all") {
      params.delete("status");
    } else {
      params.set("status", key);
    }
    const qs = params.toString();
    navigate("/orders" + (qs ? "?" + qs : ""), { replace: true });
  };
  const utils = trpc.useUtils();
  const confirmTopupPayment = trpc.orders.confirmTopupPayment.useMutation();
  const [terminateConfirm, setTerminateConfirm] = useState<{ open: boolean; orderId: number | null }>({ open: false, orderId: null });
  const terminatePlanMutation = trpc.orders.terminatePlan.useMutation({
    onSuccess: () => {
      toast.success(language === "zh-TW" ? "方案已成功終止" : language === "zh-CN" ? "方案已成功终止" : language === "ja" ? "プランを終了しました" : language === "ko" ? "플랜이 성공적으로 종료되었습니다" : language === "th" ? "ยกเลิกแผนสำเร็จแล้ว" : "Plan terminated successfully");
      setTerminateConfirm({ open: false, orderId: null });
      ordersQuery.refetch();
      utils.orders.getUsage.invalidate();
      utils.orders.list.invalidate();
      utils.orders.getMyTopupOrders.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const retryCheckoutMutation = trpc.orders.retryCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: () => {
      toast.error(language === "zh-TW" ? "無法重新發起付款" : language === "zh-CN" ? "无法重新发起付款" : language === "ja" ? "支払いを再開できません" : language === "ko" ? "결제를 다시 시작할 수 없습니다" : language === "th" ? "ไม่สามารถเริ่มชำระเงินใหม่" : "Unable to restart payment");
    },
  });
  const topupConfirmedRef = useRef(false);

  // Batch selection state for pending_payment orders
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  const batchRetryCheckoutMutation = trpc.orders.batchRetryCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        toast.info(language === "zh-TW" ? "正在跳轉至付款頁面…" : language === "zh-CN" ? "正在跳转至付款页面…" : "Redirecting to checkout…");
        window.open(data.url, "_blank");
        setSelectedOrderIds([]);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const batchCancelFailedMutation = trpc.orders.batchCancelFailed.useMutation({
    onSuccess: (data) => {
      const n = data.affected;
      toast.success(
        language === "zh-TW" ? `已清除 ${n} 筆付款失敗訂單` :
        language === "zh-CN" ? `已清除 ${n} 笔付款失败订单` :
        language === "ja" ? `${n} 件の失敗した注文を削除しました` :
        language === "ko" ? `${n}개의 실패한 주문이 삭제되었습니다` :
        language === "th" ? `ลบ ${n} คำสั่งซื้อที่ล้มเหลวแล้ว` :
        `Cleared ${n} failed orders`
      );
      utils.orders.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const batchClearPendingMutation = trpc.orders.batchClearPending.useMutation({
    onSuccess: (data) => {
      const n = data.affected;
      toast.success(
        language === "zh-TW" ? `已清除 ${n} 筆待付款訂單` :
        language === "zh-CN" ? `已清除 ${n} 笔待付款订单` :
        language === "ja" ? `${n} 件の未払い注文を削除しました` :
        language === "ko" ? `${n}개의 미결제 주문이 삭제되었습니다` :
        language === "th" ? `ลบ ${n} คำสั่งซื้อที่รอชำระเงินแล้ว` :
        `Cleared ${n} pending orders`
      );
      setSelectedOrderIds([]);
      utils.orders.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const ordersQuery = trpc.orders.list.useQuery(undefined, { enabled: isAuthenticated });
  const topupHistoryQuery = trpc.orders.getMyTopupOrders.useQuery(undefined, {
    enabled: isAuthenticated && activeTab === "topup",
  });

  // Auto-reset statusFilter when the selected filter has 0 results
  useEffect(() => {
    if (!ordersQuery.data || statusFilter === "all") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = ordersQuery.data as Array<any>;
    const effStatus = (o: typeof orders[0]): string => {
      if (o.status === "terminated" && o.hasUsableTopup) return "completed";
      if (o.status === "completed" && o.vizlyncStatus === "Active") return "in_use";
      if (o.supplier === "tgt" && o.status === "completed" && o.tgtProfileStatus === "INUSE") return "in_use";
      return o.status;
    };
    const counts: Record<string, number> = {
      pending_payment: orders.filter(o => o.status === "pending_payment").length,
      processing: orders.filter(o => o.status === "paid" || o.status === "processing").length,
      completed: orders.filter(o => {
        const s = effStatus(o);
        if (s !== "completed" && s !== "in_use" && s !== "refunded") return false;
        // Exclude TGT expired orders from "completed" tab
        if (o.supplier === "tgt") {
          const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
          if (["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps)) return false;
        }
        return true;
      }).length,
      in_use: orders.filter(o => effStatus(o) === "in_use").length,
      failed: orders.filter(o => o.status === "failed").length,
      unused: orders.filter(o => {
        if (effStatus(o) !== "completed") return false;
        if (o.supplier !== "tgt") return (o.vizlyncStatus === "Not Available" || o.vizlyncStatus === null || o.vizlyncStatus === "");
        // TGT unused: NOTACTIVE (not activated), NODOWNLOAD (not downloaded), ACTIVATED (downloaded but not started)
        const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
        return ["NOTACTIVE", "NODOWNLOAD", "ACTIVATED"].includes(ps);
      }).length,
      expired: orders.filter(o => {
        if (o.supplier !== "tgt") return false;
        const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
        return ["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps);
      }).length,
    };
    if ((counts[statusFilter] ?? 0) === 0) {
      handleSetStatusFilter("all");
    }
  }, [ordersQuery.data, statusFilter]);

  // Auto-reset topupStatusFilter when the selected filter has 0 results
  useEffect(() => {
    if (!topupHistoryQuery.data || topupStatusFilter === "all") return;
    const data = topupHistoryQuery.data;
    const counts: Record<string, number> = {
      pending_payment: data.filter(i => i.status === "pending_payment").length,
      completed: data.filter(i => i.status === "completed" || i.status === "paid").length,
      failed: data.filter(i => i.status === "failed").length,
    };
    if ((counts[topupStatusFilter] ?? 0) === 0) {
      setTopupStatusFilter("all");
    }
  }, [topupHistoryQuery.data, topupStatusFilter]);

  // On topup_success: confirm payment immediately (don't wait for webhook/cron),
  // then refresh usage + lists. Idempotent and runs once.
  useEffect(() => {
    if (!isTopupSuccess || !isAuthenticated || topupConfirmedRef.current) return;
    topupConfirmedRef.current = true;

    const finish = () => {
      utils.orders.getUsage.invalidate();
      utils.orders.list.invalidate();
      utils.orders.getMyTopupOrders.invalidate();
      toast.success(t.topup.topupSuccess);
      const url = new URL(window.location.href);
      url.searchParams.delete("topup_success");
      url.searchParams.delete("topup_session_id");
      window.history.replaceState({}, "", url.toString());
    };

    if (topupSessionId) {
      confirmTopupPayment.mutate({ sessionId: topupSessionId }, { onSettled: finish });
    } else {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTopupSuccess, isAuthenticated, topupSessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t.auth.loginTitle}</h2>
          <p className="text-muted-foreground mb-6">{t.auth.loginDesc}</p>
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (ordersQuery.data ?? []) as any[];
  // A terminated order that still has a usable top-up plan should be presented
  // to the customer as "completed" — the add-on data is still usable, so showing
  // a "terminated" badge would be confusing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectiveStatus = (o: any): string => {
    if (o.status === "terminated" && o.hasUsableTopup) return "completed";
    // Vizlync active
    if (o.status === "completed" && o.vizlyncStatus === "Active") return "in_use";
    // TGT active (INUSE)
    if (o.supplier === "tgt" && o.status === "completed" && o.tgtProfileStatus === "INUSE") return "in_use";
    return o.status;
  };
  // Helper: is a TGT order in "unused" state (not yet started using data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTgtUnused = (o: any): boolean => {
    if (o.supplier !== "tgt") return false;
    const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
    return ["NOTACTIVE", "NODOWNLOAD", "ACTIVATED"].includes(ps);
  };
  const completedCount = orders.filter(o => {
    const s = effectiveStatus(o);
    if (s !== "completed" && s !== "in_use" && s !== "refunded") return false;
    // Exclude TGT unused orders from "completed" tab
    if (isTgtUnused(o)) return false;
    // Exclude TGT expired orders from "completed" tab
    if (o.supplier === "tgt") {
      const ps = String((o as { tgtProfileStatus?: string | null }).tgtProfileStatus ?? "").toUpperCase();
      if (["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps)) return false;
    }
    return true;
  }).length;
  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => {
    const s = effectiveStatus(o);
    if (statusFilter === "pending_payment") return s === "pending_payment";
    if (statusFilter === "processing") return s === "paid" || s === "processing";
    if (statusFilter === "completed") {
      if (!((s === "completed" || s === "in_use" || s === "refunded") && !isTgtUnused(o))) return false;
      // Exclude TGT expired orders from "completed" tab
      if (o.supplier === "tgt") {
        const ps = String((o as { tgtProfileStatus?: string | null }).tgtProfileStatus ?? "").toUpperCase();
        if (["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps)) return false;
      }
      return true;
    }
    if (statusFilter === "failed") return s === "failed";
    if (statusFilter === "in_use") return s === "in_use";
    if (statusFilter === "unused") return (
      s === "completed" && (
        // Vizlync unused
        (o.supplier !== "tgt" && (o.vizlyncStatus === "Not Available" || o.vizlyncStatus === null || o.vizlyncStatus === "")) ||
        // TGT unused: NOTACTIVE, NODOWNLOAD, ACTIVATED
        (o.supplier === "tgt" && ["NOTACTIVE", "NODOWNLOAD", "ACTIVATED"].includes(String(o.tgtProfileStatus ?? "").toUpperCase()))
      )
    );
    if (statusFilter === "expired") {
      if (o.supplier !== "tgt") return false;
      const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
      return ["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps);
    }
    return true;
  });
  const pendingCount = orders.filter(o => o.status === "pending_payment").length;
  const processingCount = orders.filter(o => o.status === "paid" || o.status === "processing").length;
  const inUseCount = orders.filter(o => effectiveStatus(o) === "in_use").length;
  const unusedCount = orders.filter(o => {
    const s = effectiveStatus(o);
    if (s !== "completed") return false;
    // Vizlync unused
    if (o.supplier !== "tgt") return (o.vizlyncStatus === "Not Available" || o.vizlyncStatus === null || o.vizlyncStatus === "");
    // TGT unused: NOTACTIVE, NODOWNLOAD, ACTIVATED
    const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
    return ["NOTACTIVE", "NODOWNLOAD", "ACTIVATED"].includes(ps);
  }).length;
  const expiredCount = orders.filter(o => {
    if (o.supplier !== "tgt") return false;
    const ps = String(o.tgtProfileStatus ?? "").toUpperCase();
    return ["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"].includes(ps);
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary/8 to-secondary/20 border-b border-border py-8">
        <div className="container">
          <h1 className="text-2xl font-bold text-foreground">{t.orders.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredOrders.length} {t.orders.title}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="container pt-6 pb-0">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "orders"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.orders.title}
          </button>
          <button
            onClick={() => setActiveTab("topup")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "topup"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {t.topup.history}
          </button>
        </div>
      </div>

      <div className="container py-8">
        {/* Push Notification Banner */}
        {push.isSupported && !push.isSubscribed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{t.orders.pushTitle}</p>
                <p className="text-xs text-muted-foreground">{t.orders.pushDesc}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
              onClick={push.subscribe}
              disabled={push.isLoading}
            >
              {push.isLoading ? t.orders.pushProcessing : t.orders.pushEnable}
            </Button>
          </div>
        )}
        {push.isSupported && push.isSubscribed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-green-700">
              <Bell className="w-4 h-4" />
              <span className="text-sm">{t.orders.pushEnabled}</span>
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={push.unsubscribe}
              disabled={push.isLoading}
            >
              {t.orders.pushUnsubscribe}
            </button>
          </div>
        )}

        {/* Status Filter - only show on orders tab */}
        {activeTab === "orders" && (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-3 scrollbar-none">
            {([
              { key: "all", label: t.orders.filterAll, count: orders.length },
              { key: "pending_payment", label: t.orders.filterPending, count: pendingCount },
              { key: "processing", label: t.orders.filterProcessing, count: processingCount },
              { key: "completed", label: t.orders.filterCompleted, count: completedCount },
              { key: "in_use", label: t.orders.filterInUse, count: inUseCount },
              { key: "unused", label: t.orders.filterUnused, count: unusedCount },
              { key: "expired", label: t.orders.filterExpired, count: expiredCount },
              { key: "failed", label: t.orders.filterFailed, count: orders.filter(o => o.status === "failed").length },
            ] as const).filter(({ key, count }) => key === "all" || count > 0).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => handleSetStatusFilter(key)}
                className={`filter-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  statusFilter === key
                    ? key === "pending_payment"
                      ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                      : key === "processing"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : key === "completed"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : key === "in_use"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : key === "unused"
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : key === "failed"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : key === "expired"
                      ? "bg-gray-100 text-gray-700 border border-gray-300"
                      : "bg-primary text-white border border-primary"
                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold ${
                    statusFilter === key ? "bg-white/30" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {activeTab === "topup" ? (
          <div className="space-y-4">
            {/* Topup Status Filter */}
            {topupHistoryQuery.data && topupHistoryQuery.data.length > 0 && (
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none">
                {([
                  { key: "all", label: t.orders.filterAll, count: topupHistoryQuery.data.length },
                  { key: "pending_payment", label: t.orders.filterPending, count: topupHistoryQuery.data.filter(i => i.status === "pending_payment").length },
                  { key: "completed", label: t.orders.filterCompleted, count: topupHistoryQuery.data.filter(i => i.status === "completed" || i.status === "paid").length },
                  { key: "failed", label: t.orders.filterFailed, count: topupHistoryQuery.data.filter(i => i.status === "failed").length },
                ] as const).filter(({ key, count }) => key === "all" || count > 0).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTopupStatusFilter(key)}
                    className={`filter-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      topupStatusFilter === key
                        ? key === "pending_payment"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                          : key === "completed"
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : key === "failed"
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-primary text-white border border-primary"
                        : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold ${
                        topupStatusFilter === key ? "bg-white/30" : "bg-muted text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {topupHistoryQuery.isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : !topupHistoryQuery.data || topupHistoryQuery.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Zap className="w-14 h-14 text-muted-foreground mb-4 opacity-30" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.topup.historyEmpty}</h3>
                <p className="text-muted-foreground text-sm">{t.topup.noTopupSuggest}</p>
              </div>
            ) : (
              (topupStatusFilter === "all" ? topupHistoryQuery.data : topupHistoryQuery.data.filter(i => {
                if (topupStatusFilter === "pending_payment") return i.status === "pending_payment";
                if (topupStatusFilter === "completed") return i.status === "completed" || i.status === "paid";
                if (topupStatusFilter === "failed") return i.status === "failed";
                return true;
              })).map((item) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  pending_payment: { label: t.topup.statusPending, cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                  paid: { label: t.topup.statusPaid, cls: "bg-blue-100 text-blue-700 border-blue-200" },
                  completed: { label: t.topup.statusCompleted, cls: "bg-green-100 text-green-700 border-green-200" },
                  failed: { label: t.topup.statusFailed, cls: "bg-red-100 text-red-700 border-red-200" },
                };
                const statusInfo = statusMap[item.status ?? "pending_payment"] ?? { label: item.status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                // Enrich data from backend
                const enriched = item as typeof item & {
                  parentStatus?: string | null;
                  parentProductName?: string | null;
                  usage?: { dataAllowance: number; dataUsage: number; status: string } | null;
                };
                // parentStatus in DB: 'completed' means card issued (NOT expired).
                // Real expiry comes from Vizlync usage.status === 'Expired'.
                const usageData = enriched.usage;
                const vizlyncExpired = usageData?.status === "Expired" || usageData?.status === "Data Depleted";
                const vizlyncActive = usageData?.status === "Active";
                // Show main card badge based on Vizlync status (if available), fallback to DB status
                const parentExpired = usageData
                  ? vizlyncExpired
                  : (enriched.parentStatus != null && ["refunded", "failed"].includes(enriched.parentStatus));
                const formatBytes = (bytes: number) => {
                  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
                  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
                  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                  return `${bytes} B`;
                };
                const usagePct = usageData && usageData.dataAllowance > 0
                  ? Math.min(100, Math.round((usageData.dataUsage / usageData.dataAllowance) * 100))
                  : null;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-border p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground text-sm line-clamp-1">{item.topupProductName}</h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Main card status badge */}
                            {(usageData || enriched.parentStatus) && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                parentExpired
                                  ? "bg-orange-50 text-orange-600 border-orange-200"
                                  : vizlyncActive
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}>
                                {parentExpired ? t.topup.mainCardExpired : t.topup.mainCardActive}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">#{String(item.id).padStart(6, '0')}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.createdAt, language)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.createdAt, language)}
                          </span>
                          {item.priceHkd && (
                            <span className="font-semibold text-primary">{toDisplayMain(Number(item.priceHkd ?? 0))}</span>
                          )}
                          {item.parentOrderId && (
                            <span className="text-muted-foreground">{t.orders.parentOrderLabel} #{item.parentOrderId}</span>
                          )}
                        </div>
                        {/* Usage progress bar for completed topups */}
                        {item.status === "completed" && usageData && usagePct !== null && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                              <span className="font-medium text-foreground">{t.topup.usageLabel}</span>
                              <span>{formatBytes(usageData.dataUsage)} / {formatBytes(usageData.dataAllowance)}</span>
                            </div>
                            <Progress value={usagePct} className="h-1.5" />
                          </div>
                        )}
                        {/* Main card expired note */}
                        {item.status === "completed" && parentExpired && (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{t.topup.mainCardExpiredNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : ordersQuery.isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {orders.length === 0 ? t.orders.empty : (
                statusFilter === "pending_payment" ? t.orders.filterPending :
                statusFilter === "processing" ? t.orders.filterProcessing :
                statusFilter === "completed" ? t.orders.filterCompleted :
                statusFilter === "unused" ? t.orders.filterUnused :
                statusFilter === "failed" ? t.orders.filterFailed :
                statusFilter === "expired" ? t.orders.filterExpired :
                t.orders.empty
              )}
            </h3>
            <p className="text-muted-foreground mb-6">
              {orders.length === 0 ? t.orders.emptyDesc : (
                language === "zh-TW" ? `沒有${statusFilter === "pending_payment" ? "待付款" : statusFilter === "processing" ? "未完成" : statusFilter === "completed" ? "已完成" : statusFilter === "unused" ? "未使用" : "失敗"}的訂單` :
                language === "zh-CN" ? `没有${statusFilter === "pending_payment" ? "待付款" : statusFilter === "processing" ? "未完成" : statusFilter === "completed" ? "已完成" : statusFilter === "unused" ? "未使用" : "失败"}的订单` :
                language === "ja" ? `${statusFilter === "pending_payment" ? "支払い待ち" : statusFilter === "processing" ? "未完了" : statusFilter === "completed" ? "完了" : statusFilter === "unused" ? "未使用" : "失敗"}の注文はありません` :
                language === "ko" ? `${statusFilter === "pending_payment" ? "결제 대기" : statusFilter === "processing" ? "미완료" : statusFilter === "completed" ? "완료" : statusFilter === "unused" ? "미사용" : "실패"} 주문이 없습니다` :
                language === "th" ? `ไม่มีคำสั่งซื้อ${statusFilter === "pending_payment" ? "รอชำระเงิน" : statusFilter === "processing" ? "ยังไม่สมบูรณ์" : statusFilter === "completed" ? "สำเร็จ" : statusFilter === "unused" ? "ยังไม่ใช้" : "ล้มเหลว"}` :
                `No ${statusFilter === "pending_payment" ? "pending payment" : statusFilter === "processing" ? "incomplete" : statusFilter === "completed" ? "completed" : statusFilter === "unused" ? "unused" : "failed"} orders`
              )}
            </p>
            {orders.length === 0 && (
              <Link href="/products">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  {t.cart.browsePlans}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Batch action toolbar for pending_payment orders */}
            {statusFilter === "pending_payment" && filteredOrders.length > 0 && (
              <div className="flex items-center justify-between gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-1.5 text-xs text-yellow-700 hover:text-yellow-900 transition-colors"
                    onClick={() => {
                      const allIds = filteredOrders.map((o) => o.id);
                      setSelectedOrderIds(selectedOrderIds.length === allIds.length ? [] : allIds);
                    }}
                  >
                    {selectedOrderIds.length === filteredOrders.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedOrderIds.length === filteredOrders.length
                      ? (language === "zh-TW" ? "取消全選" : language === "zh-CN" ? "取消全选" : language === "ja" ? "全選解除" : language === "ko" ? "전체 해제" : language === "th" ? "ยกเลิกทั้งหมด" : "Deselect all")
                      : (language === "zh-TW" ? `全選 (${filteredOrders.length})` : language === "zh-CN" ? `全选 (${filteredOrders.length})` : language === "ja" ? `全選択 (${filteredOrders.length})` : language === "ko" ? `전체 선택 (${filteredOrders.length})` : language === "th" ? `เลือกทั้งหมด (${filteredOrders.length})` : `Select all (${filteredOrders.length})`)}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedOrderIds.length > 0 && (
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white h-7 text-xs px-3"
                      disabled={batchRetryCheckoutMutation.isPending}
                      onClick={() => {
                        batchRetryCheckoutMutation.mutate({
                          orderIds: selectedOrderIds,
                          successUrl: `${window.location.origin}/orders?payment_success=true`,
                          cancelUrl: `${window.location.origin}/orders?status=pending_payment`,
                          locale: language === "zh-TW" ? "zh-HK" : language === "zh-CN" ? "zh" : language as "en" | "ja" | "ko" | "th" | undefined,
                        });
                      }}
                    >
                      {batchRetryCheckoutMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      {language === "zh-TW" ? `付款選中 (${selectedOrderIds.length})` : language === "zh-CN" ? `付款选中 (${selectedOrderIds.length})` : language === "ja" ? `選択して支払う (${selectedOrderIds.length})` : language === "ko" ? `선택 결제 (${selectedOrderIds.length})` : language === "th" ? `ชำระที่เลือก (${selectedOrderIds.length})` : `Pay selected (${selectedOrderIds.length})`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 h-7 text-xs px-3"
                    disabled={batchClearPendingMutation.isPending}
                    onClick={() => {
                      if (window.confirm(
                        language === "zh-TW" ? `確定要清除所有 ${filteredOrders.length} 筆待付款訂單？` :
                        language === "zh-CN" ? `确定要清除所有 ${filteredOrders.length} 笔待付款订单？` :
                        language === "ja" ? `保留中の注文 ${filteredOrders.length} 件をすべて削除しますか？` :
                        language === "ko" ? `대기중인 주문 ${filteredOrders.length}건을 모두 삭제하시겠습니까?` :
                        language === "th" ? `ยืนยันลบคำสั่งซื้อที่รอชำระ ${filteredOrders.length} รายการ?` :
                        `Clear all ${filteredOrders.length} pending orders?`
                      )) {
                        batchClearPendingMutation.mutate();
                      }
                    }}
                  >
                    {batchClearPendingMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    {language === "zh-TW" ? "清除全部" : language === "zh-CN" ? "清除全部" : language === "ja" ? "すべて削除" : language === "ko" ? "전체 삭제" : language === "th" ? "ลบทั้งหมด" : "Clear all"}
                  </Button>
                </div>
              </div>
            )}
            {/* Batch action toolbar for failed orders */}
            {statusFilter === "failed" && filteredOrders.length > 0 && (
              <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700">
                    {language === "zh-TW" ? `共 ${filteredOrders.length} 筆付款失敗訂單` :
                     language === "zh-CN" ? `共 ${filteredOrders.length} 笔付款失败订单` :
                     language === "ja" ? `${filteredOrders.length} 件の決済失敗注文` :
                     language === "ko" ? `결제 실패 주문 ${filteredOrders.length}건` :
                     language === "th" ? `คำสั่งซื้อที่ชำระเงินไม่สำเร็จ ${filteredOrders.length} รายการ` :
                     `${filteredOrders.length} failed payment order${filteredOrders.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 h-7 text-xs px-3"
                  disabled={batchCancelFailedMutation.isPending}
                  onClick={() => {
                    if (window.confirm(
                      language === "zh-TW" ? `確定要清除所有 ${filteredOrders.length} 筆付款失敗訂單？此操作無法復原。` :
                      language === "zh-CN" ? `确定要清除所有 ${filteredOrders.length} 笔付款失败订单？此操作无法撤销。` :
                      language === "ja" ? `${filteredOrders.length} 件の決済失敗注文をすべて削除しますか？この操作は元に戻せません。` :
                      language === "ko" ? `결제 실패 주문 ${filteredOrders.length}건을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` :
                      language === "th" ? `ยืนยันลบคำสั่งซื้อที่ชำระเงินไม่สำเร็จ ${filteredOrders.length} รายการ? การดำเนินการนี้ไม่สามารถยกเลิกได้` :
                      `Clear all ${filteredOrders.length} failed order${filteredOrders.length > 1 ? 's' : ''}? This cannot be undone.`
                    )) {
                      batchCancelFailedMutation.mutate();
                    }
                  }}
                >
                  {batchCancelFailedMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  {language === "zh-TW" ? "清除全部" : language === "zh-CN" ? "清除全部" : language === "ja" ? "すべて削除" : language === "ko" ? "전체 삭제" : language === "th" ? "ลบทั้งหมด" : "Clear all"}
                </Button>
              </div>
            )}
            {filteredOrders.map((order) => {
              const productData = order.productData as Record<string, unknown>;
              const validityDays = Number(productData?.validityDays ?? 0);
              const dataDisplay = formatDataAmount(
                { dataAmount: productData?.dataAmount, dataUnit: productData?.dataUnit },
                String(order.productName ?? ""),
              );
              const totalAmount = Math.round(parseFloat(String(order.totalAmount ?? 0))); // already in HKD
              const dispStatus = effectiveStatus(order);
              const canViewEsim = dispStatus === "completed" || dispStatus === "paid" || dispStatus === "in_use";
              // TGT expired orders: hide view/status buttons after 1 month
              const tgtExpiredStatuses = ["DELETED", "EXPIRED", "TERMINATION", "ABANDON", "USED"];
              const isTgtExpired = order.supplier === "tgt" && tgtExpiredStatuses.includes(String((order as { tgtProfileStatus?: string | null }).tgtProfileStatus ?? "").toUpperCase());
              const tgtExpiredOver1Month = isTgtExpired && (() => {
                const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
                return created > 0 && (Date.now() - created) > 30 * 24 * 60 * 60 * 1000;
              })();
              const canViewEsimFinal = canViewEsim && !tgtExpiredOver1Month;
              const topUpAvailable = Boolean(productData?.topUpAvailable);
              const orderCountries = (productData?.countries as { id: string; name: string }[]) ?? [];
              const translatedOrderName = translatePlanName(String(order.productName ?? ""), language, orderCountries);

              const isPending = order.status === "pending_payment";
              const isSelected = selectedOrderIds.includes(order.id);
              const tgtEsimData = (order.supplier === "tgt" && order.esimData) ? order.esimData as Record<string, unknown> : null;
              const tgtActivatedEndTime = tgtEsimData?.activatedEndTime as string | null | undefined;
              return (
                <div key={order.id} className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-shadow ${isSelected ? "border-yellow-400 bg-yellow-50/30" : "border-border"}`}>
                  <div className="flex items-start gap-4">
                    {isPending && statusFilter === "pending_payment" && (
                      <div className="flex items-center justify-center pt-1 shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedOrderIds(prev =>
                              checked ? [...prev, order.id] : prev.filter(id => id !== order.id)
                            );
                          }}
                          className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Wifi className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                            {translatedOrderName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            #{order.id}{dataDisplay ? ` · ${dataDisplay}` : ""} · {validityDays} {t.common.days}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <StatusBadge status={dispStatus} />
                          {order.supplier === "tgt" && order.tgtProfileStatus && (() => {
                            const ps = order.tgtProfileStatus as string;
                            const norm = (s: string) => s.toUpperCase();
                            const getBadgeCls = (s: string) => {
                              const n = norm(s);
                              if (n === "INUSE") return "bg-green-100 text-green-700 border-green-200";
                              if (n === "NOTACTIVE" || n === "NODOWNLOAD") return "bg-amber-100 text-amber-700 border-amber-200";
                              if (n === "ACTIVATED") return "bg-blue-100 text-blue-700 border-blue-200";
                              if (n === "EXPIRED" || n === "TERMINATION" || n === "ABANDON") return "bg-red-100 text-red-700 border-red-200";
                              if (n === "DELETED") return "bg-gray-100 text-gray-500 border-gray-200";
                              if (n === "USED") return "bg-orange-100 text-orange-700 border-orange-200";
                              return "bg-gray-100 text-gray-600 border-gray-200";
                            };
                            const getBadgeLabel = (s: string) => {
                              const n = norm(s);
                              if (n === "NOTACTIVE") return t.orders.statusNotActivated;
                              if (n === "INUSE") return t.orders.statusActive;
                              if (n === "ACTIVATED") return t.orders.tgtStatusACTIVATED;
                              if (n === "NODOWNLOAD") return t.orders.tgtStatusNODOWNLOAD;
                              if (n === "EXPIRED") return t.orders.statusExpired;
                              if (n === "USED") return t.orders.statusDataDepleted;
                              if (n === "TERMINATION") return t.orders.statusTerminated;
                              if (n === "ABANDON") return t.orders.statusTerminated;
                              if (n === "DELETED") return t.orders.tgtStatusDELETED;
                              return s;
                            };
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeCls(ps)}`}>
                                {getBadgeLabel(ps)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {orderCountries.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mb-3">
                          <span className="text-xs text-muted-foreground mr-0.5">{t.orders.coverage}:</span>
                          {orderCountries.slice(0, 4).map((c) => (
                            <Badge key={c.id} variant="secondary" className="text-xs px-1.5 py-0">
                              {translateCountry(c, language)}
                            </Badge>
                          ))}
                          {orderCountries.length > 4 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              +{orderCountries.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.createdAt, language)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(order.createdAt, language)}
                          </span>
                        <span className="font-semibold text-primary text-sm">
                          {toDisplayMain(totalAmount)}
                        </span>
                      </div>

                      {validityDays > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 -mt-1">
                          <CalendarClock className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {t.orders.validity}: <span className="font-medium text-foreground">{validityDays} {t.common.days}</span>
                            <span className="text-muted-foreground/70"> ({t.orders.validityHint})</span>
                          </span>
                        </div>
                      )}

                      {canViewEsimFinal && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white h-8 text-xs"
                            onClick={() => { setTopupIntent(false); setSelectedOrderId(order.id); }}
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1.5" />
                            {t.orders.viewEsim}
                          </Button>
                          {order.supplier === "tgt" && !tgtExpiredOver1Month && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 text-xs"
                              onClick={() => setTgtStatusOrderId(order.id)}
                            >
                              <Signal className="w-3.5 h-3.5 mr-1.5" />
                              {t.orders.tgtCheckStatus}
                            </Button>
                          )}
                          {order.status === "completed" && order.hasQueuedTopup && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 h-8 text-xs"
                              onClick={() => setTerminateConfirm({ open: true, orderId: order.id })}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              {language === "zh-TW" ? "提前啟動 Top-up" : language === "zh-CN" ? "提前启动 Top-up" : language === "ja" ? "Top-upを早期起動" : language === "ko" ? "Top-up 조기 활성화" : language === "th" ? "เปิดใช้ Top-up ก่อนกำหนด" : "Activate Top-up Early"}
                            </Button>
                          )}
                          {topUpAvailable && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary/30 text-primary hover:bg-primary/5 h-8 text-xs"
                              onClick={() => { setTopupIntent(true); setSelectedOrderId(order.id); }}
                            >
                              <Zap className="w-3.5 h-3.5 mr-1.5" />
                              {t.orders.topUp}
                            </Button>
                          )}
                          {order.productId && (
                            <Link href={`/products/${encodeProductSlug(order.productId)}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 text-xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                {t.orders.buyAgain}
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                      {!canViewEsimFinal && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {order.status === "pending_payment" && (
                            <Button
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs"
                              disabled={retryCheckoutMutation.isPending}
                              onClick={() => {
                                retryCheckoutMutation.mutate({
                                  orderId: order.id,
                                  successUrl: `${window.location.origin}/orders?payment_success=true`,
                                  cancelUrl: `${window.location.origin}/orders?status=pending_payment`,
                                  locale: language === "zh-TW" ? "zh-HK" : language === "zh-CN" ? "zh" : language,
                                });
                              }}
                            >
                              {retryCheckoutMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
                              {t.orders.continuePayment}
                            </Button>
                          )}
                          {order.productId && (
                            <Link href={`/products/${encodeProductSlug(order.productId)}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 text-xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                {t.orders.buyAgain}
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                      {(order.status === "completed" || order.status === "terminated") && order.supplier !== "tgt" && (
                        <OrderUsageMini orderId={order.id} orderStatus={String(order.status ?? "")} />
                      )}
                      {/* TGT inline usage bar */}
                      {(order.status === "completed" || order.status === "terminated") && order.supplier === "tgt" && (() => {
                        const tgtUsage = order.tgtUsage as { dataTotal?: string; dataUsage?: string; dataResidual?: string; qtaconsumption?: string; refuelingTotal?: string } | null | undefined;
                        const tgtProfileStatus = order.tgtProfileStatus as string | null | undefined;
                        const tgtFetchedAt = (order as { tgtFetchedAt?: string | null }).tgtFetchedAt;
                        const formatMB = (mb: string | undefined) => {
                          if (!mb) return "—";
                          const n = parseFloat(mb);
                          if (isNaN(n)) return mb;
                          if (n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
                          return `${n.toFixed(0)} MB`;
                        };
                        const getProfileLabel = (s: string | null | undefined) => {
                          if (s === null || s === undefined || s === "") return "—";
                          const n2 = s.toUpperCase();
                          if (n2 === "NOTACTIVE") return t.orders.statusNotActivated;
                          if (n2 === "INUSE") return t.orders.statusActive;
                          if (n2 === "ACTIVATED") return t.orders.tgtStatusACTIVATED;
                          if (n2 === "NODOWNLOAD") return t.orders.tgtStatusNODOWNLOAD;
                          if (n2 === "EXPIRED") return t.orders.statusExpired;
                          if (n2 === "USED") return t.orders.statusDataDepleted;
                          if (n2 === "TERMINATION" || n2 === "ABANDON") return t.orders.statusTerminated;
                          if (n2 === "DELETED") return t.orders.tgtStatusDELETED;
                          return s;
                        };
                        const getProfileColor = (s: string | null | undefined) => {
                          if (s === null || s === undefined || s === "") return "text-muted-foreground";
                          const n2 = s.toUpperCase();
                          if (n2 === "NOTACTIVE" || n2 === "NODOWNLOAD") return "text-amber-600";
                          if (n2 === "ACTIVATED") return "text-blue-600";
                          if (n2 === "INUSE") return "text-green-600";
                          if (n2 === "EXPIRED" || n2 === "TERMINATION" || n2 === "ABANDON") return "text-red-500";
                          if (n2 === "DELETED") return "text-gray-400";
                          if (n2 === "USED") return "text-orange-500";
                          return "text-gray-500";
                        };
                        const isUnlimited = tgtUsage?.dataTotal === "unlimited";
                        // For daily packages: qtaconsumption field exists (even if 0), or dataTotal is absent but dataUsage exists
                        const isDailyPackage = !!(tgtUsage && (
                          tgtUsage.qtaconsumption !== undefined ||
                          (!tgtUsage.dataTotal && tgtUsage.dataUsage !== undefined)
                        ));
                        // For unlimited/daily plans, use productData.dataAmount (GB) as high-speed cap
                        // Also fall back to refuelingTotal (daily quota in MB) from TGT API
                        const productDataAmountGb = (isUnlimited || isDailyPackage)
                          ? parseFloat(String(productData?.dataAmount ?? 0))
                          : 0;
                        const refuelingTotalMB = tgtUsage?.refuelingTotal ? parseFloat(tgtUsage.refuelingTotal) : 0;
                        const highSpeedCapMB = productDataAmountGb > 0
                          ? productDataAmountGb * 1024
                          : (isDailyPackage && refuelingTotalMB > 0 ? refuelingTotalMB : 0);
                        const total = (!isUnlimited && tgtUsage?.dataTotal) ? parseFloat(tgtUsage.dataTotal) : 0;
                        // For daily packages: prefer qtaconsumption (high-speed used) over dataUsage
                        const usedRaw = tgtUsage?.qtaconsumption ?? tgtUsage?.dataUsage;
                        const used = usedRaw ? parseFloat(usedRaw) : 0;
                        const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                        // For unlimited: pct relative to high-speed cap
                        const unlimitedPct = highSpeedCapMB > 0 ? Math.min(100, (used / highSpeedCapMB) * 100) : 0;
                        const isThrottled = (isUnlimited || isDailyPackage) && highSpeedCapMB > 0 && used >= highSpeedCapMB;
                        return (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3 h-3 text-primary" />
                                <span className="text-muted-foreground">{t.orders.usageTitle}</span>
                              </span>
                              <span className={`font-medium ${isThrottled ? "text-orange-500" : getProfileColor(tgtProfileStatus)}`}>
                                {isThrottled ? t.orders.tgtThrottled : getProfileLabel(tgtProfileStatus)}
                              </span>
                            </div>
                            {tgtUsage && (isUnlimited || isDailyPackage) && highSpeedCapMB > 0 ? (
                              <>
                                <Progress
                                  value={unlimitedPct}
                                  className={`h-1.5 ${(isThrottled || (isDailyPackage && used >= highSpeedCapMB)) ? "[&>div]:bg-orange-500" : unlimitedPct > 80 ? "[&>div]:bg-orange-400" : "[&>div]:bg-primary"}`}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>{t.orders.used}: <span className="font-medium text-foreground">{formatMB(String(used))}</span></span>
                                  <span className="text-muted-foreground">{t.orders.tgtHighSpeedLimit}: <span className="font-medium text-foreground">{productDataAmountGb % 1 === 0 ? productDataAmountGb.toFixed(0) : productDataAmountGb.toFixed(1)} GB</span></span>
                                </div>
                                {(isThrottled || (isDailyPackage && used >= highSpeedCapMB)) && (
                                  <div className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                    <span>⚡</span>
                                    <span>{t.orders.tgtThrottledNote}</span>
                                  </div>
                                )}
                              </>
                            ) : tgtUsage && isDailyPackage && used > 0 ? (
                              // Daily package but no high-speed cap info — just show used amount
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>
                                  {t.orders.used}: <span className="font-medium text-foreground">{formatMB(String(used))}</span>
                                </span>
                              </div>
                            ) : tgtUsage && isUnlimited ? (
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>
                                  <span className="font-medium text-foreground">∞ </span>
                                  {t.orders.total}: <span className="font-medium text-foreground">{language === "zh-TW" || language === "zh-CN" ? "無限流量" : "Unlimited"}</span>
                                </span>
                                <span>
                                  {t.orders.used}: <span className="font-medium text-foreground">{formatMB(tgtUsage.dataUsage)}</span>
                                </span>
                              </div>
                            ) : tgtUsage && total > 0 ? (
                              <>
                                <Progress
                                  value={pct}
                                  className={`h-1.5 ${
                                    pct > 80 ? "[&>div]:bg-red-500" : pct > 60 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"
                                  }`}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>{t.orders.used}: <span className="font-medium text-foreground">{formatMB(tgtUsage.dataUsage)}</span></span>
                                  <span>{t.orders.remaining}: <span className="font-medium text-foreground">{formatMB(tgtUsage.dataResidual)}</span></span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {t.orders.total}: <span className="font-medium text-foreground">{formatMB(tgtUsage.dataTotal)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground italic mt-1">{t.orders.usageNotAvailable}</div>
                            )}
                            {tgtActivatedEndTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                                <CalendarClock className="w-3 h-3 text-muted-foreground/70" />
                                <span>
                                  {t.orders.tgtActivatedEnd}:
                                  {" "}<span className="font-medium text-foreground">{formatHKTime(tgtActivatedEndTime)}</span>
                                </span>
                              </div>
                            )}
                            {tgtFetchedAt && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-1.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>
                                  {language === "zh-TW" || language === "zh-CN" ? "最後更新" : language === "ja" ? "最終更新" : language === "ko" ? "마지막 업데이트" : language === "th" ? "อัปเดตล่าสุด" : "Updated"}:
                                  {" "}{new Date(tgtFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Terminate Plan Confirm Dialog */}
      <Dialog open={terminateConfirm.open} onOpenChange={(open) => setTerminateConfirm((d) => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <XCircle className="w-5 h-5" />
              {language === "zh-TW" ? "提前啟動 Top-up 方案" : language === "zh-CN" ? "提前启动 Top-up 方案" : language === "ja" ? "Top-upを早期起動" : language === "ko" ? "Top-up 조기 활성화" : language === "th" ? "เปิดใช้ Top-up ก่อนกำหนด" : "Activate Top-up Early"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-foreground">
              {language === "zh-TW" ? "此操作將終止目前的主方案，並立即啟動已購買的 Top-up 增値方案。請確認您已購買 Top-up 方案再進行此操作。"
                : language === "zh-CN" ? "此操作将终止当前的主方案，并立即启动已购买的 Top-up 增值方案。请确认您已购买 Top-up 方案再进行此操作。"
                : language === "ja" ? "この操作は現在のメインプランを終了し、購入済みの Top-up プランを即座に起動します。Top-up プランを購入済みの場合のみ実行してください。"
                : language === "ko" ? "이 작업은 현재 메인 플랜을 종료하고 구매한 Top-up 플랜을 즉시 활성화합니다. Top-up 플랜을 구매한 경우에만 실행하세요."
                : language === "th" ? "การดำเนินการนี้จะยุติแผนหลักปัจจุบันและเปิดใช้แผน Top-up ที่ซื้อไว้ทันที กรุณาซื้อแผน Top-up ก่อนดำเนินการนี้"
                : "This will terminate your current main plan and immediately activate your purchased Top-up plan. Only proceed if you have already purchased a Top-up plan."}
            </p>
            {(() => {
              const targetOrder = orders.find((o) => o.id === terminateConfirm.orderId);
              if (!targetOrder?.hasUsableTopup) return null;
              return (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary">
                    {language === "zh-TW" ? "您已購買增值方案，終止主卡後增值方案可立即啟用使用。"
                      : language === "zh-CN" ? "您已购买增值方案，终止主卡后增值方案可立即启用使用。"
                      : language === "ja" ? "追加データプランをご購入済みです。メインプラン終了後、追加プランをすぐにご利用いただけます。"
                      : language === "ko" ? "추가 데이터 플랜을 구매하셨습니다. 메인 플랜 종료 후 추가 플랜을 즉시 사용할 수 있습니다."
                      : language === "th" ? "คุณได้ซื้อแพ็กเกจเติมข้อมูลแล้ว หลังจากยกเลิกแผนหลัก แพ็กเกจเติมจะใช้งานได้ทันที"
                      : "You have a top-up plan. After terminating the main plan, your top-up will be available for immediate use."}
                  </p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateConfirm({ open: false, orderId: null })}
              disabled={terminatePlanMutation.isPending}
            >
              {language === "zh-TW" ? "取消" : language === "zh-CN" ? "取消" : language === "ja" ? "キャンセル" : language === "ko" ? "취소" : language === "th" ? "ยกเลิก" : "Cancel"}
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
              {language === "zh-TW" ? "確認提前啟動" : language === "zh-CN" ? "确认提前启动" : language === "ja" ? "早期起動する" : language === "ko" ? "조기 활성화 확인" : language === "th" ? "ยืนยันการเปิดใช้" : "Confirm Activate Early"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* eSIM Dialog */}
      {selectedOrderId !== null && (
        <EsimDialog
          orderId={selectedOrderId}
          open={selectedOrderId !== null}
          onClose={() => { setSelectedOrderId(null); setTopupIntent(false); }}
          initialShowTopup={topupIntent}
        />
      )}

      {/* TGT Status Dialog */}
      {tgtStatusOrderId !== null && (
        <TgtStatusDialog
          orderId={tgtStatusOrderId}
          open={tgtStatusOrderId !== null}
          onClose={() => setTgtStatusOrderId(null)}
        />
      )}
    </div>
  );
}
