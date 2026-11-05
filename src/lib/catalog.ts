import { RAW_ITEMS, type RawItem } from '../data/catalog.ts';
import { MAKES, parseFitment, isUniversal, slugify, type FitEntry } from './fitment.ts';
import { toBaisa } from '../data/store.ts';

export type Lang = 'ar' | 'en';
export type CategoryId = 'brake-pads' | 'brake-discs' | 'wear-sensors' | 'brake-fluid';
export type Position = 'front' | 'rear' | null;

export interface CategoryInfo {
  id: CategoryId;
  rawAr: string; // value used in the source data
  ar: string; en: string;
  singularAr: string; singularEn: string;
  blurbAr: string; blurbEn: string;
  image: string; // representative photo (preserved from the original site)
  keywords: string; // extra search synonyms (Gulf Arabic + English)
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'brake-pads', rawAr: 'أقمشة فرامل', ar: 'أقمشة الفرامل', en: 'Brake Pads',
    singularAr: 'طقم أقمشة فرامل', singularEn: 'Brake Pad Set',
    blurbAr: 'أطقم أقمشة فرامل بريمبو للمحور الأمامي والخلفي.', blurbEn: 'Brembo pad sets for front and rear axles.',
    image: '/media/brake-pads.jpg', // originally hotlinked from hybrid-racing.com
    keywords: 'pad pads brake-pads قماش قماشات اقمشه فحمات فحمه تيل',
  },
  {
    id: 'brake-discs', rawAr: 'أقراص فرامل', ar: 'أقراص الفرامل', en: 'Brake Discs',
    singularAr: 'قرص فرامل', singularEn: 'Brake Disc',
    blurbAr: 'أقراص (ديسكات) فرامل بريمبو تُباع بالقطعة.', blurbEn: 'Brembo brake discs (rotors), sold per piece.',
    image: '/media/brake-discs.jpg', // originally hotlinked from gstatic.com
    keywords: 'disc discs disk rotor rotors قرص اقراص ديسك ديسكات هوب هوبات',
  },
  {
    id: 'wear-sensors', rawAr: 'حساسات فرامل', ar: 'حساسات التآكل', en: 'Wear Sensors',
    singularAr: 'حساس تآكل فرامل', singularEn: 'Brake Pad Wear Sensor',
    blurbAr: 'حساسات تآكل الأقمشة لتنبيه لوحة العدادات.', blurbEn: 'Pad wear indicators that trigger the dashboard warning.',
    image: '/media/wear-sensors.jpg', // originally hotlinked from amazon.com
    keywords: 'sensor sensors wear indicator حساس حساسات تاكل',
  },
  {
    id: 'brake-fluid', rawAr: 'زيت فرامل', ar: 'زيت الفرامل', en: 'Brake Fluid',
    singularAr: 'زيت فرامل', singularEn: 'Brake Fluid',
    blurbAr: 'زيت فرامل بريمبو بمواصفات DOT 4 و DOT 5.1.', blurbEn: 'Brembo DOT 4 and DOT 5.1 brake fluid.',
    image: '/media/brake-fluid.webp', // originally hotlinked from bremboparts.com
    keywords: 'fluid oil dot زيت سائل',
  },
];

/** Product photos self-hosted for reliability (source URL kept in the raw catalogue). */
const LOCAL_IMG: Record<string, string> = { P11041: '/media/p11041.webp' };

const CAT_BY_RAW = new Map(CATEGORIES.map((c) => [c.rawAr, c]));
export const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export interface Product {
  sku: string;
  slug: string;
  oe: string;
  supplierGroup: string;
  supplierDesc: string;
  fits: string;
  listedModels: string[];
  unit: 'SET' | 'PCS';
  category: CategoryId;
  position: Position;
  price: number;       // OMR
  priceBaisa: number;  // integer
  image: string;
  imageIsRepresentative: boolean;
  fitment: FitEntry[];
  universal: boolean;
  makes: string[];     // make ids derived from fitment
  hasUnclearFitment: boolean;
  fluidSpec?: string;  // e.g. "DOT 4"
  volumeMl?: number;
  name: Record<Lang, string>;      // short product type name, e.g. "Front Brake Pad Set"
  title: Record<Lang, string>;     // full title incl. vehicle
  description: Record<Lang, string>;
  search: string;                  // normalised haystack
  order: number;                   // original list order
}

