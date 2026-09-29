/**
 * TGT Technology Global eSIM API v2.0 Integration
 *
 * Architecture notes:
 * - Auth: POST /oauth/token with accountId + secret → Bearer token (24h TTL)
 * - Products: POST /eSIMApi/v2/products/list (paginated, max 100/page)
 * - Order create: POST /eSIMApi/v2/order/create → returns orderNo only (async)
 * - eSIM delivery: via callback to /api/tgt/callback (qrCode, iccid, imsi, msisdn)
 * - Callback must respond { code: "0000", msg: "success" } within 10 seconds
 */

import crypto from "crypto";
import axios from "axios";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Country lookup tables (shared with frontend) ────────────────────────────
// We read the source file at module load time to avoid a circular dep.
// The maps are small (~300 entries) so this is fine.
let _countryNameMap: Record<string, { en: string }> = {};
let _countryRegionMap: Record<string, string> = {};
try {
  // Dynamic require of the TS source via a simple regex parse to avoid ts-node issues
  const src = readFileSync(resolve(__dirname, "../client/src/lib/countryNames.ts"), "utf-8");
  // Extract countryNameMap entries: XX: { ..., en: "Name", ... }
  const nameRe = /([A-Z]{2}(?:-[A-Z0-9]+)?):\s*\{[^}]*en:\s*"([^"]+)"/g;
  let m;
  while ((m = nameRe.exec(src)) !== null) {
    _countryNameMap[m[1]] = { en: m[2] };
  }
  // Extract countryRegionMap entries: XX: "Region"
  const regionRe = /([A-Z]{2}(?:-[A-Z0-9]+)?):\s*"([^"]+)"/g;
  while ((m = regionRe.exec(src)) !== null) {
    _countryRegionMap[m[1]] = m[2];
  }
} catch {
  // Fallback: maps stay empty, products will use ISO code as name and no region
}

function getCountryName(code: string): string {
  return _countryNameMap[code]?.en ?? code;
}

function inferRegionsFromCodes(codes: string[]): string[] {
  const regions = new Set<string>();
  for (const code of codes) {
    const r = _countryRegionMap[code];
    if (r) regions.add(r);
  }
  return Array.from(regions);
}

const TGT_BASE = process.env.TGT_API_BASE_URL ?? "https://enterpriseapisandbox.tugegroup.com:8070/openapi";
const TGT_ACCOUNT_ID = process.env.TGT_ACCOUNT_ID ?? "";
const TGT_SECRET = process.env.TGT_SECRET ?? "";

// ─── Token cache ────────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0; // unix ms

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 5 minutes before expiry
  if (_cachedToken && now < _tokenExpiresAt - 5 * 60 * 1000) {
    return _cachedToken;
  }

  const url = `${TGT_BASE}/oauth/token`;
  const res = await axios.post(
    url,
    { accountId: TGT_ACCOUNT_ID, secret: TGT_SECRET },
    { headers: { "Content-Type": "application/json;charset=UTF-8" }, timeout: 15000 }
  );

  const body = res.data;
  if (body?.code !== "0000") {
    throw new Error(`TGT auth failed: ${body?.code} ${body?.msg}`);
  }

  // TGT API returns the token in `data.token` (not `data.accessToken`)
  _cachedToken = (body.data.token ?? body.data.accessToken) as string;
  // expires field is seconds from now (default 86400 = 24h)
  const expiresIn = Number(body.data.expires ?? 86400);
  _tokenExpiresAt = now + expiresIn * 1000;
  return _cachedToken;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json;charset=UTF-8",
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TgtTopupInfo {
  topupId: string;
  topupName: string;
  topupSize: number;
  topupUnit: string;
  topupPrice: number;
}

export interface TgtProduct {
  productCode: string;
  productName: string;
  productType: "DAILY_PACK" | "DATA_PACK" | string;
  cardType: string;
  countryCodeList: string[];
  mccList?: string[];
  netPrice: number;
  periodType: 0 | 1; // 0=24h, 1=calendar day
  usagePeriod: number; // days after activation
  validityPeriod: number; // days before activation
  dataLimited: "Y" | "N";
  dataTotal: number;
  dataUnit: "MB" | "GB" | string;
  activeType: "AUTO_ACTIVATE" | "ACTIVATE_ON_ORDER" | string;
  ruleDesc?: string;
  operatorDesc?: string;
  apnDesc?: string;
  highSpeed?: number;
  limitSpeed?: string;
  showGradeContent?: string;
  networkType?: string;
  topupInfoList?: TgtTopupInfo[];
}

export interface TgtOrderResult {
  orderNo: string;
}

