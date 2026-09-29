/**
 * ProductInfoCard
 * A visually rich banner card displayed at the top of each product detail page.
 * Design: white/light-green card with brand green accents — matches the site theme.
 */

import { Wifi, Clock, Globe, Gauge, Share2, Zap } from "lucide-react";
import type { Language } from "@/contexts/LanguageContext";

interface ProductInfoCardProps {
  planName: string;
  dataLabel: string;
  validityDays: number;
  isNaturalDay?: boolean;
  networkType?: string;
  countriesCount: number;
  throttleSpeed?: string | null;
  hotspotAvailable?: boolean | null;
  language: Language;
  countryNames?: string[];
}

const LABELS: Record<Language, {
  data: string; validity: string; days: string; calDays: string;
  countries: string; countriesUnit: string; network: string;
  throttle: string; hotspot: string; hotspotYes: string; hotspotNo: string;
}> = {
  "zh-TW": {
    data: "數據",
    validity: "有效期",
    days: "天",
    calDays: "日曆天",
    countries: "覆蓋地區",
    countriesUnit: "個國家/地區",
    network: "網絡",
    throttle: "限速後",
    hotspot: "熱點分享",
    hotspotYes: "支援",
    hotspotNo: "不支援",
  },
  "zh-CN": {
    data: "数据",
    validity: "有效期",
    days: "天",
    calDays: "日历天",
    countries: "覆盖地区",
    countriesUnit: "个国家/地区",
    network: "网络",
    throttle: "限速后",
    hotspot: "热点共享",
    hotspotYes: "支持",
    hotspotNo: "不支持",
  },
  en: {
    data: "Data",
    validity: "Validity",
    days: "Days",
    calDays: "Cal. Days",
    countries: "Coverage",
    countriesUnit: "Countries",
    network: "Network",
    throttle: "After Cap",
    hotspot: "Hotspot",
    hotspotYes: "Supported",
    hotspotNo: "Not Supported",
  },
  ja: {
    data: "データ",
    validity: "有効期限",
    days: "日間",
    calDays: "暦日",
    countries: "対応エリア",
    countriesUnit: "カ国/地域",
    network: "ネットワーク",
    throttle: "制限後",
    hotspot: "テザリング",
    hotspotYes: "対応",
    hotspotNo: "非対応",
  },
  ko: {
    data: "데이터",
    validity: "유효기간",
    days: "일",
    calDays: "달력일",
    countries: "커버리지",
    countriesUnit: "개국/지역",
    network: "네트워크",
    throttle: "제한 후",
    hotspot: "핫스팟",
    hotspotYes: "지원",
    hotspotNo: "미지원",
  },
  th: {
    data: "ข้อมูล",
    validity: "ระยะเวลา",
    days: "วัน",
    calDays: "วันปฏิทิน",
    countries: "ครอบคลุม",
    countriesUnit: "ประเทศ/ภูมิภาค",
    network: "เครือข่าย",
    throttle: "หลังจำกัด",
    hotspot: "ฮอตสปอต",
    hotspotYes: "รองรับ",
    hotspotNo: "ไม่รองรับ",
  },
};

export function ProductInfoCard({
  planName,
  dataLabel,
  validityDays,
  isNaturalDay = false,
  networkType = "4G/5G",
  countriesCount,
  throttleSpeed,
  hotspotAvailable,
  language,
  countryNames = [],
}: ProductInfoCardProps) {
  const L = LABELS[language] ?? LABELS["zh-TW"];
  const daysLabel = isNaturalDay ? L.calDays : L.days;

  const specs: { icon: React.ReactNode; label: string; value: string; primary?: boolean }[] = [
    { icon: <Wifi className="w-4 h-4" />, label: L.data, value: dataLabel, primary: true },
    { icon: <Clock className="w-4 h-4" />, label: L.validity, value: `${validityDays} ${daysLabel}`, primary: true },
    {
      icon: <Globe className="w-4 h-4" />,
      label: L.countries,
      value: countriesCount > 1
        ? `${countriesCount} ${L.countriesUnit}`
        : (countryNames[0] ?? `${countriesCount} ${L.countriesUnit}`),
    },
    { icon: <Zap className="w-4 h-4" />, label: L.network, value: networkType },
  ];

  if (throttleSpeed) {
    specs.push({ icon: <Gauge className="w-4 h-4" />, label: L.throttle, value: throttleSpeed });
  }

  if (hotspotAvailable !== null && hotspotAvailable !== undefined) {
    specs.push({
      icon: <Share2 className="w-4 h-4" />,
      label: L.hotspot,
      value: hotspotAvailable ? L.hotspotYes : L.hotspotNo,
      primary: hotspotAvailable,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Top accent strip */}
      <div className="h-1.5 w-full bg-primary" />

      <div className="p-5 sm:p-6">
        {/* Spec grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {specs.map((spec, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 rounded-xl px-3 py-3 border ${
                spec.primary
                  ? "bg-primary/8 border-primary/20"
                  : "bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className={spec.primary ? "text-primary" : "text-muted-foreground"}>
                  {spec.icon}
                </span>
                <span>{spec.label}</span>
              </div>
              <span
                className={`text-sm font-semibold leading-snug ${
                  spec.primary ? "text-primary" : "text-foreground"
                }`}
              >
                {spec.value}
              </span>
            </div>
          ))}
        </div>

        {/* Country chips */}
        {countryNames.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {countryNames.slice(0, 8).map((name, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border"
              >
                {name}
              </span>
            ))}
            {countryNames.length > 8 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                +{countryNames.length - 8}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
