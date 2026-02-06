/**
 * Admin verilerini doldurma scripti
 * Şehit Muhammed İslam Altuğ Anadolu İmam Hatip Lisesi için örnek veriler
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://uatussmeuzqirarcecfr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdHVzc21ldXpxaXJhcmNlY2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQ5NjMsImV4cCI6MjA4NTcxMDk2M30.MkC98ZXWurtygfZ0rUDCBt3Zb5_seAg_M3ae0d1QXB4";

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ve Key gerekli!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateData() {
  console.log('Admin verileri dolduruluyor...');

  try {
    // 1. Okul bilgileri kartları
    const schoolInfoData = [
      {
        title: 'Okul Vizyonumuz',
        body: 'Geleceğin lider nesilleri yetiştiren, Türkiye\'nin önde gelen İmam Hatip Lisesi olmak. Öğrencilerimizi hem akademik hem de manevi değerlerle donatarak topluma katkı sağlayan bireyler olarak hazırlamak.'
      },
      {
        title: 'Okul Misyonumuz',
        body: 'Kaliteli eğitim ve değerler eğitimi ile öğrencilerimizi hayata hazırlamak, milli ve manevi değerleri benimseyen, bilgili ve donanımlı gençler yetiştirmek.'
      },
      {
        title: 'Öğrenci Sayılarımız',
        body: '• 9. Sınıf: 180 öğrenci\n• 10. Sınıf: 165 öğrenci\n• 11. Sınıf: 170 öğrenci\n• 12. Sınıf: 155 öğrenci\n\nToplam: 670 öğrenci'
      },
      {
        title: 'Öğretmen Kadromuz',
        body: '• 45 branş öğretmeni\n• 8 meslek dersleri öğretmeni\n• 2 rehber öğretmeni\n• 1 müdür, 2 müdür yardımcısı'
      },
      {
        title: 'Başarılarımız',
        body: '• 2023 LGS il birincisi\n• Bölge matematik olimpiyatı 2. si\n• İl düzeyinde Kur\'an-ı Kerim yarışması şampiyonu\n• Türkiye güreş şampiyonasında derece'
      },
      {
        title: 'İletişim Bilgileri',
        body: 'Adres: Merkez Mahallesi, Eğitim Caddesi No:45\nTelefon: (0312) 555-1234\nE-posta: info@smialtugihl.meb.k12.tr\nWeb: www.smialtugihl.meb.k12.tr'
      }
    ];

    console.log('Okul bilgileri ekleniyor...');
    const { error: schoolError } = await supabase
      .from('school_info')
      .insert(schoolInfoData);
    
    if (schoolError) throw schoolError;
    console.log('✅ Okul bilgileri eklendi');

    // 2. Ticker mesajları
    const now = new Date();
    const tickerData = [
      {
        text: 'Velilerimize duyurulur: Veli toplantısı 15 Şubat 2026 Cumartesi saat 10:00\'da yapılacaktır.',
        is_active: true,
        priority: 90,
        start_at: now.toISOString(),
        end_at: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        text: '12. sınıf öğrencilerinin üniversite yerleştirme sınavı başvuruları 20 Şubat\'ta başlamaktadır.',
        is_active: true,
        priority: 85,
        start_at: now.toISOString(),
        end_at: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        text: 'Okul kantini saat 10:15-10:30 ve 13:00-14:00 arası açıktır.',
        is_active: true,
        priority: 60,
        start_at: null,
        end_at: null
      },
      {
        text: 'Kütüphane hafta içi 08:00-17:00, Cumartesi 09:00-15:00 arası öğrencilerimize açıktır.',
        is_active: true,
        priority: 50,
        start_at: null,
        end_at: null
      },
      {
        text: 'Öğrenci servisleri geç kalan öğrenciler için 17:30\'da son sefer yapmaktadır.',
        is_active: true,
        priority: 70,
        start_at: null,
        end_at: null
      }
    ];

    console.log('Ticker mesajları ekleniyor...');
    const { error: tickerError } = await supabase
      .from('ticker_items')
      .insert(tickerData);
    
    if (tickerError) throw tickerError;
    console.log('✅ Ticker mesajları eklendi');

    // 3. Duyurular
    const announcementsData = [
      {
        title: '2024-2025 Eğitim Öğretim Yılı Başlangıcı',
        body: 'Sayın velilerimiz ve değerli öğrencilerimiz,\n\n2024-2025 eğitim öğretim yılının başlamasıyla birlikte yeni dönemde başarılar dileriz. Okul kayıt işlemlerinin tamamlanması ve ders programlarının kesinleşmesi için gerekli çalışmalar sürdürülmektedir.\n\nÖğrencilerimizin ilk ders günü 9 Eylül 2024 Pazartesi günü saat 08:30\'da başlayacaktır.\n\nİyi bir eğitim yılı dileriz.',
        priority: 95,
        status: 'published',
        category: 'general',
        approved_label: true,
        start_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Veli Toplantısı Duyurusu',
        body: 'Değerli velilerimiz,\n\nÖğrencilerimizin akademik gelişimlerinin değerlendirilmesi amacıyla dönem sonu veli toplantısı düzenlenecektir.\n\n📅 Tarih: 15 Şubat 2026 Cumartesi\n🕙 Saat: 10:00 - 12:00\n📍 Yer: Okul Konferans Salonu\n\nToplantıda öğrencilerimizin not durumları, devam durumları ve sosyal faaliyetleri hakkında bilgi verilecektir.\n\nKatılımınız önemlidir.',
        priority: 90,
        status: 'published',
        category: 'event',
        approved_label: false,
        start_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        end_at: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Öğrenci Başarı Ödülleri',
        body: 'Geçtiğimiz dönemde akademik başarı gösteren öğrencilerimizi kutluyoruz!\n\n🥇 Dönem birincileri:\n- 9-A: Mehmet Ali YILMAZ\n- 10-B: Fatma Zehra KAYA\n- 11-A: Ali İhsan ÖZKAN\n- 12-B: Ayşe Nur DEMİR\n\nTüm başarılı öğrencilerimiz için ödül töreni 20 Şubat\'ta yapılacaktır.',
        priority: 80,
        status: 'published',
        category: 'general',
        approved_label: true,
        start_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_at: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Kış Tatili Uyarıları',
        body: 'Sayın öğrenci ve velilerimiz,\n\nKış tatili süresince öğrencilerimizin güvenliği için:\n\n⚠️ Buzlu yollarda dikkatli olunması\n❄️ Soğuk havalardan korunma önlemlerinin alınması\n🏠 Evde güvenli ortamda vakit geçirilmesi\n📚 Tatil ödevlerinin düzenli yapılması\n\nönerilir. Sağlıklı tatiller dileriz.',
        priority: 70,
        status: 'published',
        category: 'health',
        approved_label: false,
        start_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        end_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    console.log('Duyurular ekleniyor...');
    const { error: announcementError } = await supabase
      .from('announcements')
      .insert(announcementsData);
    
    if (announcementError) throw announcementError;
    console.log('✅ Duyurular eklendi');

    // 4. Nöbetçi öğretmenler (Bu haftanın günleri için)
    const today = new Date();
    const dutyData = [];
    
    const teachers = [
      ['Ahmet YILMAZ', 'Giriş Kapısı', 'Sabah 07:30-08:30'],
      ['Fatma KAYA', 'Kantin', 'Teneffüslerde'],
      ['Mehmet DEMİR', 'Bahçe', 'Öğle arası'],
      ['Zeynep ÖZKAN', 'Giriş Kapısı', 'Sabah 07:30-08:30'],
      ['Ali KORKMAZ', 'Üst Kat', 'Teneffüslerde'],
      ['Ayşe ARSLAN', 'Kantin', 'Öğle arası'],
      ['Mustafa ÇELİK', 'Giriş Kapısı', 'Sabah 07:30-08:30'],
      ['Emine AKTAŞ', 'Bahçe', 'Teneffüslerde'],
      ['Hasan YILDIZ', 'Üst Kat', 'Öğle arası'],
      ['Hatice ERDEM', 'Giriş Kapısı', 'Sabah 07:30-08:30'],
      ['İbrahim GÜLER', 'Kantin', 'Teneffüslerde'],
      ['Meryem KURT', 'Bahçe', 'Öğle arası'],
      ['Osman ŞAHİN', 'Giriş Kapısı', 'Sabah 07:30-08:30'],
      ['Rukiye ÖZTÜRK', 'Üst Kat', 'Teneffüslerde'],
      ['Yunus ACAR', 'Kantin', 'Öğle arası']
    ];

    for (let day = 0; day < 5; day++) {
      const currentDate = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
      const teachersForDay = teachers.slice(day * 3, (day + 1) * 3);
      
      teachersForDay.forEach(([name, area, note]) => {
        dutyData.push({
          date: currentDate.toISOString().split('T')[0],
          name,
          area,
          note
        });
      });
    }

    console.log('Nöbetçi öğretmenler ekleniyor...');
    const { error: dutyError } = await supabase
      .from('duty_teachers')
      .insert(dutyData);
    
    if (dutyError) throw dutyError;
    console.log('✅ Nöbetçi öğretmenler eklendi');

    console.log('\n🎉 Tüm admin verileri başarıyla eklendi!');
    console.log('\nEklenen veriler:');
    console.log('- 6 okul bilgileri kartı');
    console.log('- 5 ticker mesajı');
    console.log('- 4 duyuru');
    console.log('- 15 nöbetçi öğretmen kaydı (5 gün)');

  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

populateData();