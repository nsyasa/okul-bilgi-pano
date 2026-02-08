// Şehit Muhammed İslam Altuğ Anadolu İmam Hatip Lisesi
// Gerçek Nöbet Çizelgesi - 5 Ocak - 13 Şubat 2026

export type DutyTemplateEntry = { name: string; area: string; note: string | null };

export const DUTY_WEEKLY_TEMPLATE: Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday", DutyTemplateEntry[]> = {
  monday: [
    { name: "A.GÜNDÜZ, M.ARACI", area: "BAHÇE", note: null },
    { name: "Y.KARAMAN, A.G. HELVACİ", area: "GİRİŞ KAT", note: null },
    { name: "D.IŞIK, E.YAŞA", area: "1.KAT", note: null },
    { name: "F.POLAT", area: "2.KAT", note: null },
    { name: "A.KARAHAN", area: "3.KAT", note: null },
    { name: "Z. KALYONCU", area: "NÖBETÇİ İDARECİ", note: null }
  ],
  tuesday: [
    { name: "Ş.YILMAZ, R.CİHANTİMUR", area: "BAHÇE", note: null },
    { name: "M.FİDAN, Z.BOZ", area: "GİRİŞ KAT", note: null },
    { name: "N.ÖZDEMİR, E.YILDIRIM", area: "1.KAT", note: null },
    { name: "Y.DİLEK", area: "2.KAT", note: null },
    { name: "İ.GÜRBÜZ", area: "3.KAT", note: null },
    { name: "K. ÖZÜÇALIŞIR", area: "NÖBETÇİ İDARECİ", note: null }
  ],
  wednesday: [
    { name: "N.KÜRÜN, G.ERKAN UNGAN", area: "BAHÇE", note: null },
    { name: "S.ÖZYER, C.TEMEL", area: "GİRİŞ KAT", note: null },
    { name: "E.YILMAZEL, H.DURMUŞ", area: "1.KAT", note: null },
    { name: "İ.ÖZDOĞAN", area: "2.KAT", note: null },
    { name: "D.ÜSTÜNER", area: "3.KAT", note: null },
    { name: "M. ALİ KÜRÜN", area: "NÖBETÇİ İDARECİ", note: null }
  ],
  thursday: [
    { name: "M.DAŞTAN, T. BARIŞ", area: "BAHÇE", note: null },
    { name: "F.ALPASLAN, M.ÖZHAN", area: "GİRİŞ KAT", note: null },
    { name: "S.YAMAN, Y.TANIL", area: "1.KAT", note: null },
    { name: "H.ÇETİNKAYA", area: "2.KAT", note: null },
    { name: "H.BARAN", area: "3.KAT", note: null },
    { name: "F. YURDAY", area: "NÖBETÇİ İDARECİ", note: null }
  ],
  friday: [
    { name: "H.TOSUNER, A.TAHİROĞLU", area: "BAHÇE", note: null },
    { name: "V.PİRİNÇCİ, N.SAZİL", area: "GİRİŞ KAT", note: null },
    { name: "D.TEKİN, Y.GENÇ", area: "1.KAT", note: null },
    { name: "Ş.TOR", area: "2.KAT", note: null },
    { name: "C.AKSOY", area: "3.KAT", note: null },
    { name: "Z. KALYONCU", area: "NÖBETÇİ İDARECİ", note: null }
  ]
};

export function generateDutySchedule(startDate: string, endDate: string) {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });

  const dates: string[] = [];
  const allData: { date: string; name: string; area: string; note: string | null }[] = [];

  const dayMap: Record<number, keyof typeof DUTY_WEEKLY_TEMPLATE> = {
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
  };

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    if (!(weekday in dayMap)) continue;
    const dateKey = fmt.format(d);
    dates.push(dateKey);
    const template = DUTY_WEEKLY_TEMPLATE[dayMap[weekday]];
    for (const t of template) {
      allData.push({ date: dateKey, name: t.name, area: t.area, note: t.note });
    }
  }

  return { dates, allData };
}

