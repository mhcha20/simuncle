import { fetchAllTgtProducts, normalizeTgtProduct } from '../server/tgt.ts';

const { products } = await fetchAllTgtProducts();
const p = products.find(x => x.productCode.includes('TMO-001'));
if (p) {
  console.log('=== Raw TGT product ===');
  console.log(JSON.stringify(p, null, 2));
  console.log('\n=== Normalized ===');
  const n = normalizeTgtProduct(p);
  console.log('productId:', JSON.stringify(n.productId));
  console.log('name:', JSON.stringify(n.name));
  console.log('price:', n.price, typeof n.price);
  console.log('validityDays:', n.validityDays, typeof n.validityDays);
  console.log('dataAmount:', n.dataAmount, typeof n.dataAmount);
  console.log('countries:', JSON.stringify(n.countries));
  console.log('topUpAvailable:', n.topUpAvailable, typeof n.topUpAvailable);
}
process.exit(0);
