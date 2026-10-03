import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { announcements, cartItems, emailLogs, InsertUser, notifications, orders, productsCache, pushSubscriptions, searchAnalytics, siteSettings, syncHistory, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.email && ENV.adminEmails.includes(user.email.trim().toLowerCase())) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Find the user for a verified email or create one. Accounts created under the
 * old Manus login are matched by email, so they keep their orders, cart,
 * referral code and admin role. New users get an openId of "google_<sub>" or
 * "email_<sha256>".
 */
export async function findOrCreateUserByEmail(input: {
  email: string;
  name: string | null;
  loginMethod: "google" | "email";
  providerId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const email = input.email.trim().toLowerCase();
  const isAdminEmail = ENV.adminEmails.includes(email);
  const now = new Date();

  const existing = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.email}) = ${email}`)
    .orderBy(asc(users.id))
    .limit(1);

  if (existing[0]) {
    const user = existing[0];
    await db
      .update(users)
      .set({
        loginMethod: input.loginMethod,
        lastSignedIn: now,
        ...(user.name ? {} : input.name ? { name: input.name } : {}),
        ...(isAdminEmail ? { role: "admin" as const } : {}),
      })
      .where(eq(users.id, user.id));
    return (await getUserByOpenId(user.openId))!;
  }

  const openId = `${input.loginMethod}_${input.providerId}`.slice(0, 64);
  await upsertUser({
    openId,
    email,
    name: input.name,
    loginMethod: input.loginMethod,
    lastSignedIn: now,
    ...(isAdminEmail ? { role: "admin" as const } : {}),
  });
  const created = await getUserByOpenId(openId);
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---- Cart helpers ----
export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId)).orderBy(desc(cartItems.createdAt));
}

export async function addCartItem(userId: number, productId: string, productName: string, productData: unknown, unitPrice: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if already in cart
  const existing = await db.select().from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(cartItems)
      .set({ quantity: existing[0].quantity + 1, updatedAt: new Date() })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(cartItems).values({
    userId,
    productId,
    productName,
    productData: productData as Record<string, unknown>,
    quantity: 1,
    unitPrice: unitPrice.toFixed(2),
  });
  // Drizzle mysql2 insert returns [ResultSetHeader, FieldPacket[]], so insertId is at result[0].insertId
  const rawResult = result as unknown as [{ insertId: number }, unknown];
  return rawResult[0].insertId;
}

export async function updateCartItemQty(cartItemId: number, userId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
  } else {
    await db.update(cartItems).set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
  }
}

export async function removeCartItem(cartItemId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// ---- Orders helpers ----
export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrderById(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getOrderByStripeSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders)
    .where(eq(orders.stripeSessionId, sessionId))
    .limit(1);
  return result[0];
}

export async function createOrder(data: {
  userId?: number | null;
  guestEmail?: string | null;
  productId: string;
  productName: string;
  productData: unknown;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  stripeSessionId?: string;
  startDate?: string;
  preferredLang?: string;
  supplier?: "vizlync" | "tgt";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(orders).values({
    userId: data.userId ?? null,
    guestEmail: data.guestEmail ?? null,
    productId: data.productId,
    productName: data.productName,
    productData: data.productData as Record<string, unknown>,
    quantity: data.quantity,
    unitPrice: data.unitPrice.toFixed(2),
    totalAmount: data.totalAmount.toFixed(2),
    stripeSessionId: data.stripeSessionId,
    startDate: data.startDate,
    preferredLang: data.preferredLang ?? "zh-TW",
    status: "pending_payment",
    supplier: data.supplier ?? "vizlync",
  });
  // Drizzle mysql2 insert returns [ResultSetHeader, FieldPacket[]], so insertId is at result[0].insertId
  const rawResult = result as unknown as [{ insertId: number }, unknown];
  return rawResult[0].insertId;
}

export async function updateOrderStatus(orderId: number, status: string, extra?: { vizlyncOrderId?: string; esimData?: unknown; stripePaymentIntentId?: string; guestEmail?: string; emailSent?: boolean; supplierOrderId?: string; errorMessage?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
  if (extra?.vizlyncOrderId) updateData.vizlyncOrderId = extra.vizlyncOrderId;
  if (extra?.esimData) updateData.esimData = extra.esimData;
  if (extra?.stripePaymentIntentId) updateData.stripePaymentIntentId = extra.stripePaymentIntentId;
  if (extra?.guestEmail) updateData.guestEmail = extra.guestEmail.toLowerCase().trim();
  if (extra?.emailSent !== undefined) updateData.emailSent = extra.emailSent;
  if (extra?.supplierOrderId) updateData.supplierOrderId = extra.supplierOrderId;
  if (extra?.errorMessage !== undefined) updateData.errorMessage = extra.errorMessage;
  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
}

// ---- Products Cache helpers ----
export async function getProducts(params: {
  search?: string;
  region?: string;
  country?: string;
  countries?: string[];
  minData?: number;
  maxData?: number;
  dailyOnly?: boolean;
  /** Only plans that can be topped up with extra data. */
  topUpOnly?: boolean;
  minDays?: number;
  maxDays?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
}) {
  const db = await getDb();
  if (!db) return { products: [], total: 0 };
  const { search, region, country, countries, minData, maxData, dailyOnly, topUpOnly, minDays, maxDays, limit = 20, offset = 0, sortBy = "price_asc" } = params;

  const conditions = [];
  // Always filter out disabled products for public queries
  conditions.push(eq(productsCache.isActive, true));
  if (search) {
    conditions.push(
      or(
        like(productsCache.name, `%${search}%`),
        like(productsCache.networkName, `%${search}%`),
        like(productsCache.productId, `%${search}%`),
        // Search inside countries JSON array (e.g. [{"id":"JP","name":"Japan"}])
        sql`JSON_SEARCH(LOWER(${productsCache.countries}), 'one', LOWER(${`%${search}%`}), NULL, '$[*].name') IS NOT NULL`,
        sql`JSON_SEARCH(LOWER(${productsCache.countries}), 'one', LOWER(${`%${search}%`}), NULL, '$[*].id') IS NOT NULL`,
      )
    );
  }
  if (region && region !== "all") {
    // Map composite region names to their actual Vizlync region values
    const regionAliasMap: Record<string, string[]> = {
      Americas: ["North America", "South America", "Caribbean"],
      "Asia Pacific": ["Asia", "Asia Pacific", "Oceania"],
      Worldwide: ["Worldwide"],
    };
    const regionValues = regionAliasMap[region] ?? [region];
    if (regionValues.length === 1) {
      conditions.push(sql`JSON_CONTAINS(${productsCache.region}, ${JSON.stringify(regionValues[0])})`);
    } else {
      // OR across multiple region values
      const orClauses = regionValues.map((r) => sql`JSON_CONTAINS(${productsCache.region}, ${JSON.stringify(r)})`);
      conditions.push(sql`(${sql.join(orClauses, sql` OR `)})`);
    }
  }
  if (country && country !== "all") {
    conditions.push(sql`JSON_CONTAINS(${productsCache.countries}, JSON_OBJECT('id', ${country}))`);
  }
  // Multi-country filter: AND logic — product must cover ALL selected countries
  if (countries && countries.length > 0) {
    for (const c of countries) {
      conditions.push(sql`JSON_CONTAINS(${productsCache.countries}, JSON_OBJECT('id', ${c}))`);
    }
  }
  if (minData != null) {
    conditions.push(sql`${productsCache.dataAmount} >= ${minData}`);
  }
  if (maxData != null) {
    conditions.push(sql`${productsCache.dataAmount} <= ${maxData}`);
  }
  if (dailyOnly) {
    // Daily plans have dataUnit containing "/天" or "/day"
    conditions.push(sql`(${productsCache.dataUnit} LIKE '%/天%' OR LOWER(${productsCache.dataUnit}) LIKE '%/day%')`);
  }
  if (topUpOnly) {
    conditions.push(eq(productsCache.topUpAvailable, true));
  }
  if (minDays != null) {
    conditions.push(sql`${productsCache.validityDays} >= ${minDays}`);
  }
  if (maxDays != null) {
    conditions.push(sql`${productsCache.validityDays} <= ${maxDays}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order by
  const orderByClause = (() => {
    switch (sortBy) {
      case "price_desc": return sql`${productsCache.price} DESC`;
      case "validity": return sql`${productsCache.validityDays} DESC`;
      case "data": return sql`${productsCache.dataAmount} DESC`;
      default: return sql`${productsCache.price} ASC`;
    }
  })();

  const [productList, countResult] = await Promise.all([
    db.select().from(productsCache)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderByClause),
    db.select({ count: sql<number>`COUNT(*)` }).from(productsCache).where(whereClause),
  ]);

  return { products: productList, total: Number(countResult[0]?.count ?? 0) };
}

