import { ConverterFactory } from "opencc-js/core";
import type { Language } from "@/contexts/LanguageContext";
import { HK_VARIANTS, ST_CHARACTERS, ST_PHRASES } from "./zhS2HK.dict";

// Simplified -> Traditional (Hong Kong) converter.
// Many provider/custom product names are stored in Simplified Chinese.
// When the UI language is zh-TW we convert them so the page stays fully Traditional.
// Uses a trimmed dictionary (see scripts/build-zh-dict.mjs) instead of the 1 MB full one.
const s2tConverter = ConverterFactory([ST_PHRASES, ST_CHARACTERS], [HK_VARIANTS]);

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
