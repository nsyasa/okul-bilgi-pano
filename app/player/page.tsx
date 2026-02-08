"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@/lib/branding";
import { PLAYER_LAYOUT } from "@/lib/layoutConfig";
import { fetchPlayerBundle } from "@/lib/playerApi";
import { fetchWeatherNow } from "@/lib/weather";
import { computeNowStatus, pickSlotsForToday } from "@/lib/schedule";
import { HeaderBar } from "@/components/player/HeaderBar";
import { LeftPanel } from "@/components/player/LeftPanel";
import { CardCarousel, buildCards } from "@/components/player/CardCarousel";
import { TickerBar } from "@/components/player/TickerBar";
import { AnnouncementSidebar } from "@/components/player/AnnouncementSidebar";
import type { PlayerBundle, WeatherNow, YouTubeVideo, PlayerRotationSettings, Announcement } from "@/types/player";

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

export default function PlayerPage() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [bundle, setBundle] = useState<PlayerBundle | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [mode, setMode] = useState<"video" | "image" | "text">("text");

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useInterval(() => setNow(new Date()), 1000);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const loadBundle = async () => {
    const r = await fetchPlayerBundle();
    setBundle(r.bundle);
    setFromCache(r.fromCache);
    setLastSyncAt(r.bundle.generatedAt);
    if (r.fromCache) setIsOffline(true);
  };

  useEffect(() => {
    loadBundle();
  }, []);

  const refreshBundle = useCallback(() => {
    loadBundle();
  }, []);

  useInterval(refreshBundle, 60_000);

  useEffect(() => {
    fetchWeatherNow().then(setWeather).catch(() => { });
  }, []);

  const refreshWeather = useCallback(() => {
    fetchWeatherNow().then(setWeather).catch(() => { });
  }, []);

  useInterval(refreshWeather, 10 * 60_000);

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
    if (bigAnnouncement) return [bigAnnouncement];
    return smallAnnouncements.filter((a) => !a.image_url && !(a.image_urls?.length));
  }, [smallAnnouncements, bigAnnouncement]);

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

  const rotateAnnouncements = useCallback(() => {
    if (!activeAnnouncements.length) return;
    setAnnouncementIndex((x) => (x + 1) % activeAnnouncements.length);
  }, [activeAnnouncements.length]);

  useInterval(rotateAnnouncements, Math.max(5, rotation.textSeconds || 10) * 1000);

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

  const status = useMemo(() => {
    const b = bundle;
    if (!b) return { state: "closed" as const, nextInSec: null as number | null, nextLabel: null as string | null };

    const dateKey = todayKeyTR(nowTR);
    const weekday = nowTR.getDay();

    const picked = pickSlotsForToday({
      dateKey,
      weekday,
      templates: b.templates as any,
      overrides: b.overrides as any,
    });

    const st = computeNowStatus(nowTR, picked.slots);
    return {
      state: st.state,
      nextInSec: st.nextInSec ?? null,
      nextLabel: st.nextLabel ?? null,
    };
  }, [bundle, nowTR]);

  const publishedAnnouncements = useMemo(() => {
    return smallAnnouncements;
  }, [smallAnnouncements]);

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
      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.topPadding}`}>
        <HeaderBar now={now} isOffline={isOffline || fromCache} lastSyncAt={lastSyncAt} />
      </div>

      <div className={`flex-1 grid grid-cols-12 gap-2 ${PLAYER_LAYOUT.sidePadding} py-3`}>
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

        <div className={publishedAnnouncements.length > 0 ? "col-span-9 flex gap-2" : "col-span-9"}>
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
          {publishedAnnouncements.length > 0 && (
            <div className="w-72">
              <AnnouncementSidebar
                announcements={publishedAnnouncements}
                selectedIndex={announcementIndex}
                onSelect={setAnnouncementIndex}
              />
            </div>
          )}
        </div>
      </div>

      <div className={`${PLAYER_LAYOUT.sidePadding} ${PLAYER_LAYOUT.bottomPadding}`}>
        <TickerBar ticker={bundle?.ticker ?? []} now={now} isAlert={false} />
      </div>
    </div>
  );
}
