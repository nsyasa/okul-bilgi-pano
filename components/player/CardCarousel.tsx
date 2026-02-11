"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Image import removed to use standard img tag
import { BRAND } from "@/lib/branding";
import { loadYouTubeIframeApi, type YTPlayer } from "@/lib/youtubeIframeApi";
import type { Announcement, EventItem, SchoolInfo, YouTubeVideo } from "@/types/player";

const DEBUG = false;

type Card =
  | { kind: "announcement"; data: Announcement }
  | { kind: "event"; data: EventItem }
  | { kind: "info"; data: SchoolInfo }
  | { kind: "video"; data: YouTubeVideo };

function extractYouTubeId(input: string | null | undefined) {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "");
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
    if (url.searchParams.has("v")) return url.searchParams.get("v");
  } catch {
    const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    if (match) return match[1];
  }
  return null;
}

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function buildCards(params: {
  announcements: Announcement[];
  events: EventItem[];
  schoolInfo: SchoolInfo[];
  youtubeVideos: YouTubeVideo[];
}): Card[] {
  const a = (params.announcements ?? [])
    .filter((x) => x.status === "published")
    .slice(0, 12)
    .map((x) => ({ kind: "announcement", data: x } as const));

  const e = (params.events ?? []).slice(0, 6).map((x) => ({ kind: "event", data: x } as const));

  const i = (params.schoolInfo ?? []).slice(0, 6).map((x) => ({ kind: "info", data: x } as const));

  const v = (params.youtubeVideos ?? [])
    .filter((x) => extractYouTubeId(x.url))
    .slice(0, 6)
    .map((x) => ({ kind: "video", data: x } as const));

  // Basit bir karışım: videolar daha erken görünsün
  return [...v, ...a, ...e, ...a.slice(0, 6), ...i];
}

// -- INTERNAL COMPONENTS --

// Isolated YouTube Player Component to prevent DOM conflicts
function YouTubeEmbed({
  videoId,
  onEnded,
  onError,
  maxSeconds
}: {
  videoId: string;
  onEnded: () => void;
  onError: () => void;
  maxSeconds: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let player: YTPlayer | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const cleanup = () => {
      isCancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (player) {
        try {
          player.destroy();
        } catch { }
      }
      playerRef.current = null;
    };

    const init = async () => {
      try {
        await loadYouTubeIframeApi(10000);
        if (isCancelled) return;

        const childId = `yt-player-${videoId}-${Date.now()}`;
        const childDiv = document.createElement("div");
        childDiv.id = childId;

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(childDiv);
        }

        // Get origin safely for SSR/CSR
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        player = new window.YT.Player(childId, {
          videoId,
          host: 'https://www.youtube.com', // Explicitly set host to prevent some origin errors
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            origin: origin, // Ensure origin is set
            enablejsapi: 1, // Enable JS API
          },
          events: {
            onReady: (e) => {
              if (isCancelled) return;
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (isCancelled) return;
              if (e.data === 0) { // ENDED
                if (!hasEndedRef.current) {
                  hasEndedRef.current = true;
                  onEnded();
                }
              }
            },
            onError: (e) => {
              if (isCancelled) return;
              console.error("YT Error:", e.data);
              onError(); // Skip on playback error
            }
          },
        });
        playerRef.current = player;
      } catch (e) {
        if (!isCancelled) onError();
      }
    };

    init();

    watchdogTimer = setTimeout(() => {
      if (!isCancelled && !hasEndedRef.current) {
        onEnded();
      }
    }, maxSeconds * 1000);

    return cleanup;
  }, [videoId, maxSeconds, onEnded, onError]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full bg-black" />;
}


