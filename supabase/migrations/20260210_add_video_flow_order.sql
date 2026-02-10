-- Add flow_order to youtube_videos
alter table public.youtube_videos 
add column if not exists flow_order int;

-- Backfill: Initialize with priority or simple sequence (offset by max announcement order to append?)
-- Actually, let's just use current priority or just random sequence.
-- We will handle collision resolution in UI or just let them coexist until first sorting.
with numbered as (
  select id, row_number() over (order by created_at desc) as rn
  from public.youtube_videos
)
update public.youtube_videos
set flow_order = numbered.rn + 1000 -- Start after likely announcement range to avoid immediate overlap visual confusion
from numbered
where public.youtube_videos.id = numbered.id
and flow_order is null;
