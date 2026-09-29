import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Gift, TrendingUp, Clock, CheckCircle, Users, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const SITE_URL = window.location.origin;

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Referral() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [newCode, setNewCode] = useState("");

  const { data: myCode, isLoading: codeLoading, refetch: refetchCode } = trpc.referral.getMyCode.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = trpc.referral.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: commissions, isLoading: commissionsLoading } = trpc.referral.getMyCommissions.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !!user }
  );

  // i18n helpers
  const tx = {
    pageTitle: language === "en" ? "Referral Program"
      : language === "zh-CN" ? "推荐计划"
      : language === "ja" ? "紹介プログラム"
      : language === "ko" ? "추천 프로그램"
      : language === "th" ? "โปรแกรมแนะนำเพื่อน"
      : "推薦計劃",
    pageSubtitle: language === "en" ? "Refer friends to buy eSIM. They get 10% off, you earn 10% commission."
      : language === "zh-CN" ? "推荐朋友购买 eSIM，朋友享9折优惠，您获成交金额10%佣金"
      : language === "ja" ? "友達にeSIMを紹介しよう。友達は10%オフ、あなたは10%コミッション獲得。"
      : language === "ko" ? "친구에게 eSIM을 추천하세요. 친구는 10% 할인, 당신은 10% 커미션."
      : language === "th" ? "แนะนำเพื่อนซื้อ eSIM เพื่อนได้ส่วนลด 10% คุณได้ค่าคอมมิชชั่น 10%"
      : "推薦朋友購買 eSIM，朋友享 9 折優惠，您獲成交金額 10% 佣金",
    loginPrompt: language === "en" ? "Log in to view your referral program"
      : language === "zh-CN" ? "登录后查看您的推荐计划"
      : language === "ja" ? "ログインして紹介プログラムを確認"
      : language === "ko" ? "로그인하여 추천 프로그램 확인"
      : language === "th" ? "เข้าสู่ระบบเพื่อดูโปรแกรมแนะนำ"
      : "登入後查看您的推薦計劃",
    loginSubtitle: language === "en" ? "Refer friends to buy eSIM. They get 10% off, you earn 10% commission."
      : language === "zh-CN" ? "推荐朋友购买 eSIM，朋友享9折优惠，您获10%佣金"
      : language === "ja" ? "友達にeSIMを紹介。友達は10%オフ、あなたは10%コミッション。"
      : language === "ko" ? "친구에게 eSIM 추천. 친구 10% 할인, 당신 10% 커미션."
      : language === "th" ? "แนะนำเพื่อนซื้อ eSIM รับส่วนลด 10% และค่าคอมมิชชั่น 10%"
      : "推薦朋友購買 eSIM，朋友享 9 折優惠，您獲 10% 佣金",
    loginBtn: language === "en" ? "Log In Now"
      : language === "zh-CN" ? "立即登录"
      : language === "ja" ? "今すぐログイン"
      : language === "ko" ? "지금 로그인"
      : language === "th" ? "เข้าสู่ระบบเลย"
      : "立即登入",
    statReferrals: language === "en" ? "Successful Referrals"
      : language === "zh-CN" ? "成功推荐"
      : language === "ja" ? "成功した紹介"
      : language === "ko" ? "성공한 추천"
      : language === "th" ? "การแนะนำสำเร็จ"
      : "成功推薦",
    statReferralsUnit: language === "en" ? "" : language === "ja" ? "件" : language === "ko" ? "건" : "筆",
    statTotal: language === "en" ? "Total Commission"
      : language === "zh-CN" ? "累积佣金"
      : language === "ja" ? "累計コミッション"
      : language === "ko" ? "누적 커미션"
      : language === "th" ? "คอมมิชชั่นสะสม"
      : "累積佣金",
    statTotalSub: language === "en" ? "Paid + Pending"
      : language === "zh-CN" ? "已付款 + 待付款"
      : language === "ja" ? "支払済 + 保留中"
      : language === "ko" ? "지급완료 + 대기중"
      : language === "th" ? "จ่ายแล้ว + รอจ่าย"
      : "已付款 + 待付款",
    statPending: language === "en" ? "Pending Commission"
      : language === "zh-CN" ? "待付款佣金"
      : language === "ja" ? "保留中のコミッション"
      : language === "ko" ? "대기중 커미션"
      : language === "th" ? "คอมมิชชั่นที่รอจ่าย"
      : "待付款佣金",
    statPendingSub: language === "en" ? "Paid via bank transfer"
      : language === "zh-CN" ? "将通过银行转账支付"
      : language === "ja" ? "銀行振込で支払われます"
      : language === "ko" ? "계좌이체로 지급됩니다"
      : language === "th" ? "จ่ายผ่านโอนเงิน"
      : "將透過現金轉帳支付",
    myCode: language === "en" ? "My Referral Code"
      : language === "zh-CN" ? "我的推荐码"
      : language === "ja" ? "マイ紹介コード"
      : language === "ko" ? "내 추천 코드"
      : language === "th" ? "รหัสแนะนำของฉัน"
      : "我的推薦碼",
    codePlaceholder: language === "en" ? "Enter new code (3-20 chars, letters/numbers)"
      : language === "zh-CN" ? "输入新推荐码（3-20字符，英文/数字）"
      : language === "ja" ? "新しいコードを入力（3-20文字、英数字）"
      : language === "ko" ? "새 코드 입력 (3-20자, 영문/숫자)"
      : language === "th" ? "ใส่รหัสใหม่ (3-20 ตัวอักษร)"
      : "輸入新推薦碼（3-20 字元，英文/數字）",
    save: language === "en" ? "Save" : language === "zh-CN" ? "保存" : language === "ja" ? "保存" : language === "ko" ? "저장" : language === "th" ? "บันทึก" : "儲存",
    cancel: language === "en" ? "Cancel" : language === "zh-CN" ? "取消" : language === "ja" ? "キャンセル" : language === "ko" ? "취소" : language === "th" ? "ยกเลิก" : "取消",
    copyCode: language === "en" ? "Copy Code" : language === "zh-CN" ? "复制推荐码" : language === "ja" ? "コードをコピー" : language === "ko" ? "코드 복사" : language === "th" ? "คัดลอกรหัส" : "複製推薦碼",
    edit: language === "en" ? "Edit" : language === "zh-CN" ? "修改" : language === "ja" ? "変更" : language === "ko" ? "수정" : language === "th" ? "แก้ไข" : "修改",
    referralLink: language === "en" ? "Referral Link"
      : language === "zh-CN" ? "推荐链接"
      : language === "ja" ? "紹介リンク"
      : language === "ko" ? "추천 링크"
      : language === "th" ? "ลิงก์แนะนำ"
      : "推薦連結",
    copy: language === "en" ? "Copy" : language === "zh-CN" ? "复制" : language === "ja" ? "コピー" : language === "ko" ? "복사" : language === "th" ? "คัดลอก" : "複製",
    share: language === "en" ? "Share" : language === "zh-CN" ? "分享" : language === "ja" ? "シェア" : language === "ko" ? "공유" : language === "th" ? "แชร์" : "分享",
    howItWorks: language === "en" ? "How It Works"
      : language === "zh-CN" ? "如何使用"
      : language === "ja" ? "使い方"
      : language === "ko" ? "이용 방법"
      : language === "th" ? "วิธีใช้งาน"
      : "如何使用",
    howStep1: language === "en" ? "Share your referral link or code with friends"
      : language === "zh-CN" ? "将推荐链接或推荐码分享给朋友"
      : language === "ja" ? "紹介リンクまたはコードを友達にシェア"
      : language === "ko" ? "추천 링크 또는 코드를 친구에게 공유"
      : language === "th" ? "แชร์ลิงก์หรือรหัสแนะนำให้เพื่อน"
      : "將推薦連結或推薦碼分享給朋友",
    howStep2Prefix: language === "en" ? "Friend enters your code at checkout and gets "
      : language === "zh-CN" ? "朋友结账时输入您的推荐码，即享"
      : language === "ja" ? "友達がチェックアウト時にコードを入力して"
      : language === "ko" ? "친구가 결제 시 코드를 입력하면 "
      : language === "th" ? "เพื่อนใส่รหัสตอนชำระเงินและได้รับ"
      : "朋友在結帳時輸入您的推薦碼，即享 ",
    howStep2Discount: language === "en" ? "10% off" : language === "zh-CN" ? "9折" : language === "ja" ? "10%オフ" : language === "ko" ? "10% 할인" : language === "th" ? "ส่วนลด 10%" : "9 折",
    howStep2Suffix: language === "en" ? "" : language === "zh-CN" ? "优惠" : language === "ja" ? "を受けられます" : language === "ko" ? " 혜택" : language === "th" ? "" : "優惠",
    howStep3Prefix: language === "en" ? "After friend pays, you automatically earn "
      : language === "zh-CN" ? "朋友成功付款后，您自动获得成交金额"
      : language === "ja" ? "友達の支払い後、成約金額の"
      : language === "ko" ? "친구 결제 완료 후 결제 금액의 "
      : language === "th" ? "หลังเพื่อนชำระเงิน คุณได้รับ"
      : "朋友成功付款後，您自動獲得成交金額 ",
    howStep3Commission: language === "en" ? "10% commission" : language === "zh-CN" ? "10%" : language === "ja" ? "10%コミッション" : language === "ko" ? "10% 커미션" : language === "th" ? "10% คอมมิชชั่น" : "10%",
    howStep3Suffix: language === "en" ? "" : language === "zh-CN" ? "佣金" : language === "ja" ? "を自動獲得" : language === "ko" ? " 자동 획득" : language === "th" ? "โดยอัตโนมัติ" : " 佣金",
    howStep4: language === "en" ? "Commissions paid via bank transfer when balance reaches HK$100"
      : language === "zh-CN" ? "累积佣金达HK$100后，通过银行转账支付"
      : language === "ja" ? "残高がHK$100に達したら銀行振込で支払い"
      : language === "ko" ? "잔액이 HK$100 이상이면 계좌이체로 지급"
      : language === "th" ? "คอมมิชชั่นจ่ายผ่านโอนเงินเมื่อยอดถึง HK$100"
      : "累積佣金達 HK$100 後，透過現金轉帳支付給您",
    commissionHistory: language === "en" ? "Commission History"
      : language === "zh-CN" ? "佣金记录"
      : language === "ja" ? "コミッション履歴"
      : language === "ko" ? "커미션 내역"
      : language === "th" ? "ประวัติค่าคอมมิชชั่น"
      : "佣金記錄",
    noCommission: language === "en" ? "No commission records yet"
      : language === "zh-CN" ? "暂无佣金记录"
      : language === "ja" ? "コミッション履歴はまだありません"
      : language === "ko" ? "아직 커미션 내역이 없습니다"
      : language === "th" ? "ยังไม่มีประวัติค่าคอมมิชชั่น"
      : "尚無佣金記錄",
    noCommissionSub: language === "en" ? "Share your referral code and start earning!"
      : language === "zh-CN" ? "分享您的推荐码，开始赚取佣金吧！"
      : language === "ja" ? "紹介コードをシェアして稼ぎ始めよう！"
      : language === "ko" ? "추천 코드를 공유하고 커미션을 받아보세요!"
      : language === "th" ? "แชร์รหัสแนะนำและเริ่มรับค่าคอมมิชชั่น!"
      : "分享您的推薦碼，開始賺取佣金吧！",
    orderLabel: language === "en" ? "Order" : language === "zh-CN" ? "订单" : language === "ja" ? "注文" : language === "ko" ? "주문" : language === "th" ? "คำสั่งซื้อ" : "訂單",
    orderAmount: language === "en" ? "Order amount" : language === "zh-CN" ? "订单金额" : language === "ja" ? "注文金額" : language === "ko" ? "주문 금액" : language === "th" ? "ยอดคำสั่งซื้อ" : "訂單金額",
    paid: language === "en" ? "Paid" : language === "zh-CN" ? "已付款" : language === "ja" ? "支払済" : language === "ko" ? "지급완료" : language === "th" ? "จ่ายแล้ว" : "已付款",
    cancelled: language === "en" ? "Cancelled" : language === "zh-CN" ? "已取消" : language === "ja" ? "キャンセル" : language === "ko" ? "취소됨" : language === "th" ? "ยกเลิก" : "已取消",
    pending: language === "en" ? "Pending" : language === "zh-CN" ? "待付款" : language === "ja" ? "保留中" : language === "ko" ? "대기중" : language === "th" ? "รอจ่าย" : "待付款",
    codeCopied: language === "en" ? "Code copied" : language === "zh-CN" ? "推荐码已复制" : language === "ja" ? "コードをコピーしました" : language === "ko" ? "코드 복사됨" : language === "th" ? "คัดลอกรหัสแล้ว" : "推薦碼已複製",
    linkCopied: language === "en" ? "Link copied" : language === "zh-CN" ? "推荐链接已复制" : language === "ja" ? "リンクをコピーしました" : language === "ko" ? "링크 복사됨" : language === "th" ? "คัดลอกลิงก์แล้ว" : "推薦連結已複製",
    codeUpdated: (code: string) => language === "en" ? `Referral code updated to ${code}`
      : language === "zh-CN" ? `推荐码已更新为 ${code}`
      : language === "ja" ? `紹介コードを ${code} に更新しました`
      : language === "ko" ? `추천 코드가 ${code}(으)로 업데이트됨`
      : language === "th" ? `อัปเดตรหัสแนะนำเป็น ${code}`
      : `推薦碼已更新為 ${code}`,
    whatsappText: (code: string, link: string) => language === "en"
      ? `Use my referral code ${code} to buy eSIM and get 10% off! ${link}`
      : language === "zh-CN"
      ? `用我的推荐码 ${code} 买 eSIM，享9折优惠！${link}`
      : language === "ja"
      ? `私の紹介コード ${code} でeSIMを購入して10%オフ！${link}`
      : language === "ko"
      ? `내 추천 코드 ${code}로 eSIM 구매하고 10% 할인 받으세요! ${link}`
      : language === "th"
      ? `ใช้รหัสแนะนำ ${code} ซื้อ eSIM ลด 10%! ${link}`
      : `用我的推薦碼 ${code} 買 eSIM，享 9 折優惠！${link}`,
    shareTitle: language === "en" ? "SIMuncle eSIM Referral"
      : language === "zh-CN" ? "SIMuncle eSIM 推荐"
      : language === "ja" ? "SIMuncle eSIM 紹介"
      : language === "ko" ? "SIMuncle eSIM 추천"
      : language === "th" ? "SIMuncle eSIM แนะนำ"
      : "SIMuncle eSIM 推薦",
  };

  const setCodeMutation = trpc.referral.setCode.useMutation({
    onSuccess: (data) => {
      toast.success(tx.codeUpdated(data.code));
      setEditMode(false);
      setNewCode("");
      refetchCode();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleCopyCode = () => {
    if (!myCode?.code) return;
    navigator.clipboard.writeText(myCode.code);
    toast.success(tx.codeCopied);
  };

  const handleCopyLink = () => {
    if (!myCode?.code) return;
    const link = `${SITE_URL}/?ref=${myCode.code}`;
    navigator.clipboard.writeText(link);
    toast.success(tx.linkCopied);
  };

  const handleSaveCode = () => {
    if (!newCode.trim()) return;
    setCodeMutation.mutate({ code: newCode.trim() });
  };

  if (!user) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{tx.loginPrompt}</h2>
        <p className="text-muted-foreground mb-6">{tx.loginSubtitle}</p>
        <Button asChild>
          <a href={getLoginUrl()}>{tx.loginBtn}</a>
        </Button>
      </div>
    );
  }

  const referralLink = myCode ? `${SITE_URL}/?ref=${myCode.code}` : "";
  const localeCode = language === "en" ? "en-US" : language === "zh-CN" ? "zh-CN" : language === "ja" ? "ja-JP" : language === "ko" ? "ko-KR" : language === "th" ? "th-TH" : "zh-HK";

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          {tx.pageTitle}
        </h1>
        <p className="text-muted-foreground mt-1">{tx.pageSubtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              icon={Users}
              label={tx.statReferrals}
              value={language === "en"
                ? `${stats?.totalReferrals ?? 0}`
                : `${stats?.totalReferrals ?? 0} ${tx.statReferralsUnit}`}
            />
            <StatCard
              icon={TrendingUp}
              label={tx.statTotal}
              value={`HK$${stats?.totalCommissionHkd ?? 0}`}
              sub={tx.statTotalSub}
            />
            <StatCard
              icon={Clock}
              label={tx.statPending}
              value={`HK$${stats?.pendingCommissionHkd ?? 0}`}
              sub={tx.statPendingSub}
            />
          </>
        )}
      </div>

      {/* My Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tx.myCode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {codeLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              {editMode ? (
                <div className="flex gap-2">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder={tx.codePlaceholder}
                    maxLength={20}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleSaveCode}
                    disabled={setCodeMutation.isPending || !newCode.trim()}
                  >
                    {tx.save}
                  </Button>
                  <Button variant="outline" onClick={() => { setEditMode(false); setNewCode(""); }}>
                    {tx.cancel}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-widest text-center">
                    {myCode?.code ?? "—"}
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyCode} title={tx.copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setNewCode(myCode?.code ?? ""); }}>
                    {tx.edit}
                  </Button>
                </div>
              )}

              {/* Referral link */}
              {!editMode && myCode && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tx.referralLink}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded px-3 py-2 text-sm text-muted-foreground truncate font-mono">
                      {referralLink}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <Copy className="w-3 h-3 mr-1" />
                      {tx.copy}
                    </Button>
                  </div>
                  {/* Share buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(tx.whatsappText(myCode.code, referralLink))}`, '_blank')}
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </Button>
                    {typeof navigator.share === 'function' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.share({ title: tx.shareTitle, text: tx.whatsappText(myCode.code, referralLink), url: referralLink })}
                      >
                        <Share2 className="w-3.5 h-3.5 mr-1.5" />
                        {tx.share}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="rounded-lg border border-dashed p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{tx.howItWorks}</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>{tx.howStep1}</li>
                  <li>
                    {tx.howStep2Prefix}
                    <strong className="text-foreground">{tx.howStep2Discount}</strong>
                    {tx.howStep2Suffix}
                  </li>
                  <li>
                    {tx.howStep3Prefix}
                    <strong className="text-foreground">{tx.howStep3Commission}</strong>
                    {tx.howStep3Suffix}
                  </li>
                  <li>{tx.howStep4}</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tx.commissionHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !commissions || commissions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{tx.noCommission}</p>
              <p className="text-sm mt-1">{tx.noCommissionSub}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {c.status === "paid" ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{tx.orderLabel} #{c.refereeOrderId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString(localeCode)} · {tx.orderAmount} HK${c.orderAmountHkd}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">+HK${c.commissionHkd}</p>
                    <Badge
                      variant={c.status === "paid" ? "default" : "secondary"}
                      className="text-xs mt-0.5"
                    >
                      {c.status === "paid" ? tx.paid : c.status === "cancelled" ? tx.cancelled : tx.pending}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