export interface TgtCallbackPayload {
  code: string;
  msg: string;
  timestamp: string;
  sign: string;
  data: {
    eventType: number; // 1=card issuance, 2=renewal, 3=sms push
    businessType: string;
    idempotencyKey?: string;
    orderInfo: {
      orderNo: string;
      channelOrderNo: string;
      iccid?: string;
      qrCode?: string;
      imsi?: string;
      msisdn?: string;
      activatedStartTime?: string;
      activatedEndTime?: string;
      latestActivationTime?: string;
      renewExpirationTime?: string;
      createdTime?: string;
      orderType?: string;
    };
  };
}

// ─── Product listing ─────────────────────────────────────────────────────────

export async function fetchAllTgtProducts(): Promise<{ products: TgtProduct[]; total: number }> {
  const token = await getAccessToken();
  const pageSize = 100;
  let pageNum = 1;
  const allProducts: TgtProduct[] = [];
  let total = 0;

  while (true) {
    const res = await axios.post(
      `${TGT_BASE}/eSIMApi/v2/products/list`,
      { pageNum, pageSize, lang: "en" },
      { headers: authHeaders(token), timeout: 30000 }
    );

    const body = res.data;
    if (body?.code !== "0000") {
      throw new Error(`TGT products/list failed: ${body?.code} ${body?.msg}`);
    }

    const data = body.data as { total: number; list: TgtProduct[] };
    total = data.total;
    allProducts.push(...(data.list ?? []));

    if (allProducts.length >= total || (data.list ?? []).length < pageSize) break;
    pageNum++;
  }

  return { products: allProducts, total };
}

export async function fetchTgtProductDetail(productCode: string): Promise<TgtProduct> {
  const token = await getAccessToken();
  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/products/detail`,
    { productCode, lang: "en" },
    { headers: authHeaders(token), timeout: 15000 }
  );

  const body = res.data;
  if (body?.code !== "0000") {
    throw new Error(`TGT products/detail failed: ${body?.code} ${body?.msg}`);
  }
  return body.data as TgtProduct;
}

// ─── Order creation ───────────────────────────────────────────────────────────

export async function createTgtOrder(params: {
  productCode: string;
  channelOrderNo: string;
  idempotencyKey: string;
  email?: string;
  startDate?: string; // ISO date string, only for ACTIVATE_ON_ORDER products
}): Promise<TgtOrderResult> {
  const token = await getAccessToken();

  const payload: Record<string, unknown> = {
    productCode: params.productCode,
    channelOrderNo: params.channelOrderNo,
    idempotencyKey: params.idempotencyKey,
  };
  if (params.email) payload.email = params.email;
  if (params.startDate) payload.startDate = params.startDate;

  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/order/create`,
    payload,
    { headers: authHeaders(token), timeout: 30000 }
  );

  const body = res.data;
  if (body?.code !== "0000") {
    throw new Error(`TGT order/create failed: ${body?.code} ${body?.msg}`);
  }
  return { orderNo: body.data.orderNo as string };
}

// ─── Order query ──────────────────────────────────────────────────────────────

