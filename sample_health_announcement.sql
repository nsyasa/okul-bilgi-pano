-- Önce image_urls kolonunu ekle (eğer yoksa)
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Sağlık Yaşam Haftası Duyurusu
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
  'Sağlık ve Yaşam Haftası 🏃‍♂️',
  'Değerli Öğrencilerimiz ve Velilerimiz,

Bu hafta okulumuzda "Sağlık ve Yaşam Haftası" etkinliklerimiz başlıyor!

🥗 Sağlıklı beslenme seminerleri
🏃‍♀️ Spor ve hareket workshopları  
🧘‍♂️ Stres yönetimi ve meditasyon
🩺 Ücretsiz sağlık taramaları
💧 Su içme kampanyası

Tüm öğrencilerimizin aktif katılımını bekliyoruz!

Hafta boyunca her gün farklı aktiviteler düzenlenecektir. Detaylı program sınıflarınızda paylaşılmıştır.

Sağlıklı nesiller için el ele! 💪

Okul İdaresi',
  NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
    'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800'
  ],
  90,
  'published',
  'event',
  '2026-02-04T08:00:00+03:00',
  '2026-02-14T18:00:00+03:00',
  false
);
