const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 saat

export function saveCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    // localStorage dolu veya erişim yok
  }
}

export function loadCache<T>(key: string): { value: T; ts: number; isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number" || !parsed.value) {
      // Geçersiz format, cache'i sil
      localStorage.removeItem(key);
      return null;
    }

    const isStale = Date.now() - parsed.ts > MAX_CACHE_AGE_MS;
    return { value: parsed.value, ts: parsed.ts, isStale };
  } catch {
    // JSON parse hatası, cache'i sil
    try {
      localStorage.removeItem(key);
    } catch { }
    return null;
  }
}

export function clearCache(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { }
}
