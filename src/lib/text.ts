// Dependency-free text helpers shared by the build (catalog) and the browser (search).

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Lower-case, unify Arabic letter variants, strip diacritics, convert Eastern digits. */
export function normalizeText(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Part numbers: strip spaces, dots, dashes, slashes so "34 11 6 855 156" matches "34116855156". */
export function compactCode(s: string): string {
  return normalizeText(s).replace(/[\s.\-_/]/g, '');
}

/** Every query term must appear in the haystack (or in its compacted part-number form). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const terms = q.split(' ').filter(Boolean);
  return terms.every((term) => haystack.includes(term) || (term.length >= 3 && haystack.includes(compactCode(term))));
}
