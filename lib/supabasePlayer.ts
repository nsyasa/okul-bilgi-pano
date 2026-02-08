import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Player-only Supabase client - Admin session'dan tamamen izole
 * 
 * Bu client:
 * - Session persist etmez (localStorage'a yazmaz)
 * - Admin session'ı okumaz (custom empty storage)
 * - Token yenilemez (autoRefreshToken: false)
 * - URL'den session almaz (detectSessionInUrl: false)
 * 
 * Sonuç: Her zaman anon key ile istek yapar, admin yetkisi sızmaz.
 */
let playerClient: SupabaseClient | null = null;

// Empty storage: Admin localStorage'ını asla okumaz/yazmaz
const emptyStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
};

export function supabasePlayer(): SupabaseClient {
    if (playerClient) return playerClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        throw new Error(
            "Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local içinde olmalı."
        );
    }

    playerClient = createClient(url, anon, {
        auth: {
            persistSession: false,       // Session kaydetme
            autoRefreshToken: false,     // Token yenileme
            detectSessionInUrl: false,   // URL'den session alma
            storage: emptyStorage,       // Admin localStorage'ını okuma
            storageKey: "sb-player-isolated", // Farklı key (ekstra izolasyon)
        },
    });

    return playerClient;
}
