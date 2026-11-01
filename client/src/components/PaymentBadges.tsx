import { Lock } from "lucide-react";
import type { Language } from "@/contexts/LanguageContext";

// Payment methods Stripe Checkout offers on this site. Apple Pay / Google Pay appear
// automatically on supported devices; card brands depend on the Stripe account settings.
const SECURE_TEXT: Record<Language, string> = {
  "zh-TW": "經 Stripe 加密安全付款",
  "zh-CN": "经 Stripe 加密安全付款",
  en: "Secure, encrypted payment by Stripe",
  ja: "Stripeによる安全な暗号化決済",
  ko: "Stripe 보안 암호화 결제",
  th: "ชำระเงินปลอดภัยผ่าน Stripe",
};

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex h-7 min-w-[46px] items-center justify-center rounded-md border border-border bg-white px-1.5 shadow-sm"
    >
      {children}
    </span>
  );
}

export function PaymentBadges({ language, className = "", showSecureText = true }: { language: Language; className?: string; showSecureText?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge label="Visa">
          <svg viewBox="0 0 48 16" className="h-3.5" aria-hidden="true">
            <text x="24" y="13.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" fill="#1A1F71">VISA</text>
          </svg>
        </Badge>
        <Badge label="Mastercard">
          <svg viewBox="0 0 32 20" className="h-4" aria-hidden="true">
            <circle cx="12" cy="10" r="8" fill="#EB001B" />
            <circle cx="20" cy="10" r="8" fill="#F79E1B" />
            <path d="M16 3.07a8 8 0 0 1 0 13.86a8 8 0 0 1 0-13.86z" fill="#FF5F00" />
          </svg>
        </Badge>
        <Badge label="Apple Pay">
          <svg viewBox="0 0 50 20" className="h-4" aria-hidden="true">
            <path d="M10.6 5.3c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.2zm.9 1.4c-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.6 1.1 8.8.7 1.1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.3-.9-2.3-3.5c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3-1.9z" fill="#000" />
            <text x="33" y="15" textAnchor="middle" fontFamily="-apple-system, Helvetica, Arial, sans-serif" fontSize="12.5" fontWeight="600" fill="#000">Pay</text>
          </svg>
        </Badge>
        <Badge label="Google Pay">
          <svg viewBox="0 0 50 20" className="h-4" aria-hidden="true">
            <text x="2" y="15" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="700">
              <tspan fill="#4285F4">G</tspan>
            </text>
            <text x="31" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="12.5" fontWeight="600" fill="#5F6368">Pay</text>
          </svg>
        </Badge>
      </div>
      {showSecureText && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {SECURE_TEXT[language] ?? SECURE_TEXT["zh-TW"]}
        </p>
      )}
    </div>
  );
}
