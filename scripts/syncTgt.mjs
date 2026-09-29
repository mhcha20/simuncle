#!/usr/bin/env node
// Run with: npx tsx scripts/syncTgt.mjs
// This script directly calls the TGT sync logic and writes to DB

import { createRequire } from 'module';
import { execSync } from 'child_process';

// Use tsx to run the TypeScript sync logic
const result = execSync(
  'npx tsx -e "' +
  "import { fetchAllTgtProducts } from './server/tgt.ts';" +
  "import { upsertProduct, getDb } from './server/db.ts';" +
  "const products = await fetchAllTgtProducts();" +
  "console.log('Fetched', products.length, 'TGT products');" +
  "let synced = 0; let errors = [];" +
  "for (const p of products) {" +
  "  try {" +
  "    await upsertProduct({ productId: p.productId, name: p.name, description: p.description || '', price: p.price, validityDays: p.validityDays, countries: p.countries, region: p.region, dataAmount: p.dataAmount, dataUnit: p.dataUnit, networkType: p.networkType, topUpAvailable: false, supplier: 'tgt', rawData: p });" +
  "    synced++;" +
  "  } catch(e) { errors.push({ productId: p.productId, error: e.message }); }" +
  "}" +
  "console.log('Synced:', synced, 'Errors:', errors.length);" +
  "if (errors.length > 0) console.log('First error:', JSON.stringify(errors[0]));" +
  '"',
  { cwd: '/home/ubuntu/esim-uncle', encoding: 'utf8', timeout: 120000 }
);
console.log(result);
