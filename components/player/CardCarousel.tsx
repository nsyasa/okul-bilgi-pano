"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@/lib/branding";
import type { Announcement, EventItem, SchoolInfo, YouTubeVideo } from "@/types/player";

function safeUrlForLog(input: string | null | undefined) {
  if (!input) return null;
  try {
    const u = new URL(input);
    return `${u.origin}${u.pathname}`;
  } catch {
    return input.slice(0, 200);
  }
}

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

  return [...v, ...a, ...e, ...a.slice(0, 6), ...i];
}

function YouTubeEmbed({
  videoId,
  onEnded,
  onError,
  maxSeconds,
}: {
  videoId: string;
  onEnded: () => void;
  onError: () => void;
  maxSeconds: number;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "pre-fix",
        hypothesisId: "C",
        location: "components/player/CardCarousel.tsx:YouTubeEmbed:mount",
        message: "YouTubeEmbed mounted (iframe mode)",
        data: { videoId },
        timestamp: Date.now(),
      }),
    }).catch(() => { });

    timeoutRef.current = setTimeout(() => {
      onEnded();
    }, maxSeconds * 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [videoId, maxSeconds, onEnded]);

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1`;

  return (
    <iframe
      className="absolute inset-0 h-full w-full"
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen={false}
      frameBorder="0"
      onError={() => {
        fetch("/api/agent-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: "pre-fix",
            hypothesisId: "C",
            location: "components/player/CardCarousel.tsx:YouTubeEmbed:iframe:onError",
            message: "YouTube iframe error",
            data: { videoId },
            timestamp: Date.now(),
          }),
        }).catch(() => { });
        onError();
      }}
    />
  );
}

export function CardCarousel(props: {
  cards: ReturnType<typeof buildCards>;
  index: number;
  onVideoEnded?: () => void;
  videoMaxSeconds?: number;
}) {
  const card = props.cards[props.index % Math.max(1, props.cards.length)];
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImageSrcs, setFailedImageSrcs] = useState<string[]>([]);

  const videoId = card?.kind === "video" ? extractYouTubeId(card.data.url) : null;
  const videoKey = videoId ? `${videoId}-${props.index}` : null;
  const handleVideoEnded = useCallback(() => props.onVideoEnded?.(), [props.onVideoEnded]);

  const announcementImages = useMemo(() => {
    if (card?.kind !== "announcement") return [];

    const raw = [...(card.data.image_urls ?? []), card.data.image_url ?? null];
    return Array.from(
      new Set(
        raw
          .map((src) => (typeof src === "string" ? src.trim() : ""))
          .filter((src) => src.length > 0)
      )
    );
  }, [card]);

  const displayImages = useMemo(() => {
    if (announcementImages.length === 0) return [];
    if (failedImageSrcs.length === 0) return announcementImages;
    return announcementImages.filter((src) => !failedImageSrcs.includes(src));
  }, [announcementImages, failedImageSrcs]);

  const currentImageSrc = displayImages[imageIndex] ?? null;

  useEffect(() => {
    if (!card) return;

    const controller = new AbortController();
    fetch("/api/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "post-fix-Carousel",
        location: "components/player/CardCarousel.tsx",
        message: "card selected",
        videoId: isVideo ? videoId : undefined
      }),
      signal: controller.signal
    }).catch(() => { });

    return () => controller.abort();
  }, [card?.kind, videoId]);

  useEffect(() => {
    // Flattened playlist strategy: No internal interval.
    // Each slide stays for its externally defined duration.
  }, []);

  useEffect(() => {
    setImageIndex(0);
    setFailedImageSrcs([]);
  }, [card, props.index]);

  useEffect(() => {
    if (displayImages.length === 0) return;
    if (imageIndex >= displayImages.length) {
      setImageIndex(0);
    }
  }, [displayImages.length, imageIndex]);

  const handleImageError = useCallback((src: string) => {
    setFailedImageSrcs((prev) => (prev.includes(src) ? prev : [...prev, src]));
  }, []);

  const isVideo = card?.kind === "video" && !!videoId;
  const isImageMode = card?.kind === "announcement" && card.data.display_mode === "image";

  if (!card) return null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl" style={{ background: BRAND.colors.panel }}>
      {isVideo ? (
        <div className="relative flex-1 bg-black">
          <YouTubeEmbed
            key={videoKey}
            videoId={videoId!}
            onEnded={handleVideoEnded}
            onError={handleVideoEnded}
            maxSeconds={props.videoMaxSeconds ?? 300}
          />
        </div>
      ) : (
        <>
          <div className="shrink-0 px-6 py-2 pb-3" style={{ borderBottom: `2px solid ${BRAND.colors.brand}` }}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="hidden text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: BRAND.colors.brand }}>
                  {card.kind === "announcement" ? "DUYURU" : card.kind === "event" ? "ETKİNLİK" : "OKUL"}
                </div>
                <div className="truncate pt-1 text-2xl font-black leading-none text-white">
                  {card.kind === "announcement" ? card.data.title : card.kind === "event" ? card.data.title : card.data.title}
                </div>
              </div>
              {card.kind === "announcement" && card.data.approved_label && (
                <div className="ml-2 shrink-0">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">✓</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4 pt-2">
            {card.kind === "announcement" ? (
              <>
                {!isImageMode && card.data.body && (
                  <div className="shrink-0 overflow-hidden rounded-lg p-3" style={{ background: BRAND.colors.bg, maxHeight: "30%" }}>
                    <div className="line-clamp-3 whitespace-pre-line text-base leading-snug text-white/90">{card.data.body}</div>
                  </div>
                )}

                {currentImageSrc ? (
                  <div className="relative flex-1 overflow-hidden rounded-xl" style={{ background: BRAND.colors.bg }}>
                    <img
                      key={currentImageSrc}
                      src={currentImageSrc}
                      alt="Görsel"
                      className="h-full w-full object-contain"
                      onLoad={() => {
                        fetch("/api/agent-log", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "components/player/CardCarousel.tsx:img:onLoad",
                            message: "announcement image loaded",
                            data: { src: safeUrlForLog(currentImageSrc), idx: imageIndex, total: displayImages.length },
                            timestamp: Date.now(),
                          }),
                        }).catch(() => { });
                      }}
                      onError={() => {
                        fetch("/api/agent-log", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            runId: "pre-fix",
                            hypothesisId: "A",
                            location: "components/player/CardCarousel.tsx:img:onError",
                            message: "announcement image failed",
                            data: { src: safeUrlForLog(currentImageSrc), idx: imageIndex, pageOrigin: window.location.origin },
                            timestamp: Date.now(),
                          }),
                        }).catch(() => { });
                        handleImageError(currentImageSrc);
                      }}
                    />
                    {displayImages.length > 1 && (
                      <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1 text-sm font-bold text-white backdrop-blur-sm">
                        {imageIndex + 1} / {displayImages.length}
                      </div>
                    )}
                  </div>
                ) : announcementImages.length > 0 ? (
                  <div className="relative flex-1 overflow-hidden rounded-xl" style={{ background: BRAND.colors.bg, minHeight: "50%" }}>
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-base font-medium text-white/40">
                      Görsel yüklenemedi
                    </div>
                  </div>
                ) : null}
              </>
            ) : card.kind === "event" ? (
              <div className="flex h-full flex-col justify-between">
                <div className="whitespace-pre-line text-2xl leading-relaxed text-white">{card.data.description ?? ""}</div>
                <div className="results mt-4 rounded-xl p-4" style={{ background: BRAND.colors.bg }}>
                  <div className="text-xl font-bold text-white">{formatEventDate(card.data.starts_at)}</div>
                  <div className="mt-1 text-lg" style={{ color: BRAND.colors.brand }}>
                    📍 {card.data.location ?? ""}
                  </div>
                </div>
              </div>
            ) : card.kind === "info" ? (
              <div className="flex h-full items-center">
                <div className="whitespace-pre-line text-2xl leading-relaxed text-white">{card.data.body}</div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
