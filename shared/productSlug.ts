/**
 * Product slug encoding/decoding utilities.
 *
 * Purpose: hide internal supplier prefixes (e.g. "tgt_") from public-facing URLs.
 * The URL slug is the productId with the supplier prefix stripped.
 * The server resolves slugs back to full productIds by trying known prefixes.
 *
 * Rules:
 *   - "tgt_ABC"  → slug "ABC"
 *   - "vizlync_ABC" → slug "ABC"  (future-proof)
 *   - "ABC" (no prefix) → slug "ABC"
 *
 * Decoding is done server-side: try raw slug first, then "tgt_" + slug.
 */

const SUPPLIER_PREFIXES = ["tgt_", "vizlync_"] as const;

/**
 * Convert an internal productId to a URL-safe slug (strips supplier prefix).
 */
export function encodeProductSlug(productId: string): string {
  for (const prefix of SUPPLIER_PREFIXES) {
    if (productId.startsWith(prefix)) {
      return productId.slice(prefix.length);
    }
  }
  return productId;
}

/**
 * Generate all candidate productIds from a URL slug.
 * Returns [slug, "tgt_" + slug, "vizlync_" + slug] so callers can try each.
 */
export function decodeProductSlugCandidates(slug: string): string[] {
  // If slug already has a known prefix (shouldn't happen, but be safe)
  for (const prefix of SUPPLIER_PREFIXES) {
    if (slug.startsWith(prefix)) return [slug];
  }
  return [slug, ...SUPPLIER_PREFIXES.map((p) => p + slug)];
}
