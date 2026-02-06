import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ✅ Browser tarafında tek instance: Multiple GoTrueClient uyarısını bitirir
let browserClient: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Daha anlaşılır hata
    throw new Error(
      "Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local içinde olmalı."
    );
  }

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // OAuth kullanırsan lazım (zararı yok)
    },
  });

  return browserClient;
}
