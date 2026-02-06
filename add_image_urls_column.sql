-- Announcements tablosuna image_urls kolonu ekle
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];
