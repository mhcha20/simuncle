/**
 * Split a product search into words. Separators such as "-", "," and "/" are
 * ignored, and at most 8 words are used. Returns the whole query when it has no words.
 */
export function searchTerms(search: string): string[] {
  const terms = search
    .split(/[\s,，、/|+&]+/)
    .map((t) => t.trim().replace(/^[-–—]+|[-–—]+$/g, ""))
    .filter((t) => t.length > 0);
  const unique = Array.from(new Set(terms)).slice(0, 8);
  return unique.length > 0 ? unique : [search.trim()].filter(Boolean);
}
