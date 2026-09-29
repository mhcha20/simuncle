import { useLanguage } from "@/contexts/LanguageContext";
import { PageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowLeft, Smartphone, CheckCircle2, AlertCircle, Info, Search } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

// Lightbox component for full-screen image viewing with prev/next navigation
function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const src = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && hasNext) onNext();
      else if (dx > 0 && hasPrev) onPrev();
    } else if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
      // Swipe down to close
      onClose();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ animation: "fadeIn 150ms ease-out" }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>

      {/* Close button */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-95 z-10"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous step"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-95 z-10"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next step"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Step indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === index ? "bg-white scale-125" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      <img
        key={src}
        src={src}
        alt={`Step ${index + 1}`}
        className="max-h-[85vh] max-w-[80vw] sm:max-w-[70vw] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "scaleIn 180ms cubic-bezier(0.23,1,0.32,1)" }}
      />
    </div>
  );
}

// LightboxImage: thumbnail that opens Lightbox with full gallery navigation
function LightboxImage({ src, alt, images, index }: { src: string; alt: string; images: string[]; index: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const handleClose = useCallback(() => setOpenIndex(null), []);
  const handlePrev = useCallback(() => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const handleNext = useCallback(() => setOpenIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i)), [images.length]);

  return (
    <>
      <div
        className="rounded-xl overflow-hidden border border-border bg-muted/20 mb-2 max-w-[200px] sm:max-w-[280px] cursor-zoom-in group relative"
        onClick={() => setOpenIndex(index)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpenIndex(index)}
        aria-label={`Enlarge: ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 backdrop-blur-sm">
            🔍 點擊放大
          </span>
        </div>
      </div>
      {openIndex !== null && (
        <Lightbox
          images={images}
          index={openIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}

// 品牌官方 eSIM 支援查詢連結
type BrandEntry = {
  name: string;
  logo: string;
  url: { en: string; "zh-TW": string; "zh-CN": string };
  note?: { en: string; "zh-TW": string; "zh-CN": string };
};

const BRANDS: BrandEntry[] = [
  {
    name: "Apple",
    logo: "🍎",
    // Apple official page listing all iPhone/iPad eSIM-supported models with regional notes
    url: {
      en: "https://support.apple.com/en-us/118669",
      "zh-TW": "https://support.apple.com/zh-tw/118669",
      "zh-CN": "https://support.apple.com/zh-cn/118669",
    },
    note: {
      en: "⚠️ iPhone 13–16 Hong Kong models do NOT support eSIM. iPhone 17 (HK) and above support eSIM.",
      "zh-TW": "⚠️ iPhone 13–16 香港版不支援 eSIM，iPhone 17（港版）及以上才支援。",
      "zh-CN": "⚠️ iPhone 13–16 香港版不支持 eSIM，iPhone 17（港版）及以上才支持。",
    },
  },
  {
    name: "Samsung",
    logo: "🔵",
    // Samsung regional pages listing Galaxy eSIM-compatible models
    url: {
      en: "https://www.samsung.com/au/support/mobile-devices/esim-compatibility/",
      "zh-TW": "https://www.samsung.com/tw/support/mobile-devices/galaxy-esim-and-supported-network-carriers/",
      "zh-CN": "https://www.samsung.com/hk/support/mobile-devices/galaxy-esim-and-supported-network-carrier/",
    },
  },
  {
    name: "Google Pixel",
    logo: "🟢",
    // Google Pixel official eSIM compatibility list
    url: {
      en: "https://support.google.com/pixelphone/answer/7086887?hl=en",
      "zh-TW": "https://support.google.com/pixelphone/answer/7086887?hl=zh-TW",
      "zh-CN": "https://support.google.com/pixelphone/answer/7086887?hl=zh-Hans",
    },
  },
  {
    name: "Huawei",
    logo: "🔴",
    // Huawei official eSIM support page
    url: {
      en: "https://consumer.huawei.com/en/support/content/en-us15730640/",
      "zh-TW": "https://consumer.huawei.com/tw/support/",
      "zh-CN": "https://consumer.huawei.com/cn/support/content/zh-cn16075303/",
    },
  },
  {
    name: "Sony Xperia",
    logo: "⚫",
    // Sony official page listing Xperia eSIM-compatible models
    url: {
      en: "https://www.sony.co.uk/electronics/support/articles/00300757",
      "zh-TW": "https://www.sony.co.uk/electronics/support/articles/00300757",
      "zh-CN": "https://www.sony.co.uk/electronics/support/articles/00300757",
    },
  },
  {
    name: "Motorola",
    logo: "🟡",
    // Third-party comprehensive Motorola eSIM device list (official page lacks a direct list)
    url: {
      en: "https://cellulardata.ubigi.com/help-center/faq/esim-data-plan/motorola-devices-equipped-with-esim/",
      "zh-TW": "https://cellulardata.ubigi.com/help-center/faq/esim-data-plan/motorola-devices-equipped-with-esim/",
      "zh-CN": "https://cellulardata.ubigi.com/help-center/faq/esim-data-plan/motorola-devices-equipped-with-esim/",
    },
  },
  {
    name: "OnePlus",
    logo: "🔴",
    // OnePlus official eSIM support article listing compatible models
    url: {
      en: "https://service.oneplus.com/au/search/search-detail?id=2151423",
      "zh-TW": "https://service.oneplus.com/au/search/search-detail?id=2151423",
      "zh-CN": "https://service.oneplus.com/au/search/search-detail?id=2151423",
    },
  },
  {
    name: "OPPO",
    logo: "🟢",
    // Comprehensive OPPO eSIM-compatible models list
    url: {
      en: "https://esim.holafly.com/how-to/esim-phones/",
      "zh-TW": "https://esim.holafly.com/zh/esim-guides/esim-phones/",
      "zh-CN": "https://esim.holafly.com/how-to/esim-phones/",
    },
  },
  {
    name: "Xiaomi",
    logo: "🟠",
    // Xiaomi official eSIM support page with model filter
    url: {
      en: "https://www.mi.com/global/support/esim/",
      "zh-TW": "https://www.mi.com/global/support/esim/?lang=zh-TW",
      "zh-CN": "https://www.mi.com/global/support/esim/?lang=zh-CN",
    },
  },
  {
    name: "Microsoft Surface",
    logo: "🔷",
    // Microsoft official eSIM setup guide for Surface devices
    url: {
      en: "https://support.microsoft.com/en-us/surface/set-up-an-esim-on-your-surface-device-d6e7b9c1",
      "zh-TW": "https://support.microsoft.com/zh-tw/surface/set-up-an-esim-on-your-surface-device-d6e7b9c1",
      "zh-CN": "https://support.microsoft.com/zh-cn/surface/set-up-an-esim-on-your-surface-device-d6e7b9c1",
    },
  },
];

// 品牌下拉選單組件
function BrandDropdown({ lang }: { lang: string }) {
  const [selected, setSelected] = useState("");
  const brand = BRANDS.find((b) => b.name === selected);
  const url = brand ? (brand.url[lang as keyof typeof brand.url] ?? brand.url.en) : "";
  const note = brand?.note ? (brand.note[lang as keyof typeof brand.note] ?? brand.note.en) : null;

  const labels = {
    title: lang === "en" ? "Not sure if your device supports eSIM?" : lang === "zh-CN" ? "不确定您的设备是否支持 eSIM？" : lang === "ja" ? "お使いの端末がeSIM対応かご不明な方は？" : lang === "ko" ? "기기가 eSIM을 지원하는지 확실하지 않으실 경우?" : lang === "th" ? "ไม่แน่ใจว่าอุปกรณ์รองรับ eSIM หรือไม่?" : "不確定您的裝置是否支援 eSIM？",
    subtitle: lang === "en" ? "Select your brand to check on the official support page." : lang === "zh-CN" ? "选择手机品牌，前往官方页面查询支持的型号。" : lang === "ja" ? "ブランドを選択して公式サポートページで確認してください。" : lang === "ko" ? "브랜드를 선택하여 공식 지원 페이지에서 확인하세요." : lang === "th" ? "เลือกแบรนด์ของคุณเพื่อตรวจสอบบนหน้าสนับสนุนทางการ" : "選擇手機品牌，前往官方頁面查詢支援的型號。",
    placeholder: lang === "en" ? "— Select your brand —" : lang === "zh-CN" ? "— 选择品牌 —" : lang === "ja" ? "— ブランドを選択 —" : lang === "ko" ? "— 브랜드 선택 —" : lang === "th" ? "— เลือกแบรนด์ —" : "— 選擇品牌 —",
    check: lang === "en" ? "Check on official page ↗" : lang === "zh-CN" ? "前往官方页面查询 ↗" : lang === "ja" ? "公式ページで確認 ↗" : lang === "ko" ? "공식 페이지에서 확인 ↗" : lang === "th" ? "ตรวจสอบบนหน้าทางการ ↗" : "前往官方頁面查詢 ↗",
    appleWarn: lang === "en"
      ? "⚠️ Apple iPhone 13–16 Hong Kong models do NOT support eSIM. iPhone 17 (HK) and above support eSIM."
      : lang === "zh-CN"
      ? "⚠️ Apple iPhone 13–16 香港版不支持 eSIM，iPhone 17（港版）及以上才支持。"
      : lang === "ja"
      ? "⚠️ Apple iPhone 13–16 香港モデルはeSIM非対応です。iPhone 17（香港版）以降が対応しています。"
      : lang === "ko"
      ? "⚠️ Apple iPhone 13–16 홍콩 모델은 eSIM을 지원하지 않습니다. iPhone 17(홍콩) 이상이 eSIM을 지원합니다."
      : lang === "th"
      ? "⚠️ Apple iPhone 13–16 รุ่นฮ่องกงไม่รองรับ eSIM iPhone 17 (ฮ่องกง) ขึ้นไปรองรับ eSIM"
      : "⚠️ Apple iPhone 13–16 香港版不支援 eSIM，iPhone 17（港版）及以上才支援。",
  };

  return (
    <div className="mt-6">
      <p className="text-center text-sm font-medium mb-1">{labels.title}</p>
      <p className="text-center text-xs text-muted-foreground mb-3">{labels.subtitle}</p>
      <div className="flex flex-col gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option value="">{labels.placeholder}</option>
          {BRANDS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        {note && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            {note}
          </p>
        )}
        {brand && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.97]"
          >
            {labels.check}
          </a>
        )}
      </div>
      {!brand && (
        <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          {labels.appleWarn}
        </p>
      )}
    </div>
  );
}

// 支援 eSIM 的裝置完整列表（2025 最新）
type DeviceEntry = { name: string; hkWarning?: boolean };

const ESIM_DEVICES: DeviceEntry[] = [
  // Apple iPhone
  { name: "iPhone XS" }, { name: "iPhone XS Max" }, { name: "iPhone XR" },
  { name: "iPhone 11" }, { name: "iPhone 11 Pro" }, { name: "iPhone 11 Pro Max" },
  { name: "iPhone 12" }, { name: "iPhone 12 mini" }, { name: "iPhone 12 Pro" }, { name: "iPhone 12 Pro Max" },
  { name: "iPhone 13", hkWarning: true }, { name: "iPhone 13 mini", hkWarning: true }, { name: "iPhone 13 Pro", hkWarning: true }, { name: "iPhone 13 Pro Max", hkWarning: true },
  { name: "iPhone 14" }, { name: "iPhone 14 Plus" }, { name: "iPhone 14 Pro" }, { name: "iPhone 14 Pro Max" },
  { name: "iPhone 15" }, { name: "iPhone 15 Plus" }, { name: "iPhone 15 Pro" }, { name: "iPhone 15 Pro Max" },
  { name: "iPhone 16" }, { name: "iPhone 16 Plus" }, { name: "iPhone 16 Pro" }, { name: "iPhone 16 Pro Max" },
  // Apple iPad
  { name: "iPad Pro 11\" (2018+)" }, { name: "iPad Pro 12.9\" (2018+)" },
  { name: "iPad Air (2019+)" }, { name: "iPad mini (2019+)" }, { name: "iPad (2020+)" },
  // Samsung Galaxy S
  { name: "Samsung Galaxy S20" }, { name: "Samsung Galaxy S20+" }, { name: "Samsung Galaxy S20 Ultra" },
  { name: "Samsung Galaxy S21" }, { name: "Samsung Galaxy S21+" }, { name: "Samsung Galaxy S21 Ultra" },
  { name: "Samsung Galaxy S22" }, { name: "Samsung Galaxy S22+" }, { name: "Samsung Galaxy S22 Ultra" },
  { name: "Samsung Galaxy S23" }, { name: "Samsung Galaxy S23+" }, { name: "Samsung Galaxy S23 Ultra" },
  { name: "Samsung Galaxy S24" }, { name: "Samsung Galaxy S24+" }, { name: "Samsung Galaxy S24 Ultra" },
  { name: "Samsung Galaxy S25" }, { name: "Samsung Galaxy S25+" }, { name: "Samsung Galaxy S25 Ultra" },
  // Samsung Galaxy Z
  { name: "Samsung Galaxy Z Fold 2" }, { name: "Samsung Galaxy Z Fold 3" }, { name: "Samsung Galaxy Z Fold 4" }, { name: "Samsung Galaxy Z Fold 5" }, { name: "Samsung Galaxy Z Fold 6" },
  { name: "Samsung Galaxy Z Flip 3" }, { name: "Samsung Galaxy Z Flip 4" }, { name: "Samsung Galaxy Z Flip 5" }, { name: "Samsung Galaxy Z Flip 6" },
  // Samsung Galaxy A
  { name: "Samsung Galaxy A54" }, { name: "Samsung Galaxy A55" },
  // Google Pixel
  { name: "Google Pixel 3" }, { name: "Google Pixel 3a" }, { name: "Google Pixel 4" }, { name: "Google Pixel 4a" },
  { name: "Google Pixel 5" }, { name: "Google Pixel 5a" },
  { name: "Google Pixel 6" }, { name: "Google Pixel 6a" }, { name: "Google Pixel 6 Pro" },
  { name: "Google Pixel 7" }, { name: "Google Pixel 7a" }, { name: "Google Pixel 7 Pro" },
  { name: "Google Pixel 8" }, { name: "Google Pixel 8a" }, { name: "Google Pixel 8 Pro" },
  { name: "Google Pixel 9" }, { name: "Google Pixel 9 Pro" }, { name: "Google Pixel 9 Pro XL" }, { name: "Google Pixel 9 Pro Fold" },
  // Motorola
  { name: "Motorola Razr 2019" }, { name: "Motorola Razr 5G" }, { name: "Motorola Razr 40" }, { name: "Motorola Razr 40 Ultra" },
  { name: "Motorola Edge 40 Pro" },
  // Sony
  { name: "Sony Xperia 10 III Lite" }, { name: "Sony Xperia 1 V" }, { name: "Sony Xperia 5 V" },
  // OnePlus
  { name: "OnePlus 12" },
  // Huawei
  { name: "Huawei P40" }, { name: "Huawei P40 Pro" }, { name: "Huawei Mate 40 Pro" },
  // Microsoft Surface
  { name: "Microsoft Surface Pro X" }, { name: "Microsoft Surface Pro 9" }, { name: "Microsoft Surface Duo 2" },
  // Others
  { name: "OPPO Find X3 Pro" }, { name: "OPPO Find X5 Pro" },
  { name: "Xiaomi 13 Pro" }, { name: "Xiaomi 14 Ultra" },
];

type Step = { title: string; desc: string; note?: string };
type Content = {
  pageTitle: string;
  pageSubtitle: string;
  iphoneTab: string;
  androidTab: string;
  requirementsTitle: string;
  iphoneReqs: string[];
  androidReqs: string[];
  stepsTitle: string;
  iphoneSteps: Step[];
  androidSteps: Step[];
  tipsTitle: string;
  tips: string[];
  backHome: string;
  compatNote: string;
};

const CONTENT: Record<string, Content> = {
  "zh-TW": {
    pageTitle: "eSIM 安裝教學",
    pageSubtitle: "按照以下步驟，輕鬆在您的裝置上安裝 eSIM",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "安裝前確認",
    iphoneReqs: [
      "iPhone XS 或更新型號（iOS 12.1 以上）",
      "裝置未被電信商鎖定（Carrier Unlocked）",
      "已連接 Wi-Fi 或行動數據",
      "已購買 eSIM 並取得 QR Code",
    ],
    androidReqs: [
      "支援 eSIM 的 Android 裝置（如 Samsung Galaxy S20+、Google Pixel 3a+）",
      "裝置未被電信商鎖定（Carrier Unlocked）",
      "已連接 Wi-Fi 或行動數據",
      "已購買 eSIM 並取得 QR Code",
    ],
    stepsTitle: "安裝步驟",
    iphoneSteps: [
      {
        title: "開啟「設定」",
        desc: "點擊主畫面的「設定」App，進入設定頁面。",
      },
      {
        title: "前往「行動網路」",
        desc: "在設定頁面向下滑動，點擊「行動網路」（Cellular）。",
      },
      {
        title: "點擊「加入 eSIM」",
        desc: "點擊「加入 eSIM」或「加入行動數據方案」。",
        note: "如果您已有實體 SIM 卡，仍可同時使用 eSIM。",
      },
      {
        title: "掃描 QR Code",
        desc: "選擇「使用 QR Code」，然後用相機掃描您在訂單頁面看到的 QR Code。",
        note: "請確保光線充足，QR Code 清晰可見。",
      },
      {
        title: "確認安裝",
        desc: "點擊「繼續」確認安裝 eSIM。系統會下載 eSIM 設定檔，通常需要 1–2 分鐘。",
      },
      {
        title: "設定行動數據",
        desc: "安裝完成後，前往「設定 > 行動網路」，選擇剛安裝的 eSIM 作為行動數據來源。",
        note: "出發前建議先設定好，到達目的地後 eSIM 會自動連線。",
      },
    ],
    androidSteps: [
      {
        title: "開啟「設定」",
        desc: "點擊設定 App，進入設定頁面。",
      },
      {
        title: "前往「網路與網際網路」",
        desc: "點擊「網路與網際網路」或「連線」（不同品牌名稱略有不同）。",
      },
      {
        title: "選擇「SIM 卡」或「行動網路」",
        desc: "點擊「SIM 卡」、「行動網路」或「SIM 卡管理員」。",
      },
      {
        title: "新增 eSIM",
        desc: "點擊「新增」、「加入 eSIM」或「+」按鈕。",
        note: "Samsung 裝置：設定 > 連線 > SIM 卡管理員 > 加入行動方案",
      },
      {
        title: "掃描 QR Code",
        desc: "選擇「掃描 QR Code」，然後掃描您在訂單頁面看到的 QR Code。",
        note: "部分裝置可能需要手動輸入啟用碼（Activation Code）。",
      },
      {
        title: "確認並啟用",
        desc: "按照畫面提示確認安裝，並將新 eSIM 設為行動數據來源。",
        note: "安裝完成後，eSIM 通常會在您到達目的地時自動啟用。",
      },
    ],
    tipsTitle: "使用提示",
    tips: [
      "eSIM 在購買後 2 個月內未啟用將會過期，請留意有效期限。",
      "大部分 eSIM 方案為一次性使用，不支援重複安裝，請妥善保管 QR Code。",
      "如需在多部裝置使用，請購買多張 eSIM。",
      "使用期間如遇連線問題，可嘗試開關飛行模式或重新啟動裝置。",
      "部分國家/地區可能需要手動選擇網路，請前往「設定 > 行動網路 > 網路選擇」。",
    ],
    backHome: "返回首頁",
    compatNote: "不確定您的裝置是否支援 eSIM？",
  },
  "zh-CN": {
    pageTitle: "eSIM 安装教程",
    pageSubtitle: "按照以下步骤，轻松在您的设备上安装 eSIM",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "安装前确认",
    iphoneReqs: [
      "iPhone XS 或更新型号（iOS 12.1 以上）",
      "设备未被运营商锁定（Carrier Unlocked）",
      "已连接 Wi-Fi 或移动数据",
      "已购买 eSIM 并获取 QR Code",
    ],
    androidReqs: [
      "支持 eSIM 的 Android 设备（如 Samsung Galaxy S20+、Google Pixel 3a+）",
      "设备未被运营商锁定（Carrier Unlocked）",
      "已连接 Wi-Fi 或移动数据",
      "已购买 eSIM 并获取 QR Code",
    ],
    stepsTitle: "安装步骤",
    iphoneSteps: [
      { title: "打开「设置」", desc: "点击主屏幕的「设置」App，进入设置页面。" },
      { title: "前往「蜂窝网络」", desc: "在设置页面向下滑动，点击「蜂窝网络」（Cellular）。" },
      { title: "点击「添加 eSIM」", desc: "点击「添加 eSIM」或「添加蜂窝套餐」。", note: "如果您已有实体 SIM 卡，仍可同时使用 eSIM。" },
      { title: "扫描 QR Code", desc: "选择「使用 QR Code」，然后用相机扫描您在订单页面看到的 QR Code。", note: "请确保光线充足，QR Code 清晰可见。" },
      { title: "确认安装", desc: "点击「继续」确认安装 eSIM。系统会下载 eSIM 配置文件，通常需要 1–2 分钟。" },
      { title: "设置移动数据", desc: "安装完成后，前往「设置 > 蜂窝网络」，选择刚安装的 eSIM 作为移动数据来源。", note: "出发前建议先设置好，到达目的地后 eSIM 会自动连接。" },
    ],
    androidSteps: [
      { title: "打开「设置」", desc: "点击设置 App，进入设置页面。" },
      { title: "前往「网络与互联网」", desc: "点击「网络与互联网」或「连接」（不同品牌名称略有不同）。" },
      { title: "选择「SIM 卡」或「移动网络」", desc: "点击「SIM 卡」、「移动网络」或「SIM 卡管理」。" },
      { title: "添加 eSIM", desc: "点击「添加」、「添加 eSIM」或「+」按钮。", note: "Samsung 设备：设置 > 连接 > SIM 卡管理 > 添加移动套餐" },
      { title: "扫描 QR Code", desc: "选择「扫描 QR Code」，然后扫描您在订单页面看到的 QR Code。", note: "部分设备可能需要手动输入激活码（Activation Code）。" },
      { title: "确认并激活", desc: "按照屏幕提示确认安装，并将新 eSIM 设为移动数据来源。", note: "安装完成后，eSIM 通常会在您到达目的地时自动激活。" },
    ],
    tipsTitle: "使用提示",
    tips: [
      "eSIM 在购买后 2 个月内未激活将会过期，请注意有效期限。",
      "大部分 eSIM 套餐为一次性使用，不支持重复安装，请妥善保管 QR Code。",
      "如需在多部设备使用，请购买多张 eSIM。",
      "使用期间如遇连接问题，可尝试开关飞行模式或重新启动设备。",
      "部分国家/地区可能需要手动选择网络，请前往「设置 > 蜂窝网络 > 网络选择」。",
    ],
    backHome: "返回首页",
    compatNote: "不确定您的设备是否支持 eSIM？",
  },
  en: {
    pageTitle: "eSIM Installation Guide",
    pageSubtitle: "Follow these steps to easily install your eSIM on your device",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "Before You Start",
    iphoneReqs: [
      "iPhone XS or newer (iOS 12.1 or later)",
      "Device must be carrier unlocked",
      "Connected to Wi-Fi or mobile data",
      "eSIM purchased with QR Code ready",
    ],
    androidReqs: [
      "eSIM-compatible Android device (e.g. Samsung Galaxy S20+, Google Pixel 3a+)",
      "Device must be carrier unlocked",
      "Connected to Wi-Fi or mobile data",
      "eSIM purchased with QR Code ready",
    ],
    stepsTitle: "Installation Steps",
    iphoneSteps: [
      { title: "Open Settings", desc: "Tap the Settings app on your home screen." },
      { title: "Go to Cellular", desc: "Scroll down and tap Cellular (or Mobile Data)." },
      { title: "Tap Add eSIM", desc: "Tap 'Add eSIM' or 'Add Cellular Plan'.", note: "You can use eSIM alongside a physical SIM card." },
      { title: "Scan QR Code", desc: "Choose 'Use QR Code' and scan the QR Code shown on your order page.", note: "Make sure there is good lighting and the QR Code is clearly visible." },
      { title: "Confirm Installation", desc: "Tap Continue to confirm. The eSIM profile will download — this usually takes 1–2 minutes." },
      { title: "Set as Data Line", desc: "After installation, go to Settings > Cellular and select the new eSIM as your mobile data source.", note: "Set this up before departure — your eSIM will connect automatically when you arrive." },
    ],
    androidSteps: [
      { title: "Open Settings", desc: "Tap the Settings app." },
      { title: "Go to Network & Internet", desc: "Tap 'Network & Internet' or 'Connections' (varies by brand)." },
      { title: "Select SIM or Mobile Network", desc: "Tap 'SIM cards', 'Mobile network', or 'SIM card manager'." },
      { title: "Add eSIM", desc: "Tap 'Add', 'Add eSIM', or the '+' button.", note: "Samsung: Settings > Connections > SIM card manager > Add mobile plan" },
      { title: "Scan QR Code", desc: "Choose 'Scan QR Code' and scan the QR Code from your order page.", note: "Some devices may require manual entry of the Activation Code." },
      { title: "Confirm & Activate", desc: "Follow the on-screen prompts to confirm installation and set the eSIM as your data source.", note: "Your eSIM will typically activate automatically when you arrive at your destination." },
    ],
    tipsTitle: "Tips",
    tips: [
      "eSIM will expire if not activated within 2 months of purchase.",
      "Most eSIM plans are single-use and cannot be reinstalled — keep your QR Code safe.",
      "If you need eSIM on multiple devices, purchase separate eSIMs.",
      "If you experience connection issues, try toggling Airplane Mode or restarting your device.",
      "In some countries, you may need to manually select a network in Settings > Cellular > Network Selection.",
    ],
    backHome: "Back to Home",
  compatNote: "Not sure if your device supports eSIM?",
  },
  ja: {
    pageTitle: "eSIM インストールガイド",
    pageSubtitle: "以下の手順に従って、端末にeSIMを簡単にインストールしてください",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "インストール前の確認",
    iphoneReqs: [
      "iPhone XS 以降（iOS 12.1以上）",
      "端末がキャリアロック解除済みであること",
      "Wi-Fiまたはモバイルデータに接続済み",
      "eSIMを購入し、QRコードを取得済み",
    ],
    androidReqs: [
      "eSIM対応のAndroid端末（Samsung Galaxy S20+、Google Pixel 3a+など）",
      "端末がキャリアロック解除済みであること",
      "Wi-Fiまたはモバイルデータに接続済み",
      "eSIMを購入し、QRコードを取得済み",
    ],
    stepsTitle: "インストール手順",
    iphoneSteps: [
      { title: "「設定」を開く", desc: "ホーム画面の「設定」Appをタップします。" },
      { title: "「モバイル通信」へ移動", desc: "設定画面を下にスクロールし、「モバイル通信」をタップします。" },
      { title: "「eSIMを追加」をタップ", desc: "「eSIMを追加」または「モバイルデータプランを追加」をタップします。", note: "物理SIMカードがある場合でも、eSIMを同時に使用できます。" },
      { title: "QRコードをスキャン", desc: "「QRコードを使用」を選択し、注文ページのQRコードをカメラでスキャンします。", note: "十分な明るさで、QRコードが鮮明に見えるようにしてください。" },
      { title: "インストールを確認", desc: "「続ける」をタップして確認します。eSIMプロファイルのダウンロードに通常1〜2分かかります。" },
      { title: "データ回線を設定", desc: "インストール後、「設定 > モバイル通信」で新しいeSIMをデータ回線として選択します。", note: "出発前に設定しておくと、目的地に到着次第自動接続されます。" },
    ],
    androidSteps: [
      { title: "「設定」を開く", desc: "設定Appをタップします。" },
      { title: "「ネットワークとインターネット」へ移動", desc: "「ネットワークとインターネット」または「接続」をタップします（ブランドにより名称が異なります）。" },
      { title: "「SIM」または「モバイルネットワーク」を選択", desc: "「SIMカード」、「モバイルネットワーク」または「SIMカードマネージャー」をタップします。" },
      { title: "eSIMを追加", desc: "「追加」、「eSIMを追加」または「+」ボタンをタップします。", note: "Samsung: 設定 > 接続 > SIMカードマネージャー > モバイルプランを追加" },
      { title: "QRコードをスキャン", desc: "「QRコードをスキャン」を選択し、注文ページのQRコードをスキャンします。", note: "一部の端末では、アクティベーションコードの手動入力が必要な場合があります。" },
      { title: "確認して有効化", desc: "画面の指示に従ってインストールを確認し、新しいeSIMをデータ回線として設定します。", note: "インストール後、eSIMは目的地に到着すると自動的に有効化されます。" },
    ],
    tipsTitle: "使用上のヒント",
    tips: [
      "eSIMは購入後2ヶ月以内に有効化しないと期限切れになります。",
      "ほとんどのeSIMプランは一回限りの使用で、再インストールはできません。QRコードを大切に保管してください。",
      "複数の端末で使用する場合は、それぞれeSIMを購入してください。",
      "接続に問題が生じた場合は、機内モードのオン/オフを試すか、端末を再起動してください。",
      "一部の国/地域では、「設定 > モバイル通信 > ネットワーク選択」で手動でネットワークを選択する必要があります。",
    ],
    backHome: "ホームに戻る",
    compatNote: "お使いの端末がeSIM対応かご不明な方は？",
  },
  ko: {
    pageTitle: "eSIM 설치 가이드",
    pageSubtitle: "다음 단계를 따라 기기에 eSIM을 쉽게 설치하세요",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "설치 전 확인",
    iphoneReqs: [
      "iPhone XS 이상 (iOS 12.1 이상)",
      "기기가 통신사 잠금 해제 상태여야 함",
      "Wi-Fi 또는 모바일 데이터에 연결됨",
      "eSIM 구매 완료 및 QR 코드 준비",
    ],
    androidReqs: [
      "eSIM 지원 Android 기기 (Samsung Galaxy S20+, Google Pixel 3a+ 등)",
      "기기가 통신사 잠금 해제 상태여야 함",
      "Wi-Fi 또는 모바일 데이터에 연결됨",
      "eSIM 구매 완료 및 QR 코드 준비",
    ],
    stepsTitle: "설치 단계",
    iphoneSteps: [
      { title: "「설정」열기", desc: "홈 화면에서 「설정」앱을 탭합니다." },
      { title: "「셀룰러」로 이동", desc: "설정 화면을 아래로 스크롤하여 「셀룰러」를 탭합니다." },
      { title: "「eSIM 추가」탭", desc: "「eSIM 추가」또는 「셀룰러 요금제 추가」를 탭합니다.", note: "물리적 SIM 카드가 있어도 eSIM을 동시에 사용할 수 있습니다." },
      { title: "QR 코드 스캔", desc: "「QR 코드 사용」을 선택하고 주문 페이지의 QR 코드를 카메라로 스캔합니다.", note: "충분한 조명에서 QR 코드가 선명하게 보이도록 하세요." },
      { title: "설치 확인", desc: "「계속」을 탭하여 확인합니다. eSIM 프로파일 다운로드에 보통 1~2분이 소요됩니다." },
      { title: "데이터 회선 설정", desc: "설치 후 「설정 > 셀룰러」에서 새 eSIM을 모바일 데이터 소스로 선택합니다.", note: "출발 전에 설정해 두면 목적지 도착 시 자동으로 연결됩니다." },
    ],
    androidSteps: [
      { title: "「설정」열기", desc: "설정 앱을 탭합니다." },
      { title: "「네트워크 및 인터넷」으로 이동", desc: "「네트워크 및 인터넷」또는 「연결」을 탭합니다 (브랜드마다 이름이 다를 수 있습니다)." },
      { title: "「SIM」또는 「모바일 네트워크」선택", desc: "「SIM 카드」, 「모바일 네트워크」또는 「SIM 카드 관리자」를 탭합니다." },
      { title: "eSIM 추가", desc: "「추가」, 「eSIM 추가」또는 「+」버튼을 탭합니다.", note: "Samsung: 설정 > 연결 > SIM 카드 관리자 > 모바일 요금제 추가" },
      { title: "QR 코드 스캔", desc: "「QR 코드 스캔」을 선택하고 주문 페이지의 QR 코드를 스캔합니다.", note: "일부 기기는 활성화 코드를 수동으로 입력해야 할 수 있습니다." },
      { title: "확인 및 활성화", desc: "화면 안내에 따라 설치를 확인하고 새 eSIM을 데이터 소스로 설정합니다.", note: "설치 후 목적지에 도착하면 eSIM이 자동으로 활성화됩니다." },
    ],
    tipsTitle: "사용 팁",
    tips: [
      "eSIM은 구매 후 2개월 이내에 활성화하지 않으면 만료됩니다.",
      "대부분의 eSIM 요금제는 일회용으로 재설치가 불가능합니다. QR 코드를 안전하게 보관하세요.",
      "여러 기기에서 사용하려면 각각 eSIM을 구매하세요.",
      "연결 문제가 발생하면 비행기 모드를 켜고 끄거나 기기를 재시작해 보세요.",
      "일부 국가/지역에서는 「설정 > 셀룰러 > 네트워크 선택」에서 수동으로 네트워크를 선택해야 할 수 있습니다.",
    ],
    backHome: "홈으로 돌아가기",
    compatNote: "기기가 eSIM을 지원하는지 확실하지 않으실 경우?",
  },
  th: {
    pageTitle: "คู่มือการติดตั้ง eSIM",
    pageSubtitle: "ทำตามขั้นตอนเหล่านี้เพื่อติดตั้ง eSIM บนอุปกรณ์ของคุณได้อย่างง่ายดาย",
    iphoneTab: "iPhone",
    androidTab: "Android",
    requirementsTitle: "ตรวจสอบก่อนติดตั้ง",
    iphoneReqs: [
      "iPhone XS หรือรุ่นใหม่กว่า (iOS 12.1 ขึ้นไป)",
      "อุปกรณ์ต้องปลดล็อกจากผู้ให้บริการแล้ว",
      "เชื่อมต่อ Wi-Fi หรือข้อมูลมือถือ",
      "ซื้อ eSIM เรียบร้อยและมี QR Code พร้อมแล้ว",
    ],
    androidReqs: [
      "อุปกรณ์ Android ที่รองรับ eSIM (เช่น Samsung Galaxy S20+, Google Pixel 3a+)",
      "อุปกรณ์ต้องปลดล็อกจากผู้ให้บริการแล้ว",
      "เชื่อมต่อ Wi-Fi หรือข้อมูลมือถือ",
      "ซื้อ eSIM เรียบร้อยและมี QR Code พร้อมแล้ว",
    ],
    stepsTitle: "ขั้นตอนการติดตั้ง",
    iphoneSteps: [
      { title: "เปิด「การตั้งค่า」", desc: "แตะแอป「การตั้งค่า」บนหน้าจอหลัก" },
      { title: "ไปที่「เซลลูลาร์」", desc: "เลื่อนลงและแตะ「เซลลูลาร์」(Cellular)" },
      { title: "แตะ「เพิ่ม eSIM」", desc: "แตะ「เพิ่ม eSIM」หรือ「เพิ่มแผนเซลลูลาร์」", note: "คุณสามารถใช้ eSIM ควบคู่กับ SIM การ์ดจริงได้" },
      { title: "สแกน QR Code", desc: "เลือก「ใช้ QR Code」และสแกน QR Code จากหน้าคำสั่งซื้อ", note: "ตรวจสอบให้แน่ใจว่ามีแสงสว่างเพียงพอและ QR Code มองเห็นได้ชัดเจน" },
      { title: "ยืนยันการติดตั้ง", desc: "แตะ「ดำเนินการต่อ」เพื่อยืนยัน โปรไฟล์ eSIM จะดาวน์โหลดซึ่งมักใช้เวลา 1-2 นาที" },
      { title: "ตั้งค่าเป็นสายข้อมูล", desc: "หลังติดตั้ง ไปที่「การตั้งค่า > เซลลูลาร์」และเลือก eSIM ใหม่เป็นแหล่งข้อมูลมือถือ", note: "ตั้งค่าก่อนออกเดินทาง eSIM จะเชื่อมต่ออัตโนมัติเมื่อถึงปลายทาง" },
    ],
    androidSteps: [
      { title: "เปิด「การตั้งค่า」", desc: "แตะแอปการตั้งค่า" },
      { title: "ไปที่「เครือข่ายและอินเทอร์เน็ต」", desc: "แตะ「เครือข่ายและอินเทอร์เน็ต」หรือ「การเชื่อมต่อ」(แตกต่างกันตามแบรนด์)" },
      { title: "เลือก「SIM」หรือ「เครือข่ายมือถือ」", desc: "แตะ「SIM การ์ด」,「เครือข่ายมือถือ」หรือ「ตัวจัดการ SIM การ์ด」" },
      { title: "เพิ่ม eSIM", desc: "แตะ「เพิ่ม」,「เพิ่ม eSIM」หรือปุ่ม「+」", note: "Samsung: การตั้งค่า > การเชื่อมต่อ > ตัวจัดการ SIM การ์ด > เพิ่มแผนมือถือ" },
      { title: "สแกน QR Code", desc: "เลือก「สแกน QR Code」และสแกน QR Code จากหน้าคำสั่งซื้อ", note: "บางอุปกรณ์อาจต้องป้อนรหัสเปิดใช้งานด้วยตนเอง" },
      { title: "ยืนยันและเปิดใช้งาน", desc: "ทำตามคำแนะนำบนหน้าจอเพื่อยืนยันการติดตั้งและตั้งค่า eSIM เป็นแหล่งข้อมูล", note: "eSIM มักจะเปิดใช้งานอัตโนมัติเมื่อถึงปลายทาง" },
    ],
    tipsTitle: "เคล็ดลับการใช้งาน",
    tips: [
      "eSIM จะหมดอายุหากไม่เปิดใช้งานภายใน 2 เดือนหลังซื้อ",
      "แผน eSIM ส่วนใหญ่ใช้ได้ครั้งเดียวและไม่สามารถติดตั้งซ้ำได้ เก็บ QR Code ไว้อย่างปลอดภัย",
      "หากต้องการใช้กับหลายอุปกรณ์ กรุณาซื้อ eSIM แยกต่างหาก",
      "หากมีปัญหาการเชื่อมต่อ ลองเปิด/ปิดโหมดเครื่องบินหรือรีสตาร์ทอุปกรณ์",
      "บางประเทศ/ภูมิภาคอาจต้องเลือกเครือข่ายด้วยตนเองใน「การตั้งค่า > เซลลูลาร์ > การเลือกเครือข่าย」",
    ],
    backHome: "กลับหน้าหลัก",
    compatNote: "ไม่แน่ใจว่าอุปกรณ์รองรับ eSIM หรือไม่?",
  },
};

export default function HowToInstall() {
  const { language } = useLanguage();
  const lang = language === "zh-CN" ? "zh-CN" : language === "en" ? "en" : language === "ja" ? "ja" : language === "ko" ? "ko" : language === "th" ? "th" : "zh-TW";
  const c = CONTENT[lang];
  const [deviceSearch, setDeviceSearch] = useState("");
  const filteredDevices = deviceSearch.trim()
    ? ESIM_DEVICES.filter(d => d.name.toLowerCase().includes(deviceSearch.toLowerCase()))
    : ESIM_DEVICES;

  const howToInstallJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": lang === "en" ? "How to Install eSIM" : "eSIM 安裝教學",
    "description": lang === "en"
      ? "Step-by-step guide to install eSIM on iPhone and Android devices."
      : "如何在 iPhone 及 Android 手機安裝 eSIM，展示詳細圖文教學。",
    "step": [
      {
        "@type": "HowToStep",
        "name": lang === "en" ? "Purchase eSIM plan" : "購買 eSIM 方案",
        "text": lang === "en" ? "Choose and purchase an eSIM plan on SIM uncle." : "在 SIM uncle 選擇並購買 eSIM 方案。"
      },
      {
        "@type": "HowToStep",
        "name": lang === "en" ? "Receive QR Code" : "收取 QR Code",
        "text": lang === "en" ? "Receive your eSIM QR code via email immediately after purchase." : "購買後即時收到 eSIM QR Code。"
      },
      {
        "@type": "HowToStep",
        "name": lang === "en" ? "Scan and activate" : "掃描安裝",
        "text": lang === "en" ? "Go to Settings > Cellular > Add eSIM and scan the QR code." : "進入設定 > 行動網路 > 新增 eSIM，掃描 QR Code 完成安裝。"
      }
    ]
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageSEO page="howToInstall" path="/how-to-install" jsonLd={howToInstallJsonLd} />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            {c.pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{c.pageSubtitle}</p>
        </div>
      </div>

      <Tabs defaultValue="iphone">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="iphone" className="flex-1">{c.iphoneTab}</TabsTrigger>
          <TabsTrigger value="android" className="flex-1">{c.androidTab}</TabsTrigger>
        </TabsList>

        {(["iphone", "android"] as const).map((platform) => {
          const reqs = platform === "iphone" ? c.iphoneReqs : c.androidReqs;
          const steps = platform === "iphone" ? c.iphoneSteps : c.androidSteps;

          return (
            <TabsContent key={platform} value={platform} className="space-y-6">
              {/* Requirements */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  {c.requirementsTitle}
                </h2>
                <ul className="space-y-2">
                  {reqs.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div>
                <h2 className="font-semibold mb-4">{c.stepsTitle}</h2>
                <ol className="space-y-6">
                  {steps.map((step, i) => {
                    // Multilingual step images keyed by language
                    const stepImagesMap: Record<string, { iphone: string[]; android: string[] }> = {
                      en: {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-en-v2-8FQiMNGtt2zNBPds7SSX2x.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-en-v2-jpEJMvCmAe8iWeJJXZZBCZ.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-en-v2-RrKeeE9Pykr4saGCcUYvnp.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-en-v2-5rcVtcWSYNJwt4aD8ZQo2U.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-en-v2-Rq6Y28ggHBnwJNvrH9xpWc.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-en-v2-9V9roWk2Bf8wSijeebymzv.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-en-v2-HzyJuMcP5fm4efrBFFfv6q.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-en-v2-bvVNBNAuQU7SYkeeZQrYky.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-en-v2-BggEfCmeVeKgspvdasAZwT.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-en-v2-hebkEPupMcyPnkPns5tjpo.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-en-v2-3VXQd7gst72KzU9pssMvqz.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-en-v2-K6NMmuikNCQxs79crAEyAc.webp",
                        ],
                      },
                      "zh-TW": {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-zh-TW-v2-2MS4LP3SFkjWtKbn9xCcXT.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-zh-TW-v2-hy8tonZVFsd9MX2oHG5hx7.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-zh-TW-v2-ZtE6pF9WbUpToXWvzMNxFz.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-zh-TW-v2-dunEr7WYyr5dLtvmXL8z6b.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-zh-TW-v2-dGjAMjG5GmQSGME4DqauoS.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-zh-TW-v2-eW5vC9jRfj6K7qA5iHQkG4.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-zh-TW-v2-DA4qhkHEeYKmiapGAquzN3.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-zh-TW-v2-ZYnXNjxttrCJvapqwQHQpQ.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-zh-TW-v2-nMkLKQDpsdre6Nv8WLANNd.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-zh-TW-v2-5UHa8DoeNgNTBNq37NnNNb.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-zh-TW-v2-dtFwHUdbWnBRY8LUdfiT5t.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-zh-TW-v2-W8nvtPiFqzUuZpa748iULQ.webp",
                        ],
                      },
                      "zh-CN": {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-zh-CN-v2-f3cfEpmhwDtprUHVJ65V72.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-zh-CN-v2-m96xAGpFUQRX8PBdF2qSH9.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-zh-CN-v2-h6cnbwpEnrA6ehufeQzVx6.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-zh-CN-v2-KsbWjKNroEHGTBD4aoSuJ6.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-zh-CN-v2-GgTHScrYA5ojDMKWLiGkDZ.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-zh-CN-v2-iBwvKQmde2UucmpFCwXgDh.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-zh-CN-v2-NktyfgZGkvUq4AwFNGG5Vh.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-zh-CN-v2-TebDZ2YRDTTjHxnPaCbsPT.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-zh-CN-v2-5jbmMvLLhoAmp5SEmC4Yzq.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-zh-CN-v2-WUQLhRPi9DMzmjj42Pstzy.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-zh-CN-v2-X4qsZBMwvJW55QYvykHMLC.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-zh-CN-v2-keetKnHmS8MDTBTxEC4LLQ.webp",
                        ],
                      },
                      ja: {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-ja-v2-4FdArTbn4GK58QXFnLNQLX.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-ja-v2-oUuMy4haCRbaMxyE3XJmbn.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-ja-v2-87wDvmCu7Ey3hJpveArSoZ.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-ja-v2-LGpCCK2vQrxvsfEjBKtzty.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-ja-v2-8gsMdzasQUxHJxcTZEhhZH.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-ja-v2-jxUkKyScdcv6zVGrf4sen5.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-ja-v2-C6bcGYqhUW8FNXuepYWWSk.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-ja-v2-Yy5BGVRNkE6ZTCbSEqkphh.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-ja-v2-2Yxxmx6ueG6M5tKubZ9SNe.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-ja-v2-8AUwcaMMP4R72zfFeHnYMj.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-ja-v2-QEPB9Ti3pnGyLW9JUbCeV6.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-ja-v2-oH66h4BZAFqfzArKg78j84.webp",
                        ],
                      },
                      ko: {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-ko-v2-GYXTsiXChepbPuyFUT6EFb.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-ko-v2-eAw2K7pgiK2XUpEbpDJHbZ.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-ko-v2-cmAaegwkMTqGkjd8mNU4P6.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-ko-v2-biTGJd9HxbDygQobrzfW4C.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-ko-v2-6TFCiRJm557e2Y6GvwZMv4.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-ko-v2-XbNAEmkYi5YmScn39UAWuu.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-ko-v2-9h733TLphF8vGSY9dqxr5F.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-ko-v2-ifeqDPfZLFefQzCbh3vkMK.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-ko-v2-HAYWS5dMWCJWpnY9hQ5BC9.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-ko-v2-H2em78udomzoxdYhyQMtJo.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-ko-v2-G4Ch8v9sEeCX4qoAQtFjYn.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-ko-v2-WieKPvdV3BDXX36uaZfNV9.webp",
                        ],
                      },
                      th: {
                        iphone: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step1-th-v2-N98NbJkfwGrszGwxRjV9Ez.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step2-th-v2-SsCBPhRK8tuVJ2rYCRs8YS.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step3-th-v2-cw26pm3eDazXgi35KpFqUc.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step4-th-v2-UAagxbzJxsad4nb9kAq8VE.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step5-th-v2-VFsgNECSSCNzoXwKZe5t7t.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-iphone-step6-th-v2-kHxJxjthXFsmjc2uKVYg3V.webp",
                        ],
                        android: [
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step1-th-v2-VxPk9wU2kwsF5UKjVVanah.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step2-th-v2-V5VreRhT3PEPzBBrYF7ynX.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step3-th-v2-Lq8a3My38YubRQByoPYwqc.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step4-th-v2-k3vChkpNaEnWDtihHSCfrp.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step5-th-v2-MsZwhN9UQ3faq8Tzw5pgGX.webp",
                          "https://d2xsxph8kpxj0f.cloudfront.net/310519663713907705/QZnNvxSvQbZH4uNdRae3iV/esim-android-step6-th-v2-cukCghbWKC9sYQqfxrMnpy.webp",
                        ],
                      },
                    };
                    // Fall back to English if language not available
                    const langImages = stepImagesMap[lang] ?? stepImagesMap.en;
                    const imgSrc = platform === "iphone" ? langImages.iphone[i] : langImages.android[i];
                    return (
                    <li key={i} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mt-1">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{step.title}</p>
                        <p className="text-sm text-muted-foreground mb-3">{step.desc}</p>
                        {imgSrc && (
                          <LightboxImage
                            src={imgSrc}
                            alt={step.title}
                            images={platform === "iphone" ? langImages.iphone : langImages.android}
                            index={i}
                          />
                        )}
                        {step.note && (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{step.note}</span>
                          </div>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ol>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Tips */}
      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5 text-primary">
          <Info className="w-4 h-4" />
          {c.tipsTitle}
        </h2>
        <ul className="space-y-2">
          {c.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Compat note — Brand Selector (dropdown) */}
      <BrandDropdown lang={lang} />

      <div className="mt-8 text-center">
        <Link href="/products">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            {lang === "en" ? "Browse eSIM Plans" : lang === "zh-CN" ? "浏览 eSIM 方案" : "瀏覽 eSIM 方案"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
