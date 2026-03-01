"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type {
  WeatherNow,
  YouTubeVideo,
  PlayerRotationSettings,
  Announcement,
  TickerItem,
  BellSlot,
} from "@/types/player";

const DEBUG = false;

// ✅ Ticker asla kapanmasın diye güvenli alt boşluk (ticker + padding)
const TICKER_SAFE_PX = 96;

// Helper to check if item is in valid time window
function inWindow(item: { start_at?: string | null; end_at?: string | null }, now: Date) {
  const t = now.getTime();
  const s = item.start_at ? new Date(item.start_at).getTime() : null;
  const e = item.end_at ? new Date(item.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

function useInterval(fn: () => void, ms: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);
  useEffect(() => {
    savedCallback.current = fn;
  }, [fn]);
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

function clampNumber(val: unknown, fallback: number, min = 1, max = 24 * 60 * 60) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Preview Banner
function PreviewBanner({
  previewTimeStr,
  remainingTtl,
  onExit,
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
        <span className="opacity-90">
          Kalan: <span className="font-mono">{formatTtl(remainingTtl)}</span>
        </span>
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

// Unified Playlist Item
type PlaylistItem = {
  id: string;
  kind: "video" | "announcement";
  flow_order: number;
  created_at: string;
  duration: number; // seconds
  original: Announcement | YouTubeVideo;
  videoData?: YouTubeVideo;
  announcementData?: Announcement;
  slideCount?: number; // slideshow total (debug)
};

function DebugOverlay({
  item,
  playlistIndex,
  total,
  debugMode,
}: {
  item: PlaylistItem | null;
  playlistIndex: number;
  total: number;
  debugMode: boolean;
}) {
  if (!debugMode) return null;
  return (
    <div className="fixed top-2 right-2 z-[9999] bg-black/80 text-white text-[10px] font-mono p-2 rounded pointer-events-none flex flex-col gap-1 shadow-xl border border-white/20">
      <div className="font-bold text-yellow-400 border-b border-white/20 pb-1 mb-1">DEBUG MODE</div>
      <div>
        Playlist: <span className="text-green-400">{playlistIndex + 1}</span> / {total}
      </div>
      {item && (
        <>
          <div>
            ID: <span className="opacity-70">{item.id}</span>
          </div>
          <div>
            Kind: <span className="text-blue-300">{item.kind}</span>
          </div>
          <div>Flow: {item.flow_order}</div>
          <div>Dur: {item.duration}s</div>
          {item.slideCount ? (
            <div className="mt-1 pt-1 border-t border-white/20 text-cyan-300">Slides: {item.slideCount}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PlayerContent() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get("debug") === "1";

  const { bundle, fromCache, lastSyncAt, isOffline, lastSuccessfulFetchAt, consecutiveFetchFailures } =
    usePlayerBundle();
  const preview = usePreviewTime();

  const [mounted, setMounted] = useState(false);
  const [realNow, setRealNow] = useState(() => new Date());

  // Effective time
  const now = preview.isActive ? preview.effectiveNow : realNow;
  const nowTR = useMemo(() => new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })), [now]);

  // minute-granularity
  const minuteTick = useMemo(() => Math.floor(nowTR.getTime() / 60000), [nowTR]);

  const [weather, setWeather] = useState<WeatherNow | null>(null);

  // current playlist position by id
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Watchdog overlay
  const { showConnectionOverlay, dailyLimitReached } = usePlayerWatchdog(
    lastSuccessfulFetchAt,
    consecutiveFetchFailures
  );

  useEffect(() => setMounted(true), []);
  useInterval(() => setRealNow(new Date()), 1000);

  useEffect(() => {
    fetchWeatherNow().then(setWeather).catch(() => { });
  }, []);
  useInterval(() => fetchWeatherNow().then(setWeather).catch(() => { }), 10 * 60_000);

  // Rotation settings (safe defaults)
  const rotation = useMemo<PlayerRotationSettings>(() => {
    const r = (bundle?.settings?.rotation as PlayerRotationSettings) ?? {};
    return {
      enabled: r.enabled ?? true,
      videoSeconds: clampNumber(r.videoSeconds, 30, 1, 60 * 60),
      imageSeconds: clampNumber(r.imageSeconds, 3, 1, 60 * 60),
      textSeconds: clampNumber(r.textSeconds, 10, 1, 60 * 60),
      // optional field (if you added)
      showSlideCounter: (r as any).showSlideCounter ?? true,
    } as PlayerRotationSettings;
  }, [bundle?.settings]);

  // Build Playlist
  const playlist = useMemo<PlaylistItem[]>(() => {
    if (!bundle) return [];

    const list: PlaylistItem[] = [];
    const _nowForFilter = new Date(minuteTick * 60000);

    // Announcements
    (bundle.announcements || []).forEach((a) => {
      if (a.status !== "published") return;
      if (!inWindow(a, _nowForFilter)) return;

      const declaredImageMode = a.display_mode === "image";

      // deterministic image list
      const rawImages: string[] = [];
      if (Array.isArray(a.image_urls)) rawImages.push(...a.image_urls);
      if (a.image_url) rawImages.push(a.image_url);

      const uniqueImages: string[] = [];
      const seen = new Set<string>();
      rawImages.forEach((img) => {
        const s = (img || "").trim();
        if (s.length > 0 && !seen.has(s)) {
          seen.add(s);
          uniqueImages.push(s);
        }
      });

      const effectiveImageMode = declaredImageMode && uniqueImages.length > 0;

      if (effectiveImageMode) {
        const imgCount = uniqueImages.length;
        const perImageSec = clampNumber(rotation.imageSeconds, 3, 1, 60 * 60);

        list.push({
          id: a.id,
          kind: "announcement",
          flow_order: Number(a.flow_order ?? 0),
          created_at: a.created_at,
          duration: imgCount * perImageSec,
          original: a,
          announcementData: { ...a, image_urls: uniqueImages },
          slideCount: imgCount,
        });
      } else {
        // if image mode but empty images -> treat like text
        const safeAnnouncement: Announcement =
          declaredImageMode && uniqueImages.length === 0
            ? ({ ...a, display_mode: "text" as any } as Announcement)
            : a;

        list.push({
          id: a.id,
          kind: "announcement",
          flow_order: Number(a.flow_order ?? 0),
          created_at: a.created_at,
          duration: clampNumber(rotation.textSeconds, 10, 1, 60 * 60),
          original: a,
          announcementData: safeAnnouncement,
        });
      }
    });

    // Videos
    (bundle.youtubeVideos || []).forEach((v) => {
      if (!v.is_active) return;
      if (!inWindow(v as any, _nowForFilter)) return;

      list.push({
        id: v.id,
        kind: "video",
        flow_order: Number(v.flow_order ?? 0),
        created_at: v.created_at || "1970-01-01T00:00:00.000Z",
        duration: clampNumber(rotation.videoSeconds, 30, 1, 60 * 60),
        original: v,
        videoData: v,
      });
    });

    // Sort: flow asc -> created_at desc -> id asc
    const sorted = list.sort((a, b) => {
      if (a.flow_order !== b.flow_order) return a.flow_order - b.flow_order;

      const tA = Date.parse(a.created_at || "1970-01-01T00:00:00.000Z");
      const tB = Date.parse(b.created_at || "1970-01-01T00:00:00.000Z");
      if (tA !== tB) return tB - tA;

      return a.id.localeCompare(b.id);
    });

    if (DEBUG || debugMode) {
      console.debug(
        "PLAYLIST REBUILT (first 10):",
        sorted.slice(0, 10).map((i) => ({ id: i.id, kind: i.kind, flow: i.flow_order, dur: i.duration }))
      );
    }

    return sorted;
  }, [bundle, minuteTick, rotation.imageSeconds, rotation.textSeconds, rotation.videoSeconds, debugMode]);

  const { currentItem, playlistIndex } = useMemo(() => {
    if (playlist.length === 0) return { currentItem: null as PlaylistItem | null, playlistIndex: -1 };

    let idx = -1;
    if (currentId) idx = playlist.findIndex((p) => p.id === currentId);
    if (idx === -1) idx = 0;

    return { currentItem: playlist[idx], playlistIndex: idx };
  }, [playlist, currentId]);

  // Advance (respect rotation.enabled unless forced)
  const handleNext = useCallback(
    (opts?: { force?: boolean }) => {
      if (playlist.length === 0) return;

      if (!rotation.enabled && !opts?.force) {
        if (DEBUG || debugMode) console.debug("⏸️ Rotation disabled, skipping advance");
        return;
      }

      const currentIdx = currentId ? playlist.findIndex((p) => p.id === currentId) : -1;
      const nextIdx = (currentIdx + 1) % playlist.length;

      if (DEBUG || debugMode) console.debug(`⏩ Advancing: ${currentIdx} -> ${nextIdx} (${playlist[nextIdx].id})`);

      setCurrentId(playlist[nextIdx].id);
    },
    [playlist, currentId, rotation.enabled, debugMode]
  );

  // rotation kapalıysa video bitince otomatik ilerleme yapma
  const handleVideoEndedGuarded = useCallback(() => {
    if (!rotation.enabled) return;
    handleNext();
  }, [rotation.enabled, handleNext]);

  // init currentId
  useEffect(() => {
    if (!currentId && playlist.length > 0) setCurrentId(playlist[0].id);
  }, [playlist, currentId]);

  // Timer for non-video items
  useEffect(() => {
    if (!rotation.enabled) return;
    if (!currentItem) return;
    if (currentItem.kind === "video") return;

    const safeDurationSeconds = clampNumber(currentItem.duration, 10, 1, 60 * 60);

    if (DEBUG || debugMode) console.debug(`⏱️ Item timer: ${currentItem.id} (${safeDurationSeconds}s)`);

    const timer = setTimeout(() => handleNext(), safeDurationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [currentItem, handleNext, rotation.enabled, debugMode]);

  const statusData = useMemo(() => {
    const b = bundle;
    if (!b)
      return {
        state: "closed" as const,
        nextInSec: null as number | null,
        nextLabel: null as string | null,
        slots: [] as BellSlot[],
        currentLessonNumber: null as number | null,
      };

    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(nowTR);
    const weekday = nowTR.getDay();
    const picked = pickSlotsForToday({ dateKey, weekday, templates: b.templates as any, overrides: b.overrides as any });
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

  // Class list
  const ALL_CLASSES = useMemo(() => [
    "5-A", "5-B", "6-A", "6-B", "7-A", "7-B", "8-A", "8-B",
    "9-A", "9-B", "9-C", "9-D",
    "10-A", "10-B", "10-C", "10-D",
    "11-A", "11-B", "11-C", "11-D",
    "12-A", "12-B", "12-C", "12-D", "12-E",
  ], []);

  const scheduleIndex = useMemo(() => {
    const schedule = bundle?.lessonSchedule ?? [];
    const index = new Map<string, Map<string, string>>();

    const normalize = (name: string) => {
      const match = name.match(/^(\d+)-?([A-Za-z])$/);
      return match ? `${match[1]}-${match[2].toUpperCase()}` : name;
    };

    for (const entry of schedule as any[]) {
      if (entry.day_of_week && entry.lesson_number && entry.class_name) {
        const key = `${entry.day_of_week}-${entry.lesson_number}`;
        let classMap = index.get(key);
        if (!classMap) {
          classMap = new Map<string, string>();
          index.set(key, classMap);
        }
        classMap.set(normalize(entry.class_name), entry.teacher_name);
      }
    }

    return index;
  }, [bundle?.lessonSchedule]);

  const currentClasses = useMemo(() => {
    const lessonNum = statusData.currentLessonNumber;
    const weekday = nowTR.getDay();

    let teacherMap: Map<string, string> | undefined;
    if (lessonNum && weekday >= 1 && weekday <= 5) {
      const key = `${weekday}-${lessonNum}`;
      teacherMap = scheduleIndex.get(key);
    }

    return ALL_CLASSES.map((className) => ({
      class_name: className,
      teacher_name: teacherMap?.get(className) || "",
    }));
  }, [statusData.currentLessonNumber, nowTR, scheduleIndex, ALL_CLASSES]);

  // Cards for CardCarousel (single item display)
  const currentCardList = useMemo(() => {
    if (!currentItem) return [];
    if (currentItem.kind === "video" && currentItem.videoData) {
      return buildCards({ announcements: [], events: [], schoolInfo: [], youtubeVideos: [currentItem.videoData] });
    }
    if (currentItem.announcementData) {
      return buildCards({ announcements: [currentItem.announcementData], events: [], schoolInfo: [], youtubeVideos: [] });
    }
    return [];
  }, [currentItem]);

  const combinedTicker = useMemo(() => (bundle?.ticker ?? []) as TickerItem[], [bundle?.ticker]);

  const statusLabel =
    statusData.state === "lesson"
      ? "DERS"
      : statusData.state === "break"
        ? "TENEFÜS"
        : statusData.state === "lunch"
          ? "ÖĞLE ARASI"
          : "OKUL DIŞI";

  const statusColor =
    statusData.state === "lesson"
      ? "#ef4444"
      : statusData.state === "break"
        ? "#22c55e"
        : statusData.state === "lunch"
          ? BRAND.colors.info
          : BRAND.colors.muted;

  if (!mounted) return null;

  // ✅ En dış container: ticker alanı kadar paddingBottom bırak (fixed ticker ile çakışmasın)
  return (
    <div
      className="min-h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: BRAND.colors.bg, paddingBottom: `${TICKER_SAFE_PX}px` }}
    >
      {preview.isActive && (
        <PreviewBanner previewTimeStr={preview.previewTimeStr} remainingTtl={preview.remainingTtl} onExit={preview.exitPreview} />
      )}

      <DebugOverlay item={currentItem} playlistIndex={playlistIndex} total={playlist.length} debugMode={debugMode} />

      {showConnectionOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="text-center text-white p-8 rounded-2xl max-w-lg" style={{ background: BRAND.colors.panel }}>
            <div className="text-4xl mb-4">{dailyLimitReached ? "🚫" : "🔄"}</div>
            <div className="text-2xl font-bold mb-2">{dailyLimitReached ? "Yenileme Durduruldu" : "Bağlantı Sorunu"}</div>
            <div className="text-lg opacity-80">
              {dailyLimitReached
                ? "Sistem kendini yenilemeyi denedi, ancak çok sık tekrarlandığı için durduruldu."
                : "Yeniden deneniyor..."}
            </div>
          </div>
        </div>
      )}

      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.topPadding}`} style={{ marginTop: preview.isActive ? "40px" : "0" }}>
        <HeaderBar now={now} isOffline={isOffline || fromCache} lastSyncAt={lastSyncAt} settings={bundle?.settings} />
      </div>

      <div className={`flex-1 grid grid-cols-12 gap-5 ${PLAYER_LAYOUT.sidePadding} py-3`}>
        <div className="col-span-3">
          <LeftPanel
            state={statusData.state}
            nextInSec={statusData.nextInSec}
            nextLabel={statusData.nextLabel}
            duties={bundle?.duties ?? []}
            weather={weather}
            now={now}
            specialDates={bundle?.specialDates ?? []}
            hideStatus={true}
          />
        </div>

        <div className="col-span-6 flex flex-col">
          <div key={currentItem?.id ?? "empty"} className="flex-1 rounded-2xl overflow-hidden relative" style={{ background: BRAND.colors.panel }}>
            {currentItem && currentCardList.length > 0 ? (
              <CardCarousel
                cards={currentCardList}
                index={0}
                onVideoEnded={handleVideoEndedGuarded}
                videoMaxSeconds={clampNumber(rotation.videoSeconds, 30, 1, 60 * 60)}
                imageSeconds={clampNumber(rotation.imageSeconds, 3, 1, 60 * 60)}
                showSlideCounter={(rotation as any).showSlideCounter ?? true}
                // Görseller fail olursa kitlenmesin: bunu force geçiyoruz (rotation kapalı olsa bile)
                onSlideShowEmptyOrFail={() => handleNext({ force: true })}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 flex-col gap-2">
                <div className="text-4xl">📭</div>
                <div>Yayınlanacak içerik bulunamadı</div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-3">
          <div className="p-3 rounded-2xl flex flex-col justify-center gap-2" style={{ background: BRAND.colors.panel, minHeight: "140px" }}>
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

          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: BRAND.colors.panel }}>
            <div className="flex-1 p-1.5 overflow-hidden">
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
      </div>

      {/* ✅ FIXED TICKER: Resim ne kadar büyük olursa olsun alt bar asla kapanmaz */}
      <div className="fixed bottom-0 left-0 right-0 z-[80]" style={{ background: BRAND.colors.bg }}>
        <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.bottomPadding}`}>
          <TickerBar
            ticker={combinedTicker}
            now={now}
            isAlert={bundle?.announcements.some((a: any) => a.category === "sensitive")}
            settings={bundle?.settings}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
          <div className="text-white text-xl">Yükleniyor...</div>
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  );
}
