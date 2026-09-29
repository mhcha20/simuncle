/**
 * Bing IndexNow integration
 *
 * IndexNow is an open protocol that allows websites to instantly notify
 * search engines (Bing, Yandex, etc.) when content is added, updated, or deleted.
 * Submitting to api.indexnow.org automatically distributes to all participating engines.
 *
 * Key file: /ef53bdea1e53f734051be26b5dd483ae.txt (served from client/public/)
 * Docs: https://www.indexnow.org/documentation
 */

import { ENV } from "./_core/env";

const INDEXNOW_HOST = "api.indexnow.org";
export const SITE_HOST = "www.simuncle.com";
const KEY_LOCATION = `https://${SITE_HOST}/${ENV.indexNowKey || "ef53bdea1e53f734051be26b5dd483ae"}.txt`;

/**
 * All destination landing pages that should be submitted to IndexNow.
 * Add new destinations here as they are created.
 */
export const DESTINATION_URLS: string[] = [
  // Asia Pacific
  "/esim/japan",
  "/esim/korea",
  "/esim/thailand",
  "/esim/singapore",
  "/esim/taiwan",
  "/esim/hong-kong",
  "/esim/china",
  "/esim/malaysia",
  "/esim/vietnam",
  "/esim/philippines",
  "/esim/indonesia",
  "/esim/india",
  "/esim/australia",
  "/esim/new-zealand",
  "/esim/cambodia",
  "/esim/myanmar",
  "/esim/laos",
  "/esim/nepal",
  "/esim/sri-lanka",
  "/esim/bangladesh",
  "/esim/pakistan",
  "/esim/maldives",
  "/esim/mongolia",
  "/esim/macau",
  // Middle East
  "/esim/dubai",
  "/esim/uae",
  "/esim/saudi-arabia",
  "/esim/qatar",
  "/esim/bahrain",
  "/esim/kuwait",
  "/esim/oman",
  "/esim/jordan",
  "/esim/israel",
  "/esim/turkey",
  // Europe
  "/esim/europe",
  "/esim/uk",
  "/esim/france",
  "/esim/germany",
  "/esim/italy",
  "/esim/spain",
  "/esim/portugal",
  "/esim/netherlands",
  "/esim/switzerland",
  "/esim/austria",
  "/esim/belgium",
  "/esim/sweden",
  "/esim/norway",
  "/esim/denmark",
  "/esim/finland",
  "/esim/poland",
  "/esim/czech-republic",
  "/esim/hungary",
  "/esim/romania",
  "/esim/greece",
  "/esim/croatia",
  "/esim/iceland",
  // Americas
  "/esim/usa",
  "/esim/canada",
  "/esim/mexico",
  "/esim/brazil",
  "/esim/argentina",
  "/esim/colombia",
  "/esim/chile",
  "/esim/peru",
  // Africa
  "/esim/south-africa",
  "/esim/egypt",
  "/esim/kenya",
  "/esim/nigeria",
  "/esim/morocco",
  "/esim/ethiopia",
  // Multi-country / Regional
  "/esim/asia",
  "/esim/global",
].map((path) => `https://${SITE_HOST}${path}`);

/**
 * Core pages that should also be submitted regularly.
 */
export const CORE_URLS: string[] = [
  "/",
  "/products",
  "/how-to-install",
  "/tips",
  "/blog", // 有用資訊
].map((path) => `https://${SITE_HOST}${path}`);

/**
 * Submit a list of URLs to IndexNow (Bing + other participating search engines).
 * Batches are limited to 10,000 URLs per request (we stay well under that).
 *
 * @param urls - Array of absolute URLs to submit
 * @returns Object with success flag, HTTP status, and any error message
 */
export async function submitToIndexNow(urls: string[]): Promise<{
  success: boolean;
  status?: number;
  submitted: number;
  error?: string;
}> {
  const key = ENV.indexNowKey;
  if (!key) {
    console.warn("[IndexNow] INDEXNOW_KEY not set, skipping submission");
    return { success: false, submitted: 0, error: "INDEXNOW_KEY not configured" };
  }

  if (urls.length === 0) {
    return { success: true, submitted: 0 };
  }

  // Deduplicate and filter to only simuncle.com URLs
  const uniqueUrls = [...new Set(urls)].filter((u) => u.startsWith(`https://${SITE_HOST}`));

  if (uniqueUrls.length === 0) {
    return { success: false, submitted: 0, error: "No valid simuncle.com URLs to submit" };
  }

  const payload = {
    host: SITE_HOST,
    key,
    keyLocation: KEY_LOCATION,
    urlList: uniqueUrls,
  };

  console.log(`[IndexNow] Submitting ${uniqueUrls.length} URLs to ${INDEXNOW_HOST}...`);

  try {
    const response = await fetch(`https://${INDEXNOW_HOST}/indexnow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] ✓ Submitted ${uniqueUrls.length} URLs (HTTP ${response.status})`);
      return { success: true, status: response.status, submitted: uniqueUrls.length };
    } else {
      const body = await response.text().catch(() => "");
      console.error(`[IndexNow] ✗ Submission failed: HTTP ${response.status} - ${body}`);
      return {
        success: false,
        status: response.status,
        submitted: 0,
        error: `HTTP ${response.status}: ${body}`,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[IndexNow] ✗ Network error: ${message}`);
    return { success: false, submitted: 0, error: message };
  }
}

/**
 * Submit all destination + core pages to IndexNow.
 * Called after daily product sync to keep Bing up to date.
 */
export async function submitAllPages(): Promise<{
  success: boolean;
  status?: number;
  submitted: number;
  error?: string;
}> {
  const allUrls = [...DESTINATION_URLS, ...CORE_URLS];
  return submitToIndexNow(allUrls);
}
