# 🔐 Güvenlik Rol Matrisi

Bu doküman, okul bilgi panosu sisteminde **kim ne yapabilir** sorusunu yanıtlar.

---

## Roller

| Rol | Açıklama | Kaynak |
|-----|----------|--------|
| **anon** | Giriş yapmamış kullanıcı (player ekranı) | RLS policy: `anon` |
| **editor** | İçerik düzenleyici (öğretmen) | `profiles.role = 'editor'` |
| **approver** | Onaylayıcı (müdür yardımcısı) | `profiles.role = 'approver'` |
| **admin** | Yönetici (müdür, IT) | `profiles.role = 'admin'` |

---

## Yetki Matrisi

### Duyurular (announcements)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma (published) | ✅ | ✅ | ✅ | ✅ |
| Okuma (tümü) | ❌ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |
| **Hassas duyuru yayınlama** | ❌ | ❌ | ✅ | ✅ |

> ⚠️ **Özel Kural:** `category='sensitive'` olan duyurular sadece **approver** veya **admin** tarafından `status='published'` yapılabilir. Editor bu kombinasyonu kaydedemez (DB seviyesinde engellenir).

### Nöbetçi Öğretmenler (duty_teachers)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma | ✅ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |

### Ders Programı (schedule_templates, schedule_overrides)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma | ✅ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |

### Kayan Yazı (ticker_items)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma | ✅ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |

### YouTube Videoları (youtube_videos)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma | ✅ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |

### Okul Bilgileri (school_info)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Okuma | ✅ | ✅ | ✅ | ✅ |
| Oluşturma | ❌ | ✅ | ✅ | ✅ |
| Güncelleme | ❌ | ✅ | ✅ | ✅ |
| Silme | ❌ | ✅ | ✅ | ✅ |

### Kullanıcı Profilleri (profiles)

| Eylem | anon | editor | approver | admin |
|-------|------|--------|----------|-------|
| Kendi profilini okuma | ❌ | ✅ | ✅ | ✅ |
| Tüm profilleri okuma | ❌ | ❌ | ❌ | ✅ |
| Profil güncelleme | ❌ | ❌ | ❌ | ✅ |

---

## Güvenlik Kontrolleri

| Kontrol | Açıklama | Uygulama Yeri |
|---------|----------|---------------|
| Hassas duyuru publish | Editor hassas duyuruyu yayınlayamaz | RLS + Trigger |
| Player session izolasyonu | Admin girişi player'a sızmaz | `supabasePlayer.ts` |
| Görsel host kısıtlaması | Sadece Supabase hostundan görsel | `next.config.mjs` |
| Published içerik filtresi | Anon sadece yayınlanan içeriği görür | RLS + Query |

---

**Kaynak:** `supabase/schema.sql` (RLS policies ve helper functions)  
**Son Güncelleme:** Şubat 2026
