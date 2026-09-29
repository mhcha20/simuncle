import {
  bigint,
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Cart items table
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productData: json("productData").notNull(), // full product snapshot
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// Orders table
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // nullable for guest orders
  guestEmail: varchar("guestEmail", { length: 255 }), // for guest checkout (no account)
  vizlyncOrderId: varchar("vizlyncOrderId", { length: 64 }), // returned from Vizlync API
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productData: json("productData").notNull(), // snapshot of product at purchase time
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  status: mysqlEnum("status", [
    "pending_payment",
    "paid",
    "processing",
    "completed",
    "failed",
    "refunded",
    "terminated",
  ])
    .default("pending_payment")
    .notNull(),
  // Supplier tracking
  supplier: mysqlEnum("order_supplier", ["vizlync", "tgt"]).default("vizlync").notNull(), // which supplier fulfilled this order
  supplierOrderId: varchar("supplierOrderId", { length: 128 }), // TGT orderNo or Vizlync orderId (unified)
  // eSIM details from supplier after order creation
  esimData: json("esimData"), // QR code, activation code, etc.
  startDate: varchar("startDate", { length: 32 }), // optional start date (ISO string)
  emailSent: boolean("emailSent").default(false).notNull(), // whether confirmation email was sent
  paymentReminderSentAt: timestamp("paymentReminderSentAt"), // when payment reminder was last sent (dedup)
  paymentReminderCount: int("paymentReminderCount").default(0), // how many reminders sent (max 4)
  preferredLang: varchar("preferredLang", { length: 8 }).default("zh-TW").notNull(), // user's language at time of order
  errorMessage: varchar("errorMessage", { length: 512 }), // failure reason if order processing failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Products cache table (synced from Vizlync API)
export const productsCache = mysqlTable("products_cache", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  planInfo: text("planInfo"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  validityDays: int("validityDays"),
  countries: json("countries"), // [{id, name}]
  region: json("region"), // string[]
  dataAmount: decimal("dataAmount", { precision: 10, scale: 3 }),
  dataUnit: varchar("dataUnit", { length: 16 }),
  speed: varchar("speed", { length: 32 }),
  planType: varchar("planType", { length: 32 }),
  category: varchar("category", { length: 32 }),
  networkName: varchar("networkName", { length: 128 }),
  networkType: varchar("networkType", { length: 64 }),
  isVoiceAvailable: boolean("isVoiceAvailable").default(false),
  isSmsAvailable: boolean("isSmsAvailable").default(false),
  hotspotAvailable: boolean("hotspotAvailable").default(false),
  topUpAvailable: boolean("topUpAvailable").default(false),
  profile: varchar("profile", { length: 32 }),
  activationPolicy: varchar("activationPolicy", { length: 128 }),
  startDateEnabled: boolean("startDateEnabled").default(false),
  voiceMin: int("voiceMin"),
  sms: int("sms"),
  rawData: json("rawData"), // full product data
  descriptionZhTW: text("descriptionZhTW"), // LLM translated Traditional Chinese
  descriptionZhCN: text("descriptionZhCN"), // LLM translated Simplified Chinese
  descriptionJa: text("descriptionJa"), // LLM translated Japanese
  descriptionKo: text("descriptionKo"), // LLM translated Korean
  descriptionTh: text("descriptionTh"), // LLM translated Thai
  planInfoZhTW: text("planInfoZhTW"), // LLM translated planInfo Traditional Chinese
  planInfoZhCN: text("planInfoZhCN"), // LLM translated planInfo Simplified Chinese
  planInfoJa: text("planInfoJa"), // LLM translated planInfo Japanese
  planInfoKo: text("planInfoKo"), // LLM translated planInfo Korean
  planInfoTh: text("planInfoTh"), // LLM translated planInfo Thai
  isActive: boolean("isActive").default(true).notNull(), // admin can disable products
  customName: varchar("customName", { length: 255 }), // admin override for product name
  customDescription: text("customDescription"), // admin override for product description
  supplier: mysqlEnum("supplier", ["vizlync", "tgt"]).default("vizlync").notNull(), // which supplier this product comes from
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCache = typeof productsCache.$inferSelect;
export type InsertProductCache = typeof productsCache.$inferInsert;

// Site settings table (key-value store)
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

// Announcements table (site-wide banner notifications)
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  message: text("message").notNull(),
  messageZhTW: text("messageZhTW"), // Traditional Chinese
  messageZhCN: text("messageZhCN"), // Simplified Chinese
  link: varchar("link", { length: 512 }), // optional CTA link
  linkText: varchar("linkText", { length: 128 }), // optional CTA text
  bgColor: varchar("bgColor", { length: 32 }).default("#16a34a").notNull(), // tailwind / hex
  textColor: varchar("textColor", { length: 32 }).default("#ffffff").notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// Push subscriptions table (Web Push API)
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // nullable for guest subscribers
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // public key
  auth: text("auth").notNull(), // auth secret
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// In-app notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  type: varchar("type", { length: 32 }).default("info").notNull(), // info | order | promo
  link: varchar("link", { length: 512 }), // optional deep link
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Search analytics table
export const searchAnalytics = mysqlTable("search_analytics", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  countryCode: varchar("countryCode", { length: 8 }),
  resultCount: int("resultCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = typeof searchAnalytics.$inferInsert;

// Top-up orders table (加值訂單)
export const topupOrders = mysqlTable("topup_orders", {
  id: int("id").autoincrement().primaryKey(),
  parentOrderId: int("parentOrderId").notNull(), // the original eSIM order being topped up
  userId: int("userId"), // nullable for guest
  topupProductId: varchar("topupProductId", { length: 64 }).notNull(),
  topupProductName: varchar("topupProductName", { length: 255 }).notNull(),
  priceHkd: int("priceHkd").notNull(), // price in HKD (integer)
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  vizlyncTopupOrderId: varchar("vizlyncTopupOrderId", { length: 64 }),
  status: mysqlEnum("topup_status", ["pending_payment", "paid", "completed", "failed"])
    .default("pending_payment")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TopupOrder = typeof topupOrders.$inferSelect;
export type InsertTopupOrder = typeof topupOrders.$inferInsert;

// Email logs table (track all outbound emails)
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"), // nullable — some emails not tied to an order
  topupOrderId: int("topupOrderId"), // nullable — for topup confirmation emails
  userId: int("userId"), // nullable for guest
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  emailType: varchar("emailType", { length: 64 }).notNull(), // e.g. order_confirmation, payment_reminder, expiry_reminder
  subject: varchar("subject", { length: 512 }).notNull(),
  status: mysqlEnum("email_log_status", ["sent", "failed"]).default("sent").notNull(),
  errorMessage: text("errorMessage"), // populated on failure
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

// Sync history table (track product sync runs)
export const syncHistory = mysqlTable("sync_history", {
  id: int("id").autoincrement().primaryKey(),
  triggeredBy: mysqlEnum("triggeredBy", ["manual", "scheduled"]).default("manual").notNull(),
  supplier: varchar("supplier", { length: 16 }).default("vizlync").notNull(),
  status: mysqlEnum("sync_status", ["success", "failed"]).default("success").notNull(),
  totalProducts: int("totalProducts").default(0).notNull(),
  added: int("added").default(0).notNull(),
  removed: int("removed").default(0).notNull(),
  priceChanged: int("priceChanged").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  errorMessage: text("errorMessage"), // populated on failure
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = typeof syncHistory.$inferInsert;

// Articles table (multi-language blog/tips system)
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  coverImage: text("coverImage"), // URL to cover image
  status: mysqlEnum("article_status", ["draft", "published"]).default("draft").notNull(),
  authorId: int("authorId"), // nullable, references users.id
  // Traditional Chinese
  titleZhTW: varchar("titleZhTW", { length: 512 }),
  excerptZhTW: text("excerptZhTW"),
  contentZhTW: text("contentZhTW"),
  // Simplified Chinese
  titleZhCN: varchar("titleZhCN", { length: 512 }),
  excerptZhCN: text("excerptZhCN"),
  contentZhCN: text("contentZhCN"),
  // English
  titleEn: varchar("titleEn", { length: 512 }),
  excerptEn: text("excerptEn"),
  contentEn: text("contentEn"),
  // Japanese
  titleJa: varchar("titleJa", { length: 512 }),
  excerptJa: text("excerptJa"),
  contentJa: text("contentJa"),
  // Korean
  titleKo: varchar("titleKo", { length: 512 }),
  excerptKo: text("excerptKo"),
  contentKo: text("contentKo"),
  // Thai
  titleTh: varchar("titleTh", { length: 512 }),
  excerptTh: text("excerptTh"),
  contentTh: text("contentTh"),
  publishedAt: timestamp("publishedAt"),
  soroId: varchar("soroId", { length: 100 }), // Soro article UUID for dedup
  category: varchar("category", { length: 64 }), // AI-classified: travel-tips | esim-guide | destination-guide | news
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// Referral codes table — one code per user, user-customisable
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one code per user
  code: varchar("code", { length: 32 }).notNull().unique(), // e.g. "JOHN10"
  discountPct: int("discount_pct").default(10).notNull(), // % off for referee (10 = 10%)
  commissionPct: int("commission_pct").default(10).notNull(), // % of order for referrer
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

// Referral commissions table — one row per successful referred order
export const referralCommissions = mysqlTable("referral_commissions", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrer_id").notNull(), // user who owns the referral code
  refereeOrderId: int("referee_order_id").notNull(), // order placed by the referred user
  referralCodeId: int("referral_code_id").notNull(),
  orderAmountHkd: int("order_amount_hkd").notNull(), // total paid in HKD (integer cents)
  commissionHkd: int("commission_hkd").notNull(), // commission earned in HKD (integer cents)
  status: mysqlEnum("commission_status", ["pending", "paid", "cancelled"])
    .default("pending")
    .notNull(),
  paidAt: timestamp("paid_at"), // when admin marked as paid
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReferralCommission = typeof referralCommissions.$inferSelect;
export type InsertReferralCommission = typeof referralCommissions.$inferInsert;