export async function getProductById(productId: string, includeInactive = false) {
  const db = await getDb();
  if (!db) return undefined;
  // Try the exact productId first, then supplier-prefixed variants (slug support)
  const candidates = [productId];
  if (!productId.startsWith("tgt_") && !productId.startsWith("vizlync_")) {
    candidates.push(`tgt_${productId}`);
  }
  for (const candidate of candidates) {
    const conditions = [eq(productsCache.productId, candidate)];
    if (!includeInactive) conditions.push(eq(productsCache.isActive, true));
    const result = await db.select().from(productsCache)
      .where(and(...conditions))
      .limit(1);
    if (result[0]) return result[0];
  }
  return undefined;
}

export async function getProductsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(productsCache);
  return Number(result[0]?.count ?? 0);
}

// Update translated description fields for a product
export async function updateProductTranslation(
  productId: string,
  descriptionZhTW: string | null,
  descriptionZhCN: string | null,
  planInfoZhTW?: string | null,
  planInfoZhCN?: string | null,
  descriptionJa?: string | null,
  descriptionKo?: string | null,
  descriptionTh?: string | null,
  planInfoJa?: string | null,
  planInfoKo?: string | null,
  planInfoTh?: string | null,
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(productsCache)
    .set({
      descriptionZhTW,
      descriptionZhCN,
      ...(planInfoZhTW !== undefined ? { planInfoZhTW } : {}),
      ...(planInfoZhCN !== undefined ? { planInfoZhCN } : {}),
      ...(descriptionJa !== undefined ? { descriptionJa } : {}),
      ...(descriptionKo !== undefined ? { descriptionKo } : {}),
      ...(descriptionTh !== undefined ? { descriptionTh } : {}),
      ...(planInfoJa !== undefined ? { planInfoJa } : {}),
      ...(planInfoKo !== undefined ? { planInfoKo } : {}),
      ...(planInfoTh !== undefined ? { planInfoTh } : {}),
      updatedAt: new Date(),
    })
    .where(eq(productsCache.productId, productId));
}

