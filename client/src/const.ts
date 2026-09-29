export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Login page URL; after signing in the user is sent back to the current page. */
export const getLoginUrl = (returnTo?: string) => {
  const target =
    returnTo ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/");
  const safe = target.startsWith("/login") ? "/" : target;
  return `/login?returnTo=${encodeURIComponent(safe)}`;
};
