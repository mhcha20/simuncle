import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Globe, Loader2, Eye, EyeOff, FileText, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Lang = "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th";

const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { key: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "ja", label: "日本語", flag: "🇯🇵" },
  { key: "ko", label: "한국어", flag: "🇰🇷" },
  { key: "th", label: "ภาษาไทย", flag: "🇹🇭" },
];

type ArticleForm = {
  id?: number;
  slug: string;
  coverImage: string;
  status: "draft" | "published";
  titleZhTW: string;
  excerptZhTW: string;
  contentZhTW: string;
  titleZhCN: string;
  excerptZhCN: string;
  contentZhCN: string;
  titleEn: string;
  excerptEn: string;
  contentEn: string;
  titleJa: string;
  excerptJa: string;
  contentJa: string;
  titleKo: string;
  excerptKo: string;
  contentKo: string;
  titleTh: string;
  excerptTh: string;
  contentTh: string;
};

const defaultForm: ArticleForm = {
  slug: "",
  coverImage: "",
  status: "draft",
  titleZhTW: "", excerptZhTW: "", contentZhTW: "",
  titleZhCN: "", excerptZhCN: "", contentZhCN: "",
  titleEn: "", excerptEn: "", contentEn: "",
  titleJa: "", excerptJa: "", contentJa: "",
  titleKo: "", excerptKo: "", contentKo: "",
  titleTh: "", excerptTh: "", contentTh: "",
};

function getLangFields(form: ArticleForm, lang: Lang) {
  const map: Record<Lang, { title: string; excerpt: string; content: string }> = {
    "zh-TW": { title: form.titleZhTW, excerpt: form.excerptZhTW, content: form.contentZhTW },
    "zh-CN": { title: form.titleZhCN, excerpt: form.excerptZhCN, content: form.contentZhCN },
    "en": { title: form.titleEn, excerpt: form.excerptEn, content: form.contentEn },
    "ja": { title: form.titleJa, excerpt: form.excerptJa, content: form.contentJa },
    "ko": { title: form.titleKo, excerpt: form.excerptKo, content: form.contentKo },
    "th": { title: form.titleTh, excerpt: form.excerptTh, content: form.contentTh },
  };
  return map[lang];
}

function setLangFields(form: ArticleForm, lang: Lang, fields: { title: string; excerpt: string; content: string }): ArticleForm {
  const updates: Partial<ArticleForm> = {};
  if (lang === "zh-TW") { updates.titleZhTW = fields.title; updates.excerptZhTW = fields.excerpt; updates.contentZhTW = fields.content; }
  else if (lang === "zh-CN") { updates.titleZhCN = fields.title; updates.excerptZhCN = fields.excerpt; updates.contentZhCN = fields.content; }
  else if (lang === "en") { updates.titleEn = fields.title; updates.excerptEn = fields.excerpt; updates.contentEn = fields.content; }
  else if (lang === "ja") { updates.titleJa = fields.title; updates.excerptJa = fields.excerpt; updates.contentJa = fields.content; }
  else if (lang === "ko") { updates.titleKo = fields.title; updates.excerptKo = fields.excerpt; updates.contentKo = fields.content; }
  else if (lang === "th") { updates.titleTh = fields.title; updates.excerptTh = fields.excerpt; updates.contentTh = fields.content; }
  return { ...form, ...updates };
}

