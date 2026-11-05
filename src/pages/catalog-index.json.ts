import type { APIRoute } from 'astro';
import { PRODUCTS } from '../lib/catalog.ts';

// Compact product index used by the cart drawer, checkout summary and search suggestions.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(PRODUCTS.map((p) => ({
    s: p.sku, u: p.slug, n: p.name, f: p.fits, p: p.priceBaisa, i: p.image, un: p.unit, o: p.oe, c: p.category, t: p.search,
  }))), { headers: { 'content-type': 'application/json; charset=utf-8' } });
