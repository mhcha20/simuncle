/**
 * Scan all products in DB, extract coverage table country names,
 * and report which ones cannot be translated (no ISO code found).
 * Run: npx tsx scripts/scan_untranslated_countries.ts
 */
import { getDb } from "../server/db";
import { productsCache } from "../drizzle/schema";
import { isNotNull } from "drizzle-orm";

// We need to parse nameToEntry from the TS source
// Since we can't import the frontend file directly, we'll rebuild the lookup from the raw data
import { countryNameMap } from "../client/src/lib/countryNames";

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB not available"); return; }
  console.log("Fetching products with descriptions...");
  const products = await db
    .select({ id: productsCache.id, name: productsCache.name, description: productsCache.description })
    .from(productsCache)
    .where(isNotNull(productsCache.description))
    .limit(5000);

  console.log(`Found ${products.length} products with descriptions`);

  // Build nameToEntry from countryNameMap
  const nameToEntry: Record<string, { id: string }> = {};
  for (const [id, entry] of Object.entries(countryNameMap)) {
    nameToEntry[entry.en.toLowerCase()] = { id };
  }
  // Add known aliases
  const aliases: Record<string, string> = {
    "macau": "MO", "macau (china)": "MO", "macao (china)": "MO",
    "czech": "CZ", "czech republic": "CZ", "usa": "US",
    "united states of america": "US", "mongolia": "MN",
    "myanmar": "MM", "brunei": "BN", "cambodia": "KH",
    "laos": "LA", "south africa": "ZA", "ivory coast": "CI",
    "kosovo": "XK", "eswatini": "SZ", "cape verde": "CV",
    "east timor": "TL", "timor-leste": "TL",
  };
  for (const [alias, id] of Object.entries(aliases)) {
    nameToEntry[alias] = { id };
  }

  const untranslated = new Map<string, number>(); // name -> count
  const translated = new Set<string>();

  const entryRegex = /^\s*(.+?)-(.+?)[，,]\s*Network-([^，,]+)[，,]\s*APN-(.+?)\s*$/i;

  for (const p of products) {
    const desc = p.description ?? "";
    // Strip HTML tags and normalise whitespace
    const cleaned = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    // Only look at the part after the "Coverage and Operator" marker if present
    const markerMatch = cleaned.match(/(?:Coverage and Operator|覆蓋範圍及營運商|覆盖范围及运营商)[：:]\s*(.*)$/i);
    const coverageText = markerMatch ? markerMatch[1] : cleaned;

    for (const part of coverageText.split(/[；;]/)) {
      const seg = part.trim();
      if (!seg) continue;
      const em = seg.match(entryRegex);
      if (!em) continue;
      const countryRaw = em[1].trim();
      const lc = countryRaw.toLowerCase();
      if (!countryRaw || countryRaw.length > 32) continue;
      if (/kbps|speed|hotspot|data |after|cap/i.test(lc)) continue;

      // Try lookup: strip "(China)" etc.
      const lookupKey = countryRaw.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();
      const found = nameToEntry[lookupKey] ?? nameToEntry[lc];

      if (found) {
        translated.add(countryRaw);
      } else {
        untranslated.set(countryRaw, (untranslated.get(countryRaw) ?? 0) + 1);
      }
    }
  }

  console.log(`\n✅ Translated: ${translated.size} unique names`);
  console.log(`❌ Untranslated: ${untranslated.size} unique names\n`);

  // Sort by count desc
  const sorted = [...untranslated.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`  [${count}x] "${name}"`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
