import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

type Section = { heading: string; body: string[] };
type Copy = { title: string; updated: string; back: string; intro: string; sections: Section[] };

const CONTACT = "support@simuncle.com";

const EN: Copy = {
  title: "Privacy Policy",
  updated: "Last updated: 30 September 2026",
  back: "Back to home",
  intro:
    "SIM uncle (\"we\", \"us\") operates simuncle.com, an online shop for travel eSIM data plans. This policy explains what personal information we collect, why, and the choices you have.",
  sections: [
    {
      heading: "Information we collect",
      body: [
        "Account details: your email address and name when you sign in with Google or an emailed sign-in link.",
        "Order details: the plan you buy, price, order and payment status, the email address used for checkout, and the eSIM details we receive from our suppliers (such as the QR code, activation code, ICCID and data usage).",
        "Payment details: payments are processed by Stripe. We never see or store your full card number.",
        "Technical and usage data: IP address, browser and device type, pages viewed and search terms, collected through cookies, local storage and analytics tools.",
        "Notifications: if you allow browser notifications, your push subscription details.",
        "Support messages: messages you send to our AI assistant or by email or WhatsApp.",
        "Referrals: if you use or share a referral code, we record the code and any resulting commission.",
      ],
    },
    {
      heading: "How we use it",
      body: [
        "To deliver your eSIM, show your orders and usage, and send order confirmations, payment reminders and expiry or low-data notices.",
        "To provide customer support and prevent fraud or misuse.",
        "To run our referral programme and pay commissions.",
        "To understand how the site is used and improve it.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We do not sell your personal information. We share it only with service providers that help us run the shop:",
        "Stripe (payments); eSIM suppliers Vizlync and TGT Technology Global (to create and manage your eSIM); Resend (email delivery); Google (sign-in, analytics and tag management); Cloudflare (file storage); Railway (hosting and database); and an AI provider that processes messages you send to our AI assistant and helps translate site content.",
        "We may also disclose information when required by law.",
      ],
    },
    {
      heading: "Cookies and local storage",
      body: [
        "We use a sign-in cookie to keep you logged in, and browser storage to remember preferences such as language, currency and recently viewed destinations. Analytics tools may set their own cookies. You can block cookies in your browser settings, but sign-in may then stop working.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep account and order records for as long as needed to provide the service, handle support requests and meet legal, tax and accounting obligations, and then delete or anonymise them.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        `You can ask us to access, correct or delete your personal information, or withdraw consent to notifications, by emailing ${CONTACT}. You can turn off push notifications in your browser at any time.`,
      ],
    },
    {
      heading: "Children",
      body: ["Our service is not directed at children under 16, and we do not knowingly collect their information."],
    },
    {
      heading: "Changes to this policy",
      body: ["We may update this policy from time to time. The date above shows the latest version."],
    },
    {
      heading: "Contact us",
      body: [`Questions about this policy: ${CONTACT}`],
    },
  ],
};

const ZH_TW: Copy = {
  title: "私隱政策",
  updated: "最後更新：2026 年 9 月 30 日",
  back: "返回首頁",
  intro:
    "SIM uncle（「我們」）經營 simuncle.com，提供旅遊 eSIM 數據方案。本政策說明我們收集哪些個人資料、用途，以及你可以作出的選擇。",
  sections: [
    {
      heading: "我們收集的資料",
      body: [
        "帳戶資料：以 Google 或電郵登入連結登入時，我們會取得你的電郵地址及姓名。",
        "訂單資料：你購買的方案、價錢、訂單及付款狀態、結帳所用電郵，以及供應商提供的 eSIM 資料（例如 QR Code、啟用碼、ICCID 及數據用量）。",
        "付款資料：付款由 Stripe 處理，我們不會取得或儲存你的完整信用卡號碼。",
        "技術及使用資料：IP 位址、瀏覽器及裝置類型、瀏覽頁面及搜尋字詞，透過 Cookie、瀏覽器儲存空間及分析工具收集。",
        "通知：如你允許瀏覽器通知，我們會儲存你的推播訂閱資料。",
        "客戶支援訊息：你向 AI 客服、電郵或 WhatsApp 發送的訊息。",
        "推薦計劃：如你使用或分享推薦碼，我們會記錄推薦碼及相關佣金。",
      ],
    },
    {
      heading: "我們如何使用",
      body: [
        "交付你的 eSIM、顯示訂單及用量，並發送訂單確認、付款提醒、到期及低用量通知。",
        "提供客戶支援，並防止欺詐或濫用。",
        "營運推薦計劃及支付佣金。",
        "了解網站使用情況並作出改善。",
      ],
    },
    {
      heading: "我們與誰分享",
      body: [
        "我們不會出售你的個人資料。我們只會與協助營運商店的服務供應商分享：",
        "Stripe（付款）；eSIM 供應商 Vizlync 及 TGT Technology Global（建立及管理你的 eSIM）；Resend（電郵發送）；Google（登入、分析及標籤管理）；Cloudflare（檔案儲存）；Railway（主機及資料庫）；以及處理你向 AI 客服所發訊息、協助翻譯網站內容的 AI 服務供應商。",
        "如法律要求，我們亦可能披露有關資料。",
      ],
    },
    {
      heading: "Cookie 及瀏覽器儲存",
      body: [
        "我們使用登入 Cookie 令你保持登入，並用瀏覽器儲存空間記住語言、貨幣及最近瀏覽的目的地等偏好。分析工具可能設定自己的 Cookie。你可在瀏覽器設定中封鎖 Cookie，但登入功能可能因此失效。",
      ],
    },
    {
      heading: "保存期限",
      body: ["我們會在提供服務、處理支援查詢及符合法律、稅務及會計要求所需的期間內保存帳戶及訂單記錄，其後刪除或匿名化。"],
    },
    {
      heading: "你的選擇",
      body: [
        `你可以透過電郵 ${CONTACT} 要求查閱、更正或刪除你的個人資料，或撤回通知同意。你亦可隨時在瀏覽器關閉推播通知。`,
      ],
    },
    { heading: "兒童", body: ["我們的服務並非針對 16 歲以下兒童，亦不會故意收集他們的資料。"] },
    { heading: "政策修訂", body: ["我們可能不時更新本政策，上方日期為最新版本。"] },
    { heading: "聯絡我們", body: [`如對本政策有任何疑問：${CONTACT}`] },
  ],
};

