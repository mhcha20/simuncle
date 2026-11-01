import { Link } from "wouter";
import { Search, Mail, Plane, ChevronRight } from "lucide-react";
import type { Language } from "@/contexts/LanguageContext";
import { PaymentBadges } from "./PaymentBadges";

type Copy = { title: string; subtitle: string; steps: [string, string][]; guide: string };

const COPY: Record<Language, Copy> = {
  "zh-TW": {
    title: "三步即用",
    subtitle: "唔使換 SIM 卡，出發前幾分鐘搞掂",
    steps: [
      ["揀方案、付款", "搜尋目的地，揀啱天數同數據量，經 Stripe 安全付款。"],
      ["即時收到 QR Code", "付款後 QR Code 即時寄到電郵，亦可喺「我的訂單」查看。"],
      ["掃碼，落機即上網", "出發前用手機掃碼安裝，到埗開啟數據漫遊即可上網。"],
    ],
    guide: "睇安裝教學",
  },
  "zh-CN": {
    title: "三步即用",
    subtitle: "无需换 SIM 卡，出发前几分钟搞定",
    steps: [
      ["选方案、付款", "搜索目的地，选择合适的天数和流量，经 Stripe 安全付款。"],
      ["即时收到二维码", "付款后二维码即时发送到邮箱，也可在「我的订单」查看。"],
      ["扫码，落地即上网", "出发前用手机扫码安装，抵达后开启数据漫游即可上网。"],
    ],
    guide: "查看安装教程",
  },
  en: {
    title: "Ready in 3 steps",
    subtitle: "No SIM swap. Set up in minutes before you fly.",
    steps: [
      ["Pick a plan & pay", "Search your destination, choose days and data, and pay securely with Stripe."],
      ["Get your QR code instantly", "Your QR code is emailed right after payment and is always in My Orders."],
      ["Scan, land, connect", "Install by scanning before you go, then turn on data roaming when you land."],
    ],
    guide: "Installation guide",
  },
  ja: {
    title: "3ステップで利用開始",
    subtitle: "SIMの差し替え不要。出発前の数分で設定完了",
    steps: [
      ["プランを選んで支払う", "渡航先を検索し、日数とデータ量を選んでStripeで安全に決済。"],
      ["QRコードをすぐ受信", "決済後すぐにQRコードをメールでお届け。「注文履歴」でも確認できます。"],
      ["スキャンして到着後すぐ接続", "出発前にQRコードを読み取って設定し、到着後にデータローミングをオン。"],
    ],
    guide: "設定ガイドを見る",
  },
  ko: {
    title: "3단계로 바로 사용",
    subtitle: "SIM 교체 없이 출발 전 몇 분이면 완료",
    steps: [
      ["요금제 선택 및 결제", "여행지를 검색하고 기간과 데이터를 골라 Stripe로 안전하게 결제하세요."],
      ["QR 코드 즉시 수신", "결제 후 QR 코드가 이메일로 바로 발송되며 '내 주문'에서도 볼 수 있습니다."],
      ["스캔 후 도착하면 연결", "출발 전 QR 코드를 스캔해 설치하고 도착 후 데이터 로밍을 켜세요."],
    ],
    guide: "설치 가이드 보기",
  },
  th: {
    title: "ใช้งานได้ใน 3 ขั้นตอน",
    subtitle: "ไม่ต้องเปลี่ยนซิม ตั้งค่าได้ในไม่กี่นาทีก่อนเดินทาง",
    steps: [
      ["เลือกแพ็กเกจและชำระเงิน", "ค้นหาปลายทาง เลือกจำนวนวันและดาต้า แล้วชำระเงินอย่างปลอดภัยผ่าน Stripe"],
      ["รับ QR Code ทันที", "QR Code จะส่งไปที่อีเมลทันทีหลังชำระเงิน และดูได้ใน \"คำสั่งซื้อของฉัน\""],
      ["สแกน ถึงแล้วใช้ได้เลย", "สแกนติดตั้งก่อนเดินทาง แล้วเปิดโรมมิ่งข้อมูลเมื่อถึงปลายทาง"],
    ],
    guide: "ดูวิธีติดตั้ง",
  },
};

const ICONS = [Search, Mail, Plane];

export function HowItWorks({ language }: { language: Language }) {
  const c = COPY[language] ?? COPY["zh-TW"];
  return (
    <section className="py-14 bg-secondary/40">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">{c.title}</h2>
          <p className="text-muted-foreground">{c.subtitle}</p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {c.steps.map(([title, desc], i) => {
            const Icon = ICONS[i];
            return (
              <li key={title} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-3 rounded-2xl border border-border bg-white p-5 md:text-center">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex flex-col items-center gap-4">
          <PaymentBadges language={language} />
          <Link href="/how-to-install" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
            {c.guide} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
