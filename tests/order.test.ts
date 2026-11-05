import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder, normalizeItems, priceLines, normalizePhone, cleanText, whatsappMessage, makeOrderRef } from '../src/lib/order.ts';
import { formatBaisa, toBaisa } from '../src/data/store.ts';

const base = () => ({
  items: [{ sku: 'P06020', qty: 1 }],
  customer: { name: 'Salim', phone: '91234567', governorate: 'muscat', wilayat: 'Bawshar', address: 'Al Khuwair, Way 3013' },
  payment: 'cod',
});

test('baisa formatting and conversion avoid float drift', () => {
  assert.equal(toBaisa(39.745), 39745);
  assert.equal(toBaisa(22.47), 22470);
  assert.equal(formatBaisa(2000), '2.000');
  assert.equal(formatBaisa(106538), '106.538');
  assert.equal(formatBaisa(5), '0.005');
});

test('pricing is computed from the catalogue, with flat delivery', () => {
  const r = priceLines([{ sku: 'P06020', qty: 2 }, { sku: '09.8952.75', qty: 2 }]);
  assert.equal(r.subtotalBaisa, 2 * 22470 + 2 * 29799);
  assert.equal(r.deliveryBaisa, 2000);
  assert.equal(r.totalBaisa, 106538);
});

test('duplicate cart lines are merged and quantities clamped', () => {
  assert.deepEqual(normalizeItems([{ sku: 'P06020', qty: 2 }, { sku: 'P06020', qty: 1 }]), [{ sku: 'P06020', qty: 3 }]);
  assert.deepEqual(normalizeItems([{ sku: 'P06020', qty: 500 }]), [{ sku: 'P06020', qty: 99 }]);
  assert.equal(normalizeItems([{ sku: 'NOPE', qty: 1 }]), null);
  assert.equal(normalizeItems([{ sku: 'P06020', qty: 0 }]), null);
  assert.equal(normalizeItems([{ sku: 'P06020', qty: 1.5 }]), null);
  assert.equal(normalizeItems([]), null);
  assert.equal(normalizeItems('x'), null);
});

test('client-supplied prices are ignored', () => {
  const r = validateOrder({ ...base(), items: [{ sku: 'P06020', qty: 1, price: 0.001 }], total: 1 });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.order.totalBaisa, 22470 + 2000);
});

test('Omani phone normalisation', () => {
  assert.equal(normalizePhone('٩١٢٣٤٥٦٧'), '91234567');
  assert.equal(normalizePhone('+968 9123 4567'), '91234567');
  assert.equal(normalizePhone('0096891234567'), '91234567');
  const bad = validateOrder({ ...base(), customer: { ...base().customer, phone: '81234567' } });
  assert.ok(!bad.ok && bad.errors.includes('phone'));
});

test('governorate / wilayat must be a real pair', () => {
  const r = validateOrder({ ...base(), customer: { ...base().customer, governorate: 'muscat', wilayat: 'Salalah' } });
  assert.ok(!r.ok && r.errors.includes('wilayat'));
  const ok = validateOrder({ ...base(), customer: { ...base().customer, governorate: 'dhofar', wilayat: 'Al Mazyunah' } });
  assert.ok(ok.ok);
});

test('VIN validation', () => {
  assert.ok(validateOrder({ ...base(), vin: 'WDD2050421F123456' }).ok);
  const r = validateOrder({ ...base(), vin: 'WDD2050421F12345O' });
  assert.ok(!r.ok && r.errors.includes('vin'));
});

test('honeypot and payment method', () => {
  const spam = validateOrder({ ...base(), company: 'ACME' });
  assert.ok(!spam.ok && spam.errors.includes('spam'));
  const pay = validateOrder({ ...base(), payment: 'card-number' });
  assert.ok(!pay.ok && pay.errors.includes('payment'));
});

test('text cleaning strips control and bidi-override characters', () => {
  assert.equal(cleanText('a\u0000b‮c  d', 50), 'abc d');
  assert.equal(cleanText('x'.repeat(100), 10).length, 10);
  assert.equal(cleanText(42, 10), '');
});

test('WhatsApp message contains ref, lines and totals', () => {
  const r = validateOrder(base());
  assert.ok(r.ok);
  if (!r.ok) return;
  const m = whatsappMessage(r.order, 'BO-261105-ABCDE');
  assert.match(m, /BO-261105-ABCDE/);
  assert.match(m, /P06020/);
  assert.match(m, /الإجمالي: 24\.470/);
});

test('order reference format', () => {
  assert.match(makeOrderRef(new Date('2026-11-05T00:00:00Z')), /^BO-261105-[2-9A-HJ-NP-Z]{5}$/);
});
