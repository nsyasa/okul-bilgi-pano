-- Şehit Muhammed İslam Altuğ Anadolu İmam Hatip Lisesi için örnek veriler

-- 1. Okul Bilgileri Kartları
INSERT INTO public.school_info (title, body) VALUES 
('Okul Vizyonumuz', 'Geleceğin lider nesilleri yetiştiren, Türkiye''nin önde gelen İmam Hatip Lisesi olmak. Öğrencilerimizi hem akademik hem de manevi değerlerle donatarak topluma katkı sağlayan bireyler olarak hazırlamak.'),
('Okul Misyonumuz', 'Kaliteli eğitim ve değerler eğitimi ile öğrencilerimizi hayata hazırlamak, milli ve manevi değerleri benimseyen, bilgili ve donanımlı gençler yetiştirmek.'),
('Öğrenci Sayılarımız', '• 9. Sınıf: 180 öğrenci\n• 10. Sınıf: 165 öğrenci\n• 11. Sınıf: 170 öğrenci\n• 12. Sınıf: 155 öğrenci\n\nToplam: 670 öğrenci'),
('Öğretmen Kadromuz', '• 45 branş öğretmeni\n• 8 meslek dersleri öğretmeni\n• 2 rehber öğretmeni\n• 1 müdür, 2 müdür yardımcısı'),
('Başarılarımız', '• 2023 LGS il birincisi\n• Bölge matematik olimpiyatı 2. si\n• İl düzeyinde Kur''an-ı Kerim yarışması şampiyonu\n• Türkiye güreş şampiyonasında derece'),
('İletişim Bilgileri', 'Adres: Merkez Mahallesi, Eğitim Caddesi No:45\nTelefon: (0312) 555-1234\nE-posta: info@smialtugihl.meb.k12.tr\nWeb: www.smialtugihl.meb.k12.tr');

-- 2. Ticker Mesajları
INSERT INTO public.ticker_items (text, is_active, priority, start_at, end_at) VALUES 
('Velilerimize duyurulur: Veli toplantısı 15 Şubat 2026 Cumartesi saat 10:00''da yapılacaktır.', true, 90, NOW(), NOW() + INTERVAL '10 days'),
('12. sınıf öğrencilerinin üniversite yerleştirme sınavı başvuruları 20 Şubat''ta başlamaktadır.', true, 85, NOW(), NOW() + INTERVAL '15 days'),
('Okul kantini saat 10:15-10:30 ve 13:00-14:00 arası açıktır.', true, 60, NULL, NULL),
('Kütüphane hafta içi 08:00-17:00, Cumartesi 09:00-15:00 arası öğrencilerimize açıktır.', true, 50, NULL, NULL),
('Öğrenci servisleri geç kalan öğrenciler için 17:30''da son sefer yapmaktadır.', true, 70, NULL, NULL);

-- 3. Duyurular
INSERT INTO public.announcements (title, body, priority, status, category, approved_label, start_at, end_at) VALUES 
('2024-2025 Eğitim Öğretim Yılı Başlangıcı', 'Sayın velilerimiz ve değerli öğrencilerimiz,

2024-2025 eğitim öğretim yılının başlamasıyla birlikte yeni dönemde başarılar dileriz. Okul kayıt işlemlerinin tamamlanması ve ders programlarının kesinleşmesi için gerekli çalışmalar sürdürülmektedir.

Öğrencilerimizin ilk ders günü 9 Eylül 2024 Pazartesi günü saat 08:30''da başlayacaktır.

İyi bir eğitim yılı dileriz.', 
95, 'published', 'general', true, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),

('Veli Toplantısı Duyurusu', 'Değerli velilerimiz,

Öğrencilerimizin akademik gelişimlerinin değerlendirilmesi amacıyla dönem sonu veli toplantısı düzenlenecektir.

📅 Tarih: 15 Şubat 2026 Cumartesi
🕙 Saat: 10:00 - 12:00
📍 Yer: Okul Konferans Salonu

Toplantıda öğrencilerimizin not durumları, devam durumları ve sosyal faaliyetleri hakkında bilgi verilecektir.

Katılımınız önemlidir.', 
90, 'published', 'event', false, NOW() + INTERVAL '1 day', NOW() + INTERVAL '11 days'),

('Öğrenci Başarı Ödülleri', 'Geçtiğimiz dönemde akademik başarı gösteren öğrencilerimizi kutluyoruz! 

🥇 Dönem birincileri:
- 9-A: Mehmet Ali YILMAZ
- 10-B: Fatma Zehra KAYA  
- 11-A: Ali İhsan ÖZKAN
- 12-B: Ayşe Nur DEMİR

Tüm başarılı öğrencilerimiz için ödül töreni 20 Şubat''ta yapılacaktır.',
80, 'published', 'general', true, NOW() - INTERVAL '5 days', NOW() + INTERVAL '15 days'),

('Kış Tatili Uyarıları', 'Sayın öğrenci ve velilerimiz,

Kış tatili süresince öğrencilerimizin güvenliği için:

⚠️ Buzlu yollarda dikkatli olunması
❄️ Soğuk havalardan korunma önlemlerinin alınması  
🏠 Evde güvenli ortamda vakit geçirilmesi
📚 Tatil ödevlerinin düzenli yapılması

önerilir. Sağlıklı tatiller dileriz.',
70, 'published', 'health', false, NOW() - INTERVAL '10 days', NOW() + INTERVAL '5 days');

-- 4. Nöbetçi Öğretmenler (Bu haftanın günleri için)
INSERT INTO public.duty_teachers (date, name, area, note) VALUES 
(CURRENT_DATE, 'Ahmet YILMAZ', 'Giriş Kapısı', 'Sabah 07:30-08:30'),
(CURRENT_DATE, 'Fatma KAYA', 'Kantin', 'Teneffüslerde'),
(CURRENT_DATE, 'Mehmet DEMİR', 'Bahçe', 'Öğle arası'),
(CURRENT_DATE + 1, 'Zeynep ÖZKAN', 'Giriş Kapısı', 'Sabah 07:30-08:30'),
(CURRENT_DATE + 1, 'Ali KORKMAZ', 'Üst Kat', 'Teneffüslerde'),
(CURRENT_DATE + 1, 'Ayşe ARSLAN', 'Kantin', 'Öğle arası'),
(CURRENT_DATE + 2, 'Mustafa ÇELİK', 'Giriş Kapısı', 'Sabah 07:30-08:30'),
(CURRENT_DATE + 2, 'Emine AKTAŞ', 'Bahçe', 'Teneffüslerde'),
(CURRENT_DATE + 2, 'Hasan YILDIZ', 'Üst Kat', 'Öğle arası'),
(CURRENT_DATE + 3, 'Hatice ERDEM', 'Giriş Kapısı', 'Sabah 07:30-08:30'),
(CURRENT_DATE + 3, 'İbrahim GÜLER', 'Kantin', 'Teneffüslerde'),
(CURRENT_DATE + 3, 'Meryem KURT', 'Bahçe', 'Öğle arası'),
(CURRENT_DATE + 4, 'Osman ŞAHİN', 'Giriş Kapısı', 'Sabah 07:30-08:30'),
(CURRENT_DATE + 4, 'Rukiye ÖZTÜRK', 'Üst Kat', 'Teneffüslerde'),
(CURRENT_DATE + 4, 'Yunus ACAR', 'Kantin', 'Öğle arası');