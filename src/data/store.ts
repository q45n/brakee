// Business configuration — single source of truth used by pages, checkout and the order API.
export const STORE = {
  name: 'BREMBO OMAN',
  nameAr: 'بريمبو عُمان',
  url: 'https://omanconnect.store',
  whatsapp: '96877277237', // international format, digits only
  whatsappDisplay: '+968 7727 7237',
  currency: 'OMR',
  country: 'OM',
  /** Flat delivery fee per order, in baisa (1 OMR = 1000 baisa). */
  deliveryFeeBaisa: 2000,
  maxQtyPerLine: 99,
  maxLines: 40,
} as const;

/** Format baisa as an OMR amount with three decimals, e.g. 39745 -> "39.745". */
export function formatBaisa(baisa: number): string {
  const sign = baisa < 0 ? '-' : '';
  const abs = Math.abs(Math.round(baisa));
  return `${sign}${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, '0')}`;
}

/** Convert an OMR decimal price (e.g. 39.745) into integer baisa without float drift. */
export function toBaisa(omr: number): number {
  return Math.round(omr * 1000);
}
