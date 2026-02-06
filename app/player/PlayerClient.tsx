"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { PlayerBundle, WeatherNow, YouTubeVideo } from "@/types/player";

function useInterval(fn: () => void, ms: number) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}

function todayKeyTR(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

export default function PlayerClient() {
  const [now, setNow] = useState(() => new Date());
  const [bundle, setBundle] = useState<PlayerBundle | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  const [isOffline, setIsOffline] = useState(false);

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

  useInterval(() => {
    loadBundle();
  }, 60_000);

  useEffect(() => {
    fetchWeatherNow().then(setWeather).catch(() => {});
  }, []);
  useInterval(() => {
    fetchWeatherNow().then(setWeather).catch(() => {});
  }, 10 * 60_000);

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

  const cards = useMemo(() => {
    if (!bundle) return [];
    return buildCards({
      announcements: bundle.announcements,
      events: bundle.events,
      schoolInfo: bundle.schoolInfo,
      youtubeVideos: activeVideos,
    });
  }, [bundle, activeVideos]);

  useInterval(() => {
    if (!cards.length) return;
    setCardIndex((x) => x + 1);
  }, 12_000);

  useInterval(() => {
    if (!bundle?.announcements.length) return;
    const filteredAnnouncements = bundle.announcements.filter(a => a.status === 'published');
    if (!filteredAnnouncements.length) return;
    setAnnouncementIndex((x) => (x + 1) % filteredAnnouncements.length);
  }, 12_000);

  const status = useMemo(() => {
    const b = bundle;
    if (!b) return { state: "closed" as const, nextInSec: null as number | null, nextLabel: null as string | null };

    const dateKey = todayKeyTR(now);
    const weekday = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();

    const picked = pickSlotsForToday({
      dateKey,
      weekday,
      templates: b.templates as any,
      overrides: b.overrides as any,
    });

    const st = computeNowStatus(now, picked.slots);
    return {
      state: st.state,
      nextInSec: st.nextInSec ?? null,
      nextLabel: st.nextLabel ?? null,
    };
  }, [bundle, now]);

  const publishedAnnouncements = useMemo(() => {
    return bundle?.announcements.filter(a => a.status === 'published') ?? [];
  }, [bundle?.announcements]);

  return (
    <div className="min-h-screen w-screen flex flex-col" style={{ background: BRAND.colors.bg }}>
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
            <CardCarousel cards={cards} index={cardIndex} />
          </div>
          {publishedAnnouncements.length > 0 && (
            <div className="w-72">
              <AnnouncementSidebar
                announcements={bundle?.announcements ?? []}
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