const ZH_CN: Copy = {
  title: "隐私政策",
  updated: "最后更新：2026 年 9 月 30 日",
  back: "返回首页",
  intro:
    "SIM uncle（“我们”）运营 simuncle.com，提供旅游 eSIM 数据方案。本政策说明我们收集哪些个人信息、用途，以及你可以作出的选择。",
  sections: [
    {
      heading: "我们收集的信息",
      body: [
        "账户信息：以 Google 或邮件登录链接登录时，我们会获取你的邮箱地址及姓名。",
        "订单信息：你购买的方案、价格、订单及付款状态、结账所用邮箱，以及供应商提供的 eSIM 信息（例如 QR Code、激活码、ICCID 及流量使用情况）。",
        "付款信息：付款由 Stripe 处理，我们不会获取或存储你的完整银行卡号。",
        "技术及使用数据：IP 地址、浏览器及设备类型、浏览页面及搜索词，通过 Cookie、浏览器存储及分析工具收集。",
        "通知：如你允许浏览器通知，我们会保存你的推送订阅信息。",
        "客服消息：你向 AI 客服、邮件或 WhatsApp 发送的消息。",
        "推荐计划：如你使用或分享推荐码，我们会记录推荐码及相关佣金。",
      ],
    },
    {
      heading: "我们如何使用",
      body: [
        "交付你的 eSIM、显示订单及用量，并发送订单确认、付款提醒、到期及低流量通知。",
        "提供客户支持，并防止欺诈或滥用。",
        "运营推荐计划并支付佣金。",
        "了解网站使用情况并加以改进。",
      ],
    },
    {
      heading: "我们与谁共享",
      body: [
        "我们不会出售你的个人信息。我们只会与协助运营商店的服务提供商共享：",
        "Stripe（付款）；eSIM 供应商 Vizlync 及 TGT Technology Global（创建及管理你的 eSIM）；Resend（邮件发送）；Google（登录、分析及标签管理）；Cloudflare（文件存储）；Railway（主机及数据库）；以及处理你向 AI 客服发送的消息、协助翻译网站内容的 AI 服务提供商。",
        "如法律要求，我们也可能披露相关信息。",
      ],
    },
    {
      heading: "Cookie 及浏览器存储",
      body: [
        "我们使用登录 Cookie 让你保持登录，并用浏览器存储记住语言、货币及最近浏览的目的地等偏好。分析工具可能设置自己的 Cookie。你可在浏览器设置中屏蔽 Cookie，但登录功能可能因此失效。",
      ],
    },
    {
      heading: "保存期限",
      body: ["我们会在提供服务、处理支持咨询及满足法律、税务及会计要求所需的期间内保存账户及订单记录，其后删除或匿名化。"],
    },
    {
      heading: "你的选择",
      body: [
        `你可以通过邮件 ${CONTACT} 要求查阅、更正或删除你的个人信息，或撤回通知同意。你也可随时在浏览器关闭推送通知。`,
      ],
    },
    { heading: "儿童", body: ["我们的服务并非面向 16 岁以下儿童，也不会故意收集他们的信息。"] },
    { heading: "政策修订", body: ["我们可能不时更新本政策，上方日期为最新版本。"] },
    { heading: "联系我们", body: [`如对本政策有任何疑问：${CONTACT}`] },
  ],
};

// Japanese, Korean and Thai visitors see the English text for now.
const COPY: Record<Language, Copy> = { "zh-TW": ZH_TW, "zh-CN": ZH_CN, en: EN, ja: EN, ko: EN, th: EN };

export default function Privacy() {
  const { language } = useLanguage();
  const c = COPY[language] ?? EN;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${c.title} | SIM uncle`}</title>
        <meta name="description" content={c.intro} />
        <link rel="canonical" href="https://simuncle.com/privacy" />
      </Helmet>
      <div className="container max-w-3xl py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" />
          {c.back}
        </Link>
        <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{c.updated}</p>
        <p className="leading-relaxed mb-8">{c.intro}</p>
        {c.sections.map(section => (
          <section key={section.heading} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{section.heading}</h2>
            <div className="space-y-3 leading-relaxed text-foreground/90">
              {section.body.map(p => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
