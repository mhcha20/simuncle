import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  ExternalLink,
  Globe,
  Link2,
  Minus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

// ---- IndexNow Tab ----
function IndexNowTab() {
  const pageListQuery = trpc.indexNow.getPageList.useQuery();
  const submitAllMutation = trpc.indexNow.submitAll.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`✓ 已成功提交 ${data.submitted} 個 URL 至 Bing IndexNow (HTTP ${data.status})`);
      } else {
        toast.error(`提交失敗：${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`錯誤：${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-primary" />
            Bing IndexNow 主動索引
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            IndexNow 是一個開放協議，讓你主動通知 Bing（同時分享至 Yandex 等其他搜尋引擎）網站內容已更新，
            不用等待爬蟲自動發現。每日產品同步完成後會自動執行。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => submitAllMutation.mutate()}
              disabled={submitAllMutation.isPending}
              className="flex items-center gap-2"
            >
              {submitAllMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitAllMutation.isPending ? "提交中...請稍候" : "立即提交所有頁面"}
            </Button>
            <Badge variant="secondary" className="self-center">
              {pageListQuery.data ? `共 ${pageListQuery.data.total} 個 URL` : "載入中..."}
            </Badge>
          </div>
          {submitAllMutation.data && (
            <div className={`text-sm p-3 rounded-lg ${
              submitAllMutation.data.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {submitAllMutation.data.success
                ? `✓ 成功提交 ${submitAllMutation.data.submitted} 個 URL（HTTP ${submitAllMutation.data.status}）`
                : `✗ 提交失敗：${submitAllMutation.data.error}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* URL List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">將提交的 URL 列表</CardTitle>
        </CardHeader>
        <CardContent>
          {pageListQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  目的地頁面 ({pageListQuery.data?.destinationUrls.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {pageListQuery.data?.destinationUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  核心頁面 ({pageListQuery.data?.coreUrls.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {pageListQuery.data?.coreUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key file info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">驗證設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">Key 文件：</span>
            <a
              href="https://www.simuncle.com/ef53bdea1e53f734051be26b5dd483ae.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              /ef53bdea1e53f734051be26b5dd483ae.txt
            </a>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">每日自動提交：</span>
            <span>daily-sync-products 完成後自動執行</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">提交對象：</span>
            <span>Bing（自動分享至 Yandex 等參與搜尋引擎）</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";
  const bg =
    score >= 80 ? "bg-green-50" : score >= 60 ? "bg-yellow-50" : "bg-red-50";
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-full w-24 h-24 ${bg} border-4 ${score >= 80 ? "border-green-400" : score >= 60 ? "border-yellow-400" : "border-red-400"}`}
    >
      <span className={`text-3xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground">/100</span>
    </div>
  );
}

function IssueStatusBadge({ status }: { status: string }) {
  if (status === "error")
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        錯誤
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 bg-yellow-50">
        <AlertTriangle className="w-3 h-3 mr-1" />
        警告
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      {status}
    </Badge>
  );
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 0)
    return (
      <span className="text-sm text-muted-foreground font-medium">—</span>
    );
  if (pos <= 3)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
        {pos}
      </span>
    );
  if (pos <= 10)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
        {pos}
      </span>
    );
  if (pos <= 30)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
        {pos}
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm">
      {pos}
    </span>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 text-green-600 text-xs font-medium">
        <ArrowUp className="w-3 h-3" />
        {change}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium">
      <ArrowDown className="w-3 h-3" />
      {Math.abs(change)}
    </span>
  );
}

// ─── Rank Tracker Tab ──────────────────────────────────────────────────────────

function RankTrackerTab() {
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>(undefined);
  const [selectedEngineId, setSelectedEngineId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: rankData,
    isLoading: rankLoading,
    error: rankError,
    refetch: rankRefetch,
    isFetching: rankFetching,
  } = trpc.seranking.getKeywordRankings.useQuery(
    { siteId: selectedSiteId, siteEngineId: selectedEngineId },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: enginesData } = trpc.seranking.listSearchEngines.useQuery(
    { siteId: selectedSiteId ?? rankData?.selectedSiteId ?? 0 },
    {
      enabled: !!(selectedSiteId ?? rankData?.selectedSiteId),
      staleTime: 10 * 60 * 1000,
    }
  );

  const filteredKeywords = (rankData?.keywords ?? []).filter((kw) =>
    kw.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summary = rankData?.summary;
  const projects = rankData?.projects ?? [];

  return (
    <div className="space-y-6">
      {/* Project & Engine Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        {projects.length > 0 && (
          <Select
            value={String(selectedSiteId ?? rankData?.selectedSiteId ?? "")}
            onValueChange={(v) => {
              setSelectedSiteId(Number(v));
              setSelectedEngineId(undefined);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="選擇項目" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.title} ({p.keyword_count} 關鍵字)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {enginesData && enginesData.length > 0 && (
          <Select
            value={String(selectedEngineId ?? rankData?.selectedEngineId ?? "")}
            onValueChange={(v) => setSelectedEngineId(Number(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="選擇搜尋引擎" />
            </SelectTrigger>
            <SelectContent>
              {enginesData.map((e) => (
                <SelectItem key={e.site_engine_id} value={String(e.site_engine_id)}>
                  {e.lang_code === "en"
                    ? "Google 英文"
                    : e.lang_code === "zh-TW"
                      ? "Google 繁中"
                      : `Google (${e.lang_code})`}{" "}
                  ({e.keyword_count} 關鍵字)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => rankRefetch()}
          disabled={rankFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${rankFetching ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Top 5", value: summary.top5, color: "text-green-600" },
            { label: "Top 10", value: summary.top10, color: "text-blue-600" },
            { label: "Top 30", value: summary.top30, color: "text-yellow-600" },
            { label: "Top 50", value: summary.top50, color: "text-orange-600" },
            { label: "Top 100", value: summary.top100, color: "text-muted-foreground" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Visibility */}
      {summary && (
        <Card>
          <CardContent className="p-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">可見度分數</p>
              <p className="text-2xl font-bold">{summary.visibility ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">可見度百分比</p>
              <p className="text-2xl font-bold">{summary.visibility_percent ?? 0}%</p>
            </div>
            {summary.avg_pos !== null && summary.avg_pos !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">平均排名</p>
                <p className="text-2xl font-bold">{summary.avg_pos}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">追蹤關鍵字數</p>
              <p className="text-2xl font-bold">{summary.keywords_count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {rankLoading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {rankError && (
        <Card className="border-destructive">
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            <div>
              <p className="font-medium">無法載入關鍵字排名數據</p>
              <p className="text-sm">{rankError.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keywords Table */}
      {rankData && rankData.keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4" />
                關鍵字排名（{filteredKeywords.length} / {rankData.keywords.length}）
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜尋關鍵字..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background w-48 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">關鍵字</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">排名</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">變化</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">搜尋量</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">競爭度</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{kw.name}</td>
                      <td className="px-4 py-3 text-center">
                        <PositionBadge pos={kw.latestPosition} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ChangeIndicator change={kw.positionChange} />
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.volume > 0 ? kw.volume.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.competition > 0 ? (kw.competition * 100).toFixed(0) + "%" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.cpc > 0 ? `$${kw.cpc.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {rankData && rankData.keywords.length === 0 && !rankLoading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">暫無關鍵字排名數據</p>
            <p className="text-sm mt-1">
              項目剛建立，SE Ranking 正在進行首次排名檢查，請稍後再試。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Site Audit Tab ────────────────────────────────────────────────────────────

function SiteAuditTab() {
  const { data, isLoading, error, refetch, isFetching } = trpc.seranking.getSeoSummary.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            <div>
              <p className="font-medium">無法載入 SEO 數據</p>
              <p className="text-sm">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">
                  網站健康分數
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3 pb-6">
                {data.audit ? (
                  <>
                    <ScoreRing score={data.audit.score} />
                    {data.audit.prevScore !== null && (
                      <div className="text-xs text-muted-foreground">
                        上次：{data.audit.prevScore} 分
                        {data.audit.score > data.audit.prevScore ? (
                          <span className="text-green-600 ml-1">
                            ▲ +{data.audit.score - data.audit.prevScore}
                          </span>
                        ) : data.audit.score < data.audit.prevScore ? (
                          <span className="text-red-600 ml-1">
                            ▼ {data.audit.score - data.audit.prevScore}
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      最後審查：{data.audit.lastUpdate}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">暫無審查數據</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  錯誤
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-red-600">{data.audit?.errors ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">需要立即修復</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  警告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-yellow-600">{data.audit?.warnings ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">建議改善</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <Globe className="w-4 h-4 text-blue-500" />
                  已爬取頁面
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600">
                  {data.audit?.crawledPages ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">本次審查</p>
              </CardContent>
            </Card>
          </div>

          {/* Backlinks & Authority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <Link2 className="w-4 h-4" />
                  反向連結數量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.backlinks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">總反向連結</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">
                  域名權威度（Domain Inlink Rank）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.domainAuthority}</p>
                <p className="text-xs text-muted-foreground mt-1">SE Ranking 評分</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">
                  頁面權威度（Page Inlink Rank）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.pageAuthority}</p>
                <p className="text-xs text-muted-foreground mt-1">首頁評分</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Issues */}
          {data.topIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  需要修復的 SEO 問題（Top {data.topIssues.length}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <IssueStatusBadge status={issue.status} />
                        <div>
                          <p className="text-sm font-medium">{issue.name}</p>
                          <p className="text-xs text-muted-foreground">{issue.section}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {issue.count} 頁
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Sections Overview */}
          {data.auditSections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">審查分類概覽</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.auditSections.map((section) => {
                    const issues = Object.values(section.props);
                    const errors = issues.filter((i) => i.status === "error" && i.value > 0).length;
                    const warnings = issues.filter(
                      (i) => i.status === "warning" && i.value > 0
                    ).length;
                    const passed = issues.filter((i) => i.status === "passed").length;
                    const total = issues.length;

                    return (
                      <div key={section.uid} className="border rounded-lg p-4 space-y-2">
                        <p className="font-medium text-sm">{section.name}</p>
                        <div className="flex items-center gap-2 text-xs">
                          {errors > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {errors} 錯誤
                            </span>
                          )}
                          {warnings > 0 && (
                            <span className="text-yellow-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {warnings} 警告
                            </span>
                          )}
                          {errors === 0 && warnings === 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              全部通過
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${total > 0 ? (passed / total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {passed}/{total} 項通過
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSEO() {
  const [, navigate] = useLocation();

  const { data: subData } = trpc.seranking.getSubscription.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                SEO 儀表板
              </h1>
              <p className="text-sm text-muted-foreground">
                由 SE Ranking 提供數據 · simuncle.com
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="https://online.seranking.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              SE Ranking 後台
            </a>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* API Credits */}
        {subData && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>
              API 配額：已用{" "}
              <strong>
                {(
                  subData.subscription_info.units_limit - subData.subscription_info.units_left
                ).toLocaleString()}
              </strong>{" "}
              /{" "}
              <strong>{subData.subscription_info.units_limit.toLocaleString()}</strong> credits ·
              到期日：{subData.subscription_info.expiraton_date.split(" ")[0]}
            </span>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="rankings">
          <TabsList className="mb-4">
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              關鍵字排名追蹤
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              網站審查
            </TabsTrigger>
            <TabsTrigger value="indexnow" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              IndexNow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings">
            <RankTrackerTab />
          </TabsContent>

          <TabsContent value="audit">
            <SiteAuditTab />
          </TabsContent>

          <TabsContent value="indexnow">
            <IndexNowTab />
          </TabsContent>
        </Tabs>

        {/* Footer link */}
        <div className="text-center py-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            查看完整報告、競爭對手分析、AI 搜尋可見度
          </p>
          <Button asChild>
            <a href="https://online.seranking.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              前往 SE Ranking 完整後台
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
