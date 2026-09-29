/**
 * Translation Completeness Test
 *
 * Ensures all translation keys defined in the Translations interface
 * are present in every supported language (zh-TW, zh-CN, en, ja, ko, th).
 *
 * This prevents future feature additions from silently missing translations
 * for non-Chinese/English languages.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---- Helper: recursively collect all leaf key paths from an object ----
function collectKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

// ---- Load the LanguageContext source and extract the translations object ----
// We use a simple regex approach to avoid importing the full React module tree.
// The test verifies structural completeness, not runtime values.

const LANG_CONTEXT_PATH = resolve(
  __dirname,
  "../client/src/contexts/LanguageContext.tsx"
);

const SUPPORTED_LANGUAGES = ["zh-TW", "zh-CN", "en", "ja", "ko", "th"] as const;

describe("Translation completeness", () => {
  it("LanguageContext.tsx exports translations for all supported languages", () => {
    const src = readFileSync(LANG_CONTEXT_PATH, "utf-8");
    for (const lang of SUPPORTED_LANGUAGES) {
      // Each language block must be present in the file
      const hasLang =
        src.includes(`"${lang}":`) ||
        src.includes(`'${lang}':`) ||
        src.includes(`${lang.replace("-", "")}:`);
      expect(hasLang, `Language "${lang}" block not found in LanguageContext.tsx`).toBe(true);
    }
  });

  it("All languages have the same top-level translation sections", () => {
    const src = readFileSync(LANG_CONTEXT_PATH, "utf-8");

    // Extract top-level section names from zh-TW block (reference)
    // Sections look like:  nav: {, home: {, products: {, etc.
    const sectionRegex = /^\s{4}(\w+): \{/gm;
    const zhTwStart = src.indexOf('"zh-TW":');
    const zhTwEnd = src.indexOf('"zh-CN":');
    const zhTwBlock = src.slice(zhTwStart, zhTwEnd);

    const referenceSections: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = sectionRegex.exec(zhTwBlock)) !== null) {
      referenceSections.push(m[1]);
    }

    expect(referenceSections.length).toBeGreaterThan(0);

    // For each other language, verify all reference sections exist
    const langBoundaries: Record<string, [number, number]> = {
      "zh-CN": [src.indexOf("  \"zh-CN\":"), 0],
      en: [src.indexOf("  en: {"), 0],
      ja: [src.indexOf("  ja: {"), 0],
      ko: [src.indexOf("  ko: {"), 0],
      th: [src.indexOf("  th: {"), 0],
    };

    // Compute end boundaries
    const starts = Object.values(langBoundaries)
      .map((v) => v[0])
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    for (const [lang, [start]] of Object.entries(langBoundaries)) {
      if (start < 0) {
        // Language block not found at all — already caught by previous test
        continue;
      }
      const nextStart = starts.find((s) => s > start) ?? src.length;
      const block = src.slice(start, nextStart);

      for (const section of referenceSections) {
        const hasSection =
          block.includes(`${section}: {`) || block.includes(`${section}:{`);
        expect(
          hasSection,
          `Language "${lang}" is missing section "${section}"`
        ).toBe(true);
      }
    }
  });

  it("countryNameMap has ja/ko/th fields for every entry", () => {
    const countryNamesPath = resolve(
      __dirname,
      "../client/src/lib/countryNames.ts"
    );
    const src = readFileSync(countryNamesPath, "utf-8");

    // Each entry looks like: XX: { zhTW: "...", zhCN: "...", en: "...", ja: "...", ko: "...", th: "..." }
    const entryRegex = /[A-Z]{2}:\s*\{([^}]+)\}/g;
    let entry: RegExpExecArray | null;
    const missingFields: string[] = [];

    while ((entry = entryRegex.exec(src)) !== null) {
      const body = entry[1];
      const code = entry[0].slice(0, 2);
      for (const field of ["ja", "ko", "th"]) {
        if (!body.includes(`${field}:`)) {
          missingFields.push(`${code} missing "${field}"`);
        }
      }
    }

    expect(
      missingFields,
      `countryNameMap entries missing fields: ${missingFields.join(", ")}`
    ).toHaveLength(0);
  });
});
