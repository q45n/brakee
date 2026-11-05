// Catalogue filtering: vehicle (make/model/chassis/year), category, axle, text search, sort. State lives in the URL.
import { S, LANG, h, icon, initFinder, openOverlay, closeOverlay, type FinderState } from './app.ts';
import { matchesQuery } from '../lib/text.ts';

type Fit = [string, string, string[], number | null, number | null, 0 | 1];
interface Card { el: HTMLElement; cat: string; pos: string; price: number; order: number; makes: string[]; universal: boolean; fit: Fit[]; search: string; flag: HTMLElement | null }

const root = document.querySelector<HTMLElement>('[data-catalog]');
if (root) {
  const grid = root.querySelector<HTMLElement>('[data-grid]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const countEls = root.querySelectorAll<HTMLElement>('[data-count], [data-count-inline]');
  const active = root.querySelector<HTMLElement>('[data-active]')!;
  const sortSel = root.querySelector<HTMLSelectElement>('[data-sort]')!;
  const filtersPanel = root.querySelector<HTMLElement>('[data-filters]')!;
  const fixedMake = root.dataset.fixedMake || '';
  const thisYear = new Date().getFullYear();

  const cards: Card[] = [...grid.querySelectorAll<HTMLElement>('[data-card]')].map((el) => {
    let fit: Fit[] = [];
    try { fit = JSON.parse(el.dataset.fit || '[]'); } catch { /* ignore */ }
    return {
      el, cat: el.dataset.cat || '', pos: el.dataset.pos || '', price: Number(el.dataset.price), order: Number(el.dataset.order),
      makes: (el.dataset.makes || '').split(' ').filter(Boolean), universal: el.dataset.universal === '1', fit, search: el.dataset.search || '',
      flag: el.querySelector<HTMLElement>('[data-year-flag]'),
    };
  });

  const state = { q: '', cat: '', pos: '', sort: '', make: fixedMake, model: '', chassis: '', year: '' };
  const finderForm = root.querySelector<HTMLFormElement>('form[data-finder]')!;
  const finder = initFinder(finderForm, (s: FinderState) => { Object.assign(state, s); if (fixedMake && !state.make) state.make = fixedMake; apply(true); });

  /* ---- read URL ---- */
  const params = new URLSearchParams(location.search);
  state.q = (params.get('q') || '').slice(0, 80);
  state.cat = params.get('cat') || '';
  state.pos = params.get('pos') || '';
  state.sort = params.get('sort') || '';
  state.make = fixedMake || params.get('make') || '';
  finder.set({ make: state.make });
  state.make = finder.get().make; // ignore unknown values
  if (state.make) { finder.set({ model: params.get('model') || '' }); state.model = finder.get().model; }
  if (state.model) { finder.set({ chassis: params.get('chassis') || '', year: params.get('year') || '' }); Object.assign(state, finder.get()); }
  sortSel.value = ['price-asc', 'price-desc'].includes(state.sort) ? state.sort : '';
  for (const inp of document.querySelectorAll<HTMLInputElement>('form[data-search] input[name="q"]')) inp.value = state.q;

  /* ---- segment buttons ---- */
  for (const seg of root.querySelectorAll<HTMLElement>('[data-filter]')) {
    const key = seg.dataset.filter as 'cat' | 'pos';
    seg.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button[data-v]');
      if (!b) return;
      state[key] = b.dataset.v || '';
      apply(true);
    });
  }
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(true); });
  document.addEventListener('catalog:query', (e) => { state.q = String((e as CustomEvent).detail || '').slice(0, 80); apply(true); });
  root.querySelector('[data-clear]')?.addEventListener('click', clearAll);

  /* ---- mobile filter sheet ---- */
  const openBtn = root.querySelector<HTMLElement>('[data-open-filters]');
  openBtn?.addEventListener('click', () => openOverlay(filtersPanel, { trigger: openBtn }));
  root.querySelectorAll('[data-close-filters]').forEach((b) => b.addEventListener('click', () => { if (filtersPanel.classList.contains('open')) closeOverlay(); }));

  function clearAll() {
    Object.assign(state, { q: '', cat: '', pos: '', make: fixedMake, model: '', chassis: '', year: '' });
    finder.set({ make: fixedMake });
    for (const inp of document.querySelectorAll<HTMLInputElement>('form[data-search] input[name="q"]')) inp.value = '';
    apply(true);
  }

  /** Vehicle match: 'yes' | 'confirm' (listed for the model, but generation/year not listed) | 'no'. */
  function vehicleMatch(c: Card): { ok: boolean; note: string } {
    if (!state.make) return { ok: true, note: '' };
    if (c.universal) return { ok: true, note: '' };
    const modelName = state.model ? finder.models().get(state.model)?.n : '';
    const year = state.year ? parseInt(state.year, 10) : 0;
    let best: 'yes' | 'confirm' | 'no' = 'no';
    let listedYears = '';
    for (const [mk, md, ch, from, to, present] of c.fit) {
      if (mk !== state.make) continue;
      if (modelName && md !== modelName) continue;
      let level: 'yes' | 'confirm' = 'yes';
      if (state.chassis) {
        if (ch.length && !ch.includes(state.chassis)) continue;
        if (!ch.length) level = 'confirm';
      }
      if (year) {
        if (from == null) level = 'confirm';
        else {
          const end = present ? thisYear + 1 : (to ?? from);
          if (year < from || year > end) continue;
          listedYears = `${from}–${present ? (LANG === 'ar' ? 'الآن' : 'present') : end}`;
        }
      }
      if (level === 'yes') { best = 'yes'; break; }
      best = 'confirm';
    }
    if (best === 'no') return { ok: false, note: '' };
    if (best === 'confirm') return { ok: true, note: S.yearUnlisted };
    return { ok: true, note: listedYears ? `${S.yearListed} ${listedYears}` : '' };
  }

  function apply(push = false) {
    const visible: Card[] = [];
    for (const c of cards) {
      let ok = (!state.cat || c.cat === state.cat) && (!state.pos || c.pos === state.pos || (c.pos === '' && state.pos === ''));
      if (ok && state.q) ok = matchesQuery(c.search, state.q);
      let note = '';
      if (ok) { const v = vehicleMatch(c); ok = v.ok; note = v.note; }
      c.el.hidden = !ok;
      if (c.flag) {
        const confirm = note === S.yearUnlisted;
        c.flag.hidden = !note;
        c.flag.classList.toggle('flag-ok', !!note && !confirm);
        c.flag.querySelector('span')!.textContent = note;
      }
      if (ok) visible.push(c);
    }
    const sorted = [...cards].sort((a, b) =>
      state.sort === 'price-asc' ? a.price - b.price || a.order - b.order
        : state.sort === 'price-desc' ? b.price - a.price || a.order - b.order
          : a.order - b.order);
    // Reorder only when needed to avoid layout thrash.
    if (sorted.some((c, i) => grid.children[i] !== c.el)) grid.append(...sorted.map((c) => c.el));

    countEls.forEach((el) => (el.textContent = String(visible.length)));
    empty.hidden = visible.length > 0;
    grid.hidden = visible.length === 0;

    for (const seg of root!.querySelectorAll<HTMLElement>('[data-filter]')) {
      const key = seg.dataset.filter as 'cat' | 'pos';
      seg.querySelectorAll<HTMLButtonElement>('button[data-v]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || '') === state[key])));
    }
    renderChips();
    if (push) syncUrl();
  }

  function renderChips() {
    const chips: Array<[string, () => void]> = [];
    if (state.q) chips.push([`“${state.q}”`, () => { state.q = ''; document.querySelectorAll<HTMLInputElement>('form[data-search] input[name="q"]').forEach((i) => (i.value = '')); }]);
    const opt = (k: string) => finderForm.querySelector<HTMLSelectElement>(`[data-f="${k}"]`)!.selectedOptions[0]?.textContent || '';
    if (state.make && !fixedMake) chips.push([opt('make'), () => finder.set({ make: '' })]);
    if (state.model) chips.push([opt('model'), () => finder.set({ model: '' })]);
    if (state.chassis) chips.push([state.chassis, () => finder.set({ chassis: '' })]);
    if (state.year) chips.push([state.year, () => finder.set({ year: '' })]);
    if (state.pos) chips.push([state.pos === 'front' ? S.front : S.rear, () => { state.pos = ''; }]);
    if (state.cat) {
      const b = root!.querySelector<HTMLElement>(`[data-filter="cat"] button[data-v="${CSS.escape(state.cat)}"]`);
      chips.push([b?.firstChild?.textContent?.trim() || state.cat, () => { state.cat = ''; }]);
    }
    active.replaceChildren(...chips.map(([label, undo]) => {
      const b = h('button', { type: 'button', 'aria-label': `${S.remove}: ${label}` }, h('bdi', { text: label }), icon('close'));
      b.addEventListener('click', () => { undo(); Object.assign(state, { ...finder.get(), make: finder.get().make || fixedMake }); apply(true); });
      return b;
    }));
    if (chips.length > 1) { const c = h('button', { type: 'button', class: 'clear', text: S.clearAll }); c.addEventListener('click', clearAll); active.append(c); }
    active.hidden = chips.length === 0;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat) p.set('cat', state.cat);
    if (state.pos) p.set('pos', state.pos);
    if (state.make && !fixedMake) p.set('make', state.make);
    if (state.model) p.set('model', state.model);
    if (state.chassis) p.set('chassis', state.chassis);
    if (state.year) p.set('year', state.year);
    if (state.sort) p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
  }

  apply(false);
}
