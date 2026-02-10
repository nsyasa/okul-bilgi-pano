"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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

export function CardCarousel(props: {
  cards: ReturnType<typeof buildCards>;
  index: number;
  onVideoEnded?: () => void;
  videoMaxSeconds?: number; // Watchdog: ENDED gelmezse bu süre sonunda otomatik geç
}) {
  const card = props.cards[props.index % Math.max(1, props.cards.length)];
  const [imageIndex, setImageIndex] = useState(0);
  const videoId = card?.kind === "video" ? extractYouTubeId(card.data.url) : null;
  // Unique key for video to track changes even with same video
  const videoKey = videoId ? `${videoId}-${props.index}` : null;

  // Otomatik resim carousel (3 saniyede bir)
  useEffect(() => {
    if (card?.kind !== "announcement") return;
    const images = card.data.image_urls ?? [];
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [card]);

  // Card değiştiğinde resim index'ini sıfırla
  useEffect(() => {
    setImageIndex(0);
  }, [props.index]);

  // YouTube player refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hasEndedRef = useRef(false);

  // Video bitti callback'i (çift çağrı önleme)
  const handleVideoEnded = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    if (DEBUG) console.log(`🎥 Video ended: ${videoId}`);
    props.onVideoEnded?.();
  }, [videoId, props.onVideoEnded]);

  // YouTube IFrame API ile video bitişi tespiti
  useEffect(() => {
    if (!videoKey || !videoId || !props.onVideoEnded) return;
    if (!playerContainerRef.current) return;

    hasEndedRef.current = false;
    let player: YTPlayer | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const initPlayer = async () => {
      try {
        await loadYouTubeIframeApi(10000);
        if (isCancelled) return;

        if (DEBUG) console.log(`🎥 Creating YT.Player for: ${videoId}`);

        // Container'a unique id ver
        const containerId = `yt-player-${videoId}-${Date.now()}`;
        if (playerContainerRef.current) {
          playerContainerRef.current.id = containerId;
        }

        player = new window.YT.Player(containerId, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return;
              if (DEBUG) console.log(`🎥 Video ready: ${videoId}`);
              // Autoplay kısıtlarına karşı
              event.target.mute();
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              // ENDED = 0
              if (event.data === 0) {
                if (DEBUG) console.log(`🎥 Video state ENDED: ${videoId}`);
                handleVideoEnded();
              }
            },
            onError: (event) => {
              if (isCancelled) return;
              if (DEBUG) console.log(`🎥 Video error (${event.data}): ${videoId}`);
              // Hata durumunda video atla
              handleVideoEnded();
            },
          },
        });

        playerRef.current = player;
      } catch (err) {
        if (isCancelled) return;
        if (DEBUG) console.log(`🎥 YT API yüklenemedi, fallback timer başlatılıyor`);
        // API yüklenemezse 5 saniye sonra atla
        fallbackTimer = setTimeout(() => {
          if (!isCancelled) {
            handleVideoEnded();
          }
        }, 5000);
      }
    };

    initPlayer();

    // Watchdog: ENDED event gelmezse videoMaxSeconds sonra otomatik geç
    const watchdogMs = (props.videoMaxSeconds ?? 300) * 1000; // default 5 dakika
    const maxDurationTimer = setTimeout(() => {
      if (!isCancelled && !hasEndedRef.current) {
        if (DEBUG) console.log(`🎥 Watchdog timeout (${props.videoMaxSeconds ?? 300}s), skipping: ${videoId}`);
        handleVideoEnded();
      }
    }, watchdogMs);

    return () => {
      isCancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      clearTimeout(maxDurationTimer);
      if (player) {
        try {
          player.destroy();
          if (DEBUG) console.log(`🎥 Player destroyed: ${videoId}`);
        } catch {
          // Player already destroyed
        }
      }
      playerRef.current = null;
    };
  }, [videoKey, videoId, props.onVideoEnded, handleVideoEnded]);

  if (!card) {
    return null;
  }

  return (
    <div className="h-full rounded-2xl overflow-hidden relative flex flex-col" style={{ background: BRAND.colors.panel }}>
      {card.kind !== "video" ? (
        <>
          {/* Başlık - Daha Minimal */}
          <div className="px-8 py-4" style={{ borderBottom: `2px solid ${BRAND.colors.brand}` }}>
            <div className="text-sm tracking-widest font-bold opacity-60" style={{ color: BRAND.colors.brand }}>
              {card.kind === "announcement" ? "DUYURU" : card.kind === "event" ? "ETKİNLİK" : "OKUL"}
            </div>
            <div className="text-3xl font-black mt-1 text-white leading-tight">
              {card.kind === "announcement" ? card.data.title : card.kind === "event" ? card.data.title : card.data.title}
            </div>
            {card.kind === "announcement" && card.data.approved_label ? (
              <div
                className="mt-2 text-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold"
                style={{ background: BRAND.colors.bg, color: BRAND.colors.brand }}
              >
                ✓ Editör Onaylı
              </div>
            ) : null}
          </div>

          {/* İçerik */}
          <div className="flex-1 flex flex-col p-6 gap-3">
            {card.kind === "announcement" ? (
              <>
                {/* Metin Kutusu - Daha Minimal */}
                {card.data.body && (
                  <div className="p-4 rounded-xl" style={{ background: BRAND.colors.bg }}>
                    <div className="text-lg leading-relaxed text-white/90 whitespace-pre-line line-clamp-3">{card.data.body}</div>
                  </div>
                )}

                {/* Resim Galerisi - Daha Fazla Alan */}
                {card.data.image_urls && card.data.image_urls.length > 0 ? (
                  <div className="flex-1">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                      <Image src={card.data.image_urls[imageIndex]} alt="Duyuru görseli" fill className="object-contain" />
                      {card.data.image_urls.length > 1 && (
                        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-xl text-lg font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "white", backdropFilter: "blur(4px)" }}>
                          {imageIndex + 1} / {card.data.image_urls.length}
                        </div>
                      )}
                    </div>
                  </div>
                ) : card.data.image_url ? (
                  <div className="flex-1">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                      <Image src={card.data.image_url} alt="Duyuru görseli" fill className="object-contain" />
                    </div>
                  </div>
                ) : null}
              </>
            ) : card.kind === "event" ? (
              <div className="h-full flex flex-col justify-between">
                <div className="text-2xl text-white leading-relaxed whitespace-pre-line">{card.data.description ?? ""}</div>
                <div className="mt-4 p-4 rounded-xl" style={{ background: BRAND.colors.bg }}>
                  <div className="text-xl font-bold text-white">{formatEventDate(card.data.starts_at)}</div>
                  <div className="text-lg mt-1" style={{ color: BRAND.colors.brand }}>
                    📍 {card.data.location ?? ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center">
                <div className="text-2xl text-white leading-relaxed whitespace-pre-line">{card.data.body}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1">
          <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
            <div
              ref={playerContainerRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}