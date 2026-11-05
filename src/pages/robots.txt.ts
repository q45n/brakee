import type { APIRoute } from 'astro';
import { STORE } from '../data/store.ts';

export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /checkout/', 'Disallow: /en/checkout/', 'Disallow: /order/', 'Disallow: /en/order/', 'Disallow: /api/', '', `Sitemap: ${STORE.url}/sitemap.xml`, ''].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
