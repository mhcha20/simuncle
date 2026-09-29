import { useState } from "react";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Bell, Send, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type AnnouncementForm = {
  id?: number;
  message: string;
  messageZhTW: string;
  messageZhCN: string;
  link: string;
  linkText: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
};

const defaultForm: AnnouncementForm = {
  message: "",
  messageZhTW: "",
  messageZhCN: "",
  link: "",
  linkText: "",
  bgColor: "#16a34a",
  textColor: "#ffffff",
  isActive: false,
};

export default function AdminAnnouncements() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(defaultForm);
  const [showPushForm, setShowPushForm] = useState(false);
  const [pushForm, setPushForm] = useState({ title: "", body: "", url: "" });

  const utils = trpc.useUtils();

  const announcementsQuery = trpc.announcements.list.useQuery();
  const subscriberCountQuery = trpc.push.subscriberCount.useQuery();

  const upsertMutation = trpc.announcements.upsert.useMutation({
    onSuccess: () => {
      toast.success("公告已儲存");
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const toggleMutation = trpc.announcements.toggleActive.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      toast.success("公告已刪除");
      utils.announcements.list.invalidate();
      utils.announcements.getActive.invalidate();
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const sendPushMutation = trpc.push.sendToAll.useMutation({
    onSuccess: (result) => {
      toast.success(`推播已發送！成功 ${result.sent} 個，過期 ${result.expired} 個，失敗 ${result.failed} 個`);
      setShowPushForm(false);
      setPushForm({ title: "", body: "", url: "" });
    },
    onError: (e) => toast.error(`發送失敗：${e.message}`),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        無權限查看此頁面
      </div>
    );
  }

  const handleEdit = (a: typeof announcementsQuery.data extends (infer T)[] | undefined ? T : never) => {
    if (!a) return;
    setForm({
      id: a.id,
      message: a.message,
      messageZhTW: a.messageZhTW ?? "",
      messageZhCN: a.messageZhCN ?? "",
      link: a.link ?? "",
      linkText: a.linkText ?? "",
      bgColor: a.bgColor,
      textColor: a.textColor,
      isActive: a.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.message.trim()) {
      toast.error("請填寫英文公告內容");
      return;
    }
    upsertMutation.mutate({
      ...form,
      messageZhTW: form.messageZhTW || null,
      messageZhCN: form.messageZhCN || null,
      link: form.link || null,
      linkText: form.linkText || null,
    });
  };

  return (
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft size={16} className="mr-1" /> 返回設定
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-1">通知管理</h1>
      <p className="text-muted-foreground mb-8">管理網站公告橫幅及推播通知</p>

      {/* Push Notification Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell size={18} /> 推播通知
              </CardTitle>
              <CardDescription className="mt-1">
                向所有已訂閱的用戶發送推播通知
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {subscriberCountQuery.data?.count ?? 0}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Users size={12} /> 已訂閱用戶
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowPushForm(true)}
            disabled={!subscriberCountQuery.data?.count}
            className="w-full"
          >
            <Send size={16} className="mr-2" />
            發送推播通知
          </Button>
          {!subscriberCountQuery.data?.count && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              目前沒有已訂閱的用戶
            </p>
          )}
        </CardContent>
      </Card>

      {/* Announcements Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>網站公告橫幅</CardTitle>
              <CardDescription className="mt-1">
                在網站頂部顯示公告，每次只能有一個公告處於啟用狀態
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => { setForm(defaultForm); setShowForm(true); }}
            >
              <Plus size={16} className="mr-1" /> 新增公告
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcementsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : !announcementsQuery.data?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              尚未建立任何公告
            </div>
          ) : (
            <div className="space-y-3">
              {announcementsQuery.data.map((a) => (
                <div key={a.id} className="border rounded-lg p-4">
                  {/* Preview */}
                  <div
                    className="rounded-md px-3 py-2 text-sm mb-3 flex items-center justify-between"
                    style={{ backgroundColor: a.bgColor, color: a.textColor }}
                  >
                    <span>{a.message}</span>
                    {a.link && (
                      <span className="underline text-xs opacity-80">{a.linkText ?? "了解更多"}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.isActive ? "default" : "secondary"}>
                        {a.isActive ? "啟用中" : "已停用"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: a.id, isActive: v })}
                        disabled={toggleMutation.isPending}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}>
                        編輯
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("確定刪除此公告？")) {
                            deleteMutation.mutate({ id: a.id });
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcement Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "編輯公告" : "新增公告"}</DialogTitle>
            <DialogDescription>
              設定公告內容、顏色及連結
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>英文內容 *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="e.g. Limited time offer! Get 20% off all plans."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>繁體中文內容</Label>
              <Textarea
                value={form.messageZhTW}
                onChange={(e) => setForm(f => ({ ...f, messageZhTW: e.target.value }))}
                placeholder="例：限時優惠！所有方案 8 折！"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>简体中文内容</Label>
              <Textarea
                value={form.messageZhCN}
                onChange={(e) => setForm(f => ({ ...f, messageZhCN: e.target.value }))}
                placeholder="例：限时优惠！所有方案 8 折！"
                rows={2}
                className="mt-1"
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>連結 URL（選填）</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>連結文字（選填）</Label>
                <Input
                  value={form.linkText}
                  onChange={(e) => setForm(f => ({ ...f, linkText: e.target.value }))}
                  placeholder="了解更多"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>背景顏色</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={(e) => setForm(f => ({ ...f, bgColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.bgColor}
                    onChange={(e) => setForm(f => ({ ...f, bgColor: e.target.value }))}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <Label>文字顏色</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => setForm(f => ({ ...f, textColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.textColor}
                    onChange={(e) => setForm(f => ({ ...f, textColor: e.target.value }))}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div>
              <Label>預覽</Label>
              <div
                className="mt-1 rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: form.bgColor, color: form.textColor }}
              >
                {form.message || "公告內容預覽"}
                {form.link && (
                  <span className="ml-2 underline opacity-80">{form.linkText || "了解更多"}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>立即啟用（會停用其他公告）</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "儲存中..." : "儲存公告"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Form Dialog */}
      <Dialog open={showPushForm} onOpenChange={setShowPushForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>發送推播通知</DialogTitle>
            <DialogDescription>
              向所有 {subscriberCountQuery.data?.count ?? 0} 位已訂閱用戶發送通知
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>標題 *</Label>
              <Input
                value={pushForm.title}
                onChange={(e) => setPushForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：限時優惠！"
                className="mt-1"
                maxLength={100}
              />
            </div>
            <div>
              <Label>內容 *</Label>
              <Textarea
                value={pushForm.body}
                onChange={(e) => setPushForm(f => ({ ...f, body: e.target.value }))}
                placeholder="例：所有方案限時 8 折，立即選購！"
                rows={3}
                className="mt-1"
                maxLength={300}
              />
            </div>
            <div>
              <Label>連結（選填）</Label>
              <Input
                value={pushForm.url}
                onChange={(e) => setPushForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://www.esimuncle.com/products"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushForm(false)}>取消</Button>
            <Button
              onClick={() => {
                if (!pushForm.title.trim() || !pushForm.body.trim()) {
                  toast.error("請填寫標題和內容");
                  return;
                }
                sendPushMutation.mutate({
                  title: pushForm.title,
                  body: pushForm.body,
                  url: pushForm.url || undefined,
                });
              }}
              disabled={sendPushMutation.isPending}
            >
              {sendPushMutation.isPending ? "發送中..." : "確認發送"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
