/**
 * Google Tag Manager dataLayer helper
 * Provides typed event pushing for GTM conversion tracking
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function pushEvent(event: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

/** 購買完成 - 到達付款成功頁面時觸發 */
export function trackPurchase(params: {
  transactionId: string;
  value: number;
  currency?: string;
  items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>;
}) {
  pushEvent({
    event: "purchase",
    ecommerce: {
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency ?? "HKD",
      items: params.items ?? [],
    },
  });
}

/** Google Ads「加入購物車」轉換標籤 send_to ID */
const ADD_TO_CART_SEND_TO = "AW-18236820850/KiD2CKLCkL8cEPKa__dD";

/** 加入購物車 - 點擊「加入購物車」按鈕成功後觸發 */
export function trackAddToCart(params: {
  itemId: string;
  itemName: string;
  price?: number;
  currency?: string;
  quantity?: number;
}) {
  const value = (params.price ?? 0) * (params.quantity ?? 1);
  const currency = params.currency ?? "HKD";

  // GA4 / GTM dataLayer event
  pushEvent({
    event: "add_to_cart",
    ecommerce: {
      currency,
      value,
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.price ?? 0,
          quantity: params.quantity ?? 1,
        },
      ],
    },
  });

  // Google Ads conversion (direct gtag binding)
  if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "conversion", {
      send_to: ADD_TO_CART_SEND_TO,
      value,
      currency,
    });
  }
}

/** 開始結帳 - 點擊「立即購買 / Checkout」按鈕時觸發 */
export function trackBeginCheckout(params: {
  value: number;
  currency?: string;
  itemName: string;
  itemId: string;
}) {
  pushEvent({
    event: "begin_checkout",
    ecommerce: {
      value: params.value,
      currency: params.currency ?? "HKD",
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.value,
          quantity: 1,
        },
      ],
    },
  });
}

/** 查看產品詳情 - 進入產品詳情頁時觸發 */
export function trackViewItem(params: {
  itemId: string;
  itemName: string;
  price?: number;
  currency?: string;
}) {
  pushEvent({
    event: "view_item",
    ecommerce: {
      currency: params.currency ?? "HKD",
      value: params.price ?? 0,
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.price ?? 0,
          quantity: 1,
        },
      ],
    },
  });
}

/** 搜尋目的地 - 在首頁搜尋框搜尋時觸發 */
export function trackSearch(searchTerm: string) {
  pushEvent({
    event: "search",
    search_term: searchTerm,
  });
}

/** 查看產品列表 - 進入產品列表頁時觸發 */
export function trackViewItemList(params: {
  listName: string;
  country?: string;
}) {
  pushEvent({
    event: "view_item_list",
    ecommerce: {
      item_list_name: params.listName,
      country: params.country ?? "",
    },
  });
}

/** 點擊安裝教學 */
export function trackViewHowToInstall() {
  pushEvent({
    event: "view_how_to_install",
  });
}

/** 查詢訂單 */
export function trackTrackOrder() {
  pushEvent({
    event: "track_order",
  });
}

/** 取消付款 - 使用者從 Stripe 結帳頁返回購物車 (?cancelled=true) 時觸發 */
export function trackCancelCheckout(params?: {
  value?: number;
  currency?: string;
}) {
  pushEvent({
    event: "cancel_checkout",
    ecommerce: {
      value: params?.value ?? 0,
      currency: params?.currency ?? "HKD",
    },
  });
}
