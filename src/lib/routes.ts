import { PRODUCTS, CATEGORIES, VEHICLE_INDEX } from './catalog.ts';

/** Every indexable path (without language prefix). Used for the sitemap. */
export function allPaths(): string[] {
  return [
    '/', '/shop/', '/vehicles/', '/delivery/', '/fitment/',
    ...CATEGORIES.map((c) => `/shop/${c.id}/`),
    ...VEHICLE_INDEX.map((m) => `/vehicles/${m.id}/`),
    ...PRODUCTS.map((p) => `/p/${p.slug}/`),
  ];
}
