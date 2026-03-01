import { supabasePlayer } from "./supabasePlayer";
import type {
  PlayerBundle,
  DutyTeacher,
  DutyTemplateEntry,
  LessonScheduleEntry,
  PlayerSettings,
  Announcement,
  EventItem,
  TickerItem,
  YouTubeVideo,
  ScheduleTemplate,
  ScheduleOverride,
  SchoolInfo,
  SpecialDate
} from "@/types/player";
import { saveCache, loadCache } from "./storage";
import { type SupabaseClient } from "@supabase/supabase-js";

const CACHE_KEY = "pano_player_bundle_v1";

function todayKeyTR(now: Date) {
  // YYYY-MM-DD (Europe/Istanbul)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

/**
 * Bugünün nöbetçi öğretmenlerini çeker.
 * Önce bugüne özel kayıt var mı bakar, yoksa haftalık şablondan alır.
 */
async function fetchDutyTeachers(sb: SupabaseClient, dateKey: string, weekday: number): Promise<DutyTeacher[]> {
  // 1. Önce bugüne özel kayıt var mı kontrol et
  const { data: todayDuties, error: todayErr } = await sb
    .from("duty_teachers")
    .select("*")
    .eq("date", dateKey)
    .order("name", { ascending: true });

  if (todayErr) throw todayErr;

  if (todayDuties && todayDuties.length > 0) {
    return todayDuties as DutyTeacher[];
  }

  // 2. Bugüne özel yoksa, haftalık şablondan al
  // weekday: JS getDay() -> 0=Pazar, 1=Pazartesi... 6=Cumartesi
  // duty_templates day_of_week: 1=Pazartesi, 5=Cuma
  if (weekday >= 1 && weekday <= 5) {
    const { data: templateDuties, error: templateErr } = await sb
      .from("duty_templates")
      .select("*")
      .eq("day_of_week", weekday)
      .order("area", { ascending: true });

    if (templateErr) {
      // Tablo yoksa veya hata olursa sessizce devam et
      console.warn("duty_templates sorgu hatası:", templateErr.message);
      return [];
    }

    // Şablonu DutyTeacher formatına çevir
    return (templateDuties || []).map((t: DutyTemplateEntry) => ({
      id: t.id,
      date: dateKey,
      name: t.teacher_name,
      area: t.area,
      note: null,
    }));
  }

  return [];
}

export async function fetchPlayerBundle(): Promise<{
  bundle: PlayerBundle;
  fromCache: boolean;
  cacheTimestamp?: number;
  isStale?: boolean;
}> {
  const sb = supabasePlayer();
  const now = new Date();
  const dateKey = todayKeyTR(now);

  // Türkiye saati ile haftanın gününü al
  const trNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const weekday = trNow.getDay();

  try {
    // Lesson schedule için pagination ile tüm kayıtları çek
    async function fetchAllLessonSchedule(): Promise<LessonScheduleEntry[]> {
      let allData: LessonScheduleEntry[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await sb
          .from("lesson_schedule")
          .select("*")
          .order("teacher_name", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length < pageSize) hasMore = false;
        allData = [...allData, ...((data as LessonScheduleEntry[]) || [])];
        from += pageSize;
      }
      return allData;
    }

    const [ann, ev, tick, temp, over, info, spec, yt, settings, dutyTemp] = await Promise.all([
      sb
        .from("announcements")
        .select("*")
        .eq("status", "published")
        .order("flow_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("events")
        .select("*")
        .gte("starts_at", new Date(now.getTime() - 7 * 864e5).toISOString())
        .order("starts_at", { ascending: true })
        .limit(20),
      sb
        .from("ticker_items")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(30),
      sb
        .from("schedule_templates")
        .select("*")
        .order("key", { ascending: true })
        .limit(10),
      sb
        .from("schedule_overrides")
        .select("*")
        .gte("date", dateKey)
        .order("date", { ascending: true })
        .limit(14),
      sb
        .from("school_info")
        .select("*")
        .order("title", { ascending: true })
        .limit(20),
      sb
        .from("special_dates")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", dateKey)
        .or(`end_date.is.null,end_date.gte.${dateKey}`)
        .order("start_date", { ascending: true })
        .limit(10),
      sb
        .from("youtube_videos")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(20),
      sb
        .from("player_settings")
        .select("*")
        .limit(5),
      sb
        .from("duty_templates")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("area", { ascending: true })
        .limit(100),
    ]);

    // Lesson schedule'ı ayrıca pagination ile çek
    const lessonScheduleData = await fetchAllLessonSchedule();

    // Nöbetçi öğretmenleri özel fonksiyonla çek
    const duties = await fetchDutyTeachers(sb, dateKey, weekday);

    const anyErr = ann.error || ev.error || tick.error || temp.error || over.error || info.error || spec.error || yt.error || settings.error;
    if (anyErr) throw anyErr;

    const settingsMap = (settings.data ?? []).reduce((acc: Record<string, unknown>, row: { key: string; value: unknown }) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);

    const bundle: PlayerBundle = {
      generatedAt: Date.now(),
      announcements: (ann.data ?? []) as Announcement[],
      events: (ev.data ?? []) as EventItem[],
      duties: duties,
      dutyTemplates: (dutyTemp.data ?? []) as DutyTemplateEntry[],
      ticker: (tick.data ?? []) as TickerItem[],
      youtubeVideos: (yt.data ?? []) as YouTubeVideo[],
      settings: settingsMap as PlayerSettings,
      templates: (temp.data ?? []) as ScheduleTemplate[],
      overrides: (over.data ?? []) as ScheduleOverride[],
      schoolInfo: (info.data ?? []) as SchoolInfo[],
      specialDates: (spec.data ?? []) as SpecialDate[],
      lessonSchedule: lessonScheduleData,
    };

    saveCache(CACHE_KEY, bundle);
    return { bundle, fromCache: false };
  } catch {
    const cached = loadCache<PlayerBundle>(CACHE_KEY);
    if (cached?.value) {
      return {
        bundle: cached.value,
        fromCache: true,
        cacheTimestamp: cached.ts,
        isStale: cached.isStale,
      };
    }
    return {
      bundle: {
        generatedAt: Date.now(),
        announcements: [],
        events: [],
        duties: [],
        dutyTemplates: [],
        ticker: [],
        youtubeVideos: [],
        settings: {},
        templates: [],
        overrides: [],
        schoolInfo: [],
        specialDates: [],
        lessonSchedule: [],
      },
      fromCache: true,
    };
  }
}