export { normalizeText, compactCode } from './text.ts';
import { normalizeText, compactCode } from './text.ts';

/* ---------------- naming ---------------- */

const POS_TEXT = {
  front: { en: 'Front', arM: 'أمامي', arF: 'أمامية' },
  rear: { en: 'Rear', arM: 'خلفي', arF: 'خلفية' },
};

function productName(cat: CategoryInfo, pos: Position, fluidSpec?: string, volumeMl?: number): Record<Lang, string> {
  if (cat.id === 'brake-fluid') {
    const spec = fluidSpec ? ` ${fluidSpec}` : '';
    const volEn = volumeMl ? ` · ${volumeMl} ml` : '';
    const volAr = volumeMl ? ` · ${volumeMl} مل` : '';
    return { en: `Brake Fluid${spec}${volEn}`, ar: `زيت فرامل${spec}${volAr}` };
  }
  if (!pos) return { en: cat.singularEn, ar: cat.singularAr };
  const p = POS_TEXT[pos];
  // Arabic adjective agreement: pad set (أقمشة → feminine plural), disc/sensor (masculine)
  const ar = cat.id === 'brake-pads' ? `${cat.singularAr} ${p.arF}` : `${cat.singularAr} ${p.arM}`;
  return { en: `${p.en} ${cat.singularEn}`, ar };
}

function parseFluid(desc: string) {
  const dot = desc.match(/DOT\s*(5\.1|4)(\s*LV)?/i);
  const vol = desc.match(/\[(\d+)\s*ML\]/i);
  let spec: string | undefined;
  if (dot) spec = `DOT ${dot[1]}${dot[2] ? ' LV' : ''}`;
  if (/PRIME/i.test(desc) && spec) spec = `${spec} Prime Line`;
  return { spec, volumeMl: vol ? parseInt(vol[1], 10) : undefined };
}

function describe(p: Omit<Product, 'description' | 'search' | 'slug'>, cat: CategoryInfo): Record<Lang, string> {
  const posEn = p.position === 'front' ? 'front axle' : p.position === 'rear' ? 'rear axle' : '';
  const posAr = p.position === 'front' ? 'للمحور الأمامي' : p.position === 'rear' ? 'للمحور الخلفي' : '';
  const oeEn = p.oe && p.oe !== p.sku ? ` OE reference: ${p.oe}.` : '';
  const oeAr = p.oe && p.oe !== p.sku ? ` الرقم المرجعي الأصلي (OE): ${p.oe}.` : '';
  switch (cat.id) {
    case 'brake-pads':
      return {
        en: `Brembo brake pad set${posEn ? ` for the ${posEn}` : ''}, listed for ${p.fits}. Sold as a set. Brembo part number ${p.sku}.${oeEn}`,
        ar: `طقم أقمشة فرامل بريمبو${posAr ? ` ${posAr}` : ''}، مُدرج للاستخدام مع ${p.fits}. يُباع كطقم. رقم قطعة بريمبو ${p.sku}.${oeAr}`,
      };
    case 'brake-discs':
      return {
        en: `Brembo brake disc${posEn ? ` for the ${posEn}` : ''}, listed for ${p.fits}. Sold per piece — discs are usually replaced in pairs on the same axle, so set the quantity accordingly. Brembo part number ${p.sku}.${oeEn}`,
        ar: `قرص فرامل بريمبو${posAr ? ` ${posAr}` : ''}، مُدرج للاستخدام مع ${p.fits}. يُباع بالقطعة — تُستبدل الأقراص عادةً كزوج على نفس المحور، لذا اختر الكمية المناسبة. رقم قطعة بريمبو ${p.sku}.${oeAr}`,
      };
    case 'wear-sensors':
      return {
        en: `Brembo brake pad wear sensor${posEn ? ` for the ${posEn}` : ''}, listed for ${p.fits}. Usually replaced together with the brake pads. Brembo part number ${p.sku}.${oeEn}`,
        ar: `حساس تآكل أقمشة فرامل بريمبو${posAr ? ` ${posAr}` : ''}، مُدرج للاستخدام مع ${p.fits}. يُستبدل عادةً مع أقمشة الفرامل. رقم قطعة بريمبو ${p.sku}.${oeAr}`,
      };
    case 'brake-fluid':
      return {
        en: `Brembo brake fluid${p.fluidSpec ? `, ${p.fluidSpec}` : ''}${p.volumeMl ? `, ${p.volumeMl} ml` : ''}. Always use the fluid specification stated in your vehicle's owner's manual or on the reservoir cap. Product code ${p.sku}.`,
        ar: `زيت فرامل بريمبو${p.fluidSpec ? ` بمواصفة ${p.fluidSpec}` : ''}${p.volumeMl ? `، سعة ${p.volumeMl} مل` : ''}. استخدم دائماً المواصفة المذكورة في دليل المالك أو على غطاء خزان الزيت في سيارتك. رمز المنتج ${p.sku}.`,
      };
  }
}

