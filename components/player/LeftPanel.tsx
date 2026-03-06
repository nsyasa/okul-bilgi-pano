"use client";

import { BRAND } from "@/lib/branding";
import { formatCountdown } from "@/lib/schedule";
import type { DutyTeacher, WeatherNow, SpecialDate } from "@/types/player";
import { memo } from "react";

// ⚡ Bolt: Wrap with React.memo to prevent unnecessary re-renders when parent ticks
export const LeftPanel = memo(function LeftPanel(props: {
  state: "closed" | "lesson" | "break" | "lunch";
  nextInSec: number | null;
  nextLabel: string | null;
  duties: DutyTeacher[];
  weather: WeatherNow | null;
  now: Date;
  specialDates?: SpecialDate[];
  hideStatus?: boolean; /* New prop */
}) {
  const stateLabel =
    props.state === "lesson" ? "DERS" : props.state === "break" ? "TENEFÜS" : props.state === "lunch" ? "ÖĞLE ARASI" : "OKUL DIŞI";

  const stateColor =
    props.state === "lesson" ? "#ef4444" : props.state === "break" ? "#22c55e" : props.state === "lunch" ? BRAND.colors.info : BRAND.colors.muted;

  return (
    <div className="h-full p-2 rounded-2xl" style={{ background: BRAND.colors.panel }}>
      <div className="p-2 rounded-xl" style={{ background: BRAND.colors.bg }}>
        <div className="mt-1 p-2 rounded-xl flex items-center gap-3" style={{ background: BRAND.colors.panel }}>
          <div>
            <div className="text-4xl">
              {!props.weather?.code
                ? "❓"
                : props.weather.code === 0 || props.weather.code === 1
                  ? "☀️"
                  : props.weather.code === 2 || props.weather.code === 3
                    ? "⛅"
                    : props.weather.code >= 45 && props.weather.code <= 48
                      ? "🌫️"
                      : props.weather.code >= 51 && props.weather.code <= 67
                        ? "🌧️"
                        : props.weather.code >= 71 && props.weather.code <= 87
                          ? "❄️"
                          : props.weather.code >= 80 && props.weather.code <= 82
                            ? "🌧️"
                            : props.weather.code >= 85 && props.weather.code <= 86
                              ? "❄️"
                              : props.weather.code >= 80 && props.weather.code <= 82
                                ? "⛈️"
                                : "🌡️"}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-semibold">Yalova Çiftlikköy</div>
            <div className="text-white text-2xl font-bold tabular-nums">
              {props.weather?.tempC == null ? "--" : Math.round(props.weather.tempC)}°C
            </div>
            <div className="text-sm" style={{ color: BRAND.colors.muted }}>
              {!props.weather?.code
                ? ""
                : props.weather.code === 0
                  ? "Açık"
                  : props.weather.code === 1 || props.weather.code === 2
                    ? "Bulutlu"
                    : props.weather.code === 3
                      ? "Çok Bulutlu"
                      : props.weather.code >= 45 && props.weather.code <= 48
                        ? "Sisli"
                        : props.weather.code >= 51 && props.weather.code <= 67
                          ? "Yağmurlu"
                          : props.weather.code >= 71 && props.weather.code <= 87
                            ? "Karlı"
                            : props.weather.code >= 80 && props.weather.code <= 82
                              ? "Sağanak Yağmur"
                              : props.weather.code >= 85 && props.weather.code <= 86
                                ? "Kar Sağanağı"
                                : props.weather.code >= 95 && props.weather.code <= 99
                                  ? "Fırtına"
                                  : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-2">
        {!props.hideStatus && (
          <>
            <div className="p-2 rounded-xl" style={{ background: BRAND.colors.bg }}>
              <div className="text-3xl font-extrabold" style={{ color: stateColor }}>
                {stateLabel}
              </div>
            </div>

            <div className="p-2 rounded-xl" style={{ background: BRAND.colors.bg }}>
              <div className="text-2xl font-bold text-white tabular-nums">
                {props.nextInSec == null ? "--:--" : formatCountdown(props.nextInSec)}
              </div>
              <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                {props.nextInSec ? `${Math.ceil(props.nextInSec / 60)} dakika sonra` : ""}
                {props.nextLabel ? ` • ${props.nextLabel}` : ""}
              </div>
            </div>
          </>
        )}

        <div className="p-2 rounded-xl" style={{ background: BRAND.colors.bg }}>
          <div className="mt-1 space-y-1">
            {props.duties?.length ? (
              (() => {
                // Emoji mapping
                const getEmoji = (area: string | null) => {
                  if (!area) return "👤";
                  const areaUpper = area.toUpperCase();
                  if (areaUpper.includes("BAHÇE")) return "🌳";
                  if (areaUpper.includes("GİRİŞ")) return "🚪";
                  if (areaUpper.includes("1.KAT") || areaUpper.includes("1. KAT")) return "1️⃣";
                  if (areaUpper.includes("2.KAT") || areaUpper.includes("2. KAT")) return "2️⃣";
                  if (areaUpper.includes("3.KAT") || areaUpper.includes("3. KAT")) return "3️⃣";
                  if (areaUpper.includes("İDARE") || areaUpper.includes("NÖBETÇİ İDARECİ")) return "👔";
                  return "👤";
                };

                // İdareciyi en üste, bahçeyi en alta taşı
                const sorted = [...props.duties].sort((a, b) => {
                  const getPriority = (area: string | null): number => {
                    if (!area) return 5;
                    const upper = area.toUpperCase();
                    if (upper.includes("İDARE") || upper.includes("NÖBETÇİ İDARECİ")) return 0;
                    if (upper.includes("3.KAT") || upper.includes("3. KAT")) return 1;
                    if (upper.includes("2.KAT") || upper.includes("2. KAT")) return 2;
                    if (upper.includes("1.KAT") || upper.includes("1. KAT")) return 3;
                    if (upper.includes("GİRİŞ")) return 4;
                    if (upper.includes("BAHÇE")) return 5;
                    return 5;
                  };
                  return getPriority(a.area) - getPriority(b.area);
                });

                return sorted.slice(0, 6).map((d) => (
                  <div key={d.id} className="p-2 rounded-lg flex items-center gap-2" style={{ background: BRAND.colors.bg }}>
                    <div className="text-3xl">{getEmoji(d.area)}</div>
                    <div className="flex flex-col">
                      <div className="text-xs font-semibold" style={{ color: BRAND.colors.muted }}>
                        {d.area ?? ""}
                      </div>
                      <div className="text-xl font-black text-white">{d.name}</div>
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="text-base" style={{ color: BRAND.colors.muted }}>
                Bugün için kayıt yok.
              </div>
            )}
          </div>
        </div>

        {props.specialDates && props.specialDates.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: BRAND.colors.bg }}>
            {props.specialDates.map((sd) => (
              <div key={sd.id} className="mb-2 last:mb-0">
                <div className="text-2xl">{sd.icon}</div>
                <div className="text-sm font-bold text-white mt-1">{sd.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
