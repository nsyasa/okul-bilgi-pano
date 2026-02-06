# Okul Pano - TV Player (Next.js + Supabase)

## Kurulum
1) Node.js 18+ kurulu olsun
2) Projeyi aç:
   - `npm install`
3) Ortam değişkenleri:
   - `.env.example` dosyasını `.env.local` yap
   - Supabase URL ve ANON KEY gir
4) Çalıştır:
   - `npm run dev`
5) Tarayıcı:
   - http://localhost:3000/player

## Notlar
- Bu iskelet sadece "TV Player" arayüzünü içerir.
- Supabase tablo adları örnek:
  - announcements, events, duty_teachers, ticker_items, schedule_templates, schedule_overrides, school_info
- Admin panel ve Supabase şema/RLS bir sonraki adımda eklenecek.


## Admin Panel
- URL: `/admin`
- Giriş: Supabase Auth (email/password)
- Roller: `profiles` tablosu (schema.sql)
- Bucket: `pano-media` (public önerilir)
