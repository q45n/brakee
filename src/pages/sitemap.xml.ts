import type { APIRoute } from 'astro';
import { allPaths } from '../lib/routes.ts';
import { lp } from '../lib/i18n.ts';
import { STORE } from '../data/store.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = () => {
  const urls = allPaths().flatMap((path) => {
    const ar = new URL(lp('ar', path), STORE.url).href;
    const en = new URL(lp('en', path), STORE.url).href;
    const alts = `<xhtml:link rel="alternate" hreflang="ar-OM" href="${esc(ar)}"/><xhtml:link rel="alternate" hreflang="en-OM" href="${esc(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(ar)}"/>`;
    return [ar, en].map((loc) => `<url><loc>${esc(loc)}</loc>${alts}</url>`);
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
