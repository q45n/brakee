import { S, LANG, CFG, h, cart, prunedCart, lineEl, totals, omr, lp, type Cart, type IndexItem } from './app.ts';

const form = document.querySelector<HTMLFormElement>('form[data-checkout]');
if (form) {
  const $ = <T extends Element>(s: string) => form.querySelector<T>(s)!;
  const emptyBox = document.querySelector<HTMLElement>('[data-checkout-empty]')!;
  const linesHost = $<HTMLElement>('[data-summary-lines]');
  const gov = $<HTMLSelectElement>('#c-gov');
  const wil = $<HTMLSelectElement>('#c-wil');
  const submit = $<HTMLButtonElement>('[data-submit]');
  const alertBox = $<HTMLElement>('[data-form-alert]');
  const phone = $<HTMLInputElement>('#c-phone');
  const vin = $<HTMLInputElement>('#c-vin');
  let govData: Array<{ id: string; w: Array<{ v: string; l: string }> }> = [];
  try { govData = JSON.parse($('[data-gov]').textContent || '[]'); } catch { /* ignore */ }
  let current: { c: Cart; idx: Map<string, IndexItem> } | null = null;
  let sending = false;

  gov.addEventListener('change', () => {
    const g = govData.find((x) => x.id === gov.value);
    wil.replaceChildren(h('option', { value: '', text: S.chooseWil }), ...(g?.w ?? []).map((w) => h('option', { value: w.v, text: w.l })));
    wil.disabled = !g;
    if (g && g.w.length === 1) wil.value = g.w[0].v;
  });

  // Eastern Arabic digits → Latin, digits only.
  phone.addEventListener('input', () => {
    phone.value = phone.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '').slice(0, 11);
  });
  vin.addEventListener('input', () => { vin.value = vin.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17); });

  async function render() {
    try { current = await prunedCart(); } catch {
      linesHost.replaceChildren(h('p', { class: 'field-error', text: S.errNetwork }));
      return;
    }
    const { c, idx } = current;
    const skus = Object.keys(c);
    const isEmpty = skus.length === 0;
    form!.hidden = isEmpty;
    emptyBox.hidden = !isEmpty;
    if (isEmpty) return;
    linesHost.replaceChildren(...skus.map((s) => lineEl(idx.get(s)!, c[s], true)));
    const tt = totals(c, idx);
    $('[data-s-sub]').textContent = omr(tt.sub);
    $('[data-s-del]').textContent = omr(tt.delivery);
    $('[data-s-total]').textContent = omr(tt.total);
  }
  document.addEventListener('cart:change', () => { if (!sending) render(); });
  render();

  /* ---- validation (mirrors the server) ---- */
  const normPhone = (v: string) => { let d = v.replace(/\D/g, ''); if (d.length === 11 && d.startsWith('968')) d = d.slice(3); return d; };
  const fields: Record<string, { el: HTMLElement; err: string; check: () => boolean }> = {
    name: { el: $('#c-name'), err: S.errName, check: () => ($<HTMLInputElement>('#c-name').value.trim().length >= 2) },
    phone: { el: phone, err: S.errPhone, check: () => /^[79]\d{7}$/.test(normPhone(phone.value)) },
    governorate: { el: gov, err: S.errGov, check: () => !!gov.value },
    wilayat: { el: wil, err: S.errWil, check: () => !!wil.value },
    address: { el: $('#c-address'), err: S.errAddress, check: () => ($<HTMLTextAreaElement>('#c-address').value.trim().length >= 3) },
    vin: { el: vin, err: S.errVin, check: () => !vin.value || /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.value) },
  };
  const errId: Record<string, string> = { name: 'e-name', phone: 'e-phone', governorate: 'e-gov', wilayat: 'e-wil', address: 'e-address', vin: 'e-vin' };
  function showErr(key: string, on: boolean, msg?: string) {
    const f = fields[key]; if (!f) return;
    const p = document.getElementById(errId[key])!;
    p.textContent = on ? (msg ?? f.err) : '';
    p.hidden = !on;
    f.el.setAttribute('aria-invalid', String(on));
    f.el.closest('.field')?.classList.toggle('invalid', on);
  }
  for (const [k, f] of Object.entries(fields)) {
    f.el.addEventListener('blur', () => { if ((f.el as HTMLInputElement).value) showErr(k, !f.check()); });
    f.el.addEventListener('input', () => { if (f.el.getAttribute('aria-invalid') === 'true' && f.check()) showErr(k, false); });
    f.el.addEventListener('change', () => { if (f.el.getAttribute('aria-invalid') === 'true' && f.check()) showErr(k, false); });
  }

  function setAlert(text: string, waUrl?: string) {
    alertBox.hidden = !text;
    $('[data-alert-text]').textContent = text;
    const a = $<HTMLAnchorElement>('[data-alert-wa]');
    a.hidden = !waUrl;
    if (waUrl) a.href = waUrl;
    if (text) alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function fallbackWhatsapp(): string {
    if (!current) return `https://wa.me/${CFG.wa}`;
    const { c, idx } = current;
    const tt = totals(c, idx);
    const L = ['مرحباً، أرغب بطلب القطع التالية:', ''];
    for (const [s, q] of Object.entries(c)) { const it = idx.get(s); if (it) L.push(`- ${s}${it.o && it.o !== s ? ` (OE ${it.o})` : ''} × ${q} = ${omr(it.p * q)}`, `  ${it.f}`); }
    L.push('', `الإجمالي: ${omr(tt.total)} (يشمل التوصيل)`, '', `الاسم: ${$<HTMLInputElement>('#c-name').value.trim()}`, `الهاتف: +968 ${normPhone(phone.value)}`,
      `${gov.selectedOptions[0]?.textContent ?? ''} — ${wil.selectedOptions[0]?.textContent ?? ''}`, $<HTMLTextAreaElement>('#c-address').value.trim());
    if (vin.value) L.push(`VIN: ${vin.value}`);
    return `https://wa.me/${CFG.wa}?text=${encodeURIComponent(L.join('\n'))}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || !current) return;
    setAlert('');
    let firstBad: HTMLElement | null = null;
    for (const [k, f] of Object.entries(fields)) { const ok = f.check(); showErr(k, !ok); if (!ok && !firstBad) firstBad = f.el; }
    if (firstBad) { firstBad.focus(); return; }

    const items = Object.entries(cart.get()).map(([sku, qty]) => ({ sku, qty }));
    if (!items.length) { render(); return; }
    const body = {
      items,
      customer: {
        name: $<HTMLInputElement>('#c-name').value, phone: normPhone(phone.value), governorate: gov.value, wilayat: wil.value,
        address: $<HTMLTextAreaElement>('#c-address').value,
      },
      vin: vin.value || undefined,
      notes: $<HTMLInputElement>('#c-notes').value,
      payment: (form.querySelector<HTMLInputElement>('input[name="payment"]:checked')?.value) || 'cod',
      company: $<HTMLInputElement>('#c-company').value,
      lang: LANG,
    };
    sending = true;
    submit.disabled = true;
    submit.textContent = S.placing;
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.ref) {
        try { sessionStorage.setItem('bo_last_order', JSON.stringify(data)); } catch { /* ignore */ }
        cart.clear();
        location.assign(lp('/order/'));
        return;
      }
      if (res.status === 422 && Array.isArray(data.fields)) {
        if (data.fields.includes('items')) { setAlert(S.errItems); await render(); }
        let focus: HTMLElement | null = null;
        for (const k of data.fields) if (fields[k]) { showErr(k, true); focus ??= fields[k].el; }
        if (data.fields.includes('payment')) setAlert(S.errPayment);
        focus?.focus();
      } else if (res.status === 429) {
        setAlert(S.errRate);
      } else {
        setAlert(S.errServer, fallbackWhatsapp());
      }
    } catch {
      setAlert(S.errNetwork, fallbackWhatsapp());
    } finally {
      sending = false;
      submit.disabled = false;
      submit.textContent = S.placeOrder;
    }
  });
}
