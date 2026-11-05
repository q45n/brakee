/** Netlify Image CDN URL for a (remote or local) source image. */
export function cdn(src: string, w: number, opts: { h?: number; fit?: 'contain' | 'cover'; q?: number } = {}): string {
  const p = new URLSearchParams({ url: src, w: String(w) });
  if (opts.h) p.set('h', String(opts.h));
  if (opts.fit) p.set('fit', opts.fit);
  p.set('q', String(opts.q ?? 72));
  return `/.netlify/images?${p.toString()}`;
}

/** srcset for responsive product imagery. */
export function cdnSrcset(src: string, widths: number[], opts: { h?: (w: number) => number; fit?: 'contain' | 'cover' } = {}): string {
  return widths.map((w) => `${cdn(src, w, { h: opts.h?.(w), fit: opts.fit })} ${w}w`).join(', ');
}
