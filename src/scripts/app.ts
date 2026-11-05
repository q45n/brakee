// Shared client logic for every page. All DOM is built with textContent/attributes — never innerHTML with data.
import { normalizeText, matchesQuery } from '../lib/text.ts';

/* ---------------- config & strings ---------------- */
type Strings = Record<string, string>;
const readJSON = <T,>(id: string, fallback: T): T => {
  try { return JSON.parse(document.getElementById(id)?.textContent || '') as T; } catch { return fallback; }
};
export const S: Strings = readJSON<Strings>('i18n', {});
export const CFG = readJSON('cfg', { lang: 'ar', base: '', fee: 2000, max: 99, wa: '' }) as { lang: 'ar' | 'en'; base: string; fee: number; max: number; wa: string };
export const LANG = CFG.lang;

export function fmt(baisa: number): string {
  const abs = Math.abs(Math.round(baisa));
  return `${baisa < 0 ? '-' : ''}${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')}`;
}
export const omr = (baisa: number) => (LANG === 'ar' ? `${fmt(baisa)} ${S.omr}` : `${S.omr} ${fmt(baisa)}`);

/* ---------------- tiny DOM helper ---------------- */
type Attrs = Record<string, string | number | boolean | undefined | null>;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Array<Node | string | null | undefined | false>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS: Record<string, string[]> = {
  plus: ['M12 5v14M5 12h14'], minus: ['M5 12h14'], check: ['M5 12.5l4.5 4.5L19 7.5'], close: ['M6 6l12 12M18 6L6 18'],
  cart: ['M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2'],
};
export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
  for (const d of ICONS[name] ?? []) { const p = document.createElementNS(SVG_NS, 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
}
export const lp = (path: string) => `${CFG.base}${path}`;
export const img = (src: string, w: number) => `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}&q=72`;

/* ---------------- catalog index (lazy) ---------------- */
export interface IndexItem { s: string; u: string; n: { ar: string; en: string }; f: string; p: number; i: string; un: 'SET' | 'PCS'; o: string; c: string; t: string }
let indexPromise: Promise<Map<string, IndexItem>> | null = null;
export function loadIndex(): Promise<Map<string, IndexItem>> {
  if (!indexPromise) {
    indexPromise = fetch('/catalog-index.json', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((arr: IndexItem[]) => new Map(arr.map((x) => [x.s, x])))
      .catch((e) => { indexPromise = null; throw e; });
  }
  return indexPromise;
}

/* ---------------- cart store ---------------- */
const KEY = 'bo_cart'; // same key as the previous site, so existing carts survive the upgrade
export type Cart = Record<string, number>;
function sanitize(raw: unknown): Cart {
  const out: Cart = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [sku, q] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(q));
    if (typeof sku === 'string' && sku.length <= 32 && n > 0) out[sku] = Math.min(n, CFG.max);
  }
  return out;
}
export const cart = {
  get(): Cart {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; }
  },
  save(c: Cart) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode / quota */ }
    document.dispatchEvent(new CustomEvent('cart:change', { detail: c }));
  },
  add(sku: string, qty = 1) { const c = cart.get(); c[sku] = Math.min((c[sku] ?? 0) + qty, CFG.max); cart.save(c); },
  set(sku: string, qty: number) { const c = cart.get(); if (qty <= 0) delete c[sku]; else c[sku] = Math.min(qty, CFG.max); cart.save(c); },
  remove(sku: string) { const c = cart.get(); delete c[sku]; cart.save(c); },
  clear() { cart.save({}); },
  count(c: Cart = cart.get()): number { return Object.values(c).reduce((a, b) => a + b, 0); },
};
window.addEventListener('storage', (e) => { if (e.key === KEY) document.dispatchEvent(new CustomEvent('cart:change', { detail: cart.get() })); });

/** Drop SKUs that no longer exist in the catalogue. */
export async function prunedCart(): Promise<{ c: Cart; idx: Map<string, IndexItem> }> {
  const idx = await loadIndex();
  const c = cart.get();
  let changed = false;
  for (const sku of Object.keys(c)) if (!idx.has(sku)) { delete c[sku]; changed = true; }
  if (changed) cart.save(c);
  return { c, idx };
}

