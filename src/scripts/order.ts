import { h, S } from './app.ts';

interface Saved { ref: string; lines: Array<{ sku: string; qty: number; name: string; line: string }>; subtotal: string; delivery: string; total: string; whatsapp: string }
const root = document.querySelector<HTMLElement>('[data-order]');
if (root) {
  let o: Saved | null = null;
  try { o = JSON.parse(sessionStorage.getItem('bo_last_order') || 'null'); } catch { o = null; }
  const ok = root.querySelector<HTMLElement>('[data-order-ok]')!;
  const none = root.querySelector<HTMLElement>('[data-order-none]')!;
  // Only accept a wa.me link for the store — never navigate to anything else from storage.
  if (o && typeof o.ref === 'string' && typeof o.whatsapp === 'string' && o.whatsapp.startsWith('https://wa.me/')) {
    root.querySelector('[data-ref]')!.textContent = o.ref;
    root.querySelector<HTMLAnchorElement>('[data-wa]')!.href = o.whatsapp;
    const cur = ` ${S.omr}`;
    root.querySelector('[data-lines]')!.replaceChildren(...(o.lines || []).map((l) =>
      h('div', { class: 'sum' }, h('span', { text: `${l.sku} × ${l.qty} — ${l.name}` }), h('b', { text: l.line + cur }))));
    root.querySelector('[data-sub]')!.textContent = o.subtotal + cur;
    root.querySelector('[data-del]')!.textContent = o.delivery + cur;
    root.querySelector('[data-total]')!.textContent = o.total + cur;
    ok.hidden = false;
  } else {
    none.hidden = false;
  }
}
