-- Örnek Duyuru - Düzenleyebilirsiniz
-- NOT: Supabase SQL Editor'de çalıştırırken RLS'yi bypass etmek için
-- başına şunu ekleyin: SET LOCAL ROLE postgres;

SET LOCAL ROLE postgres;

INSERT INTO public.announcements (
  title, 
  body, 
  image_url, 
  image_urls,
  priority, 
  status, 
  category, 
  start_at, 
  end_at,
  approved_label
) VALUES (
  'Velilere Bilgilendirme',
  'Değerli velilerimiz,

Öğrencilerimizin başarısı için aileleriyle işbirliği içinde olmayı önemsiyoruz. 

• Ders kitaplarının eksiksiz getirilmesi
• Okul kıyafetlerinin düzenli olması  
• Ders çalışma saatlerine dikkat edilmesi

konularında hassasiyet gösterilmesini rica ederiz.

Saygılarımızla,
Okul İdaresi',
  NULL,
  NULL,
  80,
  'published',
  'general',
  '2026-02-04T08:00:00+03:00',
  '2026-02-10T18:00:00+03:00',
  false
),
(
  'Spor Gün Etkinlikleri',
  'Okul Spor Gün Etkinlikleri 

Tarihi: 15 Şubat 2026
Saat: 09:00 - 16:00
Yer: Okul Bahçesi ve Spor Kompleksi

Harita, futbol, voleybol ve atletizm müsabakaları yapılacaktır.

Tüm öğrenciler katılmaya davetlidir!',
  NULL,
  NULL,
  75,
  'published',
  'event',
  '2026-02-04T08:00:00+03:00',
  '2026-02-15T18:00:00+03:00',
  false
),
(
  'Kütüphane Oryantasyonu',
  'Yeni Öğrenciler için Kütüphane Oryantasyonu

Tarih: 10 Şubat 2026
Saat: 14:00 - 14:45
Yer: Merkezi Kütüphane

Kütüphanemizin kaynaklarından yararlanmayı öğreneceksiniz.
Kütüphaneci Öğrt. Ayşe Hanım tarafından rehberlik yapılacak.',
  NULL,
  NULL,
  70,
  'published',
  'info',
  '2026-02-04T08:00:00+03:00',
  '2026-02-10T18:00:00+03:00',
  false
),
(
  'Matematik Yarışması Duyurusu',
  'Matematik Olimpiyatı Seçme Sınavı

Tarihler: 16-17 Şubat 2026
Saatler: 10:00 - 12:00
Yer: Matematik Bölümü Sınıfları

Aşağıdaki numaralı öğrenciler başvuru yapmışlardır:
- 9.A sınıfı: 15 öğrenci
- 10.A sınıfı: 12 öğrenci

Başarılar dilerim.',
  NULL,
  NULL,
  65,
  'published',
  'general',
  '2026-02-04T08:00:00+03:00',
  '2026-02-17T18:00:00+03:00',
  false
);
