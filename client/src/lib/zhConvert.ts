import * as OpenCC from "opencc-js";
import type { Language } from "@/contexts/LanguageContext";

// Simplified -> Traditional (Hong Kong) converter.
// Many provider/custom product names are stored in Simplified Chinese.
// When the UI language is zh-TW we convert them so the page stays fully Traditional.
const s2tConverter = OpenCC.Converter({ from: "cn", to: "hk" });

/**
 * Convert a string to Traditional Chinese (HK) when the display language is zh-TW.
 * For all other languages the input is returned unchanged.
 */
export function toDisplayChinese(
  text: string | null | undefined,
  lang: Language
): string {
  if (!text) return "";
  if (lang !== "zh-TW") return text;
  try {
    return s2tConverter(text);
  } catch {
    return text;
  }
}
