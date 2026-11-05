import type { Lang } from './catalog.ts';

export const LANGS: Lang[] = ['ar', 'en'];

/** Localised path: Arabic lives at the root, English under /en. Always ends with "/". */
export function lp(lang: Lang, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const withSlash = p.endsWith('/') || p.includes('?') || p.includes('#') || /\.[a-z]+$/.test(p) ? p : `${p}/`;
  return lang === 'en' ? `/en${withSlash === '/' ? '/' : withSlash}` : withSlash;
}

/** Strip the language prefix from a pathname. */
export function basePath(pathname: string): string {
  return pathname.replace(/^\/en(?=\/|$)/, '') || '/';
}

const dict = {
  ar: {
    brandTag: 'قطع فرامل بريمبو الأصلية في عُمان',
    skip: 'تخطَّ إلى المحتوى',
    navShop: 'المتجر', navVehicles: 'حسب السيارة', navDelivery: 'التوصيل والدفع', navFitment: 'التأكد من التوافق',
    menu: 'القائمة', close: 'إغلاق',
    searchPh: 'ابحث برقم القطعة، OE، الموديل…', searchLabel: 'بحث في المنتجات', searchGo: 'بحث',
    cart: 'السلة', cartTitle: 'سلة المشتريات', cartEmpty: 'سلتك فارغة.', cartEmptySub: 'ابحث عن سيارتك أو تصفّح الأقسام لإضافة القطع.',
    browse: 'تصفّح المتجر',
    subtotal: 'المجموع الفرعي', delivery: 'التوصيل', total: 'الإجمالي', checkout: 'إتمام الطلب', continueShopping: 'متابعة التسوق',
    remove: 'حذف', qty: 'الكمية', increase: 'زيادة الكمية', decrease: 'إنقاص الكمية',
    addToCart: 'أضف إلى السلة', added: 'أُضيف إلى السلة', inCart: 'في السلة',
    omr: 'ر.ع', perSet: 'للطقم', perPiece: 'للقطعة', set: 'طقم', piece: 'قطعة',
    front: 'أمامي', rear: 'خلفي', all: 'الكل',
    representative: 'صورة توضيحية للفئة',
    oe: 'رقم OE', sku: 'رقم بريمبو',
    fits: 'مُدرج لـ', viewDetails: 'التفاصيل',
    langName: 'English', langSwitch: 'View in English',
    whatsapp: 'واتساب',
    // finder
    finderTitle: 'ابحث عن قطع سيارتك', finderSub: 'اختر الشركة والموديل، ثم الجيل والسنة إن عرفتها.',
    make: 'الشركة المصنّعة', model: 'الموديل', chassis: 'الجيل / الشاصي', year: 'سنة الصنع',
    chooseMake: 'اختر الشركة', chooseModel: 'اختر الموديل', anyChassis: 'غير متأكد / الكل', anyYear: 'أي سنة',
    findParts: 'اعرض القطع المتوافقة',
    // catalog
    filters: 'التصفية', clearAll: 'مسح الكل', category: 'القسم', position: 'موضع التركيب', sort: 'الترتيب',
    sortRelevance: 'الأنسب', sortPriceAsc: 'السعر: من الأقل', sortPriceDesc: 'السعر: من الأعلى',
    results: 'منتج', noResults: 'لا توجد قطع مطابقة.', noResultsSub: 'جرّب إزالة بعض عوامل التصفية، أو أرسل لنا رقم الشاصي على واتساب وسنبحث لك.',
    showResults: 'عرض النتائج', yearUnlisted: 'سنوات الصنع غير مُدرجة — يلزم التأكيد', yearListed: 'مُدرج لسنة',
    allCategories: 'كل الأقسام', vehicleSelected: 'سيارتك',
    // product
    home: 'الرئيسية', shop: 'المتجر',
    compat: 'التوافق المُدرج', compatNote: 'بيانات التوافق مأخوذة من قائمة المورّد. تأكّد دائماً بمطابقة رقم OE على القطعة الحالية أو أرسل لنا رقم الشاصي (VIN) قبل الطلب.',
    compatUnclear: 'جزء من بيانات التوافق لهذه القطعة غير واضح في قائمة المورّد — يلزم التأكيد معنا قبل الطلب.',
    vehicleCol: 'السيارة', chassisCol: 'الجيل / الشاصي', yearsCol: 'السنوات', notesCol: 'ملاحظات', notListed: 'غير مُدرج', present: 'حتى الآن',
    specs: 'المواصفات', brand: 'العلامة', categoryLbl: 'القسم', soldAs: 'يُباع', supplierDesc: 'وصف المورّد',
    diameter: 'القطر / السماكة', confirmWithUs: 'غير مُدرج — اسألنا مع رقم الشاصي',
    fluidUniversal: 'مناسب لأي سيارة تتطلب هذه المواصفة — راجع دليل المالك أو غطاء خزان الزيت.',
    askFitment: 'اسأل عن التوافق عبر واتساب', askFitmentMsg: 'مرحباً، أريد التأكد من توافق هذه القطعة مع سيارتي:',
    forSameVehicle: 'قطع أخرى لنفس السيارة', similar: 'منتجات مشابهة',
    deliveryLine: 'توصيل 2.000 ر.ع لجميع محافظات سلطنة عُمان', codLine: 'الدفع عند الاستلام متاح',
    verifyLine: 'تحقق من رقم OE قبل الطلب',
    // checkout
    checkoutTitle: 'إتمام الطلب', contact: 'بيانات التواصل', deliveryAddress: 'عنوان التوصيل', payment: 'طريقة الدفع', orderSummary: 'ملخص الطلب',
    fullName: 'الاسم الكامل', namePh: 'مثال: سالم بن راشد الهنائي', phone: 'رقم الهاتف (عُماني)', phoneHint: '8 أرقام يبدأ بـ 7 أو 9',
    governorate: 'المحافظة', wilayat: 'الولاية', chooseGov: 'اختر المحافظة', chooseWil: 'اختر الولاية',
    address: 'تفاصيل العنوان', addressPh: 'المنطقة، الشارع، رقم المبنى أو أقرب معلم',
    vin: 'رقم الشاصي VIN (اختياري)', vinHint: '17 حرفاً ورقماً — يساعدنا على التأكد من التوافق قبل الشحن',
    notes: 'ملاحظات (اختياري)', notesPh: 'مثال: موعد التوصيل المفضل',
    payCod: 'الدفع عند الاستلام', payCodSub: 'نقداً عند وصول الطلب',
    payLink: 'بطاقة بنكية / Apple Pay', payLinkSub: 'يرسل لك فريقنا رابط دفع آمناً بعد تأكيد الطلب',
    payNote: 'لا نطلب ولا نخزّن بيانات بطاقتك على هذا الموقع.',
    placeOrder: 'تأكيد الطلب', placing: 'جارٍ إرسال الطلب…',
    errName: 'يرجى إدخال الاسم (حرفان على الأقل).', errPhone: 'أدخل رقماً عُمانياً صحيحاً من 8 أرقام يبدأ بـ 7 أو 9.',
    errGov: 'اختر المحافظة.', errWil: 'اختر الولاية.', errAddress: 'أدخل تفاصيل العنوان.', errVin: 'رقم الشاصي يجب أن يتكون من 17 حرفاً/رقماً (بدون I و O و Q).',
    errItems: 'تغيّرت السلة — يرجى مراجعتها.', errPayment: 'اختر طريقة الدفع.',
    errServer: 'تعذّر حفظ الطلب حالياً. يمكنك إرسال الطلب مباشرة عبر واتساب.', errNetwork: 'تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى، أو أرسل الطلب عبر واتساب.',
    errRate: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.',
    sendWhatsappFallback: 'إرسال الطلب عبر واتساب',
    emptyCheckout: 'لا توجد منتجات في السلة.',
    termsLine: 'بتأكيد الطلب، يتواصل معك فريقنا لتأكيد التوافق وموعد التوصيل.',
    // order confirmation
    orderPlaced: 'تم استلام طلبك', orderRef: 'رقم الطلب', orderNext: 'الخطوة الأخيرة: أرسل الطلب لنا على واتساب ليتم تأكيده بسرعة.',
    sendOnWhatsapp: 'إرسال الطلب عبر واتساب', orderSaved: 'حفظنا طلبك. احتفظ برقم الطلب للمتابعة.', orderMissing: 'لا يوجد طلب حديث على هذا الجهاز.',
    // footer
    footerAbout: 'قطع فرامل بريمبو: أقمشة، أقراص، حساسات وزيت فرامل لأشهر الماركات — مع توصيل لجميع محافظات سلطنة عُمان.',
    footerPrices: 'جميع الأسعار بالريال العُماني.', footerDelivery: 'رسوم توصيل ثابتة 2.000 ر.ع لكل طلب · داخل سلطنة عُمان فقط.',
    footerContact: 'تواصل معنا', footerShop: 'الأقسام', footerHelp: 'مساعدة',
    rights: 'جميع الحقوق محفوظة.',
    trademark: 'Brembo علامة تجارية مسجلة لمالكها. أسماء وشعارات السيارات لأغراض التعريف بالتوافق فقط.',
    toastAdded: 'أُضيف إلى السلة',
  },
  en: {
    brandTag: 'Original Brembo brake parts in Oman',
    skip: 'Skip to content',
    navShop: 'Shop', navVehicles: 'By vehicle', navDelivery: 'Delivery & payment', navFitment: 'Checking fitment',
    menu: 'Menu', close: 'Close',
    searchPh: 'Search part no., OE, model…', searchLabel: 'Search products', searchGo: 'Search',
    cart: 'Cart', cartTitle: 'Your cart', cartEmpty: 'Your cart is empty.', cartEmptySub: 'Find your vehicle or browse the categories to add parts.',
    browse: 'Browse the shop',
    subtotal: 'Subtotal', delivery: 'Delivery', total: 'Total', checkout: 'Checkout', continueShopping: 'Continue shopping',
    remove: 'Remove', qty: 'Quantity', increase: 'Increase quantity', decrease: 'Decrease quantity',
    addToCart: 'Add to cart', added: 'Added to cart', inCart: 'In cart',
    omr: 'OMR', perSet: 'per set', perPiece: 'per piece', set: 'Set', piece: 'Piece',
    front: 'Front', rear: 'Rear', all: 'All',
    representative: 'Representative category image',
    oe: 'OE no.', sku: 'Brembo no.',
    fits: 'Listed for', viewDetails: 'Details',
    langName: 'العربية', langSwitch: 'عرض بالعربية',
    whatsapp: 'WhatsApp',
    finderTitle: 'Find parts for your vehicle', finderSub: 'Choose make and model, then generation and year if you know them.',
    make: 'Make', model: 'Model', chassis: 'Generation / chassis', year: 'Model year',
    chooseMake: 'Choose make', chooseModel: 'Choose model', anyChassis: 'Not sure / all', anyYear: 'Any year',
    findParts: 'Show matching parts',
    filters: 'Filters', clearAll: 'Clear all', category: 'Category', position: 'Axle position', sort: 'Sort',
    sortRelevance: 'Best match', sortPriceAsc: 'Price: low to high', sortPriceDesc: 'Price: high to low',
    results: 'products', noResults: 'No matching parts.', noResultsSub: 'Try removing some filters, or send us your VIN on WhatsApp and we will look it up.',
    showResults: 'Show results', yearUnlisted: 'Model years not listed — confirmation needed', yearListed: 'Listed for',
    allCategories: 'All categories', vehicleSelected: 'Your vehicle',
    home: 'Home', shop: 'Shop',
    compat: 'Listed fitment', compatNote: 'Fitment data comes from the supplier listing. Always confirm by matching the OE number on your current part, or send us your VIN before ordering.',
    compatUnclear: 'Part of this listing is ambiguous in the supplier data — please confirm with us before ordering.',
    vehicleCol: 'Vehicle', chassisCol: 'Generation / chassis', yearsCol: 'Years', notesCol: 'Notes', notListed: 'Not listed', present: 'present',
    specs: 'Specifications', brand: 'Brand', categoryLbl: 'Category', soldAs: 'Sold as', supplierDesc: 'Supplier description',
    diameter: 'Diameter / thickness', confirmWithUs: 'Not listed — ask us with your VIN',
    fluidUniversal: 'Suitable for any vehicle that requires this specification — check your owner’s manual or reservoir cap.',
    askFitment: 'Ask about fitment on WhatsApp', askFitmentMsg: 'Hello, I would like to confirm this part fits my vehicle:',
    forSameVehicle: 'More parts for the same vehicle', similar: 'Similar products',
    deliveryLine: '2.000 OMR delivery to every governorate in Oman', codLine: 'Cash on delivery available',
    verifyLine: 'Check the OE number before ordering',
    checkoutTitle: 'Checkout', contact: 'Contact details', deliveryAddress: 'Delivery address', payment: 'Payment method', orderSummary: 'Order summary',
    fullName: 'Full name', namePh: 'e.g. Salim Al Hinai', phone: 'Phone number (Oman)', phoneHint: '8 digits starting with 7 or 9',
    governorate: 'Governorate', wilayat: 'Wilayat', chooseGov: 'Choose governorate', chooseWil: 'Choose wilayat',
    address: 'Address details', addressPh: 'Area, street, building no. or nearest landmark',
    vin: 'VIN (optional)', vinHint: '17 characters — helps us verify fitment before dispatch',
    notes: 'Notes (optional)', notesPh: 'e.g. preferred delivery time',
    payCod: 'Cash on delivery', payCodSub: 'Pay in cash when your order arrives',
    payLink: 'Bank card / Apple Pay', payLinkSub: 'Our team sends you a secure payment link after confirming the order',
    payNote: 'We never ask for or store card details on this website.',
    placeOrder: 'Place order', placing: 'Sending order…',
    errName: 'Please enter your name (at least 2 characters).', errPhone: 'Enter a valid 8-digit Omani number starting with 7 or 9.',
    errGov: 'Choose a governorate.', errWil: 'Choose a wilayat.', errAddress: 'Enter your address details.', errVin: 'A VIN has 17 letters/digits (no I, O or Q).',
    errItems: 'Your cart changed — please review it.', errPayment: 'Choose a payment method.',
    errServer: 'We could not save the order right now. You can send it directly on WhatsApp.', errNetwork: 'Connection problem. Check your internet and try again, or send the order on WhatsApp.',
    errRate: 'Too many attempts. Please wait a minute and try again.',
    sendWhatsappFallback: 'Send order on WhatsApp',
    emptyCheckout: 'There are no products in your cart.',
    termsLine: 'After you place the order, our team contacts you to confirm fitment and delivery time.',
    orderPlaced: 'Order received', orderRef: 'Order number', orderNext: 'Last step: send the order to us on WhatsApp so we can confirm it quickly.',
    sendOnWhatsapp: 'Send order on WhatsApp', orderSaved: 'Your order is saved. Keep the order number for follow-up.', orderMissing: 'No recent order on this device.',
    footerAbout: 'Brembo brake parts — pads, discs, wear sensors and brake fluid for popular makes, delivered to every governorate in Oman.',
    footerPrices: 'All prices in Omani Rial.', footerDelivery: 'Flat 2.000 OMR delivery per order · within the Sultanate of Oman only.',
    footerContact: 'Contact', footerShop: 'Categories', footerHelp: 'Help',
    rights: 'All rights reserved.',
    trademark: 'Brembo is a registered trademark of its owner. Vehicle names and logos are used only to identify fitment.',
    toastAdded: 'Added to cart',
  },
} as const;

export type DictKey = keyof typeof dict.ar;
export function t(lang: Lang, key: DictKey): string {
  return dict[lang][key];
}
export function dictFor(lang: Lang) {
  return dict[lang];
}

/** Strings the client-side scripts need, serialised into each page. */
export const CLIENT_KEYS: DictKey[] = [
  'omr', 'remove', 'increase', 'decrease', 'cartEmpty', 'cartEmptySub', 'browse', 'subtotal', 'delivery', 'total', 'checkout',
  'added', 'inCart', 'addToCart', 'toastAdded', 'results', 'chooseModel', 'anyChassis', 'anyYear', 'yearUnlisted', 'yearListed', 'set', 'piece',
  'errName', 'errPhone', 'errGov', 'errWil', 'errAddress', 'errVin', 'errItems', 'errPayment', 'errServer', 'errNetwork', 'errRate', 'placing', 'placeOrder',
  'chooseWil', 'emptyCheckout', 'front', 'rear', 'searchGo', 'viewDetails', 'qty', 'noResults', 'clearAll', 'all', 'sendWhatsappFallback',
];
