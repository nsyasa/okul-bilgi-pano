# 🧪 Player Saha Testi Rehberi

## Amaç
Bu test, okul bilgi panosu (player) ekranının düzgün çalıştığını doğrulamak içindir. Videolar, resimler ve duyurular sırayla dönmeli, hiçbir içerik takılıp kalmamalıdır.

---

## Hazırlık (5 dakika)

1. **Bilgisayarda tarayıcı açın** → `http://localhost:3001/admin` adresine gidin
2. **Video ekleyin:**
   - Sol menüden "YouTube Videoları" seçin
   - 2 adet kısa video ekleyin (örn: 1-2 dakikalık videolar)
   - 1 adet bozuk link ekleyin (örn: `https://youtube.com/watch?v=BOZUKLINK`)
3. **Duyuru ekleyin:**
   - Sol menüden "Duyurular" seçin
   - En az 2 adet resimli duyuru ekleyin
   - En az 1 adet sadece yazılı duyuru ekleyin
4. **Döngü süresini ayarlayın:**
   - "Döngü Ayarları" sekmesine gidin
   - Metin: 5 saniye
   - Resim: 5 saniye
   - "Kaydet" butonuna basın
5. **Player'ı açın:** Yeni sekmede `http://localhost:3001/player` adresine gidin

---

## Test 1: Video Geçişi

| Adım | Yapılacak | Beklenen Sonuç |
|------|-----------|----------------|
| 1 | Birinci videonun bitmesini bekleyin | ✅ Video bitince otomatik ikinci videoya geçmeli |
| 2 | Videonun üstünde saniye sayacı görünüyor mu? | ✅ Sayaç aşağı saymalı |

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 2: Mod Geçişi

| Adım | Yapılacak | Beklenen Sonuç |
|------|-----------|----------------|
| 1 | Son videonun bitmesini bekleyin | ✅ Resim veya yazı moduna geçmeli |
| 2 | Döngü tamamlanınca | ✅ Tekrar video moduna dönmeli |

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 3: Döngü Süreleri

| Adım | Yapılacak | Beklenen Sonuç |
|------|-----------|----------------|
| 1 | Resim modunda kronometreyle ölçün | ✅ Her resim yaklaşık 5 saniye gösterilmeli |
| 2 | Yazı modunda kronometreyle ölçün | ✅ Her yazı yaklaşık 5 saniye gösterilmeli |

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 4: Bozuk Video

| Adım | Yapılacak | Beklenen Sonuç |
|------|-----------|----------------|
| 1 | Bozuk video linkine sıra geldiğinde | ✅ Takılmadan bir sonraki içeriğe geçmeli |
| 2 | Maksimum 30 saniye bekle | ✅ Ekran donmuş kalmamalı |

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## ⚠️ Sorun Olursa Not Alın

Bir test başarısız olursa aşağıdaki bilgileri kaydedin:

1. **Hangi mod?** (Video / Resim / Yazı)
2. **Saat kaçtı?** (Örn: 14:35)
3. **Kaç video/resim vardı?** (Örn: 2 video, 3 resim)
4. **Konsol hatası var mı?** (F12 tuşuna basın → "Console" sekmesi → kırmızı yazı var mı?)
5. **İnternet bağlantısı çalışıyor mu?** (Başka bir site açılıyor mu?)

---

## Test Özeti

| Test | Sonuç |
|------|-------|
| Video Geçişi | ☐ Geçti ☐ Kaldı |
| Mod Geçişi | ☐ Geçti ☐ Kaldı |
| Döngü Süreleri | ☐ Geçti ☐ Kaldı |
| Bozuk Video | ☐ Geçti ☐ Kaldı |

**Test Tarihi:** _______________  
**Testi Yapan:** _______________
