"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/branding";
import { signInWithPassword } from "@/lib/adminAuth";
import { FieldLabel, PrimaryButton, TextInput } from "@/components/admin/FormBits";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BRAND.colors.bg }}>
      <div className="w-full max-w-md p-7 rounded-2xl" style={{ background: BRAND.colors.panel }}>
        <div className="text-white text-2xl font-extrabold mb-2">Admin Girişi</div>
        <div className="text-sm mb-6" style={{ color: BRAND.colors.muted }}>
          Supabase Auth hesabınızla giriş yapın.
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel>E-posta</FieldLabel>
            <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@okul.k12.tr" />
          </div>

          <div>
            <FieldLabel>Şifre</FieldLabel>
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {err ? <div className="text-sm" style={{ color: BRAND.colors.warn }}>⚠ {err}</div> : null}

          <PrimaryButton
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
          >
            {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
          </PrimaryButton>

          <div className="text-xs mt-4" style={{ color: BRAND.colors.muted }}>
            Not: Kullanıcıları Supabase Dashboard → Authentication → Users bölümünden oluşturabilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
}
