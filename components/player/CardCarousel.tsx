"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { BRAND } from "@/lib/branding";
import type { Announcement, EventItem, SchoolInfo, YouTubeVideo } from "@/types/player";

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

export function CardCarousel(props: { cards: ReturnType<typeof buildCards>; index: number; onVideoEnded?: () => void }) {
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

  // YouTube IFrame API ile video bitişi tespiti
  useEffect(() => {
    if (!videoKey || !props.onVideoEnded) return;

    console.log(`🎥 Video started: ${videoId} (key: ${videoKey})`);
    
    // Test için 15 saniye (production'da daha uzun olmalı)
    const timer = setTimeout(() => {
      console.log("⏱️ Video duration timeout, calling onVideoEnded");
      props.onVideoEnded?.();
    }, 15 * 1000); // 15 saniye

    return () => {
      console.log(`🎥 Video cleanup: ${videoId}`);
      clearTimeout(timer);
    };
  }, [videoKey, props.onVideoEnded]);

  if (!card) {
    return null;
  }

  return (
    <div className="h-full rounded-2xl overflow-hidden relative flex flex-col" style={{ background: BRAND.colors.panel }}>
      {card.kind !== "video" ? (
        <>
          {/* Başlık */}
          <div className="px-10 py-8" style={{ borderBottom: `3px solid ${BRAND.colors.brand}` }}>
            <div className="text-2xl tracking-widest font-bold" style={{ color: BRAND.colors.brand }}>
              {card.kind === "announcement" ? "DUYURU" : card.kind === "event" ? "ETKİNLİK" : "OKUL"}
            </div>
            <div className="text-5xl font-black mt-3 text-white leading-tight">
              {card.kind === "announcement" ? card.data.title : card.kind === "event" ? card.data.title : card.data.title}
            </div>
            {card.kind === "announcement" && card.data.approved_label ? (
              <div
                className="mt-3 text-lg inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold"
                style={{ background: BRAND.colors.bg, color: BRAND.colors.brand }}
              >
                ✓ Editör Onaylı
              </div>
            ) : null}
          </div>

          {/* İçerik */}
          <div className="flex-1 flex flex-col p-8 gap-4">
            {card.kind === "announcement" ? (
              <>
                {/* Metin Kutusu - Üstte Küçük */}
                {card.data.body && (
                  <div className="p-6 rounded-xl" style={{ background: BRAND.colors.bg }}>
                    <div className="text-2xl leading-relaxed text-white whitespace-pre-line line-clamp-4">{card.data.body}</div>
                  </div>
                )}

                {/* Resim Galerisi - Büyük */}
                {card.data.image_urls && card.data.image_urls.length > 0 ? (
                  <div className="flex-1">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                      <Image src={card.data.image_urls[imageIndex]} alt="Duyuru görseli" fill className="object-cover" />
                      {card.data.image_urls.length > 1 && (
                        <div className="absolute bottom-6 right-6 px-6 py-3 rounded-full text-2xl font-bold" style={{ background: "rgba(0,0,0,0.8)", color: "white" }}>
                          {imageIndex + 1} / {card.data.image_urls.length}
                        </div>
                      )}
                    </div>
                  </div>
                ) : card.data.image_url ? (
                  <div className="flex-1">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
                      <Image src={card.data.image_url} alt="Duyuru görseli" fill className="object-cover" />
                    </div>
                  </div>
                ) : null}
              </>
            ) : card.kind === "event" ? (
              <div className="h-full flex flex-col justify-between">
                <div className="text-3xl text-white leading-relaxed whitespace-pre-line">{card.data.description ?? ""}</div>
                <div className="mt-8 p-6 rounded-2xl" style={{ background: BRAND.colors.bg }}>
                  <div className="text-2xl font-bold text-white">{formatEventDate(card.data.starts_at)}</div>
                  <div className="text-xl mt-2" style={{ color: BRAND.colors.brand }}>
                    📍 {card.data.location ?? ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center">
                <div className="text-3xl text-white leading-relaxed whitespace-pre-line">{card.data.body}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1">
          <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
            <iframe
              key={videoId}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}