/* ---------------- count badge ---------------- */
const badges = [...document.querySelectorAll<HTMLElement>('[data-cart-count]')];
function paintCount(bump = false) {
  const n = cart.count();
  for (const b of badges) {
    b.textContent = String(n);
    b.classList.toggle('has', n > 0);
    if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
}
paintCount();

/* ---------------- overlays (drawer / nav) with focus management ---------------- */
const scrim = document.querySelector<HTMLElement>('[data-scrim]');
let openLayer: { el: HTMLElement; trigger: Element | null; close: () => void } | null = null;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export function openOverlay(el: HTMLElement, opts: { scrim?: boolean; onClose?: () => void; trigger?: Element | null } = {}) {
  if (openLayer) openLayer.close();
  el.classList.add('open');
  if (opts.scrim !== false) scrim?.classList.add('open');
  document.documentElement.style.overflow = 'hidden';
  const trigger = opts.trigger ?? document.activeElement;
  trigger?.setAttribute?.('aria-expanded', 'true');
  const close = () => {
    el.classList.remove('open');
    scrim?.classList.remove('open');
    document.documentElement.style.overflow = '';
    trigger?.setAttribute?.('aria-expanded', 'false');
    openLayer = null;
    opts.onClose?.();
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  };
  openLayer = { el, trigger, close };
  requestAnimationFrame(() => el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true }));
}
export const closeOverlay = () => openLayer?.close();
scrim?.addEventListener('click', closeOverlay);
document.addEventListener('keydown', (e) => {
  if (!openLayer) return;
  if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); return; }
  if (e.key === 'Tab') {
    const f = [...openLayer.el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* mobile nav */
const navPanel = document.querySelector<HTMLElement>('[data-nav-panel]');
document.querySelectorAll('[data-open-nav]').forEach((b) => b.addEventListener('click', () => navPanel && openOverlay(navPanel, { scrim: false, trigger: b })));
document.querySelectorAll('[data-close-nav]').forEach((b) => b.addEventListener('click', closeOverlay));

/* ---------------- cart drawer ---------------- */
const drawer = document.querySelector<HTMLElement>('[data-cart-drawer]');
const linesHost = document.querySelector<HTMLElement>('[data-cart-lines]');
const foot = document.querySelector<HTMLElement>('[data-cart-foot]');

export function stepper(sku: string, qty: number, onChange: (q: number) => void): HTMLElement {
  const out = h('output', { 'aria-live': 'polite', 'aria-label': S.qty, text: qty });
  const dec = h('button', { type: 'button', 'aria-label': S.decrease }, icon('minus'));
  const inc = h('button', { type: 'button', 'aria-label': S.increase, disabled: qty >= CFG.max }, icon('plus'));
  dec.addEventListener('click', () => onChange(qty - 1));
  inc.addEventListener('click', () => onChange(qty + 1));
  return h('div', { class: 'stepper sm', 'data-sku': sku }, dec, out, inc);
}

export function lineEl(it: IndexItem, qty: number, editable: boolean): HTMLElement {
  const href = lp(`/p/${it.u}/`);
  const info = h('div', {},
    h('h3', {}, h('a', { href, text: it.n[LANG] })),
    h('p', { class: 'meta', text: `${it.s}${it.o && it.o !== it.s ? ` · OE ${it.o}` : ''}` }),
    h('p', { class: 'meta', text: it.f }),
  );
  if (editable) {
    const controls = h('div', { class: 'controls' },
      stepper(it.s, qty, (q) => cart.set(it.s, q)),
      (() => { const b = h('button', { type: 'button', class: 'rm', text: S.remove }); b.addEventListener('click', () => cart.remove(it.s)); return b; })(),
    );
    info.append(controls);
  } else {
    info.append(h('p', { class: 'meta', text: `× ${qty}` }));
  }
  return h('div', { class: 'line' },
    h('img', { src: img(it.i, 128), alt: '', width: 64, height: 64, loading: 'lazy', decoding: 'async' }),
    info,
    h('span', { class: 'lp', text: fmt(it.p * qty) }),
  );
}

export function totals(c: Cart, idx: Map<string, IndexItem>) {
  let sub = 0;
  for (const [sku, q] of Object.entries(c)) { const it = idx.get(sku); if (it) sub += it.p * q; }
  const delivery = sub > 0 ? CFG.fee : 0;
  return { sub, delivery, total: sub + delivery };
}

async function renderDrawer() {
  if (!linesHost || !foot) return;
  let data;
  try { data = await prunedCart(); } catch {
    linesHost.replaceChildren(h('p', { class: 'cart-empty', text: S.errNetwork }));
    return;
  }
  const { c, idx } = data;
  const skus = Object.keys(c);
  if (!skus.length) {
    const browse = h('a', { class: 'btn btn-red', href: lp('/shop/'), text: S.browse });
    linesHost.replaceChildren(h('div', { class: 'cart-empty' }, icon('cart'), h('b', { text: S.cartEmpty }), h('p', { text: S.cartEmptySub }), browse));
    foot.hidden = true;
    return;
  }
  linesHost.replaceChildren(...skus.map((s) => lineEl(idx.get(s)!, c[s], true)));
  const tt = totals(c, idx);
  foot.querySelector('[data-cart-subtotal]')!.textContent = omr(tt.sub);
  foot.querySelector('[data-cart-delivery]')!.textContent = omr(tt.delivery);
  foot.querySelector('[data-cart-total]')!.textContent = omr(tt.total);
  foot.hidden = false;
}
export function openCart(trigger?: Element | null) {
  if (!drawer) return;
  renderDrawer();
  openOverlay(drawer, { trigger: trigger ?? document.querySelector('[data-open-cart]') });
}
document.querySelectorAll('[data-open-cart]').forEach((b) => b.addEventListener('click', () => openCart(b)));
document.querySelectorAll('[data-close-cart]').forEach((b) => b.addEventListener('click', closeOverlay));
document.addEventListener('cart:change', () => { paintCount(); if (drawer?.classList.contains('open')) renderDrawer(); });

/* ---------------- toasts ---------------- */
const toastHost = document.querySelector<HTMLElement>('[data-toasts]');
export function toast(text: string, action?: { label: string; run: () => void }) {
  if (!toastHost) return;
  const t = h('div', { class: 'toast', role: 'status' }, icon('check'), h('span', { text }));
  if (action) { const b = h('button', { type: 'button', text: action.label }); b.addEventListener('click', () => { action.run(); t.remove(); }); t.append(b); }
  toastHost.append(t);
  while (toastHost.children.length > 2) toastHost.firstElementChild?.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3200);
}

/* ---------------- add to cart (delegated) ---------------- */
document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>('[data-add]');
  if (!btn) return;
  e.preventDefault();
  const sku = btn.dataset.add!;
  const qtyInput = btn.dataset.qtyFrom ? document.querySelector<HTMLInputElement>(btn.dataset.qtyFrom) : null;
  const qty = Math.max(1, Math.min(CFG.max, parseInt(qtyInput?.value || '1', 10) || 1));
  cart.add(sku, qty);
  paintCount(true);
  btn.classList.add('done');
  const lbl = btn.querySelector('.lbl');
  const old = lbl?.textContent;
  if (lbl) lbl.textContent = S.added;
  setTimeout(() => { btn.classList.remove('done'); if (lbl && old != null) lbl.textContent = old; }, 1400);
  toast(S.toastAdded, { label: S.checkout, run: () => openCart() });
});

