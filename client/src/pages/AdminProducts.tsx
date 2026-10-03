import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  Package,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Pencil,
  Download,
  Upload,
  Languages,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

// CSV helpers
function escapeCsvField(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(cur); cur = ""; }
      else { cur += ch; }
    }
  }
  result.push(cur);
  return result;
}

const PAGE_SIZE = 50;

// Translation languages (product names are NOT translated, only description & planInfo)
type TransLang = "zh-TW" | "zh-CN" | "ja" | "ko" | "th";
type TransField =
  | "descriptionZhTW" | "descriptionZhCN" | "descriptionJa" | "descriptionKo" | "descriptionTh"
  | "planInfoZhTW" | "planInfoZhCN" | "planInfoJa" | "planInfoKo" | "planInfoTh";

const TRANS_LANGS: { key: TransLang; label: string; flag: string; descField: TransField; piField: TransField }[] = [
  { key: "zh-TW", label: "繁中", flag: "🇹🇼", descField: "descriptionZhTW", piField: "planInfoZhTW" },
  { key: "zh-CN", label: "簡中", flag: "🇨🇳", descField: "descriptionZhCN", piField: "planInfoZhCN" },
  { key: "ja", label: "日文", flag: "🇯🇵", descField: "descriptionJa", piField: "planInfoJa" },
  { key: "ko", label: "韓文", flag: "🇰🇷", descField: "descriptionKo", piField: "planInfoKo" },
  { key: "th", label: "泰文", flag: "🇹🇭", descField: "descriptionTh", piField: "planInfoTh" },
];

function emptyTransDraft(): Record<TransField, string> {
  return {
    descriptionZhTW: "", descriptionZhCN: "", descriptionJa: "", descriptionKo: "", descriptionTh: "",
    planInfoZhTW: "", planInfoZhCN: "", planInfoJa: "", planInfoKo: "", planInfoTh: "",
  };
}

type ProductRow = {
  productId: string;
  name: string;
  customName: string | null;
  customDescription: string | null;
  description: string | null;
  price: string;
  dataAmount: string | null;
  dataUnit: string | null;
  validityDays: number | null;
  countries: unknown;
  region: unknown;
  isActive: boolean;
  supplier: "vizlync" | "tgt" | null;
};

