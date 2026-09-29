import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS instructions banner after 3 seconds
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (!showBanner || isInstalled) return null;

  const title =
    language === "en" ? "Add to Home Screen"
    : language === "zh-CN" ? "添加到主屏幕"
    : language === "ja" ? "ホーム画面に追加"
    : language === "ko" ? "홈 화면에 추가"
    : language === "th" ? "เพิ่มไปยังหน้าจอหลัก"
    : "加入主畫面";

  const iosDesc =
    language === "en" ? <>Tap the <span className="font-medium text-primary">Share</span> button at the bottom of Safari, then select "Add to Home Screen"</>
    : language === "zh-CN" ? <>点击 Safari 底部的 <span className="font-medium text-primary">分享</span> 按钮，然后选择「添加到主屏幕」</>
    : language === "ja" ? <>Safariの下部にある <span className="font-medium text-primary">共有</span> ボタンをタップし、「ホーム画面に追加」を選択してください</>
    : language === "ko" ? <>Safari 하단의 <span className="font-medium text-primary">공유</span> 버튼을 탭한 후 「홈 화면에 추가」를 선택하세요</>
    : language === "th" ? <>แตะปุ่ม <span className="font-medium text-primary">แชร์</span> ที่ด้านล่างของ Safari แล้วเลือก "เพิ่มไปยังหน้าจอหลัก"</>
    : <>點擊 Safari 底部的 <span className="font-medium text-primary">分享</span> 按鈕，然後選擇「加入主畫面」</>;

  const androidDesc =
    language === "en" ? "Install SIM uncle App for quick eSIM purchases anytime"
    : language === "zh-CN" ? "安装 SIM uncle App，随时快速购买 eSIM"
    : language === "ja" ? "SIM uncle Appをインストールして、いつでも素早くeSIMを購入"
    : language === "ko" ? "SIM uncle 앱을 설치하고 언제든지 빠르게 eSIM 구매"
    : language === "th" ? "ติดตั้ง SIM uncle App เพื่อซื้อ eSIM ได้ทุกเมื่อ"
    : "安裝 SIM uncle App，隨時快速購買 eSIM";

  const installBtn =
    language === "en" ? "Install"
    : language === "zh-CN" ? "立即安装"
    : language === "ja" ? "インストール"
    : language === "ko" ? "설치하기"
    : language === "th" ? "ติดตั้ง"
    : "立即安裝";

  const closeLabel =
    language === "en" ? "Close"
    : language === "zh-CN" ? "关闭"
    : language === "ja" ? "閉じる"
    : language === "ko" ? "닫기"
    : language === "th" ? "ปิด"
    : "關閉";

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-20 sm:w-80 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-primary/20 rounded-2xl shadow-xl p-4 flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {title}
          </p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {iosDesc}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {androidDesc}
            </p>
          )}

          {!isIOS && (
            <Button
              size="sm"
              className="mt-2 h-7 text-xs px-3 bg-primary hover:bg-primary/90"
              onClick={handleInstall}
            >
              <Download className="w-3 h-3 mr-1" />
              {installBtn}
            </Button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label={closeLabel}
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
