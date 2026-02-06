"use client";

import { useState } from "react";
import { uploadAnnouncementImage } from "@/lib/adminStorage";
import { BRAND } from "@/lib/branding";
import { SecondaryButton } from "./FormBits";

export function ImageUploader(props: { value: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setErr(null);
            try {
              const url = await uploadAnnouncementImage(file);
              props.onChange(url);
            } catch (e: any) {
              setErr(e?.message ?? "Yükleme hatası");
            } finally {
              setBusy(false);
            }
          }}
        />
        {props.value ? (
          <SecondaryButton type="button" onClick={() => props.onChange(null)}>Görseli Kaldır</SecondaryButton>
        ) : null}
      </div>

      {props.value ? (
        <div className="p-3 rounded-xl" style={{ background: BRAND.colors.panel }}>
          <div className="text-xs break-all" style={{ color: BRAND.colors.muted }}>{props.value}</div>
        </div>
      ) : null}

      {err ? <div className="text-sm" style={{ color: BRAND.colors.warn }}>⚠ {err}</div> : null}
    </div>
  );
}