export default function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterSupplier, setFilterSupplier] = useState<"vizlync" | "tgt" | undefined>(undefined);
  const [page, setPage] = useState(0);

  // Edit dialog state
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Translation edit dialog state
  const [translationProduct, setTranslationProduct] = useState<ProductRow | null>(null);
  const [activeTransLang, setActiveTransLang] = useState<TransLang>("zh-TW");
  const [transDraft, setTransDraft] = useState<Record<TransField, string>>(emptyTransDraft());

  const queryInput = useMemo(
    () => ({
      search: search || undefined,
      isActive: filterActive,
      supplier: filterSupplier,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, filterActive, filterSupplier, page]
  );

  const productsQuery = trpc.adminProducts.list.useQuery(queryInput, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const syncHistoryQuery = trpc.products.getSyncHistory.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const lastSyncs = (["vizlync", "tgt"] as const)
    .map((supplier) => ({ supplier, row: syncHistoryQuery.data?.find((h) => h.supplier === supplier) }))
    .filter((x): x is { supplier: "vizlync" | "tgt"; row: NonNullable<typeof x.row> } => !!x.row);

  const utils = trpc.useUtils();

  const toggleMutation = trpc.adminProducts.toggle.useMutation({
    onMutate: async ({ productId, isActive }) => {
      await utils.adminProducts.list.cancel();
      const prev = utils.adminProducts.list.getData(queryInput);
      if (prev) {
        utils.adminProducts.list.setData(queryInput, {
          ...prev,
          products: prev.products.map((p) =>
            p.productId === productId ? { ...p, isActive } : p
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.adminProducts.list.setData(queryInput, context.prev);
      }
      toast.error(language === "en" ? "Failed to update product" : language === "zh-CN" ? "更新产品失败" : "更新產品失敗");
    },
    onSuccess: (_data, { isActive }) => {
      toast.success(
        isActive
          ? language === "en" ? "Product enabled" : language === "zh-CN" ? "产品已启用" : "產品已啟用"
          : language === "en" ? "Product disabled" : language === "zh-CN" ? "产品已停用" : "產品已停用"
      );
    },
    onSettled: () => {
      utils.adminProducts.list.invalidate();
    },
  });

  const updateCustomMutation = trpc.adminProducts.updateCustom.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Product updated" : language === "zh-CN" ? "产品已更新" : "產品已更新");
      utils.adminProducts.list.invalidate();
      setEditProduct(null);
    },
    onError: () => {
      toast.error(language === "en" ? "Failed to update product" : language === "zh-CN" ? "更新失败" : "更新失敗");
    },
  });

  // Translation batch state
  const [showTranslation, setShowTranslation] = useState(false);
  const [batchLang, setBatchLang] = useState<"ja" | "ko" | "th" | "zh-TW">("zh-TW");
  const [batchLog, setBatchLog] = useState<string[]>([]);
  const [isBatching, setIsBatching] = useState(false);

  const translationStatsQuery = trpc.adminProducts.translationStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: isBatching ? 3000 : false,
  });

  const batchTranslateMutation = trpc.adminProducts.batchTranslate.useMutation({
    onSuccess: (data) => {
      const langName = batchLang === "ja" ? "日文" : batchLang === "ko" ? "韓文" : batchLang === "th" ? "泰文" : "繁體中文";
      setBatchLog(prev => [...prev, `✓ 翻譯了 ${data.translated} 個產品，剩餘 ${data.remaining} 個`]);
      if (data.remaining > 0) {
        batchTranslateMutation.mutate({ lang: batchLang, batchSize: 5 });
      } else {
        setIsBatching(false);
        setBatchLog(prev => [...prev, `✅ ${langName}翻譯全部完成！`]);
        translationStatsQuery.refetch();
        toast.success(`${langName}批量翻譯完成`);
      }
    },
    onError: (err) => {
      setIsBatching(false);
      setBatchLog(prev => [...prev, `❌ 錯誤：${err.message}`]);
      toast.error("批量翻譯失敗");
    },
  });

  const handleStartBatch = () => {
    if (isBatching) return;
    setIsBatching(true);
    const langName = batchLang === "ja" ? "日文" : batchLang === "ko" ? "韓文" : batchLang === "th" ? "泰文" : "繁體中文";
    setBatchLog([`▶ 開始批量翻譯 ${langName}...`]);
    batchTranslateMutation.mutate({ lang: batchLang, batchSize: 5 });
  };

  // CSV export/import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const exportQuery = trpc.adminProducts.exportCsv.useQuery(undefined, { enabled: false });
  const bulkUpdateMutation = trpc.adminProducts.bulkUpdateCustom.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "en"
          ? `Updated ${data.updated} products`
          : `已更新 ${data.updated} 個產品`
      );
      utils.adminProducts.list.invalidate();
    },
    onError: () => {
      toast.error(language === "en" ? "Import failed" : "匯入失敗");
    },
    onSettled: () => setIsImporting(false),
  });

  const handleExportCsv = async () => {
    toast.info(language === "en" ? "Preparing CSV…" : "準備 CSV 中…");
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    const header = "productId,name,customName,customDescription,price,validityDays,dataAmount,dataUnit,isActive";
    const lines = rows.map((r) =>
      [
        escapeCsvField(r.productId),
        escapeCsvField(r.name),
        escapeCsvField(r.customName),
        escapeCsvField(r.customDescription),
        escapeCsvField(String(r.price)),
        escapeCsvField(String(r.validityDays ?? "")),
        escapeCsvField(String(r.dataAmount ?? "")),
        escapeCsvField(r.dataUnit),
        escapeCsvField(r.isActive ? "true" : "false"),
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `esim-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          toast.error(language === "en" ? "CSV is empty" : "CSV 檔案是空的");
          setIsImporting(false);
          return;
        }
        const header = parseCsvLine(lines[0]).map((h) => h.trim());
        const pidIdx = header.indexOf("productId");
        const cnIdx = header.indexOf("customName");
        const cdIdx = header.indexOf("customDescription");
        if (pidIdx === -1) {
          toast.error(language === "en" ? "Missing productId column" : "CSV 缺少 productId 欄位");
          setIsImporting(false);
          return;
        }
        const rows = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          return {
            productId: cols[pidIdx]?.trim() ?? "",
            customName: cnIdx !== -1 ? (cols[cnIdx]?.trim() || null) : null,
            customDescription: cdIdx !== -1 ? (cols[cdIdx]?.trim() || null) : null,
          };
        }).filter((r) => r.productId);
        if (rows.length === 0) {
          toast.error(language === "en" ? "No valid rows found" : "找不到有效資料列");
          setIsImporting(false);
          return;
        }
        bulkUpdateMutation.mutate({ rows });
      } catch {
        toast.error(language === "en" ? "Failed to parse CSV" : "CSV 解析失敗");
        setIsImporting(false);
      }
    };
    reader.readAsText(file, "utf-8");
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const openEdit = (product: ProductRow) => {
    setEditProduct(product);
    setEditName(product.customName ?? "");
    setEditDesc(product.customDescription ?? "");
  };

  // ---- Translation preview/edit ----
  const translationQuery = trpc.adminProducts.getProductTranslations.useQuery(
    { productId: translationProduct?.productId ?? "" },
    { enabled: !!translationProduct }
  );

  // Sync fetched translations into the editable draft
  useEffect(() => {
    const d = translationQuery.data;
    if (d) {
      setTransDraft({
        descriptionZhTW: d.descriptionZhTW ?? "",
        descriptionZhCN: d.descriptionZhCN ?? "",
        descriptionJa: d.descriptionJa ?? "",
        descriptionKo: d.descriptionKo ?? "",
        descriptionTh: d.descriptionTh ?? "",
        planInfoZhTW: d.planInfoZhTW ?? "",
        planInfoZhCN: d.planInfoZhCN ?? "",
        planInfoJa: d.planInfoJa ?? "",
        planInfoKo: d.planInfoKo ?? "",
        planInfoTh: d.planInfoTh ?? "",
      });
    }
  }, [translationQuery.data]);

  const updateTransMutation = trpc.adminProducts.updateProductTranslations.useMutation({
    onSuccess: () => {
      toast.success(language === "en" ? "Translations saved" : language === "zh-CN" ? "翻译已保存" : "翻譯已儲存");
      utils.adminProducts.translationStats.invalidate();
      setTranslationProduct(null);
    },
    onError: () => {
      toast.error(language === "en" ? "Failed to save translations" : language === "zh-CN" ? "保存翻译失败" : "儲存翻譯失敗");
    },
  });

  const [retranslatingLang, setRetranslatingLang] = useState<TransLang | null>(null);
  const retranslateMutation = trpc.adminProducts.retranslateProduct.useMutation({
    onSuccess: (data, vars) => {
      const lang = TRANS_LANGS.find((l) => l.key === vars.lang);
      if (lang) {
        setTransDraft((prev) => ({
          ...prev,
          [lang.descField]: data.description ?? "",
          [lang.piField]: data.planInfo ?? "",
        }));
      }
      toast.success(language === "en" ? "Re-translated" : language === "zh-CN" ? "已重新翻译" : "已重新翻譯");
      setRetranslatingLang(null);
    },
    onError: () => {
      toast.error(language === "en" ? "Re-translation failed" : language === "zh-CN" ? "重新翻译失败" : "重新翻譯失敗");
      setRetranslatingLang(null);
    },
  });

  const openTranslations = (product: ProductRow) => {
    setActiveTransLang("zh-TW");
    setTransDraft(emptyTransDraft());
    setTranslationProduct(product);
  };

  const handleSaveTranslations = () => {
    if (!translationProduct) return;
    const toNull = (s: string) => (s.trim() === "" ? "" : s);
    updateTransMutation.mutate({
      productId: translationProduct.productId,
      descriptionZhTW: toNull(transDraft.descriptionZhTW),
      descriptionZhCN: toNull(transDraft.descriptionZhCN),
      descriptionJa: toNull(transDraft.descriptionJa),
      descriptionKo: toNull(transDraft.descriptionKo),
      descriptionTh: toNull(transDraft.descriptionTh),
      planInfoZhTW: toNull(transDraft.planInfoZhTW),
      planInfoZhCN: toNull(transDraft.planInfoZhCN),
      planInfoJa: toNull(transDraft.planInfoJa),
      planInfoKo: toNull(transDraft.planInfoKo),
      planInfoTh: toNull(transDraft.planInfoTh),
    });
  };

  const handleSaveEdit = () => {
    if (!editProduct) return;
    updateCustomMutation.mutate({
      productId: editProduct.productId,
      customName: editName.trim() || null,
      customDescription: editDesc.trim() || null,
    });
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {language === "en" ? "Admin Access Required" : language === "zh-CN" ? "需要管理员权限" : "需要管理員權限"}
        </h1>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === "en" ? "Back to Home" : language === "zh-CN" ? "返回首页" : "返回首頁"}
          </Button>
        </Link>
      </div>
    );
  }

  const products = (productsQuery.data?.products ?? []) as unknown as ProductRow[];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(draftSearch);
    setPage(0);
  };

  const handleFilterChange = (val: string) => {
    setFilterActive(val === "all" ? undefined : val === "active" ? true : false);
    setPage(0);
  };

  const handleSupplierChange = (val: string) => {
    setFilterSupplier(val === "all" ? undefined : val as "vizlync" | "tgt");
    setPage(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {language === "en" ? "Admin" : "管理"}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {language === "en" ? "Product Management" : language === "zh-CN" ? "产品管理" : "產品管理"}
          </h1>
          {lastSyncs.map(({ supplier, row }) => (
            <span key={supplier} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {supplier === "tgt" ? "TGT" : "Vizlync"} {language === "en" ? "last sync:" : "上次同步："}{" "}
              {new Date(row.createdAt).toLocaleString()}
              {row.status === "failed" && (
                <span className="ml-1 text-destructive">· {language === "en" ? "Failed" : "失敗"}</span>
              )}
              {row.failedCount > 0 && row.status === "success" && (
                <span className="ml-1 text-amber-600">· {row.failedCount} {language === "en" ? "failed" : "個失敗"}</span>
              )}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {total > 0 && (
            <Badge variant="secondary">
              {total} {language === "en" ? "products" : language === "zh-CN" ? "个产品" : "個產品"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowTranslation(v => !v)}>
            <Languages className="w-4 h-4 mr-1" />
            {language === "en" ? "Translations" : "翻譯管理"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exportQuery.isFetching}>
            <Download className="w-4 h-4 mr-1" />
            {language === "en" ? "Export CSV" : "匯出 CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="w-4 h-4 mr-1" />
            {isImporting ? (language === "en" ? "Importing…" : "匯入中…") : (language === "en" ? "Import CSV" : "匯入 CSV")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
          />
        </div>
      </div>

      {/* Translation Stats Panel */}
      {showTranslation && (
        <div className="mb-6 border rounded-xl p-5 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              {language === "en" ? "Translation Status" : "翻譯狀態"}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowTranslation(false)}>✕</Button>
          </div>
          {translationStatsQuery.isLoading ? (
            <div className="space-y-3">
              {["zh", "ja", "ko", "th"].map(l => <Skeleton key={l} className="h-6 w-full" />)}
            </div>
          ) : (() => {
            const stats = translationStatsQuery.data;
            if (!stats) return null;
            const langs: { key: keyof typeof stats; label: string; flag: string }[] = [
              { key: "translatedZh", label: "繁體中文", flag: "🇹🇼" },
              { key: "translatedJa", label: "日文", flag: "🇯🇵" },
              { key: "translatedKo", label: "韓文", flag: "🇰🇷" },
              { key: "translatedTh", label: "泰文", flag: "🇹🇭" },
            ];
            return (
              <div className="space-y-3">
                {langs.map(({ key, label, flag }) => {
                  const count = Number(stats[key] ?? 0);
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{flag} {label}</span>
                        <span className="text-muted-foreground">{count} / {stats.total} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="mt-5 border-t pt-4">
            <p className="text-sm font-medium mb-3">{language === "en" ? "Batch Translate" : "批量翻譯"}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["zh-TW", "ja", "ko", "th"] as const).map(l => (
                <Button
                  key={l}
                  variant={batchLang === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBatchLang(l)}
                  disabled={isBatching}
                >
                  {l === "ja" ? "🇯🇵 日文" : l === "ko" ? "🇰🇷 韓文" : l === "th" ? "🇹🇭 泰文" : "🇹🇼 繁體中文"}
                </Button>
              ))}
              <Button
                size="sm"
                onClick={handleStartBatch}
                disabled={isBatching}
                className="ml-auto"
              >
                {isBatching ? (language === "en" ? "Translating…" : "翻譯中…") : (language === "en" ? "Start Batch" : "開始批量翻譯")}
              </Button>
            </div>
            {batchLog.length > 0 && (
              <div className="bg-background border rounded-lg p-3 text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                {batchLog.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder={language === "en" ? "Search by name, ID, country…" : language === "zh-CN" ? "按名称、ID、国家搜索…" : "依名稱、ID、國家搜尋…"}
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {(["all", "active", "disabled"] as const).map((f) => (
            <Button
              key={f}
              variant={
                (f === "all" && filterActive === undefined) ||
                (f === "active" && filterActive === true) ||
                (f === "disabled" && filterActive === false)
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => handleFilterChange(f)}
            >
              {f === "all"
                ? language === "en" ? "All" : "全部"
                : f === "active"
                ? language === "en" ? "Active" : language === "zh-CN" ? "启用" : "啟用"
                : language === "en" ? "Disabled" : language === "zh-CN" ? "停用" : "停用"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "vizlync", "tgt"] as const).map((s) => (
            <Button
              key={s}
              variant={
                (s === "all" && filterSupplier === undefined) ||
                (s === "vizlync" && filterSupplier === "vizlync") ||
                (s === "tgt" && filterSupplier === "tgt")
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => handleSupplierChange(s)}
            >
              {s === "all"
                ? language === "en" ? "All Suppliers" : "全部供應商"
                : s === "vizlync"
                ? "Vizlync"
                : "TGT"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
          <span>{language === "en" ? "Product" : language === "zh-CN" ? "产品" : "產品"}</span>
          <span className="text-right">{language === "en" ? "Price" : language === "zh-CN" ? "价格" : "價格"}</span>
          <span className="text-right">{language === "en" ? "Data" : language === "zh-CN" ? "流量" : "流量"}</span>
          <span className="text-right">{language === "en" ? "Days" : language === "zh-CN" ? "天数" : "天數"}</span>
          <span className="text-center">{language === "en" ? "Trans." : language === "zh-CN" ? "翻译" : "翻譯"}</span>
          <span className="text-center">{language === "en" ? "Edit" : language === "zh-CN" ? "编辑" : "編輯"}</span>
          <span className="text-center">{language === "en" ? "Active" : language === "zh-CN" ? "启用" : "啟用"}</span>
        </div>

        {/* Error state */}
        {productsQuery.isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
            <p className="font-medium">
              {language === "en" ? "Failed to load products" : language === "zh-CN" ? "加载产品失败" : "載入產品失敗"}
            </p>
            <Button variant="outline" size="sm" onClick={() => productsQuery.refetch()}>
              {language === "en" ? "Retry" : language === "zh-CN" ? "重试" : "重試"}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {productsQuery.isLoading && (
          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-5 w-8 mx-auto" />
                <Skeleton className="h-5 w-8 mx-auto" />
                <Skeleton className="h-5 w-10 mx-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!productsQuery.isLoading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Package className="w-10 h-10" />
            <p>{language === "en" ? "No products found" : language === "zh-CN" ? "未找到产品" : "找不到產品"}</p>
          </div>
        )}

        {/* Product rows */}
        {!productsQuery.isLoading && products.length > 0 && (
          <div className="divide-y">
            {products.map((product) => {
              const countries = (product.countries as Array<{ id: string; name: string }> | null) ?? [];
              const regions = (product.region as string[] | null) ?? [];
              const dataStr = product.dataAmount
                ? `${parseFloat(String(product.dataAmount))}${product.dataUnit ?? "GB"}`
                : "—";
              const isPending = toggleMutation.isPending && toggleMutation.variables?.productId === product.productId;
              const hasCustom = !!(product.customName || product.customDescription);

              return (
                <div
                  key={product.productId}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center transition-colors hover:bg-muted/30 ${!product.isActive ? "opacity-60" : ""}`}
                >
                  {/* Product info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {product.customName || product.name}
                      </span>
                      {product.customName && (
                        <Badge variant="outline" className="text-xs shrink-0 text-primary border-primary/40">
                          {language === "en" ? "Custom" : "自訂"}
                        </Badge>
                      )}
                      {!product.isActive && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          <EyeOff className="w-3 h-3 mr-1" />
                          {language === "en" ? "Hidden" : language === "zh-CN" ? "已隐藏" : "已隱藏"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 items-center">
                      <span className="font-mono">{product.productId}</span>
                      {product.supplier === "tgt" ? (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
                          TGT
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                          Vizlync
                        </Badge>
                      )}
                      {regions.length > 0 && <span>{regions[0]}</span>}
                      {countries.length > 0 && (
                        <span>
                          {countries.slice(0, 3).map((c) => c.name).join(", ")}
                          {countries.length > 3 && ` +${countries.length - 3}`}
                        </span>
                      )}
                      {product.customDescription && (
                        <span className="text-primary/70">
                          {language === "en" ? "Custom desc" : "自訂概覽"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-sm font-medium tabular-nums text-right">
                    US${parseFloat(String(product.price)).toFixed(2)}
                  </span>

                  {/* Data */}
                  <span className="text-sm text-right text-muted-foreground">{dataStr}</span>

                  {/* Validity */}
                  <span className="text-sm text-right text-muted-foreground">
                    {product.validityDays ? `${product.validityDays}d` : "—"}
                  </span>

                  {/* Translations button */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => openTranslations(product)}
                      aria-label="Edit translations"
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Edit button */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`w-8 h-8 ${hasCustom ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => openEdit(product)}
                      aria-label="Edit product"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Toggle */}
                  <div className="flex justify-center">
                    <Switch
                      checked={product.isActive}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ productId: product.productId, isActive: checked })
                      }
                      aria-label={product.isActive ? "Disable product" : "Enable product"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {language === "en"
              ? `Page ${page + 1} of ${totalPages}`
              : language === "zh-CN"
              ? `第 ${page + 1} / ${totalPages} 页`
              : `第 ${page + 1} / ${totalPages} 頁`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? "Edit Product" : language === "zh-CN" ? "编辑产品" : "編輯產品"}
            </DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-mono">{editProduct.productId}</span>
                <p className="mt-1 text-muted-foreground/80 line-clamp-2">{editProduct.name}</p>
              </div>

              {/* Custom Name */}
              <div className="space-y-1.5">
                <Label>
                  {language === "en" ? "Custom Name" : language === "zh-CN" ? "自定义名称" : "自訂名稱"}
                </Label>
                <Input
                  placeholder={editProduct.name}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Leave empty to use original name"
                    : language === "zh-CN"
                    ? "留空則使用原始名稱"
                    : "留空則使用原始名稱"}
                </p>
              </div>

              {/* Custom Description */}
              <div className="space-y-1.5">
                <Label>
                  {language === "en" ? "Custom Overview" : language === "zh-CN" ? "自定义概览" : "自訂概覽"}
                </Label>
                <Textarea
                  placeholder={
                    language === "en"
                      ? "Enter custom overview text (supports HTML)…"
                      : language === "zh-CN"
                      ? "輸入自訂概覽文字（支援 HTML）…"
                      : "輸入自訂概覽文字（支援 HTML）…"
                  }
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Leave empty to use original description. Supports plain text or HTML."
                    : language === "zh-CN"
                    ? "留空則使用原始描述，支援純文字或 HTML。"
                    : "留空則使用原始描述，支援純文字或 HTML。"}
                </p>
              </div>

              {(editProduct.customName || editProduct.customDescription) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => {
                    setEditName("");
                    setEditDesc("");
                  }}
                >
                  {language === "en" ? "Clear all custom fields" : language === "zh-CN" ? "清除所有自定义" : "清除所有自訂"}
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              {language === "en" ? "Cancel" : language === "zh-CN" ? "取消" : "取消"}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateCustomMutation.isPending}
            >
              {updateCustomMutation.isPending
                ? language === "en" ? "Saving…" : "儲存中…"
                : language === "en" ? "Save" : language === "zh-CN" ? "保存" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translation Edit Dialog */}
      <Dialog open={!!translationProduct} onOpenChange={(open) => !open && setTranslationProduct(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" />
              {language === "en" ? "Edit Translations" : language === "zh-CN" ? "编辑翻译" : "編輯翻譯"}
            </DialogTitle>
          </DialogHeader>
          {translationProduct && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-mono">{translationProduct.productId}</span>
                <p className="mt-1 text-muted-foreground/80 line-clamp-2">{translationProduct.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">
                  {language === "en"
                    ? "Product names are not translated. Only description & plan info below."
                    : language === "zh-CN"
                    ? "产品名称不翻译，仅翻译以下描述与方案说明。"
                    : "產品名稱不翻譯，僅翻譯以下描述與方案說明。"}
                </p>
              </div>

              {translationQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* Source (English) reference */}
                  <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground">
                      🇬🇧 {language === "en" ? "Source (English)" : language === "zh-CN" ? "源文（英文）" : "原文（英文）"}
                    </p>
                    <div className="text-xs text-muted-foreground/80">
                      <span className="font-medium">{language === "en" ? "Description: " : "描述："}</span>
                      <span className="line-clamp-3">{(translationQuery.data?.description || "—").replace(/<[^>]+>/g, " ")}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/80">
                      <span className="font-medium">{language === "en" ? "Plan Info: " : "方案說明："}</span>
                      <span className="line-clamp-3">{(translationQuery.data?.planInfo || "—").replace(/<[^>]+>/g, " ")}</span>
                    </div>
                  </div>

                  {/* Language tabs */}
                  <Tabs value={activeTransLang} onValueChange={(v) => setActiveTransLang(v as TransLang)}>
                    <TabsList className="grid w-full grid-cols-5">
                      {TRANS_LANGS.map((l) => (
                        <TabsTrigger key={l.key} value={l.key} className="text-xs">
                          {l.flag} {l.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {TRANS_LANGS.map((l) => (
                      <TabsContent key={l.key} value={l.key} className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retranslatingLang !== null}
                            onClick={() => {
                              if (!translationProduct) return;
                              setRetranslatingLang(l.key);
                              retranslateMutation.mutate({ productId: translationProduct.productId, lang: l.key });
                            }}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${retranslatingLang === l.key ? "animate-spin" : ""}`} />
                            {retranslatingLang === l.key
                              ? (language === "en" ? "Translating…" : "翻譯中…")
                              : (language === "en" ? "Re-translate" : language === "zh-CN" ? "重新翻译" : "重新翻譯")}
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{language === "en" ? "Description" : language === "zh-CN" ? "描述" : "描述"}</Label>
                          <Textarea
                            value={transDraft[l.descField]}
                            onChange={(e) => setTransDraft((prev) => ({ ...prev, [l.descField]: e.target.value }))}
                            rows={5}
                            className="text-xs"
                            placeholder={language === "en" ? "No translation yet" : "尚未翻譯"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{language === "en" ? "Plan Info" : language === "zh-CN" ? "方案说明" : "方案說明"}</Label>
                          <Textarea
                            value={transDraft[l.piField]}
                            onChange={(e) => setTransDraft((prev) => ({ ...prev, [l.piField]: e.target.value }))}
                            rows={5}
                            className="text-xs"
                            placeholder={language === "en" ? "No translation yet" : "尚未翻譯"}
                          />
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTranslationProduct(null)}>
              {language === "en" ? "Cancel" : language === "zh-CN" ? "取消" : "取消"}
            </Button>
            <Button onClick={handleSaveTranslations} disabled={updateTransMutation.isPending || translationQuery.isLoading}>
              {updateTransMutation.isPending
                ? (language === "en" ? "Saving…" : "儲存中…")
                : (language === "en" ? "Save" : language === "zh-CN" ? "保存" : "儲存")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
