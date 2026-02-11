"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@/lib/branding";
import { PLAYER_LAYOUT } from "@/lib/layoutConfig";
import { fetchWeatherNow } from "@/lib/weather";
import { computeNowStatus, pickSlotsForToday, getCurrentLessonNumber, formatCountdown } from "@/lib/schedule";
import { HeaderBar } from "@/components/player/HeaderBar";
import { usePlayerBundle } from "@/hooks/usePlayerBundle";
import { usePlayerWatchdog } from "@/hooks/usePlayerWatchdog";
import { usePreviewTime } from "@/hooks/usePreviewTime";
import { LeftPanel } from "@/components/player/LeftPanel";
import { CardCarousel, buildCards } from "@/components/player/CardCarousel";
import { TickerBar } from "@/components/player/TickerBar";
import type { WeatherNow, YouTubeVideo, PlayerRotationSettings, Announcement, TickerItem, BellSlot } from "@/types/player";

const DEBUG = false;

// Helper to check if item is in valid time window
function inWindow(item: { start_at?: string | null, end_at?: string | null }, now: Date) {
  const t = now.getTime();
  const s = item.start_at ? new Date(item.start_at).getTime() : null;
  const e = item.end_at ? new Date(item.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

function useInterval(fn: () => void, ms: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);
  useEffect(() => { savedCallback.current = fn; }, [fn]);
  useEffect(() => {
    if (ms === null) return;
    const tick = () => savedCallback.current?.();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
}

function formatTtl(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Preview Banner
function PreviewBanner({ previewTimeStr, remainingTtl, onExit }: { previewTimeStr: string; remainingTtl: number; onExit: () => void; }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-4 py-2 px-4" style={{ background: "linear-gradient(to right, #059669, #0d9488)" }}>
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        <span className="text-lg">🕐</span>
        <span>Önizleme Modu:</span>
        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{previewTimeStr}</span>
        <span className="opacity-70">•</span>
        <span className="opacity-90">Kalan: <span className="font-mono">{formatTtl(remainingTtl)}</span></span>
      </div>
      <button onClick={onExit} className="px-3 py-1 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 text-white transition-all flex items-center gap-1">
        <span>✕</span><span>Çık</span>
      </button>
    </div>
  );
}

// Unified Playlist Item
type PlaylistItem = {
  id: string;
  kind: "video" | "announcement";
  flow_order: number;
  created_at: string;
  duration: number;
  original: Announcement | YouTubeVideo;
  videoData?: YouTubeVideo;
  announcementData?: Announcement;
};

function PlayerContent() {
  const { bundle, fromCache, lastSyncAt, isOffline, cacheTimestamp, isCacheStale, lastSuccessfulFetchAt, consecutiveFetchFailures, lastError } = usePlayerBundle();
  const preview = usePreviewTime();
  const [mounted, setMounted] = useState(false);
  const [realNow, setRealNow] = useState(() => new Date());

  // #region agent log
  useEffect(() => {
    fetch("/api/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "pre-fix",
        hypothesisId: "B",
        location: "app/player/page.tsx:PlayerContent:mount",
        message: "PlayerContent mounted",
        data: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
  }, []);
  // #endregion

  // Effective time
  const now = preview.isActive ? preview.effectiveNow : realNow;
  const nowTR = useMemo(() => new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })), [now]);

  // Derived minute tick for playlist updates (avoids second-by-second regeneration)
  const minuteTick = useMemo(() => Math.floor(nowTR.getTime() / 60000), [nowTR]);

  const [weather, setWeather] = useState<WeatherNow | null>(null);

  // Playlist State
  const [playlistIndex, setPlaylistIndex] = useState(0);

  // Watchdog
  const { showConnectionOverlay, dailyLimitReached } = usePlayerWatchdog(lastSuccessfulFetchAt, consecutiveFetchFailures);

  useEffect(() => { setMounted(true); }, []);
  useInterval(() => setRealNow(new Date()), 1000);

  useEffect(() => { fetchWeatherNow().then(setWeather).catch(() => { }); }, []);
  useInterval(() => fetchWeatherNow().then(setWeather).catch(() => { }), 10 * 60_000);

  // Settings
  const rotation = useMemo<PlayerRotationSettings>(() => {
    return (bundle?.settings?.rotation as PlayerRotationSettings) ?? { enabled: true, videoSeconds: 30, imageSeconds: 10, textSeconds: 10 };
  }, [bundle?.settings]);

  // Build Playlist - Now depends on minuteTick instead of nowTR to prevent rapid regeneration
  const playlist = useMemo<PlaylistItem[]>(() => {
    if (!bundle) return [];

    const list: PlaylistItem[] = [];
    const _nowForFilter = new Date(minuteTick * 60000); // Approximate time for filtering

    // 1. Announcements
    (bundle.announcements || []).forEach(a => {
      if (a.status !== 'published') return;
      if (!inWindow(a, _nowForFilter)) return;

      // Determine type/duration
      const isImage = a.display_mode === 'image';
      const duration = isImage ? rotation.imageSeconds : rotation.textSeconds;

      list.push({
        id: a.id,
        kind: "announcement",
        flow_order: a.flow_order ?? 0,
        created_at: a.created_at,
        duration: Math.max(5, duration || 10),
        original: a,
        announcementData: a
      });
    });

    // 2. Videos
    (bundle.youtubeVideos || []).forEach(v => {
      if (!v.is_active) return;
      if (!inWindow(v, _nowForFilter)) return;

      list.push({
        id: v.id,
        kind: "video",
        flow_order: v.flow_order ?? 0,
        created_at: v.created_at || new Date().toISOString(), // Assumes created_at exists on video (it does in DB)
        duration: Math.max(5, rotation.videoSeconds || 30), // Max duration for watchdog
        original: v,
        videoData: v
      });
    });

    // 3. Sort
    return list.sort((a, b) => {
      if (a.flow_order !== b.flow_order) return a.flow_order - b.flow_order;
      // Secondary: created_at desc (newer first if same order)
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    });

  }, [bundle, minuteTick, rotation]);

  // Current Item
  const currentItem = useMemo(() => {
    if (playlist.length === 0) return null;
    return playlist[playlistIndex % playlist.length];
  }, [playlist, playlistIndex]);

  // Navigation
  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    setPlaylistIndex((prev) => {
      const next = (prev + 1) % playlist.length;
      if (DEBUG) console.log(`Next item triggered. Current index: ${prev}, next: ${next}`);
      return next;
    });
  }, [playlist.length]);

  // Timer for non-video items
  useEffect(() => {
    if (!rotation.enabled) return;
    if (!currentItem) return;
    if (currentItem.kind === 'video') return; // Wait for onVideoEnded

    const durationMs = currentItem.duration * 1000;
    if (DEBUG) console.log(`⏱️ Item timer started: ${currentItem.id} (${durationMs}ms)`);

    const timer = setTimeout(() => {
      handleNext();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentItem, handleNext, rotation.enabled]);

  // Reset index if playlist shrinks
  useEffect(() => {
    if (playlistIndex >= playlist.length && playlist.length > 0) {
      setPlaylistIndex(0);
    }
  }, [playlist.length, playlistIndex]);


  const statusData = useMemo(() => {
    const b = bundle;
    if (!b) return { state: "closed" as const, nextInSec: null as number | null, nextLabel: null as string | null, slots: [] as BellSlot[], currentLessonNumber: null as number | null };
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(nowTR);
    const weekday = nowTR.getDay();
    const picked = pickSlotsForToday({ dateKey, weekday, templates: b.templates as any, overrides: b.overrides as any });
    const st = computeNowStatus(nowTR, picked.slots);
    const lessonNum = getCurrentLessonNumber(nowTR, picked.slots);
    return { state: st.state, nextInSec: st.nextInSec ?? null, nextLabel: st.nextLabel ?? null, slots: picked.slots, currentLessonNumber: lessonNum };
  }, [bundle, nowTR]);

  // Class list logic
  const ALL_CLASSES = ["5-A", "5-B", "6-A", "6-B", "7-A", "7-B", "8-A", "8-B", "9-A", "9-B", "9-C", "9-D", "10-A", "10-B", "10-C", "10-D", "11-A", "11-B", "11-C", "11-D", "12-A", "12-B", "12-C", "12-D", "12-E"];
  const currentClasses = useMemo(() => {
    const lessonNum = statusData.currentLessonNumber;
    const weekday = nowTR.getDay();
    const schedule = bundle?.lessonSchedule ?? [];
    const normalize = (name: string) => { const match = name.match(/^(\d+)-?([A-Za-z])$/); return match ? `${match[1]}-${match[2].toUpperCase()}` : name; };
    const teacherMap = new Map<string, string>();
    if (lessonNum && weekday >= 1 && weekday <= 5) {
      for (const entry of schedule) {
        if (entry.day_of_week === weekday && entry.lesson_number === lessonNum && entry.class_name) {
          teacherMap.set(normalize(entry.class_name), entry.teacher_name);
        }
      }
    }
    return ALL_CLASSES.map((className) => ({ class_name: className, teacher_name: teacherMap.get(className) || "" }));
  }, [statusData.currentLessonNumber, nowTR, bundle?.lessonSchedule]);

  // Derived Cards for CardCarousel
  const currentCardList = useMemo(() => {
    if (!currentItem) return [];

    // Use buildCards to generate the standard card structure
    if (currentItem.kind === 'video' && currentItem.videoData) {
      return buildCards({ announcements: [], events: [], schoolInfo: [], youtubeVideos: [currentItem.videoData] });
    } else if (currentItem.announcementData) {
      return buildCards({ announcements: [currentItem.announcementData], events: [], schoolInfo: [], youtubeVideos: [] });
    }
    return [];
  }, [currentItem]);

  // #region agent log
  useEffect(() => {
    fetch("/api/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "pre-fix",
        hypothesisId: "B",
        location: "app/player/page.tsx:PlayerContent:playlist",
        message: "playlist / current item snapshot",
        data: {
          playlistLength: playlist.length,
          currentItemKind: currentItem?.kind ?? null,
          currentHasVideo: !!currentItem?.videoData,
          currentHasAnnouncement: !!currentItem?.announcementData,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
  }, [playlist.length, currentItem?.kind, !!currentItem?.videoData, !!currentItem?.announcementData]);
  // #endregion

  const combinedTicker = useMemo(() => (bundle?.ticker ?? []) as TickerItem[], [bundle?.ticker]);

  // Determine State Labels/Colors
  const statusLabel = statusData.state === "lesson" ? "DERS" : statusData.state === "break" ? "TENEFÜS" : statusData.state === "lunch" ? "ÖĞLE ARASI" : "OKUL DIŞI";
  const statusColor = statusData.state === "lesson" ? "#ef4444" : statusData.state === "break" ? "#22c55e" : statusData.state === "lunch" ? BRAND.colors.info : BRAND.colors.muted;

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-screen flex flex-col overflow-hidden" style={{ background: BRAND.colors.bg }}>
      {preview.isActive && <PreviewBanner previewTimeStr={preview.previewTimeStr} remainingTtl={preview.remainingTtl} onExit={preview.exitPreview} />}

      {/* Overlays */}
      {showConnectionOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center text-white p-8 rounded-2xl max-w-lg" style={{ background: BRAND.colors.panel }}>
            <div className="text-4xl mb-4">{dailyLimitReached ? "🚫" : "🔄"}</div>
            <div className="text-2xl font-bold mb-2">{dailyLimitReached ? "Yenileme Durduruldu" : "Bağlantı Sorunu"}</div>
            <div className="text-lg opacity-80">{dailyLimitReached ? "Sistem kendini yenilemeyi denedi, ancak çok sık tekrarlandığı için durduruldu." : "Yeniden deneniyor..."}</div>
          </div>
        </div>
      )}

      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.topPadding}`} style={{ marginTop: preview.isActive ? "40px" : "0" }}>
        <HeaderBar now={now} isOffline={isOffline || fromCache} lastSyncAt={lastSyncAt} settings={bundle?.settings} />
      </div>

      <div className={`flex-1 grid grid-cols-12 gap-5 ${PLAYER_LAYOUT.sidePadding} py-3`}>
        {/* Sol Panel: Nöbetçi, Hava (DERS PROGRAMI KISMI SAĞA TAŞINDI) */}
        <div className="col-span-3">
          <LeftPanel
            state={statusData.state}
            nextInSec={statusData.nextInSec}
            nextLabel={statusData.nextLabel}
            duties={bundle?.duties ?? []}
            weather={weather}
            now={now}
            specialDates={bundle?.specialDates ?? []}
            hideStatus={true} // New prop to hide status from LeftPanel
          />
        </div>

        {/* ORTA PANEL: Unified Player Queue */}
        <div className="col-span-6 flex flex-col">
          <div className="flex-1 rounded-2xl overflow-hidden relative" style={{ background: BRAND.colors.panel }}>
            {currentItem && currentCardList.length > 0 ? (
              <CardCarousel
                cards={currentCardList}
                index={0}
                onVideoEnded={handleNext}
                videoMaxSeconds={Math.max(5, rotation.videoSeconds || 30)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 flex-col gap-2">
                <div className="text-4xl">📭</div>
                <div>Yayınlanacak içerik bulunamadı</div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel: Ders Programı ve DURUM */}
        <div className="col-span-3 flex flex-col gap-3">

          {/* DURUM KUTUSU (Sol panelden buraya taşındı) */}
          <div className="p-3 rounded-2xl flex flex-col justify-center gap-2" style={{ background: BRAND.colors.panel, minHeight: '140px' }}>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-extrabold" style={{ color: statusColor }}>
                {statusLabel}
              </div>
              {statusData.state === "lesson" && statusData.currentLessonNumber && (
                <div className="bg-white/10 px-3 py-1 rounded text-xl font-bold text-white">
                  {statusData.currentLessonNumber}. Ders
                </div>
              )}
            </div>

            <div className="mt-1">
              <div className="text-4xl font-bold text-white tabular-nums tracking-tight">
                {statusData.nextInSec == null ? "--:--" : formatCountdown(statusData.nextInSec)}
              </div>
              <div className="text-sm mt-1 opacity-70" style={{ color: BRAND.colors.muted }}>
                {statusData.nextInSec ? `${Math.ceil(statusData.nextInSec / 60)} dakika sonra` : ""}
                {statusData.nextLabel ? ` • ${statusData.nextLabel}` : ""}
              </div>
            </div>
          </div>

          {/* DERS PROGRAMI LISTESI */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: BRAND.colors.panel }}>
            <div className="flex-1 p-1.5 overflow-hidden">
              <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
                {currentClasses.map((entry, idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${entry.teacher_name ? "bg-white/10" : "bg-white/[0.03]"}`}>
                    <div className="w-10 h-5 rounded bg-emerald-500/40 text-emerald-200 flex items-center justify-center text-[11px] font-bold shrink-0">{entry.class_name}</div>
                    <div className={`flex-1 text-[11px] font-medium truncate ${entry.teacher_name ? "text-white" : "text-white/25"}`}>{entry.teacher_name || "—"}</div>
                  </div>
                ))}
              </div>
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