// Normalise dataAmount to GB so all DB comparisons use a consistent unit.
// Vizlync returns amounts in MB, GB, or TB depending on the plan.
function normaliseDataAmountGb(amount: number | null | undefined, unit: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const u = String(unit ?? "GB").toUpperCase();
  if (u.startsWith("M")) return amount / 1024;
  if (u.startsWith("T")) return amount * 1024;
  return amount; // GB (default)
}

export async function upsertProduct(product: {
  productId: string;
  name: string;
  description?: string | null;
  planInfo?: string | null;
  price: number;
  validityDays?: number | null;
  countries?: unknown;
  region?: unknown;
  dataAmount?: number | null;
  dataUnit?: string | null;
  speed?: string | null;
  planType?: string | null;
  category?: string | null;
  networkName?: string | null;
  networkType?: string | null;
  isVoiceAvailable?: boolean;
  isSmsAvailable?: boolean;
  hotspotAvailable?: boolean;
  topUpAvailable?: boolean;
  profile?: string | null;
  activationPolicy?: string | null;
  startDateEnabled?: boolean;
  voiceMin?: number | null;
  sms?: number | null;
  rawData?: unknown;
  supplier?: "vizlync" | "tgt";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Normalise dataAmount to GB for consistent DB filtering/sorting
  const dataAmountGb = normaliseDataAmountGb(product.dataAmount, product.dataUnit);
  await db.insert(productsCache).values({
    ...product,
    price: Number(product.price).toFixed(2),
    dataAmount: dataAmountGb != null ? dataAmountGb.toFixed(6) : null,
    dataUnit: "GB", // always store in GB
    countries: product.countries as Record<string, unknown>[],
    region: product.region as string[],
    rawData: product.rawData as Record<string, unknown>,
    syncedAt: new Date(),
    supplier: product.supplier ?? "vizlync",
  }).onDuplicateKeyUpdate({
    set: {
      name: product.name,
      description: product.description,
      price: Number(product.price).toFixed(2),
      validityDays: product.validityDays,
      countries: product.countries as Record<string, unknown>[],
      region: product.region as string[],
      dataAmount: dataAmountGb != null ? dataAmountGb.toFixed(6) : null,
      dataUnit: "GB", // always store in GB
      speed: product.speed,
      networkName: product.networkName,
      networkType: product.networkType,
      isVoiceAvailable: product.isVoiceAvailable,
      isSmsAvailable: product.isSmsAvailable,
      hotspotAvailable: product.hotspotAvailable,
      topUpAvailable: product.topUpAvailable,
      profile: product.profile,
      activationPolicy: product.activationPolicy,
      startDateEnabled: product.startDateEnabled,
      rawData: product.rawData as Record<string, unknown>,
      supplier: product.supplier ?? "vizlync",
      syncedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Deactivate TGT products that are no longer present in the TGT API.
 * Accepts the full set of valid productIds from TGT API, then batch-updates
 * any DB rows that are (a) supplier='tgt', (b) isActive=true, and
 * (c) NOT in the provided set.
 * Returns the count of rows deactivated.
 */
export async function deactivateMissingTgtProducts(validTgtProductIds: string[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (validTgtProductIds.length === 0) return 0;

  // Fetch all currently active TGT product IDs from DB
  const activeRows = await db
    .select({ productId: productsCache.productId })
    .from(productsCache)
    .where(and(eq(productsCache.supplier, "tgt"), eq(productsCache.isActive, true)));

  const validSet = new Set(validTgtProductIds);
  const toDeactivate = activeRows
    .map((r) => r.productId)
    .filter((id) => !validSet.has(id));

  if (toDeactivate.length === 0) return 0;

  // Batch deactivate in chunks of 500 to avoid SQL parameter limits
  const chunkSize = 500;
  for (let i = 0; i < toDeactivate.length; i += chunkSize) {
    const chunk = toDeactivate.slice(i, i + chunkSize);
    const { inArray } = await import("drizzle-orm");
    await db
      .update(productsCache)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(productsCache.productId, chunk));
  }

  console.log(`[deactivateMissingTgtProducts] Deactivated ${toDeactivate.length} products.`);
  return toDeactivate.length;
}

/**
 * Deactivate active Vizlync products that the latest full API fetch no longer lists.
 * Safety valve: if the fetch returned fewer than `minRatio` of the currently active products
 * (e.g. the API returned a partial list), nothing is deactivated.
 */
export async function deactivateMissingVizlyncProducts(
  validProductIds: string[],
  minRatio = 0.9,
): Promise<{ deactivated: number; skippedReason?: string }> {
  const db = await getDb();
  if (!db) return { deactivated: 0, skippedReason: "database unavailable" };
  if (validProductIds.length === 0) return { deactivated: 0, skippedReason: "empty product list" };

  const activeRows = await db
    .select({ productId: productsCache.productId })
    .from(productsCache)
    .where(and(eq(productsCache.supplier, "vizlync"), eq(productsCache.isActive, true)));

  const validSet = new Set(validProductIds);
  const toDeactivate = activeRows.map((r) => r.productId).filter((id) => !validSet.has(id));
  if (toDeactivate.length === 0) return { deactivated: 0 };

  if (validProductIds.length < activeRows.length * minRatio) {
    return {
      deactivated: 0,
      skippedReason: `API returned ${validProductIds.length} products but ${activeRows.length} are active (below ${Math.round(minRatio * 100)}%), looks partial`,
    };
  }

  const { inArray } = await import("drizzle-orm");
  const chunkSize = 500;
  for (let i = 0; i < toDeactivate.length; i += chunkSize) {
    await db
      .update(productsCache)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(productsCache.productId, toDeactivate.slice(i, i + chunkSize)));
  }
  console.log(`[deactivateMissingVizlyncProducts] Deactivated ${toDeactivate.length} products.`);
  return { deactivated: toDeactivate.length };
}

// ---- Admin Product Management ----
export async function adminListProducts(params: {
  search?: string;
  isActive?: boolean;
  supplier?: "vizlync" | "tgt";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { products: [], total: 0 };
  const { search, isActive, supplier, limit = 50, offset = 0 } = params;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(productsCache.name, `%${search}%`),
        like(productsCache.productId, `%${search}%`),
        like(productsCache.networkName, `%${search}%`),
        sql`JSON_SEARCH(LOWER(${productsCache.countries}), 'one', LOWER(${`%${search}%`}), NULL, '$[*].name') IS NOT NULL`,
      )
    );
  }
  if (isActive !== undefined) {
    conditions.push(eq(productsCache.isActive, isActive));
  }
  if (supplier !== undefined) {
    conditions.push(eq(productsCache.supplier, supplier));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [productList, countResult] = await Promise.all([
    db.select({
      id: productsCache.id,
      productId: productsCache.productId,
      name: productsCache.name,
      customName: productsCache.customName,
      customDescription: productsCache.customDescription,
      price: productsCache.price,
      validityDays: productsCache.validityDays,
      dataAmount: productsCache.dataAmount,
      dataUnit: productsCache.dataUnit,
      countries: productsCache.countries,
      region: productsCache.region,
      networkName: productsCache.networkName,
      isActive: productsCache.isActive,
      syncedAt: productsCache.syncedAt,
      supplier: productsCache.supplier,
    }).from(productsCache)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${productsCache.isActive} DESC, ${productsCache.name} ASC`),
    db.select({ count: sql<number>`COUNT(*)` }).from(productsCache).where(whereClause),
  ]);

  return { products: productList, total: Number(countResult[0]?.count ?? 0) };
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(productsCache)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(productsCache.productId, productId));
}

export async function updateProductCustomFields(
  productId: string,
  customName: string | null,
  customDescription: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(productsCache)
    .set({ customName, customDescription, updatedAt: new Date() })
    .where(eq(productsCache.productId, productId));
}

export async function exportProductsForCsv() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select({
    productId: productsCache.productId,
    name: productsCache.name,
    customName: productsCache.customName,
    customDescription: productsCache.customDescription,
    price: productsCache.price,
    validityDays: productsCache.validityDays,
    dataAmount: productsCache.dataAmount,
    dataUnit: productsCache.dataUnit,
    isActive: productsCache.isActive,
  }).from(productsCache)
    .orderBy(sql`${productsCache.name} ASC`);
  return rows;
}

export async function bulkUpdateProductCustomFields(
  rows: Array<{ productId: string; customName: string | null; customDescription: string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  let updated = 0;
  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await Promise.all(
      batch.map((row) =>
        db
          .update(productsCache)
          .set({ customName: row.customName, customDescription: row.customDescription, updatedAt: new Date() })
          .where(eq(productsCache.productId, row.productId))
      )
    );
    updated += batch.length;
  }
  return updated;
}

// ---- Site Settings helpers ----
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Returns the most recent updatedAt timestamp across a list of setting keys */
export async function getSettingsLatestUpdatedAt(keys: string[]): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ updatedAt: siteSettings.updatedAt })
    .from(siteSettings)
    .where(sql`${siteSettings.key} IN (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})`)
    .orderBy(sql`${siteSettings.updatedAt} DESC`)
    .limit(1);
  return result[0]?.updatedAt ?? null;
}

// ---- Announcements ----

export async function getActiveAnnouncement() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(announcements)
    .where(eq(announcements.isActive, true))
    .orderBy(sql`${announcements.updatedAt} DESC`)
    .limit(1);
  return result[0] ?? null;
}

export async function listAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(sql`${announcements.createdAt} DESC`);
}

export async function upsertAnnouncement(data: {
  id?: number;
  message: string;
  messageZhTW?: string | null;
  messageZhCN?: string | null;
  link?: string | null;
  linkText?: string | null;
  bgColor?: string;
  textColor?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(announcements).set({
      message: data.message,
      messageZhTW: data.messageZhTW ?? null,
      messageZhCN: data.messageZhCN ?? null,
      link: data.link ?? null,
      linkText: data.linkText ?? null,
      bgColor: data.bgColor ?? "#16a34a",
      textColor: data.textColor ?? "#ffffff",
      isActive: data.isActive ?? false,
      updatedAt: new Date(),
    }).where(eq(announcements.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(announcements).values({
      message: data.message,
      messageZhTW: data.messageZhTW ?? null,
      messageZhCN: data.messageZhCN ?? null,
      link: data.link ?? null,
      linkText: data.linkText ?? null,
      bgColor: data.bgColor ?? "#16a34a",
      textColor: data.textColor ?? "#ffffff",
      isActive: data.isActive ?? false,
    });
    return (result as unknown as [{ insertId: number }])[0].insertId;
  }
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(announcements).where(eq(announcements.id, id));
}

export async function toggleAnnouncementActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deactivate all others first if activating
  if (isActive) {
    await db.update(announcements).set({ isActive: false, updatedAt: new Date() });
  }
  await db.update(announcements).set({ isActive, updatedAt: new Date() })
    .where(eq(announcements.id, id));
}

// ---- Push Subscriptions ----
export async function savePushSubscription(userId: number | null, sub: { endpoint: string; p256dh: string; auth: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Upsert by endpoint
  const existing = await db.select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(sql`${pushSubscriptions.endpoint} = ${sub.endpoint}`)
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(pushSubscriptions).values({
    userId: userId ?? undefined,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  });
  return (result as unknown as [{ insertId: number }])[0].insertId;
}

export async function deletePushSubscription(userId: number | null, endpoint: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete by endpoint (regardless of userId for guests)
  await db.delete(pushSubscriptions)
    .where(sql`${pushSubscriptions.endpoint} = ${endpoint}`);
}

export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions);
}

export async function getPushSubscriptionByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

// Track order by email + orderId (for guests without account)
export async function getOrderByEmailAndId(email: string, orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.guestEmail, email.toLowerCase().trim())))
    .limit(1);
  return result[0];
}

// Admin: list all orders with search and filter
export async function adminListOrders(opts: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };
  const { search, status, page = 1, pageSize = 20 } = opts;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [];
  if (status && status !== "all") {
    conditions.push(sql`${orders.status} = ${status}`);
  }
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      sql`(${orders.guestEmail} LIKE ${like} OR ${orders.productName} LIKE ${like} OR CAST(${orders.id} AS CHAR) LIKE ${like})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select({
      id: orders.id,
      userId: orders.userId,
      guestEmail: orders.guestEmail,
      userEmail: users.email,
      productName: orders.productName,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      status: orders.status,
      vizlyncOrderId: orders.vizlyncOrderId,
      stripeSessionId: orders.stripeSessionId,
      esimData: orders.esimData,
      emailSent: orders.emailSent,
      createdAt: orders.createdAt,
      paymentReminderCount: orders.paymentReminderCount,
      paymentReminderSentAt: orders.paymentReminderSentAt,
      supplier: orders.supplier,
      supplierOrderId: orders.supplierOrderId,
      errorMessage: orders.errorMessage,
    }).from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(whereClause),
  ]);

  return { orders: rows, total: Number(countRows[0]?.count ?? 0) };
}

// Get customer email by userId (for logged-in orders)
export async function getCustomerEmailByUserId(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.email ?? null;
}

// Admin: get single order by id
export async function adminGetOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result[0];
}

export async function adminDeleteOrder(orderId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(orders).where(eq(orders.id, orderId));
}

// ---- In-app Notifications ----

export async function createNotification(data: {
  userId: number;
  title: string;
  content?: string;
  type?: string;
  link?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values({
    userId: data.userId,
    title: data.title,
    content: data.content ?? null,
    type: data.type ?? "info",
    link: data.link ?? null,
    isRead: false,
  });
  return (result as unknown as [{ insertId: number }])[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(sql`${notifications.createdAt} DESC`)
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// Search analytics
export async function recordSearchAnalytic(query: string, countryCode?: string, resultCount?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchAnalytics).values({
    query: query.slice(0, 255),
    countryCode: countryCode?.slice(0, 8),
    resultCount: resultCount ?? 0,
  });
}

export async function getTopSearches(limit = 20): Promise<{ query: string; countryCode: string | null; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      query: searchAnalytics.query,
      countryCode: searchAnalytics.countryCode,
      count: sql<number>`COUNT(*) AS count`,
    })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.query, searchAnalytics.countryCode)
    .orderBy(desc(sql`count`))
    .limit(limit);
  return rows as { query: string; countryCode: string | null; count: number }[];
}

