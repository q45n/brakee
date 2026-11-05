import type { Config, Context } from '@netlify/functions';
import { db } from '../../db/index.ts';
import { orders } from '../../db/schema.ts';
import { validateOrder, whatsappMessage, whatsappUrl, makeOrderRef } from '../../src/lib/order.ts';
import { formatBaisa } from '../../src/data/store.ts';

const MAX_BODY_BYTES = 16 * 1024;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });

function secureRandom(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients; still validated below
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'unsupported_media_type' }, 415);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }

  const result = validateOrder(body);
  if (!result.ok) {
    // Honeypot hits get a generic response so bots learn nothing.
    if (result.errors.includes('spam')) return json({ error: 'invalid' }, 400);
    return json({ error: 'validation', fields: result.errors }, 422);
  }
  const order = result.order;

  let ref: string | null = null;
  for (let attempt = 0; attempt < 3 && !ref; attempt++) {
    const candidate = makeOrderRef(new Date(), secureRandom);
    try {
      await db.insert(orders).values({
        ref: candidate,
        customerName: order.customer.name,
        phone: order.customer.phone,
        governorate: order.customer.governorateId,
        wilayat: order.customer.wilayat,
        address: order.customer.address,
        vin: order.vin,
        notes: order.notes,
        paymentMethod: order.payment,
        lang: order.lang,
        items: order.lines.map((l) => ({ sku: l.sku, qty: l.qty, unitBaisa: l.unitBaisa, lineBaisa: l.lineBaisa })),
        subtotalBaisa: order.subtotalBaisa,
        deliveryBaisa: order.deliveryBaisa,
        totalBaisa: order.totalBaisa,
      });
      ref = candidate;
    } catch (err) {
      const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as any)?.cause?.code;
      if (code === '23505') continue; // unique violation on ref — retry with a new one
      // Never log err.message: Drizzle includes the query parameters (customer PII) in it.
      const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
      console.error('order insert failed', { requestId: context.requestId, code: code ?? 'unknown', cause: cause?.code ?? cause?.message?.slice(0, 120) });
      return json({ error: 'server_error' }, 503);
    }
  }
  if (!ref) return json({ error: 'server_error' }, 503);

  const message = whatsappMessage(order, ref);
  return json({
    ref,
    lines: order.lines.map((l) => ({ sku: l.sku, qty: l.qty, name: l.name, line: formatBaisa(l.lineBaisa) })),
    subtotal: formatBaisa(order.subtotalBaisa),
    delivery: formatBaisa(order.deliveryBaisa),
    total: formatBaisa(order.totalBaisa),
    payment: order.payment,
    whatsapp: whatsappUrl(message),
  }, 201);
};

export const config: Config = {
  path: '/api/orders',
  method: ['POST'],
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
