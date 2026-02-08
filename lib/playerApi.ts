import { supabasePlayer } from "./supabasePlayer";
import type { PlayerBundle } from "@/types/player";
import { saveCache, loadCache } from "./storage";

const CACHE_KEY = "pano_player_bundle_v1";

function todayKeyTR(now: Date) {
  // YYYY-MM-DD (Europe/Istanbul)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

/**
 * Bugünün nöbetçi öğretmenlerini çeker.
 * Sadece bugünün verisi gösterilir.
 */
async function fetchDutyTeachers(sb: any, dateKey: string): Promise<any[]> {
  const { data: todayDuties, error: todayErr } = await sb
    .from("duty_teachers")
    .select("*")
    .eq("date", dateKey)
    .order("name", { ascending: true });

  if (todayErr) throw todayErr;

  return todayDuties || [];
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

  try {
    const [ann, ev, tick, temp, over, info, spec, yt, settings, lessonSched] = await Promise.all([
      sb
        .from("announcements")
        .select("*")
        .eq("status", "published")
        .order("priority", { ascending: false })
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
        .from("lesson_schedule")
        .select("*")
        .order("teacher_name", { ascending: true })
        .limit(1000),
    ]);

    // Nöbetçi öğretmenleri özel fonksiyonla çek (otomatik tekrar mantığı ile)
    const duties = await fetchDutyTeachers(sb, dateKey);

    const anyErr = ann.error || ev.error || tick.error || temp.error || over.error || info.error || spec.error || yt.error || settings.error;
    if (anyErr) throw anyErr;

    const settingsMap = (settings.data ?? []).reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as any);

    const bundle: PlayerBundle = {
      generatedAt: Date.now(),
      announcements: (ann.data ?? []) as any,
      events: (ev.data ?? []) as any,
      duties: duties as any,
      ticker: (tick.data ?? []) as any,
      youtubeVideos: (yt.data ?? []) as any,
      settings: settingsMap as any,
      templates: (temp.data ?? []) as any,
      overrides: (over.data ?? []) as any,
      schoolInfo: (info.data ?? []) as any,
      specialDates: (spec.data ?? []) as any,
      lessonSchedule: (lessonSched.data ?? []) as any,
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