export async function getTgtOrderByChannelNo(channelOrderNo: string): Promise<Record<string, unknown> | null> {
  const token = await getAccessToken();
  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/order/orders`,
    { channelOrderNo },
    { headers: authHeaders(token), timeout: 15000 }
  );

  const body = res.data;
  if (body?.code !== "0000") return null;
  return (body.data?.list?.[0] ?? null) as Record<string, unknown> | null;
}

// ─── Order status & usage query ─────────────────────────────────────────────

export interface TgtOrderInfo {
  orderNo: string;
  productCode: string;
  productName: string;
  activatedStartTime?: string;
  activatedEndTime?: string;
  latestActivationTime?: string;
  renewExpirationTime?: string;
  createdTime?: string;
  orderStatus: string; // NOTACTIVE / ACTIVATED / INUSE / USED / EXPIRED / ABANDON / TERMINATION
  profileStatus: string; // nodownload / activated / downloaded / downloadfail / failed / ungenerated / etc.
  qrCode?: string;
  channelOrderNo?: string;
  orderType?: string;
  cardInfo?: {
    iccid?: string;
    imsi?: string;
    msisdn?: string;
    rentalContractNumber?: string;
  };
}

export interface TgtUsageInfo {
  dataTotal?: string;    // Total data for cycle, in MB (not returned for daily packages)
  dataUsage?: string;    // Current cycle data usage, in MB
  dataResidual?: string; // Remaining data, in MB (not returned for daily packages)
  refuelingTotal?: string; // Daily refueling package data total, in MB
  qtaconsumption?: string; // Daily high-speed data usage, in MB
}

/**
 * Query TGT order status and card info via API 4.8
 * Use channelOrderNo = "SU{orderId}" to look up our orders.
 */
export async function queryTgtOrder(channelOrderNo: string): Promise<TgtOrderInfo | null> {
  const token = await getAccessToken();
  let res;
  try {
    res = await axios.post(
      `${TGT_BASE}/eSIMApi/v2/order/orders`,
      { channelOrderNo },
      { headers: authHeaders(token), timeout: 15000 }
    );
  } catch (err: unknown) {
    // HTTP 404 or other network errors — treat as not found
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }

  const body = res.data;
  if (body?.code !== "0000") {
    if (body?.subCode === "5032") return null; // order not found
    throw new Error(`TGT order/orders failed: ${body?.code} ${body?.subCode} ${body?.subMsg ?? body?.msg}`);
  }

  // Response wraps in data.list[]
  const list = body.data?.list as TgtOrderInfo[] | undefined;
  return list?.[0] ?? null;
}

/**
 * Query TGT real-time data usage via API 4.10
 * Requires TGT system orderNo (SE...), not channelOrderNo.
 */
export async function queryTgtUsage(orderNo: string): Promise<TgtUsageInfo | null> {
  const token = await getAccessToken();
  let res;
  try {
    res = await axios.post(
      `${TGT_BASE}/eSIMApi/v2/order/usage`,
      { orderNo },
      { headers: authHeaders(token), timeout: 15000 }
    );
  } catch (err: unknown) {
    // HTTP 404 or other network errors — treat as not supported
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }

  const body = res.data;
  if (body?.code !== "0000") {
    // 5005 = card type does not support real-time traffic; 4068 = calculation in progress
    if (body?.subCode === "5005" || body?.subCode === "5002") return null;
    if (body?.subCode === "4068") return null; // calculation in progress
    throw new Error(`TGT order/usage failed: ${body?.code} ${body?.subCode} ${body?.subMsg ?? body?.msg}`);
  }

  return body.data as TgtUsageInfo;
}

// ─── Account balance ──────────────────────────────────────────────────────────

export async function getTgtAccountBalance(): Promise<{ balance: number; currency: string }> {
  const token = await getAccessToken();
  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/account/balance`,
    {},
    { headers: authHeaders(token), timeout: 10000 }
  );

  const body = res.data;
  if (body?.code !== "0000") {
    throw new Error(`TGT account/balance failed: ${body?.code} ${body?.msg}`);
  }
  return {
    balance: Number(body.data?.balance ?? 0),
    currency: String(body.data?.currency ?? "USD"),
  };
}

// ─── Callback signature verification ─────────────────────────────────────────

/**
 * Verify TGT callback signature.
 * Algorithm:
 * 1. Exclude `sign` field and null/empty fields.
 * 2. Flatten nested objects as "parent.child".
 * 3. Sort keys by ASCII ascending.
 * 4. Concatenate each key+value without separator.
 * 5. Prepend and append secret.
 * 6. MD5 → lowercase 32-char hex.
 */
export function verifyTgtCallbackSign(payload: Record<string, unknown>, receivedSign: string): boolean {
  const secret = TGT_SECRET;

  function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (k === "sign") continue;
      if (v === null || v === undefined || v === "") continue;
      if (typeof v === "object" && !Array.isArray(v)) {
        Object.assign(result, flatten(v as Record<string, unknown>, key));
      } else {
        result[key] = String(v);
      }
    }
    return result;
  }

  const flat = flatten(payload);
  const sortedKeys = Object.keys(flat).sort();
  let str = secret;
  for (const k of sortedKeys) {
    str += k + flat[k];
  }
  str += secret;

  const expected = crypto.createHash("md5").update(str, "utf8").digest("hex").toLowerCase();
  return expected === receivedSign.toLowerCase();
}

// ─── Normalise TGT product → products_cache shape ────────────────────────────

/**
 * Convert a TGT ProductInfo into the shape expected by `upsertProduct()` in db.ts.
 * The productId is prefixed with "tgt_" to avoid collision with Vizlync IDs.
 */
