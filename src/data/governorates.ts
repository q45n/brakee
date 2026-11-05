// Governorates and wilayats of the Sultanate of Oman (11 governorates, 63 wilayats).
// Arabic names preserved from the original site. Correction: "محوت" (Mahout) was listed under
// Dhofar as well as Al Wusta; it belongs to Al Wusta, and Dhofar's tenth wilayat is Al Mazyunah.
export interface Wilayat { ar: string; en: string }
export interface Governorate { id: string; ar: string; en: string; wilayats: Wilayat[] }

const w = (ar: string, en: string): Wilayat => ({ ar, en });

export const GOVERNORATES: Governorate[] = [
  { id: 'muscat', ar: 'مسقط', en: 'Muscat', wilayats: [
    w('مسقط', 'Muscat'), w('مطرح', 'Muttrah'), w('بوشر', 'Bawshar'), w('السيب', 'As Seeb'), w('العامرات', 'Al Amerat'), w('قريات', 'Qurayyat'),
  ] },
  { id: 'dhofar', ar: 'ظفار', en: 'Dhofar', wilayats: [
    w('صلالة', 'Salalah'), w('طاقة', 'Taqah'), w('مرباط', 'Mirbat'), w('سدح', 'Sadah'), w('ضلكوت', 'Dhalkut'), w('رخيوت', 'Rakhyut'),
    w('مقشن', 'Maqshan'), w('شليم وجزر الحلانيات', 'Shalim & Hallaniyat Islands'), w('ثمريت', 'Thumrait'), w('المزيونة', 'Al Mazyunah'),
  ] },
  { id: 'musandam', ar: 'مسندم', en: 'Musandam', wilayats: [
    w('خصب', 'Khasab'), w('بخا', 'Bukha'), w('دبا البيعة', 'Dibba'), w('مدحاء', 'Madha'),
  ] },
  { id: 'buraimi', ar: 'البريمي', en: 'Al Buraimi', wilayats: [
    w('البريمي', 'Al Buraimi'), w('محضة', 'Mahdah'), w('السنينة', 'As Sunaynah'),
  ] },
  { id: 'dakhiliyah', ar: 'الداخلية', en: 'Ad Dakhiliyah', wilayats: [
    w('نزوى', 'Nizwa'), w('بهلاء', 'Bahla'), w('منح', 'Manah'), w('الحمراء', 'Al Hamra'), w('أدم', 'Adam'), w('إزكي', 'Izki'), w('سمائل', 'Samail'), w('بدبد', 'Bidbid'),
  ] },
  { id: 'north-batinah', ar: 'شمال الباطنة', en: 'North Al Batinah', wilayats: [
    w('صحار', 'Sohar'), w('شناص', 'Shinas'), w('لوى', 'Liwa'), w('صحم', 'Saham'), w('الخابورة', 'Al Khaburah'), w('السويق', 'As Suwayq'),
  ] },
  { id: 'south-batinah', ar: 'جنوب الباطنة', en: 'South Al Batinah', wilayats: [
    w('الرستاق', 'Ar Rustaq'), w('العوابي', 'Al Awabi'), w('نخل', 'Nakhal'), w('وادي المعاول', 'Wadi Al Maawil'), w('بركاء', 'Barka'), w('المصنعة', 'Al Musanaah'),
  ] },
  { id: 'dhahirah', ar: 'الظاهرة', en: 'Ad Dhahirah', wilayats: [
    w('عبري', 'Ibri'), w('ينقل', 'Yanqul'), w('ضنك', 'Dhank'),
  ] },
  { id: 'north-sharqiyah', ar: 'شمال الشرقية', en: 'North Ash Sharqiyah', wilayats: [
    w('إبراء', 'Ibra'), w('المضيبي', 'Al Mudaybi'), w('بدية', 'Bidiyah'), w('القابل', 'Al Qabil'), w('وادي بني خالد', 'Wadi Bani Khalid'), w('دماء والطائيين', 'Dima Wa At Taiyyin'),
  ] },
  { id: 'south-sharqiyah', ar: 'جنوب الشرقية', en: 'South Ash Sharqiyah', wilayats: [
    w('صور', 'Sur'), w('الكامل والوافي', 'Al Kamil Wal Wafi'), w('جعلان بني بو علي', 'Jaalan Bani Bu Ali'), w('جعلان بني بو حسن', 'Jaalan Bani Bu Hassan'), w('مصيرة', 'Masirah'),
  ] },
  { id: 'wusta', ar: 'الوسطى', en: 'Al Wusta', wilayats: [
    w('هيماء', 'Haima'), w('محوت', 'Mahout'), w('الدقم', 'Ad Duqm'), w('الجازر', 'Al Jazir'),
  ] },
];

export function findWilayat(govId: string, wilayatEn: string): { gov: Governorate; wil: Wilayat } | null {
  const gov = GOVERNORATES.find((g) => g.id === govId);
  if (!gov) return null;
  const wil = gov.wilayats.find((x) => x.en === wilayatEn);
  return wil ? { gov, wil } : null;
}
