"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@/lib/branding";
import { PLAYER_LAYOUT } from "@/lib/layoutConfig";
import { fetchWeatherNow } from "@/lib/weather";
import { computeNowStatus, pickSlotsForToday, getCurrentLessonNumber } from "@/lib/schedule";
import { HeaderBar } from "@/components/player/HeaderBar";
import { usePlayerBundle } from "@/hooks/usePlayerBundle";
import { usePlayerWatchdog } from "@/hooks/usePlayerWatchdog";
import { usePreviewTime } from "@/hooks/usePreviewTime";
import { LeftPanel } from "@/components/player/LeftPanel";
import { CardCarousel, buildCards } from "@/components/player/CardCarousel";
import { TickerBar } from "@/components/player/TickerBar";
import type { PlayerBundle, WeatherNow, YouTubeVideo, PlayerRotationSettings, Announcement, TickerItem, LessonScheduleEntry, BellSlot } from "@/types/player";

const DEBUG = false;

function useInterval(fn: () => void, ms: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = fn;
  }, [fn]);

  // Set up the interval
  useEffect(() => {
    if (ms === null) return;

    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
}

function todayKeyTR(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

function inWindow(a: Announcement, now: Date) {
  const t = now.getTime();
  const s = a.start_at ? new Date(a.start_at).getTime() : null;
  const e = a.end_at ? new Date(a.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

function formatTtl(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Preview Banner Component
function PreviewBanner({
  previewTimeStr,
  remainingTtl,
  onExit
}: {
  previewTimeStr: string;
  remainingTtl: number;
  onExit: () => void;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-4 py-2 px-4"
      style={{ background: "linear-gradient(to right, #059669, #0d9488)" }}
    >
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        <span className="text-lg">🕐</span>
        <span>Önizleme Modu:</span>
        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{previewTimeStr}</span>
        <span className="opacity-70">•</span>
        <span className="opacity-90">Kalan: <span className="font-mono">{formatTtl(remainingTtl)}</span></span>
      </div>
      <button
        onClick={onExit}
        className="px-3 py-1 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 text-white transition-all flex items-center gap-1"
      >
        <span>✕</span>
        <span>Çık</span>
      </button>
    </div>
  );
}

function PlayerContent() {
  // State management moved to usePlayerBundle hook
  const {
    bundle,
    fromCache,
    lastSyncAt,
    isOffline,
    cacheTimestamp,
    isCacheStale,
    lastSuccessfulFetchAt,
    consecutiveFetchFailures,
    lastError,
    refreshBundle
  } = usePlayerBundle();

  // Preview time hook
  const preview = usePreviewTime();

  // Local UI state
  const [mounted, setMounted] = useState(false);
  const [realNow, setRealNow] = useState(() => new Date());

  // Use effectiveNow from preview if active, otherwise use realNow
  const now = preview.isActive ? preview.effectiveNow : realNow;

  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [cardIndex, setCardIndex] = useState(0);

  const [imageIndex, setImageIndex] = useState(0);
  const [mode, setMode] = useState<"video" | "image" | "text">("text");

  // Watchdog & Self-Recovery Hook
  const { showConnectionOverlay, dailyLimitReached } = usePlayerWatchdog(
    lastSuccessfulFetchAt,
    consecutiveFetchFailures
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useInterval(() => setRealNow(new Date()), 1000);

  useEffect(() => {
    fetchWeatherNow().then(setWeather).catch(() => { });
  }, []);

  const refreshWeather = useCallback(() => {
    fetchWeatherNow().then(setWeather).catch(() => { });
  }, []);

  useInterval(refreshWeather, 10 * 60_000);


  // ============ DAILY CONTROLLED REFRESH (03:00 ISTANBUL) ============
  const [showDailyRefreshOverlay, setShowDailyRefreshOverlay] = useState(false);

  useEffect(() => {
    // Skip daily refresh logic during preview mode
    if (preview.isActive) return;

    const DAILY_REFRESH_HOUR = 3; // 03:00 Istanbul time
    const DAILY_RELOAD_KEY = "obe_last_daily_reload_date";

    // 1. İstanbul'a göre BUGÜN tarih stringi (YYYY-MM-DD)
    const getTodayDateKeyTR = () => {
      // en-CA formatı: YYYY-MM-DD
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    };

    // 2. Bir sonraki İstanbul 03:00'a kaç ms var?
    const getMsUntilNextIstanbulHour = (targetHour: number) => {
      const now = new Date();

      // İstanbul'daki şu anki zamanı parçalarına ayır
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hourCycle: 'h23'
      });

      const parts = fmt.formatToParts(now);
      const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);

      const trYear = getPart('year');
      const trMonth = getPart('month') - 1; // JS months are 0-indexed
      const trDay = getPart('day');
      const trHour = getPart('hour');
      const trMinute = getPart('minute');
      const trSecond = getPart('second');

      // "Sanal" tarih objeleri oluştur (Cihazın yerel saatiyle, ama İstanbul değerleriyle)
      // Bu sayede timezone farklarından etkilenmeden sadece süre farkını (delta) buluruz.
      const trNowVirtual = new Date(trYear, trMonth, trDay, trHour, trMinute, trSecond);
      const trTargetVirtual = new Date(trYear, trMonth, trDay, targetHour, 0, 0);

      // Eğer hedef saat bugün geçtiyse, yarına planla
      if (trNowVirtual.getTime() >= trTargetVirtual.getTime()) {
        trTargetVirtual.setDate(trTargetVirtual.getDate() + 1);
      }

      return trTargetVirtual.getTime() - trNowVirtual.getTime();
    };

    const hasReloadedToday = () => {
      try {
        const lastDate = localStorage.getItem(DAILY_RELOAD_KEY);
        // İstanbul tarihine göre kontrol et
        return lastDate === getTodayDateKeyTR();
      } catch {
        return false;
      }
    };

    const markReloadedToday = () => {
      try {
        localStorage.setItem(DAILY_RELOAD_KEY, getTodayDateKeyTR());
      } catch { }
    };

    const scheduleDailyRefresh = () => {
      const msUntilRefresh = getMsUntilNextIstanbulHour(DAILY_REFRESH_HOUR);

      if (DEBUG) {
        const hours = Math.floor(msUntilRefresh / (1000 * 60 * 60));
        const minutes = Math.floor((msUntilRefresh % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`🕐 Daily refresh scheduled in ${hours}h ${minutes}m (Istanbul Time)`);
      }

      const timerId = setTimeout(() => {
        // Aynı gün (TR saatiyle) içinde tekrar reload yapma
        if (hasReloadedToday()) {
          if (DEBUG) console.log("🔒 Daily refresh: Bugün zaten yapıldı, atlanıyor");
          // Yarını planla ve çık
          scheduleDailyRefresh();
          return;
        }

        // 10 saniye sonra reload yap (önce overlay göster)
        setShowDailyRefreshOverlay(true);

        setTimeout(() => {
          markReloadedToday();
          if (DEBUG) console.log("🔄 Daily refresh: Sayfa yenileniyor...");
          window.location.reload();
        }, 10 * 1000);
      }, msUntilRefresh);

      return timerId;
    };

    const timerId = scheduleDailyRefresh();
    return () => clearTimeout(timerId);
  }, [preview.isActive]);

  // ============ END DAILY REFRESH ============

  const activeVideos = useMemo(() => {
    const list = bundle?.youtubeVideos ?? [];
    if (!list.length) return [] as YouTubeVideo[];
    const nowTR = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const filtered = list.filter((v) => {
      if (!v.is_active) return false;
      if (v.start_at && nowTR < new Date(v.start_at)) return false;
      if (v.end_at && nowTR > new Date(v.end_at)) return false;
      return true;
    });
    if (filtered.length) return filtered;
    return list.filter((v) => v.is_active);
  }, [bundle?.youtubeVideos, now]);

  const nowTR = useMemo(() => new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })), [now]);

  const activeAnnouncements = useMemo(() => {
    const list = bundle?.announcements ?? [];
    return list.filter((a) => a.status === "published" && inWindow(a, nowTR));
  }, [bundle?.announcements, nowTR]);

  const smallAnnouncements = useMemo(() => {
    return activeAnnouncements.filter((a) => (a.display_mode ?? "small") === "small");
  }, [activeAnnouncements]);

  const bigAnnouncement = useMemo(() => {
    return activeAnnouncements.find((a) => (a.display_mode ?? "small") === "big");
  }, [activeAnnouncements]);

  const imageAnnouncements = useMemo(() => {
    const filtered = activeAnnouncements.filter((a) => (a.display_mode ?? "small") === "image");
    if (DEBUG) console.log(`🖼️ Image announcements found: ${filtered.length}`, filtered.map(a => ({ id: a.id, title: a.title, images: a.image_urls?.length || (a.image_url ? 1 : 0) })));
    return filtered;
  }, [activeAnnouncements]);

  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const a of imageAnnouncements) {
      if (a.image_urls?.length) urls.push(...a.image_urls);
      else if (a.image_url) urls.push(a.image_url);
      if (urls.length >= 10) break;
    }
    if (DEBUG) console.log(`🖼️ Total image URLs collected: ${urls.length}`, urls);
    return urls.slice(0, 10);
  }, [imageAnnouncements]);

  const textAnnouncements = useMemo(() => {
    // Küçük duyurular ticker'a taşındı. Burada sadece Ana Duyuru (Big) varsa gösterilir.
    return bigAnnouncement ? [bigAnnouncement] : [];
  }, [bigAnnouncement]);

  const rotation = useMemo<PlayerRotationSettings>(() => {
    return (
      (bundle?.settings?.rotation as PlayerRotationSettings) ?? {
        enabled: true,
        videoSeconds: 30,
        imageSeconds: 10,
        textSeconds: 10,
      }
    );
  }, [bundle?.settings]);

  const cards = useMemo(() => {
    if (!bundle) return [];
    return buildCards({
      announcements: bundle.announcements,
      events: bundle.events,
      schoolInfo: bundle.schoolInfo,
      youtubeVideos: activeVideos,
    });
  }, [bundle, activeVideos]);

  const videoCards = useMemo(() => {
    return buildCards({ announcements: [], events: [], schoolInfo: [], youtubeVideos: activeVideos });
  }, [activeVideos]);

  const textCards = useMemo(() => {
    return buildCards({ announcements: textAnnouncements, events: [], schoolInfo: [], youtubeVideos: [] });
  }, [textAnnouncements]);

  const rotateCards = useCallback(() => {
    if (!cards.length) return;
    if (mode === "video") return;
    setCardIndex((x) => x + 1);
  }, [cards.length, mode]);

  useInterval(rotateCards, Math.max(5, rotation.textSeconds || 10) * 1000);



  const rotateImages = useCallback(() => {
    if (imageUrls.length < 2) return; // 0 veya 1 resimde döngü gereksiz
    setImageIndex((prev) => {
      const nextIndex = (prev + 1) % imageUrls.length;
      if (DEBUG) console.log(`🖼️ Image slideshow: ${prev + 1}/${imageUrls.length} → ${nextIndex + 1}/${imageUrls.length}`);
      return nextIndex;
    });
  }, [imageUrls.length]);

  useInterval(rotateImages, Math.max(5, rotation.imageSeconds || 10) * 1000);

  useEffect(() => {
    setImageIndex(0);
  }, [imageUrls.join("|")]);

  // Mode değiştiğinde cardIndex'i sıfırla
  useEffect(() => {
    if (DEBUG) console.log(`🎬 Mode changed to: ${mode}`);
    if (mode === "video") {
      setCardIndex(0);
    }
    if (mode === "image") {
      if (DEBUG) console.log(`🖼️ Image mode active. Images available: ${imageUrls.length}`);
      if (imageUrls.length === 0) {
        if (DEBUG) console.warn("⚠️ No images available for slideshow!");
      }
    }
  }, [mode, imageUrls.length]);

  const statusData = useMemo(() => {
    const b = bundle;
    if (!b) return { state: "closed" as const, nextInSec: null as number | null, nextLabel: null as string | null, slots: [] as BellSlot[], currentLessonNumber: null as number | null };

    const dateKey = todayKeyTR(nowTR);
    const weekday = nowTR.getDay();

    const picked = pickSlotsForToday({
      dateKey,
      weekday,
      templates: b.templates as any,
      overrides: b.overrides as any,
    });

    const st = computeNowStatus(nowTR, picked.slots);
    const lessonNum = getCurrentLessonNumber(nowTR, picked.slots);

    return {
      state: st.state,
      nextInSec: st.nextInSec ?? null,
      nextLabel: st.nextLabel ?? null,
      slots: picked.slots,
      currentLessonNumber: lessonNum,
    };
  }, [bundle, nowTR]);

  const status = statusData;

  // Sabit sınıf listesi - 5A'dan 12E'ye
  const ALL_CLASSES = [
    "5-A", "5-B",
    "6-A", "6-B",
    "7-A", "7-B",
    "8-A", "8-B",
    "9-A", "9-B", "9-C", "9-D",
    "10-A", "10-B", "10-C", "10-D",
    "11-A", "11-B", "11-C", "11-D",
    "12-A", "12-B", "12-C", "12-D", "12-E",
  ];

  // Şu anki ders için sınıf/öğretmen listesi (sabit sıralı)
  const currentClasses = useMemo(() => {
    const lessonNum = statusData.currentLessonNumber;
    const weekday = nowTR.getDay(); // 0=Pazar, 1=Pzt, ...
    const schedule = bundle?.lessonSchedule ?? [];

    // day_of_week: 1=Pazartesi, 5=Cuma
    const dayOfWeek = weekday;

    // Sınıf adını normalize et (5A -> 5-A, 5-A -> 5-A)
    const normalize = (name: string) => {
      const match = name.match(/^(\d+)-?([A-Za-z])$/);
      if (match) return `${match[1]}-${match[2].toUpperCase()}`;
      return name;
    };

    // Ders saatindeyse veritabanından öğretmenleri çek
    const teacherMap = new Map<string, string>();
    if (lessonNum && weekday >= 1 && weekday <= 5) {
      for (const entry of schedule) {
        if (entry.day_of_week === dayOfWeek && entry.lesson_number === lessonNum && entry.class_name) {
          const key = normalize(entry.class_name);
          teacherMap.set(key, entry.teacher_name);
        }
      }
    }

    // Sabit sınıf listesiyle eşleştir
    return ALL_CLASSES.map((className) => ({
      class_name: className,
      teacher_name: teacherMap.get(className) || "",
    }));
  }, [statusData.currentLessonNumber, nowTR, bundle?.lessonSchedule]);

  const combinedTicker = useMemo(() => {
    const t = (bundle?.ticker ?? []) as TickerItem[];
    const a = smallAnnouncements.map((x) => ({
      id: `ann-${x.id}`,
      text: x.title, // Sadece başlık
      priority: x.priority ?? 50,
      is_active: true,
      start_at: x.start_at,
      end_at: x.end_at,
    })) as TickerItem[];
    return [...t, ...a];
  }, [bundle?.ticker, smallAnnouncements]);

  useEffect(() => {
    const order: Array<"video" | "image" | "text"> = ["video", "image", "text"];
    const available = {
      video: activeVideos.length > 0,
      image: imageUrls.length > 0,
      text: textAnnouncements.length > 0,
    };
    if (DEBUG) console.log(`📊 Available content: Videos=${activeVideos.length}, Images=${imageUrls.length}, Text=${textAnnouncements.length}`);
    const first = order.find((k) => available[k]) ?? "text";
    setMode((prev) => {
      const newMode = available[prev] ? prev : first;
      if (newMode !== prev) {
        if (DEBUG) console.log(`🔄 Content changed, mode: ${prev} → ${newMode}`);
      }
      return newMode;
    });
  }, [activeVideos.length, imageUrls.length, textAnnouncements.length]);

  const getNextMode = useCallback(() => {
    const order: Array<"video" | "image" | "text"> = ["video", "image", "text"];
    const available = {
      video: activeVideos.length > 0,
      image: imageUrls.length > 0,
      text: textAnnouncements.length > 0,
    };
    const currentIdx = order.indexOf(mode);
    for (let i = 1; i <= order.length; i++) {
      const candidate = order[(currentIdx + i) % order.length];
      if (available[candidate]) return candidate;
    }
    return mode;
  }, [mode, activeVideos.length, imageUrls.length, textAnnouncements.length]);

  const onVideoEnded = useCallback(() => {
    const currentVideoIndex = cardIndex % Math.max(1, videoCards.length);
    if (DEBUG) console.log(`📹 onVideoEnded called. Current video: ${currentVideoIndex + 1}/${videoCards.length}`);
    if (currentVideoIndex < videoCards.length - 1) {
      if (DEBUG) console.log(`📹 Moving to next video (${currentVideoIndex + 2}/${videoCards.length})`);
      setCardIndex((x) => x + 1);
    } else {
      const nextMode = getNextMode();
      if (DEBUG) console.log(`📹 Last video finished, switching to ${nextMode} mode`);
      setCardIndex(0); // Reset card index for next cycle
      setMode(nextMode);
    }
  }, [cardIndex, videoCards.length, getNextMode]);

  useEffect(() => {
    if (!rotation.enabled) return;
    if (mode === "video") return;
    const duration = mode === "image"
      ? Math.max(1, imageUrls.length) * Math.max(5, rotation.imageSeconds || 10)
      : Math.max(1, textCards.length) * Math.max(5, rotation.textSeconds || 10);
    if (DEBUG) console.log(`🔄 Mode rotation timer: ${mode} will switch in ${duration} seconds`);
    const t = setTimeout(() => {
      const nextMode = getNextMode();
      if (DEBUG) console.log(`🔄 Switching mode: ${mode} → ${nextMode}`);
      setMode(nextMode);
    }, Math.max(5, duration) * 1000);
    return () => clearTimeout(t);
  }, [mode, rotation, getNextMode, imageUrls.length, textCards.length]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-screen flex flex-col overflow-hidden" style={{ background: BRAND.colors.bg }}>
      {/* Preview Mode Banner */}
      {preview.isActive && (
        <PreviewBanner
          previewTimeStr={preview.previewTimeStr}
          remainingTtl={preview.remainingTtl}
          onExit={preview.exitPreview}
        />
      )}

      {/* Connection overlay */}
      {showConnectionOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center text-white p-8 rounded-2xl max-w-lg" style={{ background: BRAND.colors.panel }}>
            <div className="text-4xl mb-4">{dailyLimitReached ? "🚫" : "🔄"}</div>
            <div className="text-2xl font-bold mb-2">
              {dailyLimitReached ? "Yenileme Durduruldu" : "Bağlantı Sorunu"}
            </div>
            <div className="text-lg opacity-80">
              {dailyLimitReached
                ? "Sistem kendini yenilemeyi denedi, ancak çok sık tekrarlandığı için durduruldu."
                : "Yeniden deneniyor..."}
            </div>
            {dailyLimitReached && (
              <div className="text-base mt-4 p-3 rounded-lg" style={{ background: BRAND.colors.bg }}>
                ⚠️ İnternet bağlantısı ve Supabase erişimi kontrol edilsin.
              </div>
            )}
            {lastError && <div className="text-sm mt-4 opacity-60">{lastError}</div>}
          </div>
        </div>
      )}

      {/* Offline cache mode indicator */}
      {fromCache && !showConnectionOverlay && (
        <div className="fixed top-4 right-4 z-40 px-4 py-2 rounded-lg text-sm"
          style={{ background: isCacheStale ? "#dc2626" : "#f59e0b", color: "white", marginTop: preview.isActive ? "40px" : "0" }}>
          <div className="flex items-center gap-2">
            <span>📡</span>
            <span>Çevrimdışı Mod</span>
          </div>
          {cacheTimestamp && (
            <div className="text-xs opacity-80 mt-1">
              Son güncelleme: {new Date(cacheTimestamp).toLocaleString("tr-TR")}
            </div>
          )}
          {isCacheStale && (
            <div className="text-xs mt-1">⚠️ Veri 24 saatten eski</div>
          )}
        </div>
      )}

      {/* Daily refresh overlay */}
      {showDailyRefreshOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="text-center text-white p-8 rounded-2xl" style={{ background: BRAND.colors.panel }}>
            <div className="text-4xl mb-4">🔄</div>
            <div className="text-2xl font-bold mb-2">Sistem Yenileniyor</div>
            <div className="text-lg opacity-80">Lütfen bekleyin...</div>
            <div className="text-sm mt-4 opacity-60">Günlük bakım işlemi</div>
          </div>
        </div>
      )}
      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.topPadding}`} style={{ marginTop: preview.isActive ? "40px" : "0" }}>
        <HeaderBar now={now} isOffline={isOffline || fromCache} lastSyncAt={lastSyncAt} settings={bundle?.settings} />
      </div>

      <div className={`flex-1 grid grid-cols-12 gap-5 ${PLAYER_LAYOUT.sidePadding} py-3`}>
        <div className="col-span-3">
          <LeftPanel
            state={status.state}
            nextInSec={status.nextInSec}
            nextLabel={status.nextLabel}
            duties={bundle?.duties ?? []}
            weather={weather}
            now={now}
            specialDates={bundle?.specialDates ?? []}
          />
        </div>

        <div className="col-span-6 flex flex-col">
          <div className="flex-1">
            {mode === "video" && videoCards.length > 0 ? (
              <CardCarousel
                cards={videoCards}
                index={cardIndex}
                onVideoEnded={onVideoEnded}
                videoMaxSeconds={Math.max(30, rotation.videoSeconds || 300)}
              />
            ) : mode === "image" ? (
              <div className="h-full rounded-2xl overflow-hidden relative" style={{ background: BRAND.colors.panel }}>
                {imageUrls.length ? (
                  <img src={imageUrls[imageIndex]} alt="Resim" className="w-full h-full object-contain" />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-white text-2xl">Resim slaytı için resim eklenmemiş</div>
                  </div>
                )}
              </div>
            ) : (
              <CardCarousel cards={textCards} index={cardIndex} />
            )}
          </div>
        </div>

        {/* Sağ Panel - Ders Programı */}
        <div className="col-span-3 rounded-2xl overflow-hidden flex flex-col" style={{ background: BRAND.colors.panel }}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span className="text-white font-bold text-sm">
                {status.state === "lesson" && statusData.currentLessonNumber
                  ? `${statusData.currentLessonNumber}. Ders`
                  : "Ders Programı"}
              </span>
            </div>
          </div>

          {/* Content - 2 sütunlu kompakt grid */}
          <div className="flex-1 p-1.5">
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
              {currentClasses.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${entry.teacher_name ? "bg-white/10" : "bg-white/[0.03]"}`}
                >
                  <div className="w-10 h-5 rounded bg-emerald-500/40 text-emerald-200 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {entry.class_name}
                  </div>
                  <div className={`flex-1 text-[11px] font-medium truncate ${entry.teacher_name ? "text-white" : "text-white/25"}`}>
                    {entry.teacher_name || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.bottomPadding}`}>
        <TickerBar ticker={combinedTicker} now={now} isAlert={bundle?.announcements.some((a: any) => a.category === "sensitive")} settings={bundle?.settings} />
      </div>
    </div >
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}><div className="text-white text-xl">Yükleniyor...</div></div>}>
      <PlayerContent />
    </Suspense>
  );
}
