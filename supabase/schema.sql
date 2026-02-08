-- Okul Pano - minimum Supabase şeması (başlangıç)
-- Bu dosyayı Supabase SQL Editor'de çalıştırın.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'editor' check (role in ('admin','editor','approver')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  image_urls text[],
  priority int not null default 50,
  status text not null default 'draft' check (status in ('published','draft','pending_review','approved','rejected')),
  category text not null default 'general' check (category in ('general','event','special_day','sensitive','health','info')),
  display_mode text not null default 'small' check (display_mode in ('small','big','image')),
  approved_label boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_announcements_updated on public.announcements;
create trigger trg_announcements_updated
before update on public.announcements
for each row execute function public.set_updated_at();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.duty_teachers (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  area text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticker_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  priority int not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('mon_thu','fri')),
  slots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  slots jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.school_info (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text,
  url text not null,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  priority int not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.player_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.duty_teachers enable row level security;
alter table public.ticker_items enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.school_info enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.player_settings enable row level security;

create or replace function public.my_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_edit()
returns boolean language sql stable as $$
  select coalesce(public.my_role() in ('admin','editor','approver'), false);
$$;

create or replace function public.can_approve()
returns boolean language sql stable as $$
  select coalesce(public.my_role() in ('admin','approver'), false);
$$;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for all to authenticated
using (public.my_role() = 'admin')
with check (public.my_role() = 'admin');

-- Announcements
drop policy if exists "ann_read_published" on public.announcements;
create policy "ann_read_published" on public.announcements
for select to anon, authenticated
using (status = 'published');

drop policy if exists "ann_editors_all" on public.announcements;

-- Ann: Editors can SELECT all (for admin panel)
drop policy if exists "ann_editors_select" on public.announcements;
create policy "ann_editors_select" on public.announcements
for select to authenticated
using (public.can_edit());

-- Ann: Editors can INSERT (sensitive+published requires can_approve)
drop policy if exists "ann_editors_insert" on public.announcements;
create policy "ann_editors_insert" on public.announcements
for insert to authenticated
with check (
  public.can_edit() and (
    category != 'sensitive' or status != 'published' or public.can_approve()
  )
);

-- Ann: Editors can UPDATE (sensitive+published requires can_approve)
drop policy if exists "ann_editors_update" on public.announcements;
create policy "ann_editors_update" on public.announcements
for update to authenticated
using (public.can_edit())
with check (
  public.can_edit() and (
    category != 'sensitive' or status != 'published' or public.can_approve()
  )
);

-- Ann: Editors can DELETE
drop policy if exists "ann_editors_delete" on public.announcements;
create policy "ann_editors_delete" on public.announcements
for delete to authenticated
using (public.can_edit());

-- Trigger: Ek güvenlik katmanı (RLS bypass edilse bile çalışır)
create or replace function public.enforce_sensitive_publish()
returns trigger language plpgsql security definer as $$
begin
  -- Hassas duyuru + yayınla kombinasyonu sadece approver/admin yapabilir
  if new.category = 'sensitive' and new.status = 'published' then
    if not public.can_approve() then
      raise exception 'Hassas duyuru sadece onaylayıcı veya yönetici tarafından yayınlanabilir';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_sensitive_publish on public.announcements;
create trigger trg_enforce_sensitive_publish
before insert or update on public.announcements
for each row execute function public.enforce_sensitive_publish();

-- Events
drop policy if exists "events_read_all" on public.events;
create policy "events_read_all" on public.events
for select to anon, authenticated
using (true);

drop policy if exists "events_edit" on public.events;
create policy "events_edit" on public.events
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Duty
drop policy if exists "duty_read_all" on public.duty_teachers;
create policy "duty_read_all" on public.duty_teachers
for select to anon, authenticated
using (true);

drop policy if exists "duty_edit" on public.duty_teachers;
create policy "duty_edit" on public.duty_teachers
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Ticker
drop policy if exists "ticker_read_all" on public.ticker_items;
create policy "ticker_read_all" on public.ticker_items
for select to anon, authenticated
using (true);

drop policy if exists "ticker_edit" on public.ticker_items;
create policy "ticker_edit" on public.ticker_items
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Schedule
drop policy if exists "sched_read_all" on public.schedule_templates;
create policy "sched_read_all" on public.schedule_templates
for select to anon, authenticated
using (true);

drop policy if exists "sched_edit" on public.schedule_templates;
create policy "sched_edit" on public.schedule_templates
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

drop policy if exists "ovr_read_all" on public.schedule_overrides;
create policy "ovr_read_all" on public.schedule_overrides
for select to anon, authenticated
using (true);

drop policy if exists "ovr_edit" on public.schedule_overrides;
create policy "ovr_edit" on public.schedule_overrides
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- School info
drop policy if exists "info_read_all" on public.school_info;
create policy "info_read_all" on public.school_info
for select to anon, authenticated
using (true);

drop policy if exists "info_edit" on public.school_info;
create policy "info_edit" on public.school_info
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- YouTube videos
drop policy if exists "yt_read_all" on public.youtube_videos;
create policy "yt_read_all" on public.youtube_videos
for select to anon, authenticated
using (true);

drop policy if exists "yt_edit" on public.youtube_videos;
create policy "yt_edit" on public.youtube_videos
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Player settings
drop policy if exists "ps_read_all" on public.player_settings;
create policy "ps_read_all" on public.player_settings
for select to anon, authenticated
using (true);

drop policy if exists "ps_edit" on public.player_settings;
create policy "ps_edit" on public.player_settings
for all to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Storage notu:
-- Dashboard'dan bucket oluştur: pano-media (Public=true) önerilir.

-- Special Dates (Özel Günler ve Haftalar)
create table if not exists public.special_dates (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date,
  name text not null,
  type text not null check (type in ('holiday','special_week','event','exam','closure')),
  description text,
  icon text default '📅',
  color text default '#3b82f6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.special_dates enable row level security;

drop policy if exists "special_dates_read_all" on public.special_dates;
create policy "special_dates_read_all" on public.special_dates
for select to anon, authenticated
using (true);

drop policy if exists "special_dates_edit" on public.special_dates;
create policy "special_dates_edit" on public.special_dates
for all to authenticated
using (public.can_edit())
with check (public.can_edit());