/* ---------------- image fallback (CSP-safe, no inline onerror) ---------------- */
document.addEventListener('error', (e) => {
  const el = e.target as HTMLImageElement;
  if (!(el instanceof HTMLImageElement) || el.dataset.failed) return;
  el.dataset.failed = '1';
  el.removeAttribute('srcset');
  if (el.dataset.logo) { el.replaceWith(h('span', { class: 'make-mono', text: el.dataset.logo })); return; }
  el.src = `/img/fallback-${el.dataset.fallback || 'part'}.svg`;
}, true);

/* ---------------- search suggestions ---------------- */
const onShopPage = !!document.querySelector('[data-catalog]');
for (const form of document.querySelectorAll<HTMLFormElement>('form[data-search]')) {
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const box = form.querySelector<HTMLElement>('.suggest')!;
  let timer = 0, sel = -1;
  const hide = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; };
  const items = () => [...box.querySelectorAll<HTMLAnchorElement>('a')];
  const highlight = (i: number) => { const a = items(); sel = (i + a.length) % a.length; a.forEach((x, j) => x.setAttribute('aria-selected', String(j === sel))); a[sel]?.scrollIntoView({ block: 'nearest' }); };

  input.addEventListener('focus', () => { loadIndex().catch(() => {}); }, { once: true });
  input.addEventListener('input', () => {
    clearTimeout(timer);
    if (onShopPage) { document.dispatchEvent(new CustomEvent('catalog:query', { detail: input.value })); return; }
    timer = window.setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { hide(); return; }
      let idx: Map<string, IndexItem>;
      try { idx = await loadIndex(); } catch { hide(); return; }
      const res = [...idx.values()].filter((x) => matchesQuery(x.t, q)).slice(0, 6);
      const all = h('a', { class: 's-all', href: `${lp('/shop/')}?q=${encodeURIComponent(q)}`, role: 'option', text: `${S.searchGo}: “${q}”` });
      box.replaceChildren(
        ...(res.length ? res.map((x) => h('a', { href: lp(`/p/${x.u}/`), role: 'option' },
          h('img', { src: img(x.i, 96), alt: '', width: 44, height: 44, loading: 'lazy' }),
          h('span', {}, h('span', { class: 's-title', text: x.n[LANG] }), h('span', { class: 's-meta', text: `${x.s} · ${x.f}` })),
          h('span', { class: 's-price', text: fmt(x.p) }),
        )) : [h('p', { class: 's-empty', text: S.noResults })]),
        all,
      );
      box.hidden = false; input.setAttribute('aria-expanded', 'true'); sel = -1;
    }, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(sel - 1); }
    else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); items()[sel]?.click(); }
    else if (e.key === 'Escape') hide();
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target as Node)) hide(); });
  form.addEventListener('submit', (e) => {
    if (onShopPage) { e.preventDefault(); input.blur(); document.dispatchEvent(new CustomEvent('catalog:query', { detail: input.value })); document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (!input.value.trim()) e.preventDefault();
  });
}

