import { CFG } from './app.ts';

const qty = document.querySelector<HTMLInputElement>('#qty');
if (qty) {
  const clamp = () => { const n = Math.max(1, Math.min(CFG.max, parseInt(qty.value, 10) || 1)); qty.value = String(n); };
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => { qty.value = String((parseInt(qty.value, 10) || 1) + Number(b.dataset.step)); clamp(); }));
  qty.addEventListener('change', clamp);
  qty.addEventListener('blur', clamp);
}

// Sticky mobile buy bar appears once the main add-to-cart button scrolls out of view.
const bar = document.querySelector<HTMLElement>('[data-buy-bar]');
const main = document.getElementById('main-add');
if (bar && main && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(main);
}
