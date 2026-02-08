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
 * Bugün için veri yoksa, önceki haftalarda aynı gün için girilen son veriyi tekrarlar.
 */
async function fetchDutyTeachers(sb: any, dateKey: string): Promise<any[]> {
  // Önce bugün için veri var mı kontrol et
  const { data: todayDuties, error: todayErr } = await sb
    .from("duty_teachers")
    .select("*")
    .eq("date", dateKey)
    .order("name", { ascending: true });

  if (todayErr) throw todayErr;

  if (todayDuties && todayDuties.length > 0) {
    return todayDuties;
  }

  // Bugün için veri yoksa, aynı haftanın gününü bul
  // Türkiye saati ile doğru günü hesapla
  const parts = dateKey.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2]);

  // UTC'de tarihi oluştur ve Türkiye saatine çevir
  const todayUTC = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const todayWeekday = todayUTC.getDay(); // 0=Pazar, 1=Pzt, 2=Sal, 3=Çar, 4=Per, 5=Cuma, 6=Cmt

  // Son 8 hafta içinde aynı günü ara (56 gün geriye)
  const minDate = new Date(todayUTC.getTime() - 56 * 864e5);
  const minDateKey = minDate.toISOString().split("T")[0];

  const { data: previousDuties, error: prevErr } = await sb
    .from("duty_teachers")
    .select("*")
    .lt("date", dateKey)
    .gte("date", minDateKey)
    .order("date", { ascending: false })
    .limit(200);

  if (prevErr) throw prevErr;

  if (!previousDuties || previousDuties.length === 0) {
    return [];
  }

  // Aynı haftanın gününde olan en son tarihi bul
  for (const duty of previousDuties) {
    const dutyParts = duty.date.split("-");
    const dutyYear = parseInt(dutyParts[0]);
    const dutyMonth = parseInt(dutyParts[1]) - 1;
    const dutyDay = parseInt(dutyParts[2]);
    const dutyDateUTC = new Date(Date.UTC(dutyYear, dutyMonth, dutyDay, 12, 0, 0));
    const dutyWeekday = dutyDateUTC.getDay();

    if (dutyWeekday === todayWeekday) {
      // Bu tarihteki tüm öğretmenleri çek
      const { data: sameDayDuties, error: sameErr } = await sb
        .from("duty_teachers")
        .select("*")
        .eq("date", duty.date)
        .order("name", { ascending: true });

      if (sameErr) throw sameErr;

      return sameDayDuties || [];
    }
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

  try {
    const [ann, ev, tick, temp, over, info, spec, yt, settings] = await Promise.all([
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
      },
      fromCache: true,
    };
  }
}
