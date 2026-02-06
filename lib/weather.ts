import type { WeatherNow } from "@/types/player";
import { loadCache, saveCache } from "./storage";

const CACHE_KEY = "pano_weather_now_v1";

// Yalova Çiftlikköy
const LAT = 40.6558;
const LON = 29.3116;

export async function fetchWeatherNow(): Promise<WeatherNow> {
  const cached = loadCache<WeatherNow>(CACHE_KEY);
  // 20 dk cache
  if (cached && Date.now() - cached.ts < 20 * 60 * 1000) return cached.value;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FIstanbul`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("weather_fetch_failed");
  const json = await res.json();

  const w: WeatherNow = {
    tempC: json?.current?.temperature_2m ?? null,
    windKmh: json?.current?.wind_speed_10m ?? null,
    code: json?.current?.weather_code ?? null,
    updatedAt: Date.now(),
  };

  saveCache(CACHE_KEY, w);
  return w;
}
