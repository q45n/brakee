import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAW_ITEMS } from '../src/data/catalog.ts';
import { PRODUCTS, PRODUCT_BY_SKU, complementary, related, VEHICLE_INDEX } from '../src/lib/catalog.ts';
import { parseFitment } from '../src/lib/fitment.ts';
import { matchesQuery } from '../src/lib/text.ts';
import { GOVERNORATES } from '../src/data/governorates.ts';

test('all 264 original products are preserved with unchanged prices', () => {
  assert.equal(RAW_ITEMS.length, 264);
  assert.equal(PRODUCTS.length, 264);
  for (const r of RAW_ITEMS) {
    const p = PRODUCT_BY_SKU.get(r.sku)!;
    assert.ok(p, r.sku);
    assert.equal(p.priceBaisa, Math.round(r.price * 1000), r.sku);
    assert.equal(p.oe, r.oe);
  }
});

test('SKUs and slugs are unique and URL-safe', () => {
  assert.equal(new Set(PRODUCTS.map((p) => p.sku)).size, 264);
  assert.equal(new Set(PRODUCTS.map((p) => p.slug)).size, 264);
  for (const p of PRODUCTS) assert.match(p.slug, /^[a-z0-9-]+$/);
});

test('fitment parser keeps listed data and never invents years', () => {
  const [a] = parseFitment('BMW 3 Series (F30/F31, 2012-2019)') as any;
  assert.deepEqual([a.make, a.model, a.chassis, a.yearFrom, a.yearTo], ['bmw', '3 Series', ['F30', 'F31'], 2012, 2019]);
  const [b] = parseFitment('Mercedes C-Class (W204)') as any;
  assert.equal(b.yearFrom, null);
  const hon = parseFitment('Honda Accord (7th Gen 2003-2007 / 8th Gen 2008-2012)') as any[];
  assert.equal(hon.length, 2);
  const [vw] = parseFitment('VW VI') as any;
  assert.equal(vw.unclear, true);
  assert.equal((parseFitment('Universal - all vehicles (DOT 4 specification)')[0] as any).universal, true);
});

test('every non-fluid product maps to at least one make', () => {
  for (const p of PRODUCTS) if (!p.universal) assert.ok(p.makes.length > 0, p.sku);
  assert.ok(VEHICLE_INDEX.length >= 15);
});

test('search: SKU, OE with/without spaces, Arabic synonyms', () => {
  const find = (q: string) => PRODUCTS.filter((p) => matchesQuery(p.search, q)).map((p) => p.sku);
  assert.deepEqual(find('P06020'), ['P06020']);
  assert.deepEqual(find('34116855156'), ['09.8952.75']);
  assert.deepEqual(find('34 11 6 855 156'), ['09.8952.75']);
  assert.ok(find('ديسك مرسيدس').every((s) => PRODUCT_BY_SKU.get(s)!.category === 'brake-discs'));
  assert.ok(find('W205').length > 0);
  assert.deepEqual(find('zzzz-nothing'), []);
});

test('recommendations exclude the product itself', () => {
  const p = PRODUCT_BY_SKU.get('P06020')!;
  assert.ok(!related(p).some((x) => x.sku === p.sku));
  assert.ok(complementary(p).every((x) => x.category !== p.category));
});

test('governorates: 11 governorates, no wilayat listed twice', () => {
  assert.equal(GOVERNORATES.length, 11);
  const all = GOVERNORATES.flatMap((g) => g.wilayats.map((w) => w.ar));
  assert.equal(new Set(all).size, all.length);
});