export function CardCarousel(props: {
  cards: ReturnType<typeof buildCards>;
  index: number;
  onVideoEnded?: () => void;
  videoMaxSeconds?: number;
}) {
  const card = props.cards[props.index % Math.max(1, props.cards.length)];
  const [imageIndex, setImageIndex] = useState(0);
  const videoId = card?.kind === "video" ? extractYouTubeId(card.data.url) : null;

  const videoKey = videoId ? `${videoId}-${props.index}` : null;

  useEffect(() => {
    if (card?.kind !== "announcement") return;
    const images = card.data.image_urls ?? [];
    if (images.length <= 1) return;
    const interval = setInterval(() => setImageIndex((prev) => (prev + 1) % images.length), 3000);
    return () => clearInterval(interval);
  }, [card]);

  useEffect(() => setImageIndex(0), [props.index]);

  const isVideo = card?.kind === "video" && !!videoId;

  if (!card) return null;

  return (
    <div className="h-full rounded-2xl overflow-hidden relative flex flex-col" style={{ background: BRAND.colors.panel }}>

      {isVideo ? (
        <div className="flex-1 relative bg-black">
          <YouTubeEmbed
            key={videoKey}
            videoId={videoId!}
            onEnded={() => props.onVideoEnded?.()}
            onError={() => props.onVideoEnded?.()}
            maxSeconds={props.videoMaxSeconds ?? 300}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-6 py-2 pb-3 shrink-0" style={{ borderBottom: `2px solid ${BRAND.colors.brand}` }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-widest font-bold opacity-60 uppercase hidden" style={{ color: BRAND.colors.brand }}>
                  {card.kind === "announcement" ? "DUYURU" : card.kind === "event" ? "ETKİNLİK" : "OKUL"}
                </div>
                <div className="text-2xl font-black text-white leading-none truncate pt-1">
                  {card.kind === "announcement" ? card.data.title : card.kind === "event" ? card.data.title : card.data.title}
                </div>
              </div>
              {card.kind === "announcement" && card.data.approved_label && (
                <div className="ml-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-white/50">
                    ✓
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 flex flex-col p-4 pt-2 gap-2 overflow-hidden min-h-0">
            {card.kind === "announcement" ? (
              <>
                {/* Text (Optional) */}
                {card.data.body && (
                  <div className="p-3 rounded-lg shrink-0 max-h-[30%] overflow-hidden" style={{ background: BRAND.colors.bg }}>
                    <div className="text-base leading-snug text-white/90 whitespace-pre-line line-clamp-3">{card.data.body}</div>
                  </div>
                )}

                {/* Images (Fills remaining space) */}
                {(card.data.image_urls?.length ?? 0) > 0 ? (
                  <div className="flex-1 min-h-[50%] relative rounded-xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                    <img
                      src={card.data.image_urls![imageIndex]}
                      alt="Görsel"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error("Image Load Error:", e.currentTarget.src);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {card.data.image_urls!.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-3 py-1 rounded-lg text-sm font-bold bg-black/60 text-white backdrop-blur-sm">
                        {imageIndex + 1} / {card.data.image_urls!.length}
                      </div>
                    )}
                  </div>
                ) : card.data.image_url ? (
                  <div className="flex-1 min-h-[50%] relative rounded-xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                    <img
                      src={card.data.image_url}
                      alt="Görsel"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error("Image Load Error:", e.currentTarget.src);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : card.kind === "event" ? (
              <div className="h-full flex flex-col justify-between">
                <div className="text-2xl text-white leading-relaxed whitespace-pre-line">{card.data.description ?? ""}</div>
                <div className="mt-4 p-4 rounded-xl results" style={{ background: BRAND.colors.bg }}>
                  <div className="text-xl font-bold text-white">{formatEventDate(card.data.starts_at)}</div>
                  <div className="text-lg mt-1" style={{ color: BRAND.colors.brand }}>
                    📍 {card.data.location ?? ""}
                  </div>
                </div>
              </div>
            ) : card.kind === "info" ? (
              <div className="h-full flex items-center">
                <div className="text-2xl text-white leading-relaxed whitespace-pre-line">{card.data.body}</div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}