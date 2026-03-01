import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPlayerBundle } from "@/lib/playerApi";
import type { PlayerBundle } from "@/types/player";

// Helper hook: useInterval (component içinde tekrar tanımlamamak için buraya aldık ancak page.tsx içinde weather için de kullanılıyor.
// Dry prensibi gereği bunu ayrı bir dosyaya almak en doğrusu ama görev kapsamında page.tsx'tekine dokunmadan buraya kopyalıyoruz.)
function useInterval(fn: () => void, ms: number | null) {
    const savedCallback = useRef<(() => void) | null>(null);
    useEffect(() => { savedCallback.current = fn; }, [fn]);
    useEffect(() => {
        if (ms === null) return;
        const tick = () => { if (savedCallback.current) savedCallback.current(); };
        const id = setInterval(tick, ms);
        return () => clearInterval(id);
    }, [ms]);
}

export function usePlayerBundle() {
    const [bundle, setBundle] = useState<PlayerBundle | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

    // Network/Cache durumu
    const [isOffline, setIsOffline] = useState(false);
    const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
    const [isCacheStale, setIsCacheStale] = useState(false);

    // Health / Hata durumu
    const [lastSuccessfulFetchAt, setLastSuccessfulFetchAt] = useState<number>(Date.now());
    const [consecutiveFetchFailures, setConsecutiveFetchFailures] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);

    // Online/Offline listener
    useEffect(() => {
        // Initial check
        if (typeof navigator !== 'undefined') {
            setIsOffline(!navigator.onLine);
        }

        const on = () => setIsOffline(false);
        const off = () => setIsOffline(true);

        window.addEventListener("online", on);
        window.addEventListener("offline", off);

        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    const loadBundle = useCallback(async () => {
        try {
            const r = await fetchPlayerBundle();
            setBundle(r.bundle);
            setFromCache(r.fromCache);
            setLastSyncAt(r.bundle.generatedAt);

            if (!r.fromCache) {
                // Başarılı canlı veri
                setLastSuccessfulFetchAt(Date.now());
                setConsecutiveFetchFailures(0);
                setLastError(null);
                setIsOffline(false);
                setCacheTimestamp(null);
                setIsCacheStale(false);
            } else {
                // Cache'ten geldi
                setIsOffline(true); // Veri canlı değilse offline modu aktif et
                if (r.cacheTimestamp) setCacheTimestamp(r.cacheTimestamp);
                if (r.isStale) setIsCacheStale(true);
            }
        } catch (err: unknown) {
            setConsecutiveFetchFailures((prev) => prev + 1);
            setLastError(err instanceof Error ? err.message : String(err));
        }
    }, []);

    // İlk yükleme
    useEffect(() => {
        loadBundle();
    }, [loadBundle]);

    // Periyodik yenileme (60s)
    useInterval(loadBundle, 60_000);

    return {
        bundle,
        fromCache,
        lastSyncAt,
        isOffline,
        cacheTimestamp,
        isCacheStale,
        lastSuccessfulFetchAt,
        consecutiveFetchFailures,
        lastError,
        refreshBundle: loadBundle
    };
}
