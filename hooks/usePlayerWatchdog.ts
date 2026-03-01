import { useState, useEffect, useCallback, useRef } from "react";

export function usePlayerWatchdog(
    lastSuccessfulFetchAt: number,
    consecutiveFetchFailures: number
) {
    const [showConnectionOverlay, setShowConnectionOverlay] = useState(false);

    // Reload loop koruması: sessionStorage (2dk) + localStorage günlük limit (max 5)
    const [dailyLimitReached, setDailyLimitReached] = useState(false);
    const DAILY_RELOAD_LIMIT = 5;

    const safeReload = useCallback(() => {
        try {
            const now = Date.now();

            // --- Günlük Reload Limiti Kontrolü (localStorage) ---
            const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
            const dailyCountKey = `player_reload_count_${todayKey.replace(/-/g, "")}`;

            // Eski günlerin key'lerini temizle (sadece bugünkü kalsın)
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith("player_reload_count_") && key !== dailyCountKey) {
                        localStorage.removeItem(key);
                    }
                }
            } catch { /* localStorage erişim hatası */ }

            const dailyCountStr = localStorage.getItem(dailyCountKey);
            const dailyCount = dailyCountStr ? parseInt(dailyCountStr, 10) : 0;

            if (dailyCount >= DAILY_RELOAD_LIMIT) {
                setDailyLimitReached(true);
                setShowConnectionOverlay(true);
                return false;
            }

            // --- 2 Dakika Loop Koruması (sessionStorage) ---
            const lastReloadStr = sessionStorage.getItem("player_last_reload_at");
            const lastReloadAt = lastReloadStr ? parseInt(lastReloadStr, 10) : 0;

            if (now - lastReloadAt < 2 * 60 * 1000) {
                setShowConnectionOverlay(true);
                return false;
            }

            // Sayaçları güncelle ve reload yap
            localStorage.setItem(dailyCountKey, String(dailyCount + 1));
            sessionStorage.setItem("player_last_reload_at", String(now));
            window.location.reload();
            return true;
        } catch {
            // storage erişim hatası
            return false;
        }
    }, []);

    // JS Error yakalama (unhandledrejection ve error)
    const jsErrorCountRef = useRef(0);
    const jsErrorTimestampsRef = useRef<number[]>([]);

    useEffect(() => {
        const handleError = () => {
            const now = Date.now();
            const tenMinutesAgo = now - 10 * 60 * 1000;

            // Son 10 dakikadaki hataları filtrele
            jsErrorTimestampsRef.current = jsErrorTimestampsRef.current.filter(t => t > tenMinutesAgo);
            jsErrorTimestampsRef.current.push(now);
            jsErrorCountRef.current = jsErrorTimestampsRef.current.length;
        };

        const onError = () => handleError();
        const onUnhandledRejection = () => handleError();

        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onUnhandledRejection);

        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onUnhandledRejection);
        };
    }, []);

    // Watchdog timer (30 saniyede bir kontrol)
    useEffect(() => {
        const WATCHDOG_INTERVAL = 30 * 1000; // 30 saniye
        const STALE_THRESHOLD = 5 * 60 * 1000; // 5 dakika
        const MAX_FAILURES = 5;
        const MAX_JS_ERRORS = 3;

        const watchdog = setInterval(() => {
            try {
                const now = Date.now();
                const timeSinceLastFetch = now - lastSuccessfulFetchAt;

                // 1. Veri 5 dakikadan eski mi?
                if (timeSinceLastFetch > STALE_THRESHOLD) {
                    setShowConnectionOverlay(true);
                    safeReload();
                    return;
                }

                // 2. Ardışık fetch hatası >= 5 mi?
                if (consecutiveFetchFailures >= MAX_FAILURES) {
                    setShowConnectionOverlay(true);
                    safeReload();
                    return;
                }

                // 3. Son 10 dk'da >= 3 JS hatası mı?
                if (jsErrorCountRef.current >= MAX_JS_ERRORS) {
                    safeReload();
                    return;
                }

                // Sağlıklı: overlay'i kapat (bu logic page.tsx'ten taşındı, ama interval içinde kontrol ediliyor)
                // Ancak hook'un dönüş değeri olarak da kontrol edilebilir.
                // Burada state update yaparsak dependency loop riski var mı? lastSuccessfulFetchAt ve consecutiveFetchFailures değişince effect yeniden çalışır.
                // showConnectionOverlay state'i dependency'de olmalı.

            } catch {
                // Watchdog çalışırken oluşabilecek hataları yut
            }
        }, WATCHDOG_INTERVAL);

        return () => clearInterval(watchdog);
    }, [lastSuccessfulFetchAt, consecutiveFetchFailures, safeReload]);

    // Auto-hide overlay when connection recovers
    useEffect(() => {
        if (consecutiveFetchFailures === 0 && showConnectionOverlay) {
            setShowConnectionOverlay(false);
        }
    }, [consecutiveFetchFailures, showConnectionOverlay]);

    return { showConnectionOverlay, dailyLimitReached };
}