export default function AdminArticles() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [activeLang, setActiveLang] = useState<Lang>("zh-TW");
  const [translateSource, setTranslateSource] = useState<Lang>("zh-TW");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const articlesQuery = trpc.articles.adminList.useQuery();

  const createMutation = trpc.articles.create.useMutation({
    onSuccess: () => {
      toast.success("文章已建立");
      utils.articles.adminList.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("文章已更新");
      utils.articles.adminList.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const deleteMutation = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("文章已刪除");
      utils.articles.adminList.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const batchClassifyMutation = trpc.articles.batchClassify.useMutation({
    onSuccess: (data) => {
      if (data.classified === 0) {
        toast.success("所有文章已有分類，無需補分類！");
      } else {
        toast.success(`已為 ${data.classified} 篇文章補上分類，剩餘 ${data.remaining} 篇待分類`);
      }
      utils.articles.adminList.invalidate();
    },
    onError: (e) => toast.error(`批量分類失敗：${e.message}`),
  });

  const translateMutation = trpc.articles.aiTranslate.useMutation({
    onSuccess: (data) => {
      toast.success(`AI 翻譯完成！已翻譯 ${data.translatedLanguages.length} 種語言`);
      utils.articles.adminList.invalidate();
      // Refresh the form with new translations
      if (form.id) {
        utils.articles.adminGet.fetch({ id: form.id }).then((updated) => {
          if (updated) {
            setForm({
              id: updated.id,
              slug: updated.slug,
              coverImage: updated.coverImage ?? "",
              status: updated.status,
              titleZhTW: updated.titleZhTW ?? "",
              excerptZhTW: updated.excerptZhTW ?? "",
              contentZhTW: updated.contentZhTW ?? "",
              titleZhCN: updated.titleZhCN ?? "",
              excerptZhCN: updated.excerptZhCN ?? "",
              contentZhCN: updated.contentZhCN ?? "",
              titleEn: updated.titleEn ?? "",
              excerptEn: updated.excerptEn ?? "",
              contentEn: updated.contentEn ?? "",
              titleJa: updated.titleJa ?? "",
              excerptJa: updated.excerptJa ?? "",
              contentJa: updated.contentJa ?? "",
              titleKo: updated.titleKo ?? "",
              excerptKo: updated.excerptKo ?? "",
              contentKo: updated.contentKo ?? "",
              titleTh: updated.titleTh ?? "",
              excerptTh: updated.excerptTh ?? "",
              contentTh: updated.contentTh ?? "",
            });
          }
        });
      }
    },
    onError: (e) => toast.error(`翻譯失敗：${e.message}`),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">無訪問權限</p>
      </div>
    );
  }

  const handleEdit = (article: NonNullable<typeof articlesQuery.data>[0]) => {
    setForm({
      id: article.id,
      slug: article.slug,
      coverImage: article.coverImage ?? "",
      status: article.status,
      titleZhTW: article.titleZhTW ?? "",
      excerptZhTW: article.excerptZhTW ?? "",
      contentZhTW: article.contentZhTW ?? "",
      titleZhCN: article.titleZhCN ?? "",
      excerptZhCN: article.excerptZhCN ?? "",
      contentZhCN: article.contentZhCN ?? "",
      titleEn: article.titleEn ?? "",
      excerptEn: article.excerptEn ?? "",
      contentEn: article.contentEn ?? "",
      titleJa: article.titleJa ?? "",
      excerptJa: article.excerptJa ?? "",
      contentJa: article.contentJa ?? "",
      titleKo: article.titleKo ?? "",
      excerptKo: article.excerptKo ?? "",
      contentKo: article.contentKo ?? "",
      titleTh: article.titleTh ?? "",
      excerptTh: article.excerptTh ?? "",
      contentTh: article.contentTh ?? "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (form.id) {
      updateMutation.mutate({ ...form, id: form.id, coverImage: form.coverImage || null });
    } else {
      createMutation.mutate({ ...form, coverImage: form.coverImage || null });
    }
  };

  const handleTranslate = () => {
    if (!form.id) {
      toast.error("請先儲存文章後再翻譯");
      return;
    }
    const src = getLangFields(form, translateSource);
    if (!src.title && !src.content) {
      toast.error(`${LANGS.find(l => l.key === translateSource)?.label} 尚無內容可翻譯`);
      return;
    }
    translateMutation.mutate({ id: form.id, sourceLang: translateSource });
  };

  const currentLangFields = getLangFields(form, activeLang);

  const articles = articlesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                實用資訊管理
              </h1>
              <p className="text-sm text-muted-foreground">管理多語言文章，支援 AI 一鍵翻譯</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => batchClassifyMutation.mutate({ limit: 10 })}
              disabled={batchClassifyMutation.isPending}
              className="gap-2"
            >
              {batchClassifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              批量補分類
            </Button>
            <Button onClick={() => { setForm(defaultForm); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              新增文章
            </Button>
          </div>
        </div>
      </div>

      {/* Article List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {articlesQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">尚無文章，點擊「新增文章」開始撰寫</p>
            <Button onClick={() => { setForm(defaultForm); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              新增文章
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={article.status === "published" ? "default" : "secondary"}>
                          {article.status === "published" ? (
                            <><Eye className="w-3 h-3 mr-1" />已發布</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" />草稿</>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{article.slug}</span>
                      </div>
                      <h3 className="font-semibold text-base truncate">
                        {article.titleZhTW || article.titleEn || article.slug}
                      </h3>
                      {article.excerptZhTW && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{article.excerptZhTW}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {LANGS.map((l) => {
                          const hasContent = !!(
                            l.key === "zh-TW" ? article.titleZhTW :
                            l.key === "zh-CN" ? article.titleZhCN :
                            l.key === "en" ? article.titleEn :
                            l.key === "ja" ? article.titleJa :
                            l.key === "ko" ? article.titleKo :
                            article.titleTh
                          );
                          return (
                            <span key={l.key} className={`text-xs px-1.5 py-0.5 rounded ${hasContent ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                              {l.flag} {l.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(article)} className="gap-1">
                        <Edit className="w-3.5 h-3.5" />
                        編輯
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={() => setDeleteId(article.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                        刪除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(defaultForm); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "編輯文章" : "新增文章"}</DialogTitle>
            <DialogDescription>填寫文章內容，可使用 AI 一鍵翻譯到所有語言</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Slug（URL 路徑）</Label>
                <Input
                  placeholder="e.g. japan-esim-guide"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">留空則自動從標題生成</p>
              </div>
              <div className="space-y-1.5">
                <Label>狀態</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "draft" | "published" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">發布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>封面圖片 URL</Label>
              <Input
                placeholder="https://..."
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              />
            </div>

            <Separator />

            {/* AI Translation */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI 一鍵翻譯</span>
              </div>
              <p className="text-xs text-muted-foreground">
                選擇來源語言，AI 將自動翻譯到其他 5 種語言。請先儲存文章後再翻譯。
              </p>
              <div className="flex items-center gap-3">
                <Select value={translateSource} onValueChange={(v) => setTranslateSource(v as Lang)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => (
                      <SelectItem key={l.key} value={l.key}>{l.flag} {l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleTranslate}
                  disabled={translateMutation.isPending || !form.id}
                  className="gap-2"
                >
                  {translateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />翻譯中...</>
                  ) : (
                    <><Globe className="w-4 h-4" />翻譯到所有語言</>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Language Tabs */}
            <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as Lang)}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                {LANGS.map((l) => {
                  const fields = getLangFields(form, l.key);
                  const hasContent = !!(fields.title || fields.content);
                  return (
                    <TabsTrigger key={l.key} value={l.key} className="gap-1.5">
                      {l.flag} {l.label}
                      {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {LANGS.map((l) => (
                <TabsContent key={l.key} value={l.key} className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <Label>標題 / Title</Label>
                    <Input
                      placeholder={`${l.label} 標題`}
                      value={getLangFields(form, l.key).title}
                      onChange={(e) => setForm(setLangFields(form, l.key, { ...getLangFields(form, l.key), title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>摘要 / Excerpt</Label>
                    <Textarea
                      placeholder={`${l.label} 摘要（顯示在文章列表）`}
                      rows={2}
                      value={getLangFields(form, l.key).excerpt}
                      onChange={(e) => setForm(setLangFields(form, l.key, { ...getLangFields(form, l.key), excerpt: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>內容 / Content（支援 HTML）</Label>
                    <Textarea
                      placeholder={`${l.label} 文章內容（可使用 HTML 標籤）`}
                      rows={12}
                      className="font-mono text-sm"
                      value={getLangFields(form, l.key).content}
                      onChange={(e) => setForm(setLangFields(form, l.key, { ...getLangFields(form, l.key), content: e.target.value }))}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(defaultForm); }}>取消</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "儲存更改" : "建立文章"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除文章？</AlertDialogTitle>
            <AlertDialogDescription>此操作無法復原，文章將永久刪除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
