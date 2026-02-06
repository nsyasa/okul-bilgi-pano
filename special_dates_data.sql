-- MEB BELİRLİ GÜN VE HAFTALAR ÇİZELGESİ (2025-2026)
-- https://www.meb.gov.tr/belirli-gun-ve-haftalar-cizelgesi/duyuru/11814

INSERT INTO public.special_dates (start_date, end_date, name, type, description, icon) VALUES

-- OCAK
('2026-01-09', '2026-01-15', 'Enerji Tasarrufu Haftası', 'special_week', 'Ocak ayının 2. haftası', '💡'),

-- ŞUBAT
('2026-02-23', '2026-02-28', 'Vergi Haftası', 'special_week', 'Şubat ayının son haftası', '💼'),

-- MART
('2026-03-01', '2026-03-07', 'Yeşilay Haftası', 'special_week', '1 Mart gününü içine alan hafta', '🍃'),
('2026-03-01', '2026-03-07', 'Girişimcilik Haftası', 'special_week', 'Mart ayının ilk haftası', '🚀'),
('2026-03-08', '2026-03-08', 'Dünya Kadınlar Günü', 'event', '', '👩'),
('2026-03-08', '2026-03-14', 'Bilim ve Teknoloji Haftası', 'special_week', '8-14 Mart', '🔬'),
('2026-03-12', '2026-03-12', 'İstiklâl Marşı''nın Kabulü ve Mehmet Akif Ersoy''u Anma Günü', 'event', '', '🎖️'),
('2026-03-15', '2026-03-21', 'Tüketiciyi Koruma Haftası', 'special_week', '15-21 Mart', '🛍️'),
('2026-03-18', '2026-03-18', 'Şehitler Günü', 'holiday', '', '⚔️'),
('2026-03-18', '2026-03-24', 'Yaşlılar Haftası', 'special_week', '18-24 Mart', '👴'),
('2026-03-21', '2026-03-27', 'Türk Dünyası ve Toplulukları Haftası', 'special_week', '21 Mart Nevruz gününü içine alan hafta', '🌍'),
('2026-03-21', '2026-03-26', 'Orman Haftası', 'special_week', '21-26 Mart', '🌲'),
('2026-03-22', '2026-03-22', 'Dünya Su Günü', 'event', '', '💧'),
('2026-03-27', '2026-03-27', 'Dünya Tiyatrolar Günü', 'event', '', '🎭'),
('2026-03-30', '2026-04-05', 'Kütüphaneler Haftası', 'special_week', 'Mart ayının son pazartesi gününü içine alan hafta', '📚'),

-- NİSAN
('2026-04-01', '2026-04-07', 'Kanser Haftası', 'special_week', '1-7 Nisan', '🎗️'),
('2026-04-02', '2026-04-02', 'Dünya Otizm Farkındalık Günü', 'event', '', '🧩'),
('2026-04-07', '2026-04-07', 'Kişisel Verileri Koruma Günü', 'event', '', '🔐'),
('2026-04-07', '2026-04-13', 'Dünya Sağlık Günü / Dünya Sağlık Haftası', 'special_week', '7-13 Nisan', '🏥'),
('2026-04-15', '2026-04-22', 'Turizm Haftası', 'special_week', '15-22 Nisan', '✈️'),
('2026-04-23', '2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', 'holiday', 'Resmi tatil', '🎉'),
('2026-04-26', '2026-04-26', 'Dünya Fikrî Mülkiyet Günü', 'event', '', '💡'),
('2026-04-29', '2026-04-29', 'Kût''ül Amâre Zaferi', 'event', '', '⚔️'),

-- MAYIS
('2026-05-01', '2026-05-07', 'Bilişim Haftası', 'special_week', 'Mayıs ayının ilk haftası', '💻'),
('2026-05-01', '2026-05-07', 'Trafik ve İlkyardım Haftası', 'special_week', 'Mayıs ayının ilk haftası', '🚗'),
('2026-05-01', '2026-05-01', 'Emek ve Dayanışma Günü', 'holiday', 'Resmi tatil', '👷'),
('2026-05-04', '2026-05-10', 'İş Sağlığı ve Güvenliği Haftası', 'special_week', '4-10 Mayıs', '🛡️'),
('2026-05-08', '2026-05-14', 'Vakıflar Haftası', 'special_week', 'Mayıs ayının 2. haftası', '🏛️'),
('2026-05-10', '2026-05-10', 'Anneler Günü', 'event', 'Mayıs ayının 2. Pazarı', '👩‍❤️‍👨'),
('2026-05-10', '2026-05-16', 'Engelliler Haftası', 'special_week', '10-16 Mayıs', '♿'),
('2026-05-18', '2026-05-24', 'Müzeler Haftası', 'special_week', '18-24 Mayıs', '🎨'),
('2026-05-19', '2026-05-19', 'Atatürk''ü Anma ve Gençlik ve Spor Bayramı', 'holiday', 'Resmi tatil', '🎖️'),
('2026-05-25', '2026-05-25', 'Etik Günü', 'event', '', '⚖️'),
('2026-05-29', '2026-05-29', 'İstanbul''un Fethi', 'event', '', '🕌'),

