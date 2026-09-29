import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/contexts/LanguageContext";

interface SEOProps {
  /** Override page title (without site name suffix) */
  title?: string;
  /** Override meta description */
  description?: string;
  /** Canonical URL path, e.g. "/products" */
  path?: string;
  /** Additional keywords */
  keywords?: string[];
  /** OG image URL (absolute) */
  ogImage?: string;
  /** JSON-LD structured data object */
  jsonLd?: object;
}

const SITE_NAME = "SIM uncle";
const BASE_URL = "https://simuncle.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/manus-storage/simuncle-banner_90bf4280.png`;

/** Per-language SEO content for each page */
const SEO_CONTENT = {
  home: {
    "zh-TW": {
      title: "SIM uncle - 全球 eSIM 即買即用 | 200+ 國家",
      description:
        "香港旅客首選 eSIM 服務！覆蓋 200+ 個國家及地區，無需換 SIM 卡，掃碼即用，支援 4G/5G 網絡，港幣結算，即時收到 QR Code。日本 eSIM、韓國 eSIM、泰國 eSIM、歐洲 eSIM 一應俱全。",
      keywords: [
        "eSIM 香港",
        "旅遊 eSIM",
        "全球 eSIM",
        "海外上網卡",
      ],
    },
    "zh-CN": {
      title: "SIM uncle - 全球 eSIM 即买即用 | 200+ 国家",
      description:
        "香港旅客首选 eSIM 服务！覆盖 200+ 个国家及地区，无需换 SIM 卡，扫码即用，支持 4G/5G 网络，港币结算，即时收到 QR Code。日本 eSIM、韩国 eSIM、泰国 eSIM、欧洲 eSIM 应有尽有。",
      keywords: [
        "eSIM 香港",
        "旅游 eSIM",
        "全球 eSIM",
        "海外上网卡",
      ],
    },
    en: {
      title: "SIM uncle - Global eSIM | 200+ Countries",
      description:
        "Buy travel eSIM for 200+ countries & regions. No SIM swap needed \u2014 scan and connect instantly. 4G/5G coverage, HKD pricing, QR code delivered immediately. Japan eSIM, Korea eSIM, Europe eSIM and more.",
      keywords: [
        "travel eSIM",
        "global eSIM",
        "eSIM Hong Kong",
        "buy eSIM",
      ],
    },
    ja: {
      title: "SIM uncle - グローバルeSIM | 即時開通 | 200以上の国・地域対応",
      description:
        "200以上の国・地域に対応したトラベルeSIMを購入。SIMカード交換不要 \u2014 QRコードをスキャンするだけで即時接続。4G/5G対応、HKD決済、購入後すぐにQRコードが届きます。日本・韓国・タイ・ヨーロッパeSIMも充実。",
      keywords: [
        "トラベルeSIM",
        "グローバルeSIM",
        "eSIM 海外",
        "日本eSIM",
      ],
    },
    ko: {
      title: "SIM uncle - 글로벌 eSIM | 즉시 개통 | 200개국 이상 지원",
      description:
        "200개국 이상을 지원하는 여행용 eSIM을 구매하세요. SIM 교체 불필요 \u2014 QR코드 스캔 후 즉시 연결. 4G/5G 지원, HKD 결제, 구매 즉시 QR코드 수령. 일본·한국·태국·유럽 eSIM 완비.",
      keywords: [
        "여행 eSIM",
        "글로벌 eSIM",
        "eSIM 해외",
        "일본 eSIM",
      ],
    },
    th: {
      title: "SIM uncle - eSIM ทั่วโลก | รองรับ 200+ ประเทศ",
      description:
        "ซื้อ eSIM สำหรับท่องเที่ยวกว่า 200 ประเทศและภูมิภาค ไม่ต้องเปลี่ยนซิม \u2014 สแกน QR Code แล้วเชื่อมต่อได้ทันที รองรับ 4G/5G ชำระเป็น HKD รับ QR Code ทันทีหลังซื้อ มี eSIM ญี่ปุ่น เกาหลี ยุโรป และอื่นๆ",
      keywords: [
        "eSIM ท่องเที่ยว",
        "eSIM ทั่วโลก",
        "eSIM ต่างประเทศ",
        "eSIM ญี่ปุ่น",
      ],
    },
  },
  products: {
    "zh-TW": {
      title: "eSIM 方案 - 全球旅遊數據卡 | SIM uncle",
      description:
        "瀏覽 18,000+ 款全球 eSIM 方案，包括日本、韓國、泰國、台灣、歐洲、美國等熱門目的地。按地區、數據量、有效期篩選，找到最適合你的旅遊上網卡。",
      keywords: [
        "eSIM 方案",
        "旅遊數據卡",
        "全球 eSIM 方案",
        "海外上網",
      ],
    },
    "zh-CN": {
      title: "eSIM 方案 - 全球旅游数据卡 | SIM uncle",
      description:
        "浏览 18,000+ 款全球 eSIM 方案，包括日本、韩国、泰国、台湾、欧洲、美国等热门目的地。按地区、流量、有效期筛选，找到最适合你的旅游上网卡。",
      keywords: [
        "eSIM 方案",
        "旅游数据卡",
        "全球 eSIM 方案",
        "海外上网",
      ],
    },
    en: {
      title: "eSIM Plans - Global Travel Data | SIM uncle",
      description:
        "Browse 18,000+ global eSIM plans for Japan, Korea, Thailand, Taiwan, Europe, USA and more. Filter by region, data size, and validity. Find the best travel eSIM for your trip.",
      keywords: [
        "eSIM plans",
        "travel data card",
        "global eSIM plans",
        "buy travel eSIM",
      ],
    },
    ja: {
      title: "eSIMプラン - グローバルトラベルデータ | SIM uncle",
      description:
        "18,000以上のグローバルeSIMプランを検索。日本・韓国・タイ・台湾・ヨーロッパ・アメリカなど人気の目的地に対応。地域・データ量・有効期限で絞り込んで最適なトラベルeSIMを見つけましょう。",
      keywords: [
        "eSIM プラン",
        "トラベルデータ",
        "グローバルeSIM プラン",
        "eSIM 購入",
      ],
    },
    ko: {
      title: "eSIM 요금제 - 글로벌 여행 데이터 | SIM uncle",
      description:
        "18,000개 이상의 글로벌 eSIM 요금제를 검색하세요. 일본·한국·태국·대만·유럽·미국 등 인기 목적지 지원. 지역·데이터 용량·유효기간으로 필터링하여 최적의 여행 eSIM을 찾아보세요.",
      keywords: [
        "eSIM 요금제",
        "여행 데이터",
        "글로벌 eSIM 요금제",
        "eSIM 구매",
      ],
    },
    th: {
      title: "แผน eSIM - ข้อมูลท่องเที่ยวทั่วโลก | SIM uncle",
      description:
        "ค้นหาแผน eSIM กว่า 18,000 รายการ สำหรับญี่ปุ่น เกาหลี ไทย ไต้หวัน ยุโรป สหรัฐอเมริกา และอื่นๆ กรองตามภูมิภาค ขนาดข้อมูล และระยะเวลาใช้งาน เพื่อค้นหา eSIM ที่เหมาะสมที่สุด",
      keywords: [
        "แผน eSIM",
        "ข้อมูลท่องเที่ยว",
        "แผน eSIM ทั่วโลก",
        "ซื้อ eSIM",
      ],
    },
  },
  howToInstall: {
    "zh-TW": {
      title: "eSIM 安裝教學 - iPhone / Android 設定指南 | SIM uncle",
      description:
        "詳細圖文教學：如何在 iPhone 及 Android 手機安裝 eSIM。掃描 QR Code 即可完成設定，出發前 5 分鐘搞掂。",
      keywords: [
        "eSIM 安裝教學",
        "iPhone eSIM 設定",
        "Android eSIM 設定",
        "eSIM QR Code",
      ],
    },
    "zh-CN": {
      title: "eSIM 安装教程 - iPhone / Android 设置指南 | SIM uncle",
      description:
        "详细图文教程：如何在 iPhone 及 Android 手机安装 eSIM。扫描 QR Code 即可完成设置，出发前 5 分钟搞定。",
      keywords: [
        "eSIM 安装教程",
        "iPhone eSIM 设置",
        "Android eSIM 设置",
        "eSIM QR Code",
      ],
    },
    en: {
      title: "How to Install eSIM - iPhone & Android Guide | SIM uncle",
      description:
        "Step-by-step guide to install eSIM on iPhone and Android. Scan the QR code and connect in minutes before your trip.",
      keywords: [
        "how to install eSIM",
        "eSIM setup",
        "iPhone eSIM",
        "Android eSIM",
        "eSIM QR code",
      ],
    },
    ja: {
      title: "eSIMインストール方法 - iPhone / Android 設定ガイド | SIM uncle",
      description:
        "iPhoneとAndroidへのeSIMインストール手順を図解で詳しく説明。QRコードをスキャンするだけで数分で接続完了。出発前に5分で設定できます。",
      keywords: [
        "eSIM インストール",
        "eSIM 設定",
        "iPhone eSIM",
        "Android eSIM",
        "eSIM QRコード",
      ],
    },
    ko: {
      title: "eSIM 설치 방법 - iPhone / Android 설정 가이드 | SIM uncle",
      description:
        "iPhone과 Android에 eSIM을 설치하는 단계별 가이드. QR코드를 스캔하면 몇 분 만에 연결 완료. 출발 전 5분 안에 설정 가능합니다.",
      keywords: [
        "eSIM 설치",
        "eSIM 설정",
        "iPhone eSIM",
        "Android eSIM",
        "eSIM QR코드",
      ],
    },
    th: {
      title: "วิธีติดตั้ง eSIM - คู่มือ iPhone / Android | SIM uncle",
      description:
        "คู่มือติดตั้ง eSIM บน iPhone และ Android แบบทีละขั้นตอน สแกน QR Code แล้วเชื่อมต่อได้ภายในไม่กี่นาที ตั้งค่าได้ภายใน 5 นาทีก่อนออกเดินทาง",
      keywords: [
        "ติดตั้ง eSIM",
        "ตั้งค่า eSIM",
        "iPhone eSIM",
        "Android eSIM",
        "eSIM QR Code",
      ],
    },
  },
  trackOrder: {
    "zh-TW": {
      title: "查詢訂單 - 追蹤你的 eSIM 訂單 | SIM uncle",
      description:
        "輸入訂單號碼或電郵地址查詢你的 eSIM 訂單狀態，取得 QR Code 及數據用量資訊。",
      keywords: ["查詢訂單", "eSIM 訂單", "訂單追蹤", "QR Code"],
    },
    "zh-CN": {
      title: "查询订单 - 追踪你的 eSIM 订单 | SIM uncle",
      description:
        "输入订单号码或电邮地址查询你的 eSIM 订单状态，获取 QR Code 及流量使用信息。",
      keywords: ["查询订单", "eSIM 订单", "订单追踪"],
    },
    en: {
      title: "Track Order - Check Your eSIM Order Status | SIM uncle",
      description:
        "Enter your order number or email to check your eSIM order status, retrieve your QR code, and view data usage.",
      keywords: ["track order", "eSIM order", "order status", "QR code"],
    },
    ja: {
      title: "注文確認 - eSIM注文ステータスを確認 | SIM uncle",
      description:
        "注文番号またはメールアドレスを入力してeSIM注文のステータスを確認、QRコードの取得、データ使用量の確認ができます。",
      keywords: ["注文確認", "eSIM 注文", "注文ステータス", "QRコード"],
    },
    ko: {
      title: "주문 조회 - eSIM 주문 상태 확인 | SIM uncle",
      description:
        "주문 번호 또는 이메일을 입력하여 eSIM 주문 상태를 확인하고 QR코드를 받아보세요. 데이터 사용량도 확인 가능합니다.",
      keywords: ["주문 조회", "eSIM 주문", "주문 상태", "QR코드"],
    },
    th: {
      title: "ตรวจสอบคำสั่งซื้อ - ตรวจสอบสถานะ eSIM | SIM uncle",
      description:
        "กรอกหมายเลขคำสั่งซื้อหรืออีเมลเพื่อตรวจสอบสถานะ eSIM รับ QR Code และดูข้อมูลการใช้งานข้อมูล",
      keywords: ["ตรวจสอบคำสั่งซื้อ", "eSIM คำสั่งซื้อ", "สถานะคำสั่งซื้อ", "QR Code"],
    },
  },
};

type PageKey = keyof typeof SEO_CONTENT;

interface PageSEOProps extends SEOProps {
  page: PageKey;
}

/** Full page SEO component with per-page, per-language content */
export function PageSEO({ page, path = "", jsonLd, ogImage }: PageSEOProps) {
  const { language } = useLanguage();
  const langKey = (["zh-TW", "zh-CN", "en", "ja", "ko", "th"] as const).includes(language as "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th") ? language as "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th" : "en";
  const pageContent = SEO_CONTENT[page] as Record<string, { title: string; description: string; keywords: string[] }>;
  const content = pageContent[langKey] ?? pageContent["en"];
  const canonicalUrl = `${BASE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  const allKeywords = [
    ...content.keywords,
    "eSIM",
    "SIM uncle",
    "SIMuncle",
    "esimuncle",
  ].join(", ");

  return (
    <Helmet>
      <html lang={language} />
      <title>{content.title}</title>
      <meta name="description" content={content.description} />
      <meta name="keywords" content={allKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang for multilingual */}
      <link rel="alternate" hrefLang="zh-TW" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="zh-CN" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="en" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="ja" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="ko" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="th" href={`${BASE_URL}${path}`} />
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${path}`} />

      {/* Open Graph */}
      <meta property="og:title" content={content.title} />
      <meta property="og:description" content={content.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1424" />
      <meta property="og:image:height" content="752" />
      <meta
        property="og:image:alt"
        content="SIM uncle eSIM - 一鍵開啟，探索全球"
      />
      <meta property="og:locale" content={language === "en" ? "en_US" : language === "zh-CN" ? "zh_CN" : language === "ja" ? "ja_JP" : language === "ko" ? "ko_KR" : language === "th" ? "th_TH" : "zh_TW"} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={content.title} />
      <meta name="twitter:description" content={content.description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        Array.isArray(jsonLd)
          ? (jsonLd as object[]).map((item, i) => (
              <script key={i} type="application/ld+json">
                {JSON.stringify(item)}
              </script>
            ))
          : (
              <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
              </script>
            )
      )}
    </Helmet>
  );
}

/** Truncate a string to maxLen chars, appending '…' if needed */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trimEnd() + "\u2026";
}

/** Lightweight SEO for custom title/description (e.g. product detail pages) */
export function CustomSEO({
  title,
  description,
  path = "",
  keywords = [],
  ogImage,
  jsonLd,
}: SEOProps) {
  const { language } = useLanguage();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = `${BASE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;
  // Truncate description to ≤158 chars to avoid SE Ranking "description too long" warning
  const safeDescription = description ? truncate(description, 158) : undefined;

  return (
    <Helmet>
      <html lang={language} />
      <title>{fullTitle}</title>
      {safeDescription && <meta name="description" content={safeDescription} />}
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      {safeDescription && (
        <meta property="og:description" content={safeDescription} />
      )}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {safeDescription && (
        <meta name="twitter:description" content={safeDescription} />
      )}
      <meta name="twitter:image" content={image} />
      {jsonLd && (
        Array.isArray(jsonLd)
          ? (jsonLd as object[]).map((item, i) => (
              <script key={i} type="application/ld+json">
                {JSON.stringify(item)}
              </script>
            ))
          : (
              <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
              </script>
            )
      )}
    </Helmet>
  );
}
