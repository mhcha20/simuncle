/**
 * TGT Sandbox Test Order Script
 * 1. Get access token
 * 2. List products → pick the first available one
 * 3. Create a test order
 * 4. Print the orderNo so we can track the callback
 */

import axios from "axios";
import crypto from "crypto";
import { config } from "dotenv";
import { readFileSync } from "fs";

// Load env from .env file if present
try {
  config();
} catch {}

// Read from process.env (injected by the platform)
const TGT_BASE = process.env.TGT_API_BASE_URL ?? "https://enterpriseapisandbox.tugegroup.com:8070/openapi";
const TGT_ACCOUNT_ID = process.env.TGT_ACCOUNT_ID ?? "";
const TGT_SECRET = process.env.TGT_SECRET ?? "";

console.log("=== TGT Sandbox Test Order ===");
console.log("Base URL:", TGT_BASE);
console.log("Account ID:", TGT_ACCOUNT_ID ? TGT_ACCOUNT_ID.slice(0, 4) + "****" : "(not set)");
console.log("Secret:", TGT_SECRET ? "****" : "(not set)");
console.log("");

async function getToken() {
  const res = await axios.post(
    `${TGT_BASE}/oauth/token`,
    { accountId: TGT_ACCOUNT_ID, secret: TGT_SECRET },
    { headers: { "Content-Type": "application/json;charset=UTF-8" }, timeout: 15000 }
  );
  const body = res.data;
  if (body?.code !== "0000") throw new Error(`Auth failed: ${body?.code} ${body?.msg}`);
  const token = body.data.token ?? body.data.accessToken;
  console.log("✅ Got access token:", token.slice(0, 10) + "...");
  return token;
}

async function listProducts(token) {
  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/products/list`,
    { pageNum: 1, pageSize: 10, lang: "en" },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json;charset=UTF-8" }, timeout: 30000 }
  );
  const body = res.data;
  if (body?.code !== "0000") throw new Error(`Products list failed: ${body?.code} ${body?.msg}`);
  const products = body.data?.list ?? [];
  console.log(`✅ Got ${products.length} products (total: ${body.data?.total})`);
  return products;
}

async function createOrder(token, productCode) {
  const channelOrderNo = `TEST_${Date.now()}`;
  const idempotencyKey = crypto.randomUUID();
  
  console.log(`\n📦 Creating order for product: ${productCode}`);
  console.log(`   channelOrderNo: ${channelOrderNo}`);
  console.log(`   idempotencyKey: ${idempotencyKey}`);
  
  const res = await axios.post(
    `${TGT_BASE}/eSIMApi/v2/order/create`,
    {
      productCode,
      channelOrderNo,
      idempotencyKey,
      email: "test@simuncle.com",
    },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json;charset=UTF-8" }, timeout: 30000 }
  );
  const body = res.data;
  console.log("\n📬 Order API response:", JSON.stringify(body, null, 2));
  
  if (body?.code !== "0000") throw new Error(`Order create failed: ${body?.code} ${body?.msg}`);
  return { orderNo: body.data.orderNo, channelOrderNo, idempotencyKey };
}

async function main() {
  try {
    const token = await getToken();
    const products = await listProducts(token);
    
    if (products.length === 0) {
      console.log("❌ No products available in sandbox");
      return;
    }
    
    // Show first 5 products
    console.log("\n📋 Available products (first 5):");
    products.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.productCode}] ${p.productName} - ${p.dataTotal}${p.dataUnit} / ${p.usagePeriod}days - $${p.netPrice}`);
    });
    
    // Pick the first product
    const product = products[0];
    console.log(`\n🎯 Selected: [${product.productCode}] ${product.productName}`);
    
    const result = await createOrder(token, product.productCode);
    
    console.log("\n✅ Order created successfully!");
    console.log("   TGT orderNo:", result.orderNo);
    console.log("   channelOrderNo:", result.channelOrderNo);
    console.log("\n⏳ Waiting for TGT callback to:");
    console.log("   https://esimuncle-qznnvxsv.manus.space/api/tgt/callback");
    console.log("\n📝 Tell TGT team:");
    console.log(`   We placed a test order in sandbox.`);
    console.log(`   TGT orderNo: ${result.orderNo}`);
    console.log(`   channelOrderNo: ${result.channelOrderNo}`);
    console.log(`   Callback URL: https://esimuncle-qznnvxsv.manus.space/api/tgt/callback`);
    console.log(`   Please trigger the callback so we can confirm receipt.`);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.response) {
      console.error("   Response:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

main();
