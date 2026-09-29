import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCurrencyContext, ALL_CURRENCIES } from "@/contexts/CurrencyContext";
import { Globe, DollarSign, Check, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LanguageCurrencyModalProps {
  open: boolean;
  onClose: () => void;
}

const LANGUAGES: { code: Language; label: string; region?: string }[] = [
  { code: "zh-TW", label: "繁體中文", region: "香港 / 台灣" },
  { code: "zh-CN", label: "简体中文", region: "中国大陆" },
  { code: "en", label: "English", region: "International" },
  { code: "ja", label: "日本語", region: "日本" },
  { code: "ko", label: "한국어", region: "한국" },
  { code: "th", label: "ภาษาไทย", region: "ไทย" },
];

// Group currencies for display
const CURRENCY_GROUPS = [
  {
    label: { "zh-TW": "亞洲", "zh-CN": "亚洲", en: "Asia", ja: "アジア", ko: "아시아", th: "เอเชีย" },
    codes: ["HKD", "TWD", "JPY", "KRW", "THB", "SGD", "MYR", "PHP", "IDR", "VND", "INR", "CNY", "MOP", "BDT", "LKR", "NPR", "PKR", "KHR", "LAK", "MMK"],
  },
  {
    label: { "zh-TW": "美洲", "zh-CN": "美洲", en: "Americas", ja: "アメリカ", ko: "아메리카", th: "อเมริกา" },
    codes: ["USD", "CAD", "AUD", "NZD", "BRL", "MXN"],
  },
  {
    label: { "zh-TW": "歐洲", "zh-CN": "欧洲", en: "Europe", ja: "ヨーロッパ", ko: "유럽", th: "ยุโรป" },
    codes: ["EUR", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "ISK"],
  },
  {
    label: { "zh-TW": "中東 / 非洲", "zh-CN": "中东 / 非洲", en: "Middle East / Africa", ja: "中東 / アフリカ", ko: "중동 / 아프리카", th: "ตะวันออกกลาง / แอฟริกา" },
    codes: ["AED", "SAR", "QAR", "KWD", "BHD", "JOD", "OMR", "EGP", "MAD", "ZAR", "MUR", "MGA"],
  },
  {
    label: { "zh-TW": "其他", "zh-CN": "其他", en: "Other", ja: "その他", ko: "기타", th: "อื่นๆ" },
    codes: ["TRY", "ILS", "FJD"],
  },
];

export function LanguageCurrencyModal({ open, onClose }: LanguageCurrencyModalProps) {
  const { language, setLanguage } = useLanguage();
  const { selectedCurrency, setCurrency } = useCurrencyContext();
  const [activeTab, setActiveTab] = useState<"language" | "currency">("language");
  const { data: ratesUpdatedData } = trpc.settings.getCurrencyRatesUpdatedAt.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const ratesUpdatedAt = ratesUpdatedData?.updatedAt;
  const ratesUpdatedLabel = ratesUpdatedAt
    ? new Date(ratesUpdatedAt).toLocaleDateString(language === "en" ? "en-US" : language === "zh-CN" ? "zh-CN" : language === "ja" ? "ja-JP" : language === "ko" ? "ko-KR" : language === "th" ? "th-TH" : "zh-TW", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const tabLabels = {
    language: { "zh-TW": "語言", "zh-CN": "语言", en: "Language", ja: "言語", ko: "언어", th: "ภาษา" },
    currency: { "zh-TW": "貨幣", "zh-CN": "货币", en: "Currency", ja: "通貨", ko: "통화", th: "สกุลเงิน" },
  };

  const currencyNameLabel = {
    "zh-TW": "nameCN",
    "zh-CN": "nameCN",
    en: "name",
    ja: "name",
    ko: "name",
    th: "name",
  } as const;

  const nameField = currencyNameLabel[language];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {activeTab === "language" ? tabLabels.language[language] : tabLabels.currency[language]}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 mt-3 shrink-0">
          <button
            onClick={() => setActiveTab("language")}
            className={`flex items-center gap-1.5 pb-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "language"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-4 h-4" />
            {tabLabels.language[language]}
          </button>
          <button
            onClick={() => setActiveTab("currency")}
            className={`flex items-center gap-1.5 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "currency"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            {tabLabels.currency[language]}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {activeTab === "language" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); onClose(); }}
                    className={`flex items-start justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "text-primary font-medium bg-primary/5"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{lang.label}</div>
                      {lang.region && (
                        <div className="text-xs text-muted-foreground mt-0.5">{lang.region}</div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {CURRENCY_GROUPS.map((group) => {
                const currencies = group.codes
                  .map((code) => ALL_CURRENCIES.find((c) => c.code === code))
                  .filter(Boolean) as typeof ALL_CURRENCIES;
                if (currencies.length === 0) return null;
                return (
                  <div key={group.codes[0]}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {group.label[language]}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {currencies.map((curr) => {
                        const isSelected = selectedCurrency === curr.code;
                        return (
                          <button
                            key={curr.code}
                            onClick={() => { setCurrency(curr.code); onClose(); }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                              isSelected
                                ? "text-primary font-medium bg-primary/5"
                                : "text-foreground hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono font-semibold text-muted-foreground w-8 shrink-0">
                                {curr.code}
                              </span>
                              <span className="text-sm truncate">
                                {curr[nameField]}
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Currency rates updated at hint */}
          {activeTab === "currency" && ratesUpdatedLabel && (
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                {language === "en" ? `Rates last updated: ${ratesUpdatedLabel}`
                  : language === "zh-CN" ? `汇率更新日期：${ratesUpdatedLabel}`
                  : language === "ja" ? `レート最終更新：${ratesUpdatedLabel}`
                  : language === "ko" ? `환율 최종 업데이트：${ratesUpdatedLabel}`
                  : language === "th" ? `อัปเดตอัตราล่าสุด：${ratesUpdatedLabel}`
                  : `匯率更新日期：${ratesUpdatedLabel}`}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