/* ---------------- vehicle finder ---------------- */
interface VModel { s: string; n: string; c: string[]; y: [number, number] | null }
interface VMake { id: string; models: VModel[] }
export interface FinderState { make: string; model: string; chassis: string; year: string }
export interface FinderApi { set(s: Partial<FinderState>): void; get(): FinderState; models(): Map<string, VModel> }

export function initFinder(form: HTMLFormElement, onChange?: (s: FinderState) => void): FinderApi {
  let data: VMake[] = [];
  try { data = JSON.parse(form.querySelector('[data-vehicle-data]')?.textContent || '[]'); } catch { /* ignore */ }
  const sel = (k: string) => form.querySelector<HTMLSelectElement>(`[data-f="${k}"]`)!;
  const make = sel('make'), model = sel('model'), chassis = sel('chassis'), year = sel('year');
  const firstOpt = (s: HTMLSelectElement) => s.options[0].cloneNode(true) as HTMLOptionElement;
  const blank = { model: firstOpt(model), chassis: firstOpt(chassis), year: firstOpt(year) };
  const thisYear = new Date().getFullYear();
  let modelMap = new Map<string, VModel>();

  function fillModels() {
    const m = data.find((x) => x.id === make.value);
    modelMap = new Map((m?.models ?? []).map((x) => [x.s, x]));
    model.replaceChildren(blank.model.cloneNode(true), ...(m?.models ?? []).map((x) => h('option', { value: x.s, text: x.n })));
    model.disabled = !m;
    fillDetail();
  }
  function fillDetail() {
    const md = modelMap.get(model.value);
    chassis.replaceChildren(blank.chassis.cloneNode(true), ...(md?.c ?? []).map((c) => h('option', { value: c, text: c })));
    chassis.disabled = !md || !md.c.length;
    const [from, to] = md?.y ?? [1990, thisYear];
    const years: HTMLOptionElement[] = [];
    for (let y = Math.min(to, thisYear + 1); y >= Math.max(1980, from); y--) years.push(h('option', { value: y, text: y }));
    year.replaceChildren(blank.year.cloneNode(true), ...years);
    year.disabled = !md;
  }
  const state = (): FinderState => ({ make: make.value, model: model.value, chassis: chassis.value, year: year.value });
  make.addEventListener('change', () => { fillModels(); onChange?.(state()); });
  model.addEventListener('change', () => { fillDetail(); onChange?.(state()); });
  chassis.addEventListener('change', () => onChange?.(state()));
  year.addEventListener('change', () => onChange?.(state()));
  // Clean URLs: don't submit empty selects.
  form.addEventListener('submit', () => { [model, chassis, year].forEach((s) => { if (!s.value) s.disabled = true; }); if (!make.value) make.disabled = true; });
  // Back/forward cache: re-enable after navigation back.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    make.disabled = false;
    model.disabled = !make.value;
    chassis.disabled = !model.value || chassis.options.length < 2;
    year.disabled = !model.value;
  });

  return {
    get: state,
    models: () => modelMap,
    set(s) {
      if (s.make !== undefined) { make.value = s.make; fillModels(); }
      if (s.model !== undefined) { model.value = s.model; fillDetail(); }
      if (s.chassis !== undefined) chassis.value = s.chassis;
      if (s.year !== undefined) year.value = s.year;
    },
  };
}
for (const f of document.querySelectorAll<HTMLFormElement>('form[data-finder][data-variant="hero"]')) initFinder(f);

export { normalizeText };

/* Keep filters/search when switching language (cart is shared via localStorage). */
if (location.search) {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-lang-switch]')) {
    if (!/\/(checkout|order)\//.test(a.pathname)) a.search = location.search;
  }
}
