import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

// Session-level dismissed state (resets on page reload)
const dismissedIds = new Set<number>();

export function AnnouncementBanner() {
  const { language } = useLanguage();
  const { data: announcement } = trpc.announcements.getActive.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // refresh every 5 minutes
  });
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || dismissed || dismissedIds.has(announcement.id)) return null;

  const message =
    language === "zh-TW"
      ? (announcement.messageZhTW ?? announcement.message)
      : language === "zh-CN"
        ? (announcement.messageZhCN ?? announcement.message)
        : announcement.message;

  const handleDismiss = () => {
    dismissedIds.add(announcement.id);
    setDismissed(true);
  };

  return (
    <div
      className="relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium"
      style={{ backgroundColor: announcement.bgColor, color: announcement.textColor }}
    >
      <span>{message}</span>
      {announcement.link && (
        <a
          href={announcement.link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
        >
          {announcement.linkText ?? "了解更多"}
        </a>
      )}
      <button
        onClick={handleDismiss}
        aria-label="關閉公告"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: announcement.textColor }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
