import { STORE } from '../data/store.ts';
import { lp } from './i18n.ts';
import { MAKES } from './fitment.ts';
import { CAT_BY_ID, type Lang, type Product } from './catalog.ts';
import { cdn } from './media.ts';

const abs = (p: string) => new URL(p, STORE.url).href;

export function orgLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    '@id': `${STORE.url}/#store`,
    name: STORE.name,
    alternateName: STORE.nameAr,
    url: abs(lp(lang, '/')),
    logo: abs('/apple-touch-icon.png'),
    image: abs('/og.png'),
    telephone: `+${STORE.whatsapp}`,
    currenciesAccepted: 'OMR',
    paymentAccepted: 'Cash',
    areaServed: { '@type': 'Country', name: 'Oman' },
    address: { '@type': 'PostalAddress', addressCountry: 'OM' },
    contactPoint: { '@type': 'ContactPoint', telephone: `+${STORE.whatsapp}`, contactType: 'sales', availableLanguage: ['ar', 'en'] },
  };
}

export function websiteLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${STORE.url}/#website`,
    url: abs(lp(lang, '/')),
    name: STORE.name,
    inLanguage: lang === 'ar' ? 'ar-OM' : 'en-OM',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${abs(lp(lang, '/shop/'))}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(items: Array<{ name: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.href) })),
  };
}

export function productLd(p: Product, lang: Lang) {
  const cat = CAT_BY_ID.get(p.category)!;
  const url = abs(lp(lang, `/p/${p.slug}/`));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.title[lang],
    description: p.description[lang],
    sku: p.sku,
    mpn: p.sku,
    url,
    image: [abs(cdn(p.image, 1000))],
    brand: { '@type': 'Brand', name: 'Brembo' },
    category: lang === 'ar' ? cat.ar : cat.en,
    ...(p.oe && p.oe !== p.sku ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'OE number', value: p.oe }] } : {}),
    ...(p.fitment.length ? {
      isAccessoryOrSparePartFor: p.fitment.filter((f) => !f.unclear).slice(0, 20).map((f) => ({
        '@type': 'Car', name: `${MAKES[f.make]?.en ?? f.make} ${f.model}${f.chassis.length ? ` (${f.chassis.join('/')})` : ''}`,
        brand: { '@type': 'Brand', name: MAKES[f.make]?.en ?? f.make },
      })),
    } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'OMR',
      price: (p.priceBaisa / 1000).toFixed(3),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${STORE.url}/#store` },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: (STORE.deliveryFeeBaisa / 1000).toFixed(3), currency: 'OMR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'OM' },
      },
    },
  };
}

export function itemListLd(products: Product[], lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 60).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(lp(lang, `/p/${p.slug}/`)), name: p.title[lang] })),
  };
}
