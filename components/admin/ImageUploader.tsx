"use client";

import { useRef, useState, useCallback } from "react";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { SecondaryButton } from "./FormBits";
import { ImageCropperModal, type CropResult } from "./ImageCropperModal";

export function ImageUploader(props: { value: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Seçilen dosya bir resim değil.");
      return;
    }
    setErr(null);
    setCropFile(file);
  };

  const handleCropConfirm = useCallback(async (result: CropResult) => {
    setBusy(true);
    setErr(null);
    try {
      const sb = supabaseBrowser();
      const path = `announcements/${result.suggestedName}`;
      const { data, error } = await sb.storage.from("pano-media").upload(path, result.blob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (error) throw error;
      if (!data) throw new Error("Upload failed");
      const { data: pub } = sb.storage.from("pano-media").getPublicUrl(data.path);
      props.onChange(pub.publicUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Yükleme hatası");
    } finally {
      setBusy(false);
      setCropFile(null);
    }
  }, [props]);

  const handleCropCancel = useCallback(() => {
    setCropFile(null);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={handleFileSelect}
        />
        {props.value ? (
          <SecondaryButton type="button" onClick={() => props.onChange(null)}>Görseli Kaldır</SecondaryButton>
        ) : null}
      </div>

      {busy && (
        <div className="text-sm animate-pulse" style={{ color: BRAND.colors.info }}>Yükleniyor…</div>
      )}

      {props.value ? (
        <div className="p-3 rounded-xl" style={{ background: BRAND.colors.panel }}>
          <div className="text-xs break-all" style={{ color: BRAND.colors.muted }}>{props.value}</div>
        </div>
      ) : null}

      {err ? <div className="text-sm" style={{ color: BRAND.colors.warn }}>⚠ {err}</div> : null}

      {/* Crop Modal */}
      <ImageCropperModal
        open={!!cropFile}
        file={cropFile}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
