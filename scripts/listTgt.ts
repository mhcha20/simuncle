import { fetchAllTgtProducts, normalizeTgtProduct } from '../server/tgt.ts';

const { products } = await fetchAllTgtProducts();
console.log(`Total: ${products.length} products\n`);
for (const p of products) {
  const n = normalizeTgtProduct(p);
  const countries = n.countries.map(c => c.id).join(',');
  const data = n.dataAmount === -1 ? 'Unlimited' : `${n.dataAmount}${n.dataUnit}`;
  console.log(`${n.productId}`);
  console.log(`  Name: ${n.name}`);
  console.log(`  Price: $${n.price} | Days: ${n.validityDays} | Data: ${data}`);
  console.log(`  Countries: ${countries}`);
  console.log(`  TopUp: ${n.topUpAvailable}`);
  console.log('');
}
process.exit(0);
