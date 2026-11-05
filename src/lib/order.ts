// Order validation and pricing. Runs on the server (Netlify Function) — client-sent prices are never trusted.
import { PRODUCT_BY_SKU, type Product } from './catalog.ts';
import { GOVERNORATES, findWilayat } from '../data/governorates.ts';
import { STORE, formatBaisa } from '../data/store.ts';

export const PAYMENT_METHODS = ['cod', 'payment-link'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderLine { sku: string; qty: number; name: string; unitBaisa: number; lineBaisa: number; oe: string; fits: string }
export interface ValidOrder {
  lines: OrderLine[];
  subtotalBaisa: number;
  deliveryBaisa: number;
  totalBaisa: number;
  customer: { name: string; phone: string; governorateId: string; governorate: string; wilayat: string; address: string };
  vin: string | null;
  notes: string;
  payment: PaymentMethod;
  lang: 'ar' | 'en';
}

export type FieldError = 'items' | 'name' | 'phone' | 'governorate' | 'wilayat' | 'address' | 'vin' | 'notes' | 'payment' | 'spam';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Remove control characters and collapse whitespace; enforce max length. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/** Normalise an Omani mobile number: Arabic/Persian digits, spaces, +968 / 00968 prefixes. */
export function normalizePhone(v: unknown): string {
  if (typeof v !== 'string') return '';
  let d = v
    .replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)))
    .replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('968')) d = d.slice(3);
  if (d.length === 13 && d.startsWith('00968')) d = d.slice(5);
  return d;
}
export const isOmaniMobile = (d: string) => /^[79]\d{7}$/.test(d);

/** Merge duplicate SKUs, drop invalid entries, clamp quantities. */
export function normalizeItems(items: unknown): Array<{ sku: string; qty: number }> | null {
  if (!Array.isArray(items) || items.length === 0 || items.length > STORE.maxLines * 2) return null;
  const merged = new Map<string, number>();
  for (const it of items) {
    if (!it || typeof it !== 'object') return null;
    const sku = typeof (it as any).sku === 'string' ? (it as any).sku.trim() : '';
    const qty = Number((it as any).qty);
    if (!PRODUCT_BY_SKU.has(sku) || !Number.isInteger(qty) || qty < 1) return null;
    merged.set(sku, Math.min(STORE.maxQtyPerLine, (merged.get(sku) ?? 0) + qty));
  }
  if (merged.size > STORE.maxLines) return null;
  return [...merged.entries()].map(([sku, qty]) => ({ sku, qty }));
}

export function priceLines(items: Array<{ sku: string; qty: number }>, lang: 'ar' | 'en' = 'ar') {
  const lines: OrderLine[] = items.map(({ sku, qty }) => {
    const p = PRODUCT_BY_SKU.get(sku) as Product;
    return { sku, qty, name: p.title[lang], unitBaisa: p.priceBaisa, lineBaisa: p.priceBaisa * qty, oe: p.oe, fits: p.fits };
  });
  const subtotalBaisa = lines.reduce((s, l) => s + l.lineBaisa, 0);
  const deliveryBaisa = lines.length ? STORE.deliveryFeeBaisa : 0;
  return { lines, subtotalBaisa, deliveryBaisa, totalBaisa: subtotalBaisa + deliveryBaisa };
}

export function validateOrder(body: unknown): { ok: true; order: ValidOrder } | { ok: false; errors: FieldError[] } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  // Honeypot: real users never see or fill this field.
  if (typeof b.company === 'string' && b.company.trim() !== '') return { ok: false, errors: ['spam'] };

  const items = normalizeItems(b.items);
  if (!items) errors.push('items');

  const c = (b.customer && typeof b.customer === 'object' ? b.customer : {}) as Record<string, unknown>;
  const name = cleanText(c.name, 80);
  if (name.length < 2) errors.push('name');
  const phone = normalizePhone(c.phone);
  if (!isOmaniMobile(phone)) errors.push('phone');

  const govId = typeof c.governorate === 'string' ? c.governorate : '';
  const wilEn = typeof c.wilayat === 'string' ? c.wilayat : '';
  const gov = GOVERNORATES.find((g) => g.id === govId);
  if (!gov) errors.push('governorate');
  const loc = gov ? findWilayat(govId, wilEn) : null;
  if (gov && !loc) errors.push('wilayat');

  const address = cleanText(c.address, 300);
  if (address.length < 3) errors.push('address');

  let vin: string | null = null;
  if (typeof b.vin === 'string' && b.vin.trim()) {
    const v = b.vin.trim().toUpperCase().replace(/\s/g, '');
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) vin = v; else errors.push('vin');
  }
  const notes = cleanText(b.notes, 500);

  const payment = (PAYMENT_METHODS as readonly string[]).includes(b.payment as string) ? (b.payment as PaymentMethod) : null;
  if (!payment) errors.push('payment');
  const lang = b.lang === 'en' ? 'en' : 'ar';

  if (errors.length || !items || !loc || !payment) return { ok: false, errors };
  const priced = priceLines(items, lang);
  return {
    ok: true,
    order: {
      ...priced,
      customer: { name, phone, governorateId: loc.gov.id, governorate: loc.gov.ar, wilayat: loc.wil.ar, address },
      vin, notes, payment, lang,
    },
  };
}

const PAYMENT_LABEL_AR: Record<PaymentMethod, string> = {
  cod: 'الدفع عند الاستلام',
  'payment-link': 'بطاقة / Apple Pay عبر رابط دفع يرسله المتجر',
};

/** WhatsApp message for the store (Arabic, as the original site used). */
export function whatsappMessage(order: Pick<ValidOrder, 'lines' | 'subtotalBaisa' | 'deliveryBaisa' | 'totalBaisa' | 'customer' | 'vin' | 'notes' | 'payment'>, ref: string | null): string {
  const L: string[] = [];
  L.push(ref ? `مرحباً، طلب جديد رقم ${ref}` : 'مرحباً، أرغب بطلب القطع التالية:');
  L.push('');
  for (const l of order.lines) {
    L.push(`- ${l.sku}${l.oe && l.oe !== l.sku ? ` (OE ${l.oe})` : ''} × ${l.qty} = ${formatBaisa(l.lineBaisa)} ر.ع`);
    L.push(`  ${l.fits}`);
  }
  L.push('');
  L.push(`المجموع الفرعي: ${formatBaisa(order.subtotalBaisa)} ر.ع`);
  L.push(`التوصيل: ${formatBaisa(order.deliveryBaisa)} ر.ع`);
  L.push(`الإجمالي: ${formatBaisa(order.totalBaisa)} ر.ع`);
  L.push('');
  L.push('--- بيانات التوصيل ---');
  L.push(`الاسم: ${order.customer.name}`);
  L.push(`الهاتف: +968 ${order.customer.phone}`);
  L.push(`المحافظة: ${order.customer.governorate}`);
  L.push(`الولاية: ${order.customer.wilayat}`);
  L.push(`العنوان: ${order.customer.address}`);
  if (order.vin) L.push(`رقم الشاصي (VIN): ${order.vin}`);
  if (order.notes) L.push(`ملاحظات: ${order.notes}`);
  L.push('');
  L.push(`طريقة الدفع: ${PAYMENT_LABEL_AR[order.payment]}`);
  return L.join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Human-friendly order reference, e.g. BO-261105-7KQ4 (no ambiguous characters). */
export function makeOrderRef(now = new Date(), rand: () => number = Math.random): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const d = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  let s = '';
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
  return `BO-${d}-${s}`;
}