function buildProduct(raw: RawItem, index: number): Product {
  const cat = CAT_BY_RAW.get(raw.cat);
  if (!cat) throw new Error(`Unknown category "${raw.cat}" for ${raw.sku}`);
  const position: Position = raw.pos === 'أمامي' ? 'front' : raw.pos === 'خلفي' ? 'rear' : null;

  const fitment: FitEntry[] = [];
  let universal = false;
  for (const m of raw.models ?? []) {
    for (const f of parseFitment(m)) {
      if (isUniversal(f)) universal = true; else fitment.push(f);
    }
  }
  const makes = [...new Set(fitment.map((f) => f.make))];
  const fluid = cat.id === 'brake-fluid' ? parseFluid(raw.desc) : { spec: undefined, volumeMl: undefined };
  const name = productName(cat, position, fluid.spec, fluid.volumeMl);
  const vehicle = cat.id === 'brake-fluid' ? '' : raw.fits;
  const title = {
    en: vehicle ? `Brembo ${name.en} — ${vehicle}` : `Brembo ${name.en}`,
    ar: vehicle ? `${name.ar} بريمبو — ${vehicle}` : name.ar.replace('زيت فرامل', 'زيت فرامل بريمبو'),
  };

  const base = {
    sku: raw.sku, oe: raw.oe, supplierGroup: raw.brand, supplierDesc: raw.desc, fits: raw.fits,
    listedModels: raw.models ?? [], unit: raw.unit, category: cat.id, position,
    price: raw.price, priceBaisa: toBaisa(raw.price),
    image: raw.img ? (LOCAL_IMG[raw.sku] ?? raw.img) : cat.image, imageIsRepresentative: !raw.img,
    fitment, universal, makes, hasUnclearFitment: fitment.some((f) => f.unclear),
    fluidSpec: fluid.spec, volumeMl: fluid.volumeMl, name, title, order: index,
  };
  const description = describe(base, cat);

  const fitSlug = slugify(cat.id === 'brake-fluid' ? `${fluid.spec ?? ''} ${fluid.volumeMl ? fluid.volumeMl + 'ml' : ''}` : raw.fits)
    .split('-').slice(0, 9).join('-');
  const slug = [slugify(raw.sku), position, cat.id, fitSlug].filter(Boolean).join('-');

  const makeWords = makes.flatMap((m) => [MAKES[m]?.en ?? m, MAKES[m]?.ar ?? '']);
  const posWords = position === 'front' ? 'front أمامي امامي قدام' : position === 'rear' ? 'rear خلفي ورا' : '';
  const search = normalizeText([
    raw.sku, raw.oe, raw.desc, raw.fits, raw.brand, raw.brand_ar, raw.cat, cat.en, cat.ar, cat.keywords,
    name.en, name.ar, posWords, ...(raw.models ?? []), ...makeWords,
    ...fitment.flatMap((f) => [f.model, ...f.chassis, ...f.notes]),
    fluid.spec ?? '',
  ].join(' ')) + ' ' + compactCode(raw.sku) + ' ' + compactCode(raw.oe);

  return { ...base, description, slug, search };
}

