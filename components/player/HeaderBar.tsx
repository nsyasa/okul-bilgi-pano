"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/branding";

export function HeaderBar(props: { now: Date; isOffline: boolean; lastSyncAt: number | null }) {
  const [mounted, setMounted] = useState(false);
  // ✅ Hydration fix: zamanı sadece client'ta üret (SSR'da null)
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    // İlk client render'da set et
    setNow(new Date());

    // Her saniye güncelle
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = useMemo(() => {
    if (!now) return "—";
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);

  const dateStr = useMemo(() => {
    if (!now) return "—";
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(now);
  }, [now]);

  const syncStr = useMemo(() => {
    if (!props.lastSyncAt) return null;
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(props.lastSyncAt));
  }, [props.lastSyncAt]);

  if (!mounted) return null;

  return (
    <div
      className="w-full flex items-center justify-between px-6 py-3 rounded-2xl"
      style={{ background: BRAND.colors.panel, borderBottom: `3px solid ${BRAND.colors.brand}` }}
    >
      <div className="flex items-center gap-6 min-w-[400px]">
        <div className="relative w-32 h-32">
          <Image
            src={BRAND.logoSrc}
            alt="Okul Logosu"
            fill
            className="object-contain"
            priority
            sizes="144px"
          />
        </div>
        <div className="leading-tight">
          <div className="text-4xl font-black text-white">{BRAND.schoolNameLines[0]}</div>
          <div className="text-3xl font-bold text-white">
            {BRAND.schoolNameLines[1]}
          </div>
        </div>
      </div>

      <div className="text-right">
        {/* suppressHydrationWarning = ekstra emniyet */}
        <div className="text-7xl font-black text-white tabular-nums" suppressHydrationWarning>
          {timeStr}
        </div>
        <div className="text-3xl font-bold text-white mt-1" suppressHydrationWarning>
          {dateStr}
        </div>

        {/* Teşhis Bilgisi (Her zaman görünür) */}
        <div className="text-xs mt-2 font-mono text-white/50 tabular-nums">
          Son Güncelleme: {syncStr || "--:--"} • Kaynak: {props.isOffline ? "Cache" : "Canlı"}
        </div>

        {props.isOffline && (
          <div className="text-lg mt-1 font-bold animate-pulse" style={{ color: BRAND.colors.warn }}>
            ⚠ Çevrimdışı Mod
          </div>
        )}
      </div>
    </div>
  );
}
