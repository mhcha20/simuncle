import { fetchAllTgtProducts, normalizeTgtProduct } from '../server/tgt.ts';
import { upsertProduct } from '../server/db.ts';

console.log('[TGT Sync] Starting...');

const { products, total } = await fetchAllTgtProducts();
console.log(`[TGT Sync] Fetched ${products.length} / ${total} products from TGT API`);

if (products.length === 0) {
  console.log('[TGT Sync] No products returned. Check API credentials and endpoint.');
  process.exit(1);
}

let synced = 0;
const errors: { productId: string; error: string }[] = [];

const BATCH = 20;
for (let i = 0; i < products.length; i += BATCH) {
  const batch = products.slice(i, i + BATCH);
  await Promise.all(
    batch.map(async (p) => {
      try {
        const normalized = normalizeTgtProduct(p);
        await upsertProduct({
          productId: normalized.productId,
          name: normalized.name,
          description: normalized.description,
          price: normalized.price,
          validityDays: normalized.validityDays,
          countries: normalized.countries,
          region: null,
          dataAmount: normalized.dataAmount,
          dataUnit: normalized.dataUnit,
          networkType: normalized.networkType,
          topUpAvailable: normalized.topUpAvailable,
          supplier: 'tgt',
          rawData: normalized.rawData,
        });
        synced++;
      } catch (e: unknown) {
        errors.push({ productId: p.productCode, error: (e as Error).message });
      }
    })
  );
  console.log(`[TGT Sync] Progress: ${Math.min(i + BATCH, products.length)}/${products.length}`);
}

console.log(`\n[TGT Sync] Done! Synced: ${synced}, Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log('[TGT Sync] First 5 errors:', JSON.stringify(errors.slice(0, 5), null, 2));
}
process.exit(0);