export const PRODUCTS: Product[] = RAW_ITEMS.map(buildProduct);
export const PRODUCT_BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

/* ---------------- vehicle index for the finder ---------------- */

export interface VehicleModel { make: string; model: string; slug: string; chassis: string[]; years: [number, number] | null; count: number }

export function buildVehicleIndex(products: Product[] = PRODUCTS) {
  const byMake = new Map<string, Map<string, VehicleModel & { skus: Set<string> }>>();
  const thisYear = new Date().getFullYear();
  for (const p of products) {
    for (const f of p.fitment) {
      if (f.unclear) continue;
      let models = byMake.get(f.make);
      if (!models) byMake.set(f.make, (models = new Map()));
      let m = models.get(f.model);
      if (!m) models.set(f.model, (m = { make: f.make, model: f.model, slug: slugify(f.model), chassis: [], years: null, count: 0, skus: new Set() }));
      for (const c of f.chassis) if (!m.chassis.includes(c)) m.chassis.push(c);
      if (f.yearFrom != null) {
        const to = f.present ? thisYear : (f.yearTo ?? f.yearFrom);
        m.years = m.years ? [Math.min(m.years[0], f.yearFrom), Math.max(m.years[1], to)] : [f.yearFrom, to];
      }
      m.skus.add(p.sku);
    }
  }
  const makes = [...byMake.entries()]
    .map(([id, models]) => ({
      ...MAKES[id],
      count: new Set([...models.values()].flatMap((m) => [...m.skus])).size,
      models: [...models.values()]
        .map(({ skus, ...m }) => ({ ...m, chassis: m.chassis.sort(), count: skus.size }))
        .sort((a, b) => a.model.localeCompare(b.model, 'en', { numeric: true })),
    }))
    .sort((a, b) => a.en.localeCompare(b.en));
  return makes;
}

export const VEHICLE_INDEX = buildVehicleIndex();

/* ---------------- recommendations ---------------- */

function fitKeys(p: Product): Set<string> {
  const keys = new Set<string>();
  for (const f of p.fitment) {
    if (f.unclear) continue;
    if (f.chassis.length) for (const c of f.chassis) keys.add(`${f.make}|${f.model}|${c}`);
    else keys.add(`${f.make}|${f.model}|*`);
  }
  return keys;
}
const FIT_KEYS = new Map(PRODUCTS.map((p) => [p.sku, fitKeys(p)]));

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const k of a) {
    if (b.has(k)) { n += 2; continue; }
    const [mk, md, ch] = k.split('|');
    // model-level listing ("*") on either side counts as a weaker match
    if (ch === '*' ? [...b].some((x) => x.startsWith(`${mk}|${md}|`)) : b.has(`${mk}|${md}|*`)) n += 1;
  }
  return n;
}

/** Parts for the same vehicle in other categories (e.g. discs + sensors for a pad set). */
export function complementary(p: Product, limit = 6): Product[] {
  const mine = FIT_KEYS.get(p.sku)!;
  if (!mine.size) return [];
  return PRODUCTS
    .filter((o) => o.category !== p.category && o.category !== 'brake-fluid')
    .map((o) => ({ o, s: overlap(mine, FIT_KEYS.get(o.sku)!) + (o.position === p.position ? 1 : 0) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s || a.o.order - b.o.order)
    .slice(0, limit)
    .map((x) => x.o);
}

/** Same category, same vehicle family — e.g. the other axle, or a sibling model. */
export function related(p: Product, limit = 8, exclude: Set<string> = new Set()): Product[] {
  const mine = FIT_KEYS.get(p.sku)!;
  return PRODUCTS
    .filter((o) => o.sku !== p.sku && !exclude.has(o.sku) && o.category === p.category)
    .map((o) => {
      let s = overlap(mine, FIT_KEYS.get(o.sku)!) * 2;
      if (o.makes.some((m) => p.makes.includes(m))) s += 1;
      if (p.universal && o.universal) s += 3;
      return { o, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.o.order - b.o.order)
    .slice(0, limit)
    .map((x) => x.o);
}
