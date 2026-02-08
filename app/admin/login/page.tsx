"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword } from "@/lib/adminAuth";
import { FieldLabel, PrimaryButton, TextInput } from "@/components/admin/FormBits";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#0a0a0f]">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-white text-xl font-bold tracking-tight">Okul Pano</div>
          <div className="text-white/40 text-sm mt-1">Admin Paneli</div>
        </div>

        {/* Card */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
          <div className="space-y-5">
            <div>
              <FieldLabel>E-posta</FieldLabel>
              <TextInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@okul.k12.tr"
                type="email"
                autoComplete="email"
              />
            </div>

            <div>
              <FieldLabel>Şifre</FieldLabel>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) {
                    e.preventDefault();
                    document.getElementById("login-btn")?.click();
                  }
                }}
              />
            </div>

            {err && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {err}
              </div>
            )}

            <PrimaryButton
              id="login-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                const { error } = await signInWithPassword(email.trim(), password);
                setBusy(false);
                if (error) {
                  setErr(error.message);
                  return;
                }
                router.replace("/admin");
              }}
              style={{ width: "100%" }}
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş yapılıyor…
                </span>
              ) : "Giriş Yap"}
            </PrimaryButton>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <div className="text-[11px] text-white/20 leading-relaxed">
            Kullanıcı hesaplarını Supabase Dashboard → Authentication → Users bölümünden yönetebilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
}