// Get similar products for upsell when topup is not available
export async function getSimilarProducts(params: {
  countryIds: string[];   // must cover at least one of these countries
  dataAmountGb: number;   // target data amount in GB
  excludeProductId?: string;
  limit?: number;
}): Promise<typeof productsCache.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  const { countryIds, dataAmountGb, excludeProductId, limit = 6 } = params;
  const conditions = [eq(productsCache.isActive, true)];
  if (excludeProductId) {
    conditions.push(sql`${productsCache.productId} != ${excludeProductId}`);
  }
  // Must cover at least one of the target countries
  if (countryIds.length > 0) {
    const orClauses = countryIds.map((id) =>
      sql`JSON_CONTAINS(${productsCache.countries}, JSON_OBJECT('id', ${id}))`
    );
    conditions.push(sql`(${sql.join(orClauses, sql` OR `)})`);
  }
  // Data range: 0.5x to 3x of the original plan's data (or any if original was unlimited)
  if (dataAmountGb > 0) {
    const minGb = dataAmountGb * 0.5;
    const maxGb = dataAmountGb * 3;
    conditions.push(sql`${productsCache.dataAmount} >= ${minGb}`);
    conditions.push(sql`${productsCache.dataAmount} <= ${maxGb}`);
  }
  const rows = await db
    .select()
    .from(productsCache)
    .where(and(...conditions))
    .orderBy(sql`ABS(${productsCache.dataAmount} - ${dataAmountGb}) ASC, ${productsCache.price} ASC`)
    .limit(limit);
  return rows;
}

