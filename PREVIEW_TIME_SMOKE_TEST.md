# Önizleme Zamanı Testi (Smoke Test)

## Amaç
TV ekranını farklı bir saat/tarih için test etmek. Örneğin: "Yarın sabah 08:30'da ekran nasıl görünecek?" sorusunu cevaplamak.

---

## Test Adımları

### 1️⃣ Admin Paneline Gir
- Tarayıcıda `/admin` sayfasını aç
- Giriş yap

### 2️⃣ Zaman Önizleme Kartını Bul
- Dashboard'un üst kısmında yeşil **"Zaman Önizleme"** kutusu var
- Bu kutuyu bul

### 3️⃣ Tarih/Saat Seç
- "Tarih / Saat" kutusuna test etmek istediğin zamanı gir
- Örnek: `2026-02-09 08:30` (yarın sabah)

### 4️⃣ Süre (TTL) Seç
- Kaç saniye önizleme kalacağını seç
- Varsayılan: **60 saniye** (önerilir)

### 5️⃣ Mod Seç
| Mod | Açıklama |
|-----|----------|
| **Dondur** | Saat sabit kalır (08:30'da donup kalır) |
| **Akıt** | Saat ilerler (08:30, 08:31, 08:32...) |

### 6️⃣ Önizle Butonuna Tıkla
- Yeşil **"Önizle"** butonuna bas
- Yeni bir sekme açılacak

### 7️⃣ Kontrol Et
✅ Ekranın **üstünde yeşil banner** görünmeli:
   - "Önizleme Modu: [tarih saat]"
   - "Kalan: mm:ss"
   - "Çık" butonu

✅ Ekrandaki saat, seçtiğin saati göstermeli

✅ "Akıt" modundaysa saat ilerlemeli

### 8️⃣ TTL Dolunca
- Süre bitince banner kaybolmalı
- Ekran gerçek saate dönmeli
- Sayfa **yenilenmemeli** (ani geçiş olmalı)

### 9️⃣ Manuel Çıkış (Opsiyonel)
- Banner'daki **"Çık"** butonuna tıklarsan anında gerçek saate döner

---

## Freeze vs Run Farkı

| Özellik | Freeze (Dondur) | Run (Akıt) |
|---------|-----------------|------------|
| Saat hareketi | Sabit kalır | İlerler |
| Kullanım | Belirli anı test etme | Zaman akışını test etme |
| Örnek | "10:30'daki ders durumu" | "Ders bitimine 5dk kala ne olur?" |

---

## Sorun Olursa Kaydedilecek Bilgiler

Test başarısız olursa şu 5 bilgiyi not al:

| # | Bilgi | Örnek |
|---|-------|-------|
| 1 | Seçilen saat | 2026-02-09T08:30 |
| 2 | TTL süresi | 60 saniye |
| 3 | Mod | Dondur / Akıt |
| 4 | Banner görünüyor mu? | Evet / Hayır |
| 5 | TTL dolunca gerçek saate döndü mü? | Evet / Hayır |

Ek bilgi:
- Hangi tarayıcı kullanıldı? (Chrome, Firefox, Edge)
- Hangi cihaz? (PC, tablet, TV)
- Hata mesajı varsa ekran görüntüsü

---

## Beklenen Sonuç

✅ Banner görünür  
✅ Seçilen saat ekranda görünür  
✅ TTL dolunca otomatik döner  
✅ Sayfa yenilenmez  
