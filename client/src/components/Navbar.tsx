import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, Globe, User, Menu, X, Settings, Bell, Gift } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { LanguageCurrencyModal } from "@/components/LanguageCurrencyModal";

const LANG_SHORT: Record<Language, string> = {
  "zh-TW": "ZH(HK)",
  "zh-CN": "ZH(CN)",
  en: "EN",
  ja: "JA",
  ko: "KO",
  th: "TH",
};

export default function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const { selectedCurrency } = useCurrencyContext();
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langCurrencyOpen, setLangCurrencyOpen] = useState(false);

  const cartQuery = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const cartCount = cartQuery.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const notifCountQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  const unreadCount = notifCountQuery.data?.count ?? 0;

  const notifListQuery = trpc.notifications.list.useQuery({ limit: 20 }, {
    enabled: false,
  });

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      notifCountQuery.refetch();
      notifListQuery.refetch();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      notifCountQuery.refetch();
      notifListQuery.refetch();
    },
  });

  const [notifOpen, setNotifOpen] = useState(false);

  const handleNotifOpen = (open: boolean) => {
    setNotifOpen(open);
    if (open) notifListQuery.refetch();
  };

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success(t.auth.logoutSuccess);
      window.location.href = "/";
    },
  });

  const howToLabel = language === "en" ? "How to Install" : language === "zh-CN" ? "安装教程" : language === "ja" ? "インストール方法" : language === "ko" ? "설치 방법" : language === "th" ? "วิธีติดตั้ง" : "安裝教學";
  const trackOrderLabel = language === "en" ? "Track Order" : language === "zh-CN" ? "查询订单" : language === "ja" ? "注文追跡" : language === "ko" ? "주문 추적" : language === "th" ? "ติดตามคำสั่งซื้อ" : "查詢訂單";
  const blogLabel = language === "en" ? "Tips & Info" : language === "zh-CN" ? "实用资讯" : language === "ja" ? "お役立ち情報" : language === "ko" ? "유용한 정보" : language === "th" ? "ข้อมูลที่เป็นประโยชน์" : "實用資訊";

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/products", label: t.nav.products },
    { href: "/how-to-install", label: howToLabel },
    { href: "/blog", label: blogLabel },
    ...(isAuthenticated ? [{ href: "/orders", label: t.nav.orders }] : [{ href: "/track-order", label: trackOrderLabel }]),
  ];

  const langShort = LANG_SHORT[language] ?? "EN";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/manus-storage/logo-optimized_e921ee9c.webp"
              alt="SIM uncle"
              width={200}
              height={40}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Language + Currency Selector Button */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground px-2"
              onClick={() => setLangCurrencyOpen(true)}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium hidden sm:inline">{langShort}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
              <span className="text-xs font-medium hidden sm:inline">{selectedCurrency}</span>
            </Button>

            {/* Notification Bell */}
            {isAuthenticated && (
              <DropdownMenu open={notifOpen} onOpenChange={handleNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="text-sm font-semibold">
                      {language === "en" ? "Notifications" : language === "zh-CN" ? "通知" : language === "ja" ? "通知" : language === "ko" ? "알림" : language === "th" ? "การแจ้งเตือน" : "通知"}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-xs text-primary hover:underline"
                      >
                        {language === "en" ? "Mark all read" : language === "zh-CN" ? "全部标为已读" : language === "ja" ? "すべて既読" : language === "ko" ? "모두 읽음" : language === "th" ? "อ่านทั้งหมด" : "全部標為已讀"}
                      </button>
                    )}
                  </div>
                  {notifListQuery.isLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {language === "en" ? "Loading..." : language === "zh-CN" ? "加载中..." : language === "ja" ? "読み込み中..." : language === "ko" ? "로딩 중..." : language === "th" ? "กำลังโหลด..." : "載入中..."}
                    </div>
                  ) : (notifListQuery.data?.length ?? 0) === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {language === "en" ? "No notifications" : language === "zh-CN" ? "暂无通知" : language === "ja" ? "通知なし" : language === "ko" ? "알림 없음" : language === "th" ? "ไม่มีการแจ้งเตือน" : "暫無通知"}
                    </div>
                  ) : (
                    notifListQuery.data?.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted transition-colors ${
                          notif.isRead ? "opacity-60" : "bg-primary/5"
                        }`}
                        onClick={() => {
                          if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                          if (notif.link) window.location.href = notif.link;
                          setNotifOpen(false);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.isRead && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            {notif.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.content}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(notif.createdAt, language)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Cart */}
            {isAuthenticated && (
              <Link href="/cart">
                <Button variant="ghost" size="sm" className="relative text-muted-foreground hover:text-foreground">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {/* User Menu / Login */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    <span className="hidden sm:block text-sm font-medium text-foreground max-w-24 truncate">
                      {user?.name ?? user?.email ?? t.nav.account}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">{t.nav.myOrders}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/referral" className="cursor-pointer flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      {language === "en" ? "Referral Program" : language === "zh-CN" ? "推荐计划" : language === "ja" ? "紹介プログラム" : language === "ko" ? "추천 프로그램" : language === "th" ? "โปรแกรมแนะนำ" : "推薦計劃"}
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          {language === "en" ? "Admin Settings" : language === "zh-CN" ? "管理员设置" : language === "ja" ? "管理者設定" : language === "ko" ? "관리자 설정" : language === "th" ? "การตั้งค่าผู้ดูแล" : "管理員設定"}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    className="text-destructive cursor-pointer"
                  >
                    {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                {t.nav.login}
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="px-4 pt-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  {t.nav.login}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Language + Currency Modal */}
      <LanguageCurrencyModal
        open={langCurrencyOpen}
        onClose={() => setLangCurrencyOpen(false)}
      />
    </header>
  );
}
