# 🧪 Güvenlik Smoke Testleri

Bu doküman, güvenlik kontrollerinin çalıştığını doğrulamak içindir.

---

## Hazırlık

1. Tarayıcıda admin panele gidin: `http://localhost:3001/admin`
2. Test için farklı rollerde kullanıcılar hazırlayın:
   - 1 x **editor** rolünde kullanıcı
   - 1 x **approver** rolünde kullanıcı

---

## Test 1: Editor Hassas Duyuru Yayınlayamaz

**Amaç:** Editor rolündeki kullanıcı, hassas kategorideki duyuruyu "Yayınlandı" yapamamalı.

| Adım | Yapılacak |
|------|-----------|
| 1 | Editor hesabıyla giriş yapın |
| 2 | Duyurular → Yeni Duyuru |
| 3 | Kategori: **Hassas** seçin |
| 4 | Durum: **Yayınlandı** seçin |
| 5 | Kaydet butonuna basın |

**Beklenen Sonuç:**
- ❌ Kayıt başarısız olmalı
- Hata mesajı: "Hassas duyuru sadece onaylayıcı veya yönetici tarafından yayınlanabilir"

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 2: Approver Hassas Duyuru Yayınlayabilir

**Amaç:** Approver rolündeki kullanıcı, hassas kategorideki duyuruyu "Yayınlandı" yapabilmeli.

| Adım | Yapılacak |
|------|-----------|
| 1 | Approver hesabıyla giriş yapın |
| 2 | Duyurular → Test 1'deki duyuruyu açın (veya yeni oluşturun) |
| 3 | Kategori: **Hassas** olmalı |
| 4 | Durum: **Yayınlandı** seçin |
| 5 | Kaydet butonuna basın |

**Beklenen Sonuç:**
- ✅ Kayıt başarılı olmalı
- Duyuru listesinde "Yayınlandı" olarak görünmeli

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 3: Player Anon-Only İstek Atar

**Amaç:** Admin girişi varken bile /player sayfası anonim olarak çalışmalı, admin yetkisi sızmamalı.

| Adım | Yapılacak |
|------|-----------|
| 1 | Admin hesabıyla giriş yapın |
| 2 | Yeni sekmede `http://localhost:3001/player` açın |
| 3 | F12 ile DevTools açın |
| 4 | Network sekmesine gidin |
| 5 | Sayfayı yenileyin (F5) |
| 6 | Supabase isteklerini bulun (arama: "supabase") |
| 7 | Herhangi bir isteğe tıklayın → Headers |

**Beklenen Sonuç:**
- ✅ Authorization header'da **Bearer token olmamalı**
- ✅ Sadece `apikey` header olmalı (anon key)

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test 4: Player Sadece Published İçerik Çeker

**Amaç:** Player, draft veya pending_review durumundaki içerikleri görmemeli.

| Adım | Yapılacak |
|------|-----------|
| 1 | Admin panelde bir duyuru oluşturun |
| 2 | Durum: **Taslak** olarak kaydedin |
| 3 | `/player` sayfasını açın |
| 4 | Taslak duyurunun **görünmediğini** kontrol edin |
| 5 | Admin panele dönün, aynı duyuruyu **Yayınlandı** yapın |
| 6 | `/player` sayfasını yenileyin |

**Beklenen Sonuç:**
- ❌ Taslak duyuru player'da görünmemeli
- ✅ Yayınlandı yapınca görünmeli

**Sonuç:** ☐ Geçti ☐ Kaldı

---

## Test Özeti

| Test | Açıklama | Sonuç |
|------|----------|-------|
| 1 | Editor hassas publish yapamaz | ☐ Geçti ☐ Kaldı |
| 2 | Approver hassas publish yapabilir | ☐ Geçti ☐ Kaldı |
| 3 | Player anon-only istek atar | ☐ Geçti ☐ Kaldı |
| 4 | Player sadece published çeker | ☐ Geçti ☐ Kaldı |

**Test Tarihi:** _______________  
**Testi Yapan:** _______________

---

## Sorun Olursa

Bir test başarısız olursa şu bilgileri not alın:
1. Hangi test başarısız oldu?
2. Saat kaçtı?
3. Hangi kullanıcı hesabıyla test ettiniz?
4. Konsol hatası var mı? (F12 → Console → kırmızı yazılar)
5. Ekran görüntüsü alın