// ---- Topup Orders DB helpers ----
export async function createTopupOrder(params: {
  parentOrderId: number;
  userId?: number | null;
  topupProductId: string;
  topupProductName: string;
  priceHkd: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { topupOrders } = await import("../drizzle/schema");
  const result = await db.insert(topupOrders).values({
    parentOrderId: params.parentOrderId,
    userId: params.userId ?? null,
    topupProductId: params.topupProductId,
    topupProductName: params.topupProductName,
    priceHkd: params.priceHkd,
  });
  return (result as unknown as [{ insertId: number }])[0].insertId;
}

export async function updateTopupOrderStatus(
  topupOrderId: number,
  status: "pending_payment" | "paid" | "completed" | "failed",
  extra?: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    vizlyncTopupOrderId?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { topupOrders } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(topupOrders)
    .set({ status, ...extra })
    .where(eq(topupOrders.id, topupOrderId));
}

export async function getTopupOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { topupOrders } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(topupOrders).where(eq(topupOrders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserTopupOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { topupOrders } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db.select().from(topupOrders).where(eq(topupOrders.userId, userId)).orderBy(desc(topupOrders.createdAt));
}

// Completed top-up orders for a given parent order that already have a Vizlync
// top-up order id. Used to aggregate add-on data into the parent's usage.
export async function getQueuedTopupOrdersByParent(parentOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  const { topupOrders } = await import("../drizzle/schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");
  // "completed" + vizlyncTopupOrderId not null = Vizlync has accepted the top-up order
  // but the top-up is waiting to auto-activate (when main card runs out).
  // This is the correct state to show the "Activate Top-up Early" button.
  return db
    .select()
    .from(topupOrders)
    .where(
      and(
        eq(topupOrders.parentOrderId, parentOrderId),
        eq(topupOrders.status, "completed"),
        isNotNull(topupOrders.vizlyncTopupOrderId)
      )
    );
}

export async function getCompletedTopupOrdersByParent(parentOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  const { topupOrders } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  return db
    .select()
    .from(topupOrders)
    .where(and(eq(topupOrders.parentOrderId, parentOrderId), eq(topupOrders.status, "completed")));
}

export async function adminListTopupOrders(params: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { topupOrders } = await import("../drizzle/schema");
  const { desc, like, eq, and, or, sql } = await import("drizzle-orm");
  const conditions: ReturnType<typeof eq>[] = [];
  if (params.status) {
    conditions.push(eq(topupOrders.status, params.status as "pending_payment" | "paid" | "completed" | "failed"));
  }
  if (params.search) {
    const s = `%${params.search}%`;
    conditions.push(
      or(
        like(topupOrders.topupProductName, s),
        like(topupOrders.stripeSessionId, s),
        like(topupOrders.vizlyncTopupOrderId, s),
      ) as ReturnType<typeof eq>
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (params.page - 1) * params.pageSize;
  const [items, countResult] = await Promise.all([
    db.select().from(topupOrders).where(where).orderBy(desc(topupOrders.createdAt)).limit(params.pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(topupOrders).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

// ---- Reconciliation helpers ----
// Find orders that are stuck in pending_payment/processing but have a Stripe session,
// and were created more than `olderThanMinutes` ago (i.e. webhook may have failed).
export async function getStalePendingOrders(olderThanMinutes = 5) {
  const db = await getDb();
  if (!db) return [];
  const { and, or, eq, lt, isNotNull } = await import("drizzle-orm");
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return db
    .select()
    .from(orders)
    .where(
      and(
        or(eq(orders.status, "pending_payment"), eq(orders.status, "processing")),
        isNotNull(orders.stripeSessionId),
        lt(orders.createdAt, cutoff),
      ),
    )
    .limit(100);
}

export async function getStalePendingTopupOrders(olderThanMinutes = 5) {
  const db = await getDb();
  if (!db) return [];
  const { topupOrders } = await import("../drizzle/schema");
  const { and, or, eq, lt, isNotNull } = await import("drizzle-orm");
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return db
    .select()
    .from(topupOrders)
    .where(
      and(
        or(eq(topupOrders.status, "pending_payment"), eq(topupOrders.status, "paid")),
        isNotNull(topupOrders.stripeSessionId),
        lt(topupOrders.createdAt, cutoff),
      ),
    )
    .limit(100);
}

export async function getOrdersByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  const { inArray } = await import("drizzle-orm");
  return db.select().from(orders).where(inArray(orders.id, ids));
}

export async function getTranslationStats() {
  const db = await getDb();
  if (!db) return { total: 0, translatedZh: 0, translatedJa: 0, translatedKo: 0, translatedTh: 0 };
  const [result] = await db.select({
    total: sql<number>`COUNT(*)`,
    translatedZh: sql<number>`SUM(CASE WHEN ${productsCache.descriptionZhTW} IS NOT NULL OR ${productsCache.descriptionZhTW} = '' THEN 1 ELSE 0 END)`,
    // Count both non-null and empty-string ('') as "processed" to match getUntranslatedProductIds logic
    translatedJa: sql<number>`SUM(CASE WHEN ${productsCache.descriptionJa} IS NOT NULL OR ${productsCache.descriptionJa} = '' THEN 1 ELSE 0 END)`,
    translatedKo: sql<number>`SUM(CASE WHEN ${productsCache.descriptionKo} IS NOT NULL OR ${productsCache.descriptionKo} = '' THEN 1 ELSE 0 END)`,
    translatedTh: sql<number>`SUM(CASE WHEN ${productsCache.descriptionTh} IS NOT NULL OR ${productsCache.descriptionTh} = '' THEN 1 ELSE 0 END)`,
  }).from(productsCache).where(eq(productsCache.isActive, true));
  return {
    total: Number(result?.total ?? 0),
    translatedZh: Number(result?.translatedZh ?? 0),
    translatedJa: Number(result?.translatedJa ?? 0),
    translatedKo: Number(result?.translatedKo ?? 0),
    translatedTh: Number(result?.translatedTh ?? 0),
  };
}

export async function getUntranslatedProductIds(lang: "ja" | "ko" | "th" | "zh-TW", limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const { isNull, and, eq } = await import("drizzle-orm");
  const col = lang === "ja" ? productsCache.descriptionJa
    : lang === "ko" ? productsCache.descriptionKo
    : lang === "th" ? productsCache.descriptionTh
    : productsCache.descriptionZhTW;
  // Only select active products where the target lang column is NULL
  // (empty string '' means already processed but had no content — skip those too)
  const rows = await db.select({ productId: productsCache.productId })
    .from(productsCache)
    .where(and(eq(productsCache.isActive, true), isNull(col)))
    .limit(limit);
  return rows.map(r => r.productId);
}

// Find orders that are still pending_payment, older than X hours, and haven't had a reminder sent yet
// (or reminder was sent more than reminderIntervalHours ago)
// Reminder schedule: 6h, 18h, 36h, 72h after order creation (max 4 reminders)
const REMINDER_SCHEDULE_HOURS = [6, 18, 36, 72];

export async function getPendingOrdersForReminder() {
  const db = await getDb();
  if (!db) return [];
  const { and: _and, eq: _eq, lt: _lt, gt: _gt, or: _or, isNull: _isNull, lte: _lte } = await import("drizzle-orm");
  const now = Date.now();

  // Find all pending_payment orders that haven't exceeded max reminders
  const candidates = await db
    .select()
    .from(orders)
    .where(
      _and(
        _eq(orders.status, "pending_payment"),
        // Created more than 6h ago (minimum first reminder threshold)
        _lt(orders.createdAt, new Date(now - 6 * 60 * 60 * 1000)),
        // Reminders are due at 6h/18h/36h/72h, so never chase orders older than 5 days
        // (avoids emailing long-abandoned orders when the job is first switched on)
        _gt(orders.createdAt, new Date(now - 5 * 24 * 60 * 60 * 1000)),
        // Haven't sent all 4 reminders yet
        _lte(orders.paymentReminderCount ?? 0, 3),
      ),
    )
    .limit(50);

  // Filter: only include orders that are due for their next reminder
  return candidates.filter((order) => {
    const count = order.paymentReminderCount ?? 0;
    if (count >= REMINDER_SCHEDULE_HOURS.length) return false; // max reached
    const nextReminderHours = REMINDER_SCHEDULE_HOURS[count];
    const nextReminderTime = new Date(order.createdAt.getTime() + nextReminderHours * 60 * 60 * 1000);
    return new Date() >= nextReminderTime;
  });
}

export async function markOrderReminderSent(orderId: number, currentCount: number) {
  const db = await getDb();
  if (!db) return;
  const { eq: _eq } = await import("drizzle-orm");
  await db
    .update(orders)
    .set({ paymentReminderSentAt: new Date(), paymentReminderCount: currentCount + 1 })
    .where(_eq(orders.id, orderId));
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

export async function createEmailLog(params: {
  orderId?: number | null;
  topupOrderId?: number | null;
  userId?: number | null;
  toEmail: string;
  emailType: string; // e.g. order_confirmation | payment_reminder | expiry_reminder | topup_confirmation | custom
  subject: string;
  status: "sent" | "failed";
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailLogs).values({
    orderId: params.orderId ?? null,
    topupOrderId: params.topupOrderId ?? null,
    userId: params.userId ?? null,
    toEmail: params.toEmail.toLowerCase().trim(),
    emailType: params.emailType,
    subject: params.subject,
    status: params.status,
    errorMessage: params.errorMessage ?? null,
    sentAt: new Date(),
  });
}

export async function getEmailLogsByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  const { eq: _eq, desc: _desc } = await import("drizzle-orm");
  return db
    .select()
    .from(emailLogs)
    .where(_eq(emailLogs.orderId, orderId))
    .orderBy(_desc(emailLogs.sentAt))
    .limit(50);
}

export async function getRecentEmailLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const { desc: _desc } = await import("drizzle-orm");
  return db
    .select()
    .from(emailLogs)
    .orderBy(_desc(emailLogs.sentAt))
    .limit(limit);
}

// ---- Sync History helpers ----
export async function insertSyncHistory(data: {
  triggeredBy: "manual" | "scheduled";
  status: "success" | "failed";
  supplier?: "vizlync" | "tgt";
  totalProducts: number;
  added: number;
  removed: number;
  priceChanged: number;
  failedCount?: number;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(syncHistory).values({
    triggeredBy: data.triggeredBy,
    supplier: data.supplier ?? "vizlync",
    status: data.status,
    totalProducts: data.totalProducts,
    added: data.added,
    removed: data.removed,
    priceChanged: data.priceChanged,
    failedCount: data.failedCount ?? 0,
    errorMessage: data.errorMessage ?? null,
  });
}

export async function getRecentSyncHistory(limit = 5, supplier?: "vizlync" | "tgt") {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(syncHistory)
    .where(supplier ? eq(syncHistory.supplier, supplier) : undefined)
    .orderBy(desc(syncHistory.createdAt))
    .limit(limit);
}
