import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HKT = "Asia/Hong_Kong"; // UTC+8

/** Map app language codes to BCP 47 locale tags for date/time formatting */
function toDateLocale(lang?: string): string {
  switch (lang) {
    case "zh-TW": return "zh-TW";
    case "zh-CN": return "zh-CN";
    case "en":    return "en-GB";
    case "ja":    return "ja-JP";
    case "ko":    return "ko-KR";
    case "th":    return "th-TH";
    default:      return "zh-HK";
  }
}

/** Format a timestamp as date only: e.g. "13/6/2026" */
export function formatDate(value: string | number | Date, lang?: string): string {
  return new Date(value).toLocaleDateString(toDateLocale(lang), {
    timeZone: HKT,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

/** Format a timestamp as time only: e.g. "下午11:59:59" */
export function formatTime(value: string | number | Date, lang?: string): string {
  return new Date(value).toLocaleTimeString(toDateLocale(lang), {
    timeZone: HKT,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Format a timestamp as date + time: e.g. "13/6/2026 下午11:59:59" */
export function formatDateTime(value: string | number | Date, lang?: string): string {
  return `${formatDate(value, lang)} ${formatTime(value, lang)}`;
}