export function normalizeTgtProduct(p: TgtProduct): {
  productId: string;
  name: string;
  price: number;
  validityDays: number;
  countries: { id: string; name: string }[];
  region: string[];
  dataAmount: number;
  dataUnit: string;
  networkType: string;
  planType: string;
  topUpAvailable: boolean;
  rawData: TgtProduct;
  description: string;
  activationPolicy: string;
  startDateEnabled: boolean;
  supplier: string;
  parsedFromName: boolean; // true if dataAmount was parsed from product name (not from API)
} {
  const isUnlimited = p.dataLimited === "N";
  // For unlimited plans with daily high-speed quota, use highSpeed as dataAmount
  // highSpeed is in MB (e.g. 500 = 500MB/day)
  let dataAmount = isUnlimited
    ? (p.highSpeed != null && p.highSpeed > 0 ? p.highSpeed : -1)
    : Number(p.dataTotal ?? 0);
  // Unit: unlimited plans with highSpeed show MB/day; others use the API unit
  let dataUnit = isUnlimited
    ? (p.highSpeed != null && p.highSpeed > 0 ? "MB/天" : "GB")
    : (p.dataUnit ?? "GB");

  const productNameForParse = p.productName ?? p.productCode;

  let parsedFromName = false;

  // Fallback for Unlimited plans: parse daily quota from product name when highSpeed is missing
  if (isUnlimited && dataAmount === -1) {
    // Pattern: 每日高速XMB/GB
    const chineseGB = productNameForParse.match(/每日高速(\d+(?:\.\d+)?)GB/i);
    const chineseMB = productNameForParse.match(/每日高速(\d+(?:\.\d+)?)MB/i);
    // Pattern: daily XGB
    const dailyGB = productNameForParse.match(/daily\s+(\d+(?:\.\d+)?)\s*GB/i);
    const dailyMB = productNameForParse.match(/daily\s+(\d+(?:\.\d+)?)\s*MB/i);
    // Pattern: XGB/day or XGB/Day
    const perDayGB = productNameForParse.match(/(\d+(?:\.\d+)?)\s*GB\s*\/\s*[Dd]ay/);
    const perDayMB = !productNameForParse.match(/\d+\s*Mbps/i)
      ? productNameForParse.match(/(\d+(?:\.\d+)?)\s*MB\s*\/\s*[Dd]ay/)
      : null;

    if (chineseGB) { const v = parseFloat(chineseGB[1]); if (v > 0) { dataAmount = v; dataUnit = "GB/天"; parsedFromName = true; } }
    else if (chineseMB) { const v = parseFloat(chineseMB[1]); if (v > 0) { dataAmount = v; dataUnit = "MB/天"; parsedFromName = true; } }
    else if (dailyGB) { const v = parseFloat(dailyGB[1]); if (v > 0) { dataAmount = v; dataUnit = "GB/天"; parsedFromName = true; } }
    else if (dailyMB) { const v = parseFloat(dailyMB[1]); if (v > 0) { dataAmount = v; dataUnit = "MB/天"; parsedFromName = true; } }
    else if (perDayGB) { const v = parseFloat(perDayGB[1]); if (v > 0) { dataAmount = v; dataUnit = "GB/天"; parsedFromName = true; } }
    else if (perDayMB) { const v = parseFloat(perDayMB[1]); if (v > 0) { dataAmount = v; dataUnit = "MB/天"; parsedFromName = true; } }
  }

  // Fallback: if dataAmount is 0 (TGT API bug for fixed plans), parse from product name
  if (!isUnlimited && dataAmount === 0) {
    const cleanedForParse = productNameForParse
      .replace(/\d+\s*kbps/gi, "")
      .replace(/\d+\s*mbps\/day/gi, "")
      .replace(/\d+\s*mbps/gi, "")
      .replace(/每日高速\d+MB/g, "");
    const gbMatch = cleanedForParse.match(/(\d+(?:\.\d+)?)\s*GB/i);
    const mbMatch = cleanedForParse.match(/(\d+(?:\.\d+)?)\s*MB/i);
    if (gbMatch) {
      const parsed = parseFloat(gbMatch[1]);
      if (parsed > 0) { dataAmount = parsed; dataUnit = "GB"; parsedFromName = true; }
    } else if (mbMatch) {
      const parsed = parseFloat(mbMatch[1]);
      if (parsed > 0) { dataAmount = parsed; dataUnit = "MB"; parsedFromName = true; }
    }
  }

  // Strip 【eSIM】 prefix from product name (TGT naming convention)
  const cleanName = (p.productName ?? p.productCode).replace(/^[【\[](eSIM|esim)[】\]]\s*/i, "").trim();

  // Build country list from ISO codes with English names
  const countryCodes = p.countryCodeList ?? [];
  const countries = countryCodes.map((code) => ({ id: code, name: getCountryName(code) }));

  const topUpAvailable = Array.isArray(p.topupInfoList) && p.topupInfoList.length > 0;

  const description = [p.ruleDesc, p.operatorDesc, p.apnDesc].filter(Boolean).join("\n\n");

  // Infer region from country codes
  const region = inferRegionsFromCodes(countryCodes);

  return {
    productId: `tgt_${p.productCode.replace(/[\/\s]/g, '_')}`,
    name: cleanName,
    price: Number(p.netPrice ?? 0),
    validityDays: Number(p.usagePeriod ?? 0),
    countries,
    region,
    dataAmount,
    dataUnit,
    networkType: p.networkType ?? "4G,5G",
    planType: p.productType === "DAILY_PACK" ? "daily" : "data",
    topUpAvailable,
    rawData: p,
    description,
    activationPolicy: p.activeType ?? "AUTO_ACTIVATE",
    startDateEnabled: p.activeType === "ACTIVATE_ON_ORDER",
    supplier: "tgt",
    parsedFromName,
  };
}
