// Login page: Google sign-in + emailed one-time link (six languages).
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

type Copy = {
  title: string;
  subtitle: string;
  google: string;
  or: string;
  emailLabel: string;
  emailBtn: string;
  emailHint: string;
  sentTitle: string;
  sentBody: (email: string) => string;
  useOther: string;
  noMethods: string;
  confirmTitle: string;
  confirmBody: string;
  confirmBtn: string;
  requestAgain: string;
  errors: Record<string, string>;
};

const COPY: Record<Language, Copy> = {
  "zh-TW": {
    title: "登入／登記",
    subtitle: "登入後可查看訂單、eSIM 用量及推薦佣金",
    google: "使用 Google 登入",
    or: "或",
    emailLabel: "電郵地址",
    emailBtn: "以電郵登入",
    emailHint: "我們會發送一次性登入連結到你的電郵，無需密碼。",
    sentTitle: "登入連結已發送",
    sentBody: e => `請到 ${e} 收件匣按連結登入。連結 15 分鐘內有效。`,
    useOther: "使用其他電郵",
    noMethods: "登入功能暫時未能使用，請稍後再試或聯絡客服。",
    confirmTitle: "確認登入",
    confirmBody: "按下面的按鈕完成登入 SIM uncle。",
    confirmBtn: "登入",
    requestAgain: "重新索取登入連結",
    errors: {
      default: "登入失敗，請再試一次。",
      invalid_email: "請輸入有效的電郵地址。",
      too_many_requests: "嘗試次數太多，請 10 分鐘後再試。",
      send_failed: "暫時未能發送登入連結，請稍後再試。",
      network: "網絡錯誤，請稍後再試。",
      google_cancelled: "已取消 Google 登入。",
      google_failed: "Google 登入失敗，請稍後再試。",
      google_not_configured: "Google 登入暫時未能使用，請改用電郵登入。",
      state_mismatch: "登入逾時，請再試一次。",
      email_not_verified: "此 Google 帳戶的電郵尚未驗證，請改用電郵登入。",
      link_invalid: "登入連結無效，請重新索取。",
      link_used: "此登入連結已使用過，請重新索取。",
      link_expired: "登入連結已過期，請重新索取。",
    },
  },
  "zh-CN": {
    title: "登录／注册",
    subtitle: "登录后可查看订单、eSIM 用量及推荐佣金",
    google: "使用 Google 登录",
    or: "或",
    emailLabel: "邮箱地址",
    emailBtn: "以邮箱登录",
    emailHint: "我们会发送一次性登录链接到你的邮箱，无需密码。",
    sentTitle: "登录链接已发送",
    sentBody: e => `请到 ${e} 收件箱点击链接登录。链接 15 分钟内有效。`,
    useOther: "使用其他邮箱",
    noMethods: "登录功能暂时无法使用，请稍后再试或联系客服。",
    confirmTitle: "确认登录",
    confirmBody: "点击下面的按钮完成登录 SIM uncle。",
    confirmBtn: "登录",
    requestAgain: "重新获取登录链接",
    errors: {
      default: "登录失败，请再试一次。",
      invalid_email: "请输入有效的邮箱地址。",
      too_many_requests: "尝试次数太多，请 10 分钟后再试。",
      send_failed: "暂时无法发送登录链接，请稍后再试。",
      network: "网络错误，请稍后再试。",
      google_cancelled: "已取消 Google 登录。",
      google_failed: "Google 登录失败，请稍后再试。",
      google_not_configured: "Google 登录暂时无法使用，请改用邮箱登录。",
      state_mismatch: "登录超时，请再试一次。",
      email_not_verified: "此 Google 账户的邮箱尚未验证，请改用邮箱登录。",
      link_invalid: "登录链接无效，请重新获取。",
      link_used: "此登录链接已使用过，请重新获取。",
      link_expired: "登录链接已过期，请重新获取。",
    },
  },
  en: {
    title: "Sign in / Sign up",
    subtitle: "Sign in to see your orders, eSIM usage and referral commissions",
    google: "Continue with Google",
    or: "or",
    emailLabel: "Email address",
    emailBtn: "Sign in with email",
    emailHint: "We'll email you a one-time sign-in link. No password needed.",
    sentTitle: "Sign-in link sent",
    sentBody: e => `Check ${e} and click the link to sign in. It is valid for 15 minutes.`,
    useOther: "Use a different email",
    noMethods: "Sign-in is temporarily unavailable. Please try again later or contact support.",
    confirmTitle: "Confirm sign-in",
    confirmBody: "Press the button below to finish signing in to SIM uncle.",
    confirmBtn: "Sign in",
    requestAgain: "Request a new link",
    errors: {
      default: "Sign-in failed. Please try again.",
      invalid_email: "Please enter a valid email address.",
      too_many_requests: "Too many attempts. Please try again in 10 minutes.",
      send_failed: "Couldn't send the sign-in link. Please try again later.",
      network: "Network error. Please try again later.",
      google_cancelled: "Google sign-in was cancelled.",
      google_failed: "Google sign-in failed. Please try again later.",
      google_not_configured: "Google sign-in is unavailable. Please use email instead.",
      state_mismatch: "Sign-in timed out. Please try again.",
      email_not_verified: "This Google account's email isn't verified. Please use email sign-in.",
      link_invalid: "This sign-in link is invalid. Please request a new one.",
      link_used: "This sign-in link has already been used. Please request a new one.",
      link_expired: "This sign-in link has expired. Please request a new one.",
    },
  },
  ja: {
    title: "ログイン／新規登録",
    subtitle: "ログインすると注文、eSIM の利用状況、紹介報酬を確認できます",
    google: "Google でログイン",
    or: "または",
    emailLabel: "メールアドレス",
    emailBtn: "メールでログイン",
    emailHint: "1回限りのログインリンクをメールでお送りします。パスワードは不要です。",
    sentTitle: "ログインリンクを送信しました",
    sentBody: e => `${e} の受信トレイでリンクを開いてログインしてください。リンクは15分間有効です。`,
    useOther: "別のメールを使う",
    noMethods: "ログインは現在ご利用いただけません。しばらくしてからもう一度お試しいただくか、サポートまでご連絡ください。",
    confirmTitle: "ログインの確認",
    confirmBody: "下のボタンを押して SIM uncle へのログインを完了してください。",
    confirmBtn: "ログイン",
    requestAgain: "ログインリンクを再取得",
    errors: {
      default: "ログインに失敗しました。もう一度お試しください。",
      invalid_email: "有効なメールアドレスを入力してください。",
      too_many_requests: "試行回数が多すぎます。10分後にもう一度お試しください。",
      send_failed: "ログインリンクを送信できませんでした。後でもう一度お試しください。",
      network: "ネットワークエラーです。後でもう一度お試しください。",
      google_cancelled: "Google ログインがキャンセルされました。",
      google_failed: "Google ログインに失敗しました。後でもう一度お試しください。",
      google_not_configured: "現在 Google ログインは利用できません。メールでログインしてください。",
      state_mismatch: "ログインがタイムアウトしました。もう一度お試しください。",
      email_not_verified: "この Google アカウントのメールは未確認です。メールでログインしてください。",
      link_invalid: "ログインリンクが無効です。再取得してください。",
      link_used: "このログインリンクは使用済みです。再取得してください。",
      link_expired: "ログインリンクの有効期限が切れました。再取得してください。",
    },
  },
  ko: {
    title: "로그인 / 가입",
    subtitle: "로그인하면 주문, eSIM 사용량, 추천 수수료를 확인할 수 있습니다",
    google: "Google로 계속하기",
    or: "또는",
    emailLabel: "이메일 주소",
    emailBtn: "이메일로 로그인",
    emailHint: "일회용 로그인 링크를 이메일로 보내 드립니다. 비밀번호는 필요 없습니다.",
    sentTitle: "로그인 링크를 보냈습니다",
    sentBody: e => `${e} 받은편지함에서 링크를 눌러 로그인하세요. 링크는 15분 동안 유효합니다.`,
    useOther: "다른 이메일 사용",
    noMethods: "로그인을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도하거나 고객 지원에 문의해 주세요.",
    confirmTitle: "로그인 확인",
    confirmBody: "아래 버튼을 눌러 SIM uncle 로그인을 완료하세요.",
    confirmBtn: "로그인",
    requestAgain: "로그인 링크 다시 받기",
    errors: {
      default: "로그인에 실패했습니다. 다시 시도해 주세요.",
      invalid_email: "올바른 이메일 주소를 입력해 주세요.",
      too_many_requests: "시도 횟수가 너무 많습니다. 10분 후에 다시 시도해 주세요.",
      send_failed: "로그인 링크를 보낼 수 없습니다. 나중에 다시 시도해 주세요.",
      network: "네트워크 오류입니다. 나중에 다시 시도해 주세요.",
      google_cancelled: "Google 로그인이 취소되었습니다.",
      google_failed: "Google 로그인에 실패했습니다. 나중에 다시 시도해 주세요.",
      google_not_configured: "Google 로그인을 사용할 수 없습니다. 이메일로 로그인해 주세요.",
      state_mismatch: "로그인 시간이 초과되었습니다. 다시 시도해 주세요.",
      email_not_verified: "이 Google 계정의 이메일이 확인되지 않았습니다. 이메일로 로그인해 주세요.",
      link_invalid: "로그인 링크가 올바르지 않습니다. 다시 받아 주세요.",
      link_used: "이미 사용된 로그인 링크입니다. 다시 받아 주세요.",
      link_expired: "로그인 링크가 만료되었습니다. 다시 받아 주세요.",
    },
  },
  th: {
    title: "เข้าสู่ระบบ / สมัครสมาชิก",
    subtitle: "เข้าสู่ระบบเพื่อดูคำสั่งซื้อ การใช้งาน eSIM และค่าคอมมิชชันแนะนำเพื่อน",
    google: "ดำเนินการต่อด้วย Google",
    or: "หรือ",
    emailLabel: "อีเมล",
    emailBtn: "เข้าสู่ระบบด้วยอีเมล",
    emailHint: "เราจะส่งลิงก์เข้าสู่ระบบแบบใช้ครั้งเดียวไปยังอีเมลของคุณ ไม่ต้องใช้รหัสผ่าน",
    sentTitle: "ส่งลิงก์เข้าสู่ระบบแล้ว",
    sentBody: e => `ตรวจสอบกล่องจดหมายของ ${e} แล้วกดลิงก์เพื่อเข้าสู่ระบบ ลิงก์ใช้ได้ 15 นาที`,
    useOther: "ใช้อีเมลอื่น",
    noMethods: "ขณะนี้ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่ภายหลังหรือติดต่อฝ่ายสนับสนุน",
    confirmTitle: "ยืนยันการเข้าสู่ระบบ",
    confirmBody: "กดปุ่มด้านล่างเพื่อเข้าสู่ระบบ SIM uncle",
    confirmBtn: "เข้าสู่ระบบ",
    requestAgain: "ขอลิงก์ใหม่",
    errors: {
      default: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง",
      invalid_email: "กรุณากรอกอีเมลที่ถูกต้อง",
      too_many_requests: "ลองมากเกินไป กรุณาลองใหม่ใน 10 นาที",
      send_failed: "ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
      network: "เครือข่ายขัดข้อง กรุณาลองใหม่ภายหลัง",
      google_cancelled: "ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว",
      google_failed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
      google_not_configured: "ขณะนี้ไม่สามารถใช้ Google ได้ กรุณาใช้อีเมลแทน",
      state_mismatch: "หมดเวลาเข้าสู่ระบบ กรุณาลองอีกครั้ง",
      email_not_verified: "อีเมลของบัญชี Google นี้ยังไม่ได้รับการยืนยัน กรุณาใช้อีเมลแทน",
      link_invalid: "ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ใหม่",
      link_used: "ลิงก์นี้ถูกใช้แล้ว กรุณาขอลิงก์ใหม่",
      link_expired: "ลิงก์หมดอายุ กรุณาขอลิงก์ใหม่",
    },
  },
};

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/api/")) return "/";
  return value;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { language } = useLanguage();
  const c = COPY[language] ?? COPY["zh-TW"];
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const returnTo = safeReturnTo(params.get("returnTo"));
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();

  const [providers, setProviders] = useState<{ google: boolean; email: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(() => params.get("error"));
  const error = errorCode ? c.errors[errorCode] ?? c.errors.default : null;

  useEffect(() => {
    fetch("/api/auth/providers")
      .then(r => r.json())
      .then(setProviders)
      .catch(() => setProviders({ google: true, email: true }));
  }, []);

  useEffect(() => {
    if (!loading && user) navigate(returnTo, { replace: true });
  }, [loading, user, returnTo, navigate]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorCode("invalid_email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), returnTo, lang: language }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorCode(body.error === "too_many_requests" || body.error === "invalid_email" ? body.error : "send_failed");
      }
    } catch {
      setErrorCode("network");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">{c.title}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{c.subtitle}</p>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {providers && !providers.google && !providers.email && (
          <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {c.noMethods}
          </div>
        )}

        {sent ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-medium mb-1">{c.sentTitle}</p>
            <p className="text-sm text-muted-foreground mb-4 break-words">{c.sentBody(email.trim())}</p>
            <button type="button" className="text-sm text-primary underline underline-offset-4" onClick={() => setSent(false)}>
              {c.useOther}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {providers?.google !== false && (
              <Button asChild variant="outline" size="lg" className="w-full rounded-full gap-3">
                <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>
                  <GoogleIcon />
                  {c.google}
                </a>
              </Button>
            )}

            {providers?.google !== false && providers?.email !== false && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {c.or}
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {providers?.email !== false && (
              <form onSubmit={requestLink} className="space-y-3">
                <Label htmlFor="login-email">{c.emailLabel}</Label>
                <Input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="lg" className="w-full rounded-full gap-2" disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {c.emailBtn}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{c.emailHint}</p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** /login/verify?token=... - the page the emailed link opens. */
export function LoginVerify() {
  const { language } = useLanguage();
  const c = COPY[language] ?? COPY["zh-TW"];
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token") ?? "", [search]);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setStatus("working");
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        // Full reload so every query picks up the new session.
        window.location.replace(safeReturnTo(body.returnTo));
        return;
      }
      setError(c.errors[body.error] ?? c.errors.default);
      setStatus("error");
    } catch {
      setError(c.errors.network);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-[70vh] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">{c.confirmTitle}</h1>
        {status === "error" ? (
          <>
            <p role="alert" className="text-sm text-destructive mb-6">{error}</p>
            <Button asChild size="lg" className="rounded-full">
              <a href="/login">{c.requestAgain}</a>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-8">{c.confirmBody}</p>
            <Button size="lg" className="w-full rounded-full gap-2" onClick={confirm} disabled={!token || status === "working"}>
              {status === "working" && <Loader2 className="w-4 h-4 animate-spin" />}
              {c.confirmBtn}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
