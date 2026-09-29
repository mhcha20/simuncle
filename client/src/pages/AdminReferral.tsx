import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Clock, Users, TrendingUp, Gift, ArrowLeft } from "lucide-react";

type StatusFilter = "all" | "pending" | "paid" | "cancelled";

export default function AdminReferral() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // Redirect non-admins
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: commissionsData, isLoading: commissionsLoading, refetch } = trpc.referral.adminList.useQuery(
    { limit: LIMIT, offset, status: statusFilter },
    { enabled: !!user && user.role === "admin" }
  );

  const { data: codesData, isLoading: codesLoading } = trpc.referral.adminListCodes.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const markPaidMutation = trpc.referral.adminMarkPaid.useMutation({
    onSuccess: () => {
      toast.success("已標記為已付款");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPending = commissionsData?.rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.commissionHkd, 0) ?? 0;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            推薦計劃管理
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">查看所有推薦記錄，標記佣金已付款</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" /> 推薦碼總數
            </div>
            <p className="text-2xl font-bold">{codesLoading ? "—" : codesData?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" /> 佣金記錄
            </div>
            <p className="text-2xl font-bold">{commissionsLoading ? "—" : commissionsData?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="w-4 h-4" /> 待付佣金
            </div>
            <p className="text-2xl font-bold text-amber-600">HK${totalPending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle className="w-4 h-4" /> 已付佣金
            </div>
            <p className="text-2xl font-bold text-green-600">
              HK${commissionsData?.rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.commissionHkd, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">佣金記錄</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setOffset(0); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待付款</SelectItem>
              <SelectItem value="paid">已付款</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !commissionsData?.rows.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>暫無佣金記錄</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">推薦人</th>
                      <th className="text-left py-2 pr-4 font-medium">推薦碼</th>
                      <th className="text-left py-2 pr-4 font-medium">訂單</th>
                      <th className="text-right py-2 pr-4 font-medium">訂單金額</th>
                      <th className="text-right py-2 pr-4 font-medium">佣金</th>
                      <th className="text-left py-2 pr-4 font-medium">狀態</th>
                      <th className="text-left py-2 pr-4 font-medium">日期</th>
                      <th className="text-left py-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionsData.rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{row.referrerName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{row.referrerEmail ?? ""}</p>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">{row.referralCode ?? "—"}</td>
                        <td className="py-3 pr-4">#{row.refereeOrderId}</td>
                        <td className="py-3 pr-4 text-right">HK${row.orderAmountHkd}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-primary">HK${row.commissionHkd}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={row.status === "paid" ? "default" : row.status === "cancelled" ? "destructive" : "secondary"}
                          >
                            {row.status === "paid" ? "已付款" : row.status === "cancelled" ? "已取消" : "待付款"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {new Date(row.createdAt).toLocaleDateString("zh-HK")}
                          {row.paidAt && (
                            <p>付款: {new Date(row.paidAt).toLocaleDateString("zh-HK")}</p>
                          )}
                        </td>
                        <td className="py-3">
                          {row.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPaidMutation.mutate({ id: row.id })}
                              disabled={markPaidMutation.isPending}
                            >
                              標記已付款
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {commissionsData.total > LIMIT && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>共 {commissionsData.total} 筆，顯示 {offset + 1}–{Math.min(offset + LIMIT, commissionsData.total)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                      上一頁
                    </Button>
                    <Button size="sm" variant="outline" disabled={offset + LIMIT >= commissionsData.total} onClick={() => setOffset(offset + LIMIT)}>
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Referral codes table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">推薦碼列表</CardTitle>
        </CardHeader>
        <CardContent>
          {codesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !codesData?.length ? (
            <p className="text-center py-8 text-muted-foreground">暫無推薦碼</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">用戶</th>
                    <th className="text-left py-2 pr-4 font-medium">推薦碼</th>
                    <th className="text-right py-2 pr-4 font-medium">折扣</th>
                    <th className="text-right py-2 pr-4 font-medium">佣金率</th>
                    <th className="text-left py-2 pr-4 font-medium">狀態</th>
                    <th className="text-left py-2 font-medium">建立日期</th>
                  </tr>
                </thead>
                <tbody>
                  {codesData.map((code) => (
                    <tr key={code.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{code.userName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{code.userEmail ?? ""}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold">{code.code}</td>
                      <td className="py-3 pr-4 text-right">{code.discountPct}%</td>
                      <td className="py-3 pr-4 text-right">{code.commissionPct}%</td>
                      <td className="py-3 pr-4">
                        <Badge variant={code.isActive ? "default" : "secondary"}>
                          {code.isActive ? "啟用" : "停用"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {new Date(code.createdAt).toLocaleDateString("zh-HK")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
