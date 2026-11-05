// Structured vehicle-fitment parsing.
//
// IMPORTANT: every value produced here is derived from the fitment text that already exists in the
// catalogue (the `models` field). Nothing is looked up or invented. When the listing is ambiguous the
// entry is flagged `unclear` and the UI asks the customer to confirm with us.

export interface MakeInfo { id: string; en: string; ar: string; logo?: string }

export const MAKES: Record<string, MakeInfo> = {
  'audi': { id: 'audi', en: 'Audi', ar: 'أودي', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg' },
  'bentley': { id: 'bentley', en: 'Bentley', ar: 'بنتلي' },
  'bmw': { id: 'bmw', en: 'BMW', ar: 'بي إم دبليو', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg' },
  'chevrolet': { id: 'chevrolet', en: 'Chevrolet', ar: 'شيفروليه', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Chevrolet-logo.png' },
  'dodge': { id: 'dodge', en: 'Dodge', ar: 'دودج', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Dodge_logo.svg' },
  'honda': { id: 'honda', en: 'Honda', ar: 'هوندا', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Honda.svg' },
  'jaguar': { id: 'jaguar', en: 'Jaguar', ar: 'جاكوار' },
  'land-rover': { id: 'land-rover', en: 'Land Rover', ar: 'لاند روفر' },
  'lexus': { id: 'lexus', en: 'Lexus', ar: 'لكزس', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Lexus.svg' },
  'mercedes-benz': { id: 'mercedes-benz', en: 'Mercedes-Benz', ar: 'مرسيدس-بنز', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg' },
  'mini': { id: 'mini', en: 'MINI', ar: 'ميني', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/MINI_logo.svg' },
  'mitsubishi': { id: 'mitsubishi', en: 'Mitsubishi', ar: 'ميتسوبيشي', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Mitsubishi_logo.svg' },
  'nissan': { id: 'nissan', en: 'Nissan', ar: 'نيسان', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Nissan_2020_logo.svg' },
  'porsche': { id: 'porsche', en: 'Porsche', ar: 'بورشه' },
  'tesla': { id: 'tesla', en: 'Tesla', ar: 'تيسلا', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg' },
  'toyota': { id: 'toyota', en: 'Toyota', ar: 'تويوتا', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg' },
  'volkswagen': { id: 'volkswagen', en: 'Volkswagen', ar: 'فولكس فاجن', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg' },
};

/** Prefix → make. `keep` = the prefix is part of the model name (e.g. "Range Rover Sport"). */
const MAKE_PREFIXES: Array<{ p: string; make: string; keep?: string }> = [
  { p: 'Mercedes-Benz ', make: 'mercedes-benz' },
  { p: 'Mercedes ', make: 'mercedes-benz' },
  { p: 'Range Rover Discovery ', make: 'land-rover', keep: 'Discovery ' },
  { p: 'Range Rover ', make: 'land-rover', keep: 'Range Rover ' },
  { p: 'Discovery ', make: 'land-rover', keep: 'Discovery ' },
  { p: 'Freelander ', make: 'land-rover', keep: 'Freelander ' },
  { p: 'LR2', make: 'land-rover', keep: 'LR2' },
  { p: 'BMW ', make: 'bmw' },
  { p: 'MINI ', make: 'mini' },
  { p: 'Audi ', make: 'audi' },
  { p: 'VW ', make: 'volkswagen' },
  { p: 'Porsche ', make: 'porsche' },
  { p: 'Bentley ', make: 'bentley' },
  { p: 'Chevrolet ', make: 'chevrolet' },
  { p: 'Dodge ', make: 'dodge' },
  { p: 'Honda ', make: 'honda' },
  { p: 'Jaguar ', make: 'jaguar' },
  { p: 'Lexus ', make: 'lexus' },
  { p: 'Mitsubishi ', make: 'mitsubishi' },
  { p: 'Nissan ', make: 'nissan' },
  { p: 'Tesla ', make: 'tesla' },
  { p: 'Toyota ', make: 'toyota' },
];

/** Model-name aliases that merge different spellings of the same vehicle in the listings. */
const MODEL_ALIASES: Record<string, string> = {
  'Discovery 4 - LR4': 'Discovery 4',
  'Discovery 4-LR4': 'Discovery 4',
  'Freelander 2-LR2': 'Freelander 2',
  'LR2': 'Freelander 2',
  'Range Rover III': 'Range Rover',
  'Range Rover IV': 'Range Rover',
  'Range Rover V': 'Range Rover',
  'Range Rover Sport II': 'Range Rover Sport',
  'Range Rover Sport III': 'Range Rover Sport',
  'M-Class-GLE': 'M-Class / GLE',
  'GL-GLS': 'GL / GLS',
  'Sprinter': 'Sprinter',
};

const BODY_STYLES = [' Shooting Brake', ' Convertible', ' Cabriolet', ' Cabrio', ' Coupe', ' Roadster', ' Pickup', ' 3-door'];

export interface FitEntry {
  make: string;          // make id, e.g. "bmw"
  model: string;         // normalised model, e.g. "3 Series"
  chassis: string[];     // chassis / generation codes as listed, e.g. ["E46"]
  yearFrom: number | null;
  yearTo: number | null; // null with yearFrom set = "present"
  present: boolean;
  notes: string[];       // engine, body style, side, etc. — as listed
  unclear: boolean;      // listing is ambiguous; must be confirmed
  raw: string;           // the original listing text
}

export interface UniversalFit { universal: true; raw: string }

const YEAR_RE = /(\d{4})\s*-\s*(\d{4}|present)/i;
const ROMAN_ONLY = /^(I|II|III|IV|V|VI|VII|VIII)$/;

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function classifyTokens(tokens: string[]) {
  const chassis: string[] = [];
  const notes: string[] = [];
  for (let t of tokens) {
    t = t.trim();
    if (!t) continue;
    if (/engine|4x4|platform|cylinder|left|right/i.test(t) || /^\d\.\d/.test(t)) { notes.push(t); continue; }
    // split "F30/F31" or "E70/F15" into separate codes; keep "LC/LD", "AN120/130" whole
    const parts = t.split('/').map((x) => x.trim());
    const codeLike = (x: string) => /\d/.test(x) && !/^\d+$/.test(x) && /^[A-Z0-9]+( [A-Z0-9]+)?$/.test(x);
    if (parts.length > 1 && parts.every(codeLike)) chassis.push(...parts);
    else chassis.push(t);
  }
  return { chassis, notes };
}

function parseVehicle(seg: string, extra: string, inheritedMake: string | null, raw: string): FitEntry[] {
  let s = seg.trim();
  const notes: string[] = [];
  let make: string | null = null;
  for (const mp of MAKE_PREFIXES) {
    if (s.startsWith(mp.p)) { make = mp.make; s = (mp.keep ?? '') + s.slice(mp.p.length); break; }
  }
  if (!make) make = inheritedMake;
  if (!make) return [];

  // side suffix: "- Left side", "- Right", "- Left & Right"
  const side = s.match(/\s+-\s+(Left & Right|Left side|Right side|Left|Right)\s*$/i);
  if (side) { notes.push(side[1].replace(/ side$/i, '') + ' side'); s = s.slice(0, side.index).trim(); }

  let paren = '';
  const pm = s.match(/\(([^)]*)\)/);
  if (pm) { paren = pm[1]; s = (s.slice(0, pm.index) + s.slice((pm.index ?? 0) + pm[0].length)).trim(); }
  const side2 = s.match(/\s+-\s+(Left & Right|Left side|Right side|Left|Right)\s*$/i);
  if (side2) { notes.push(side2[1].replace(/ side$/i, '') + ' side'); s = s.slice(0, side2.index).trim(); }

  let model = s.replace(/\s+/g, ' ').trim();
  model = MODEL_ALIASES[model] ?? model;
  for (const b of BODY_STYLES) {
    if (model.endsWith(b) && model.length > b.length) { notes.push(b.trim()); model = model.slice(0, -b.length).trim(); break; }
  }
  if (make === 'porsche' && model === 'Carrera') model = '911';
  if (make === 'land-rover' && model === 'Range Rover Discovery 4-LR4') model = 'Discovery 4';

  const info = [paren, extra].filter(Boolean).join(', ');

  // "7th Gen 2003-2007 / 8th Gen 2008-2012" → one entry per generation
  const genParts = info.split(/\s+\/\s+/);
  const multiGen = genParts.length > 1 && genParts.every((g) => YEAR_RE.test(g));
  const groups = multiGen ? genParts : [info];

  return groups.map((g) => {
    let yearFrom: number | null = null, yearTo: number | null = null, present = false;
    const ym = g.match(YEAR_RE);
    let rest = g;
    if (ym) {
      yearFrom = parseInt(ym[1], 10);
      if (/present/i.test(ym[2])) present = true; else yearTo = parseInt(ym[2], 10);
      rest = g.replace(ym[0], '');
    }
    const tokens = multiGen ? [rest.trim()] : splitTopLevel(rest, ',');
    const { chassis, notes: n2 } = classifyTokens(tokens);
    // drop a chassis token equal to the model (e.g. Porsche "Carrera (911, 992)")
    const ch = chassis.filter((c) => c !== model);
    return {
      make: make as string,
      model,
      chassis: ch,
      yearFrom, yearTo, present,
      notes: [...notes, ...n2],
      unclear: ROMAN_ONLY.test(model) || model.length === 0,
      raw,
    };
  });
}

/** Parse one listed fitment string (an entry from `models`). */
export function parseFitment(raw: string): Array<FitEntry | UniversalFit> {
  const text = raw.trim();
  if (/^universal/i.test(text)) return [{ universal: true, raw: text }];
  // Top-level comma segments; segments starting with a digit are extra info for the previous vehicle.
  const segs = splitTopLevel(text, ',');
  const vehicles: Array<{ seg: string; extra: string[] }> = [];
  for (const seg of segs) {
    if (/^\d/.test(seg) && vehicles.length) vehicles[vehicles.length - 1].extra.push(seg);
    else vehicles.push({ seg, extra: [] });
  }
  const out: FitEntry[] = [];
  let lastMake: string | null = null;
  for (const v of vehicles) {
    const entries = parseVehicle(v.seg, v.extra.join(', '), lastMake, text);
    if (entries.length) lastMake = entries[0].make;
    out.push(...entries);
  }
  return out;
}

export function isUniversal(f: FitEntry | UniversalFit): f is UniversalFit {
  return (f as UniversalFit).universal === true;
}

export function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Does a fitment entry match the given year? `null` = years not listed for this entry. */
export function yearMatch(f: FitEntry, year: number, currentYear = new Date().getFullYear()): boolean | null {
  if (f.yearFrom == null) return null;
  const to = f.present ? currentYear + 1 : (f.yearTo ?? f.yearFrom);
  return year >= f.yearFrom && year <= to;
}
