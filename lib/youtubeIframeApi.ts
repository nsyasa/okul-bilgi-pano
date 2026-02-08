/**
 * YouTube IFrame API Loader
 * Dinamik olarak YouTube IFrame API script'ini yükler ve hazır olana kadar bekler.
 */

// YouTube IFrame API tipleri
interface YTPlayer {
    destroy: () => void;
    playVideo: () => void;
    pauseVideo: () => void;
    mute: () => void;
    unMute: () => void;
    getPlayerState: () => number;
}

interface YTPlayerOptions {
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
    };
}

interface YTNamespace {
    Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
    PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
    };
}

declare global {
    interface Window {
        YT: YTNamespace;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}

export type { YTPlayer, YTPlayerOptions, YTNamespace };

let apiLoadPromise: Promise<void> | null = null;
let isApiReady = false;

/**
 * YouTube IFrame API'yi yükler.
 * @param timeoutMs - API yüklenemezse timeout süresi (default: 10000ms)
 * @returns API hazır olduğunda resolve eden Promise
 */
export function loadYouTubeIframeApi(timeoutMs = 10000): Promise<void> {
    // Zaten yüklenmişse hemen resolve
    if (isApiReady && window.YT?.Player) {
        return Promise.resolve();
    }

    // Yükleme devam ediyorsa aynı promise'i döndür
    if (apiLoadPromise) {
        return apiLoadPromise;
    }

    apiLoadPromise = new Promise<void>((resolve, reject) => {
        // Timeout timer
        const timeoutId = setTimeout(() => {
            reject(new Error('YouTube IFrame API yüklenemedi (timeout)'));
        }, timeoutMs);

        // API zaten yüklüyse
        if (window.YT?.Player) {
            clearTimeout(timeoutId);
            isApiReady = true;
            resolve();
            return;
        }

        // Callback'i ayarla
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            clearTimeout(timeoutId);
            isApiReady = true;
            if (previousCallback) previousCallback();
            resolve();
        };

        // Script zaten ekli mi kontrol et
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            // Script ekli ama henüz hazır değil, callback'i bekle
            return;
        }

        // Script'i ekle
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('YouTube IFrame API script yüklenemedi'));
        };
        document.head.appendChild(script);
    });

    return apiLoadPromise;
}

/**
 * API'nin yüklenip yüklenmediğini kontrol eder.
 */
export function isYouTubeApiReady(): boolean {
    return isApiReady && !!window.YT?.Player;
}