-- HAZİRAN
('2026-06-01', '2026-06-07', 'Hayat Boyu Öğrenme Haftası', 'special_week', 'Haziran ayının ilk haftası', '🎓'),
('2026-06-08', '2026-06-14', 'Çevre ve İklim Değişikliği Haftası', 'special_week', 'Haziran ayının 2. haftası', '🌍'),
('2026-06-21', '2026-06-21', 'Babalar Günü', 'event', 'Haziran ayının 3. Pazarı', '👨‍👧‍👦'),

-- TEMMUZ
('2026-07-15', '2026-07-16', 'Demokrasi ve Milli Birlik Günü', 'holiday', '15 Temmuz', '🗳️'),

-- AĞUSTOS
('2026-08-30', '2026-08-30', 'Zafer Bayramı', 'holiday', 'Resmi tatil', '⚔️'),

-- EYLÜL
('2026-09-07', '2026-09-07', 'Uluslararası Temiz Hava Günü', 'event', '7 Eylül', '🌬️'),
('2026-09-12', '2026-09-12', 'Dünya İlk Yardım Günü', 'event', 'Eylül ayının ikinci cumartesi', '🚑'),
('2026-09-14', '2026-09-20', 'İlköğretim Haftası', 'special_week', 'Eylül ayının 3. haftası', '🎒'),
('2026-09-20', '2026-09-20', 'Öğrenciler Günü', 'event', 'İlköğretim Haftasının son günü', '👨‍🎓'),
('2026-09-19', '2026-09-19', 'Gaziler Günü', 'event', '19 Eylül', '🎖️'),
('2026-09-28', '2026-09-28', 'Dünya Okul Sütü Günü', 'event', '28 Eylül', '🥛'),

-- EKİM
('2026-10-01', '2026-10-07', 'Disleksi Haftası', 'special_week', 'Ekim ayının ilk haftası', '📖'),
('2026-10-01', '2026-10-01', 'Dünya Disleksi Günü', 'event', 'Ekim ayının ilk haftasının perşembe günü', '📚'),
('2026-10-04', '2026-10-04', 'Hayvanları Koruma Günü', 'event', '4 Ekim', '🐾'),
('2026-10-08', '2026-10-12', 'Ahilik Kültürü Haftası', 'special_week', '8-12 Ekim', '🏛️'),
('2026-10-13', '2026-10-13', 'Dünya Afet Azaltma Günü', 'event', '13 Ekim', '🚨'),
('2026-10-24', '2026-10-24', 'Birleşmiş Milletler Günü', 'event', '24 Ekim', '🌐'),
('2026-10-29', '2026-10-29', 'Cumhuriyet Bayramı', 'holiday', 'Resmi tatil', '🎆'),
('2026-10-29', '2026-11-04', 'Kızılay Haftası', 'special_week', '29 Ekim - 4 Kasım', '❤️'),

-- KASIM
('2026-11-03', '2026-11-09', 'Organ Bağışı ve Nakli Haftası', 'special_week', '3-9 Kasım', '❤️'),
('2026-11-02', '2026-11-08', 'Lösemili Çocuklar Haftası', 'special_week', '2-8 Kasım', '🎗️'),
('2026-11-10', '2026-11-16', 'Atatürk Haftası', 'special_week', '10-16 Kasım', '🎖️'),
('2026-11-14', '2026-11-14', 'Dünya Diyabet Günü', 'event', '14 Kasım', '🩺'),
('2026-11-12', '2026-11-12', 'Afet Eğitimi Hazırlık Günü', 'event', '12 Kasım', '🚨'),
('2026-11-20', '2026-11-20', 'Dünya Felsefe Günü', 'event', '20 Kasım', '🤔'),
('2026-11-20', '2026-11-20', 'Dünya Çocuk Hakları Günü', 'event', '20 Kasım', '👶'),
('2026-11-21', '2026-11-27', 'Ağız ve Diş Sağlığı Haftası', 'special_week', '21-27 Kasım', '🦷'),
('2026-11-24', '2026-11-24', 'Öğretmenler Günü', 'event', '24 Kasım', '👨‍🏫'),

-- ARALIK
('2026-12-03', '2026-12-03', 'Dünya Engelliler Günü', 'event', '3 Aralık', '♿'),
('2026-12-04', '2026-12-04', 'Dünya Madenciler Günü', 'event', '4 Aralık', '⛏️'),
('2026-12-05', '2026-12-05', 'Türk Kadınına Seçme ve Seçilme Hakkının Verilişi', 'event', '5 Aralık', '👩'),
('2026-12-07', '2026-12-17', 'Mevlana Haftası', 'special_week', '7-17 Aralık', '🕌'),
('2026-12-10', '2026-12-16', 'İnsan Hakları ve Demokrasi Haftası', 'special_week', '10 Aralık gününü içine alan hafta', '⚖️'),
('2026-12-12', '2026-12-18', 'Tutum, Yatırım ve Türk Malları Haftası', 'special_week', '12-18 Aralık', '🇹🇷'),
('2026-12-20', '2026-12-27', 'Mehmet Akif Ersoy''u Anma Haftası', 'special_week', '20-27 Aralık', '📚')
ON CONFLICT DO NOTHING;
