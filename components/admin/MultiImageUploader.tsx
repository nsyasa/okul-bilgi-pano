"use client";

import { useRef, useState, useCallback } from "react";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { PrimaryButton, SecondaryButton } from "./FormBits";
import { ImageCropperModal, type CropResult } from "./ImageCropperModal";

export function MultiImageUploader({ value, onChange }: { value: string[] | null; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Crop modal state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]); // remaining files to crop

  const urls = value ?? [];

  /* ── File selection → open crop modal (queue if multiple) ── */
  const startCropFlow = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) {
      setMsg("⚠️ Geçerli bir resim dosyası seçilmedi.");
      return;
    }

    const remainingSlots = 10 - urls.length;
    if (remainingSlots <= 0) {
      setMsg("⚠️ Maksimum 10 resim limitine ulaştınız.");
      return;
    }

    const toProcess = imageFiles.slice(0, remainingSlots);
    // Open first in modal, queue the rest
    setCropFile(toProcess[0]);
    setCropQueue(toProcess.slice(1));
    setMsg("");
  }, [urls.length]);

  const selectFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = "";
    startCropFlow(files);
  }, [startCropFlow]);

  /* ── Upload processed blob ── */
  const uploadBlob = useCallback(async (blob: Blob, suggestedName: string): Promise<string> => {
    const sb = supabaseBrowser();
    const path = `announcements/${suggestedName}`;
    const { data, error } = await sb.storage.from("pano-media").upload(path, blob, {
      contentType: "image/webp",
      upsert: true,
    });
    if (error) throw error;
    if (!data) throw new Error("Upload failed – no data");
    const { data: pub } = sb.storage.from("pano-media").getPublicUrl(data.path);
    return pub.publicUrl;
  }, []);

  /* ── Crop confirmed ── */
  const handleCropConfirm = useCallback(async (result: CropResult) => {
    setUploading(true);
    setMsg("Yükleniyor…");
    try {
      const publicUrl = await uploadBlob(result.blob, result.suggestedName);

      // Dedupe
      const newUrls = urls.includes(publicUrl) ? urls : [...urls, publicUrl];
      onChange(newUrls);
      setMsg("✅ Görsel yüklendi!");
    } catch (err: unknown) {
      setMsg(`Hata: ${err instanceof Error ? err.message : "Yükleme başarısız"}`);
    } finally {
      setUploading(false);
    }

    // Close current and advance queue
    setCropFile(null);
    if (cropQueue.length > 0) {
      // Small delay to let React settle
      setTimeout(() => {
        setCropFile(cropQueue[0]);
        setCropQueue((prev) => prev.slice(1));
      }, 100);
    }
  }, [urls, onChange, uploadBlob, cropQueue]);

  /* ── Crop cancelled ── */
  const handleCropCancel = useCallback(() => {
    setCropFile(null);
    // If there are more files in the queue, skip this one
    if (cropQueue.length > 0) {
      setTimeout(() => {
        setCropFile(cropQueue[0]);
        setCropQueue((prev) => prev.slice(1));
      }, 100);
    }
  }, [cropQueue]);

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  /* ── Drag handlers ── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading || urls.length >= 10) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading || urls.length >= 10) return;
    const files = Array.from(e.dataTransfer.files);
    startCropFlow(files);
  };

  return (
    <div>
      {/* ── Uploaded images ── */}
      {urls.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: BRAND.colors.muted }}>
            Yüklenmiş Resimler ({urls.length}/10)
          </div>
          <div className="grid grid-cols-5 gap-3">
            {urls.map((url, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden" style={{ background: BRAND.colors.panel }}>
                <img src={url} alt={`Resim ${idx + 1}`} className="w-full h-24 object-cover" />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="Resmi Kaldır"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── File select / drop zone ── */}
      {urls.length < 10 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${isDragging ? "bg-white/10 border-white" : "border-gray-600 hover:border-gray-500"
            }`}
          style={{ minHeight: "150px" }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={selectFiles}
            disabled={uploading}
          />

          <div className="mb-3 text-4xl">📸</div>
          <div className="text-center">
            <PrimaryButton
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              + Resim Seç
            </PrimaryButton>
          </div>
          <div className="mt-2 text-xs text-center" style={{ color: BRAND.colors.muted }}>
            veya resimleri buraya sürükleyip bırakın
          </div>
          <div className="text-xs mt-4 text-center" style={{ color: BRAND.colors.muted }}>
            Max 10 resim • Otomatik 16:9 + WebP dönüşüm • Kırp veya Sığdır seçeneği
          </div>
        </div>
      )}

      {msg && (
        <div
          className="text-sm mt-3 p-2 rounded"
          style={{
            background: BRAND.colors.bg,
            color: msg.includes("✅") ? BRAND.colors.ok : BRAND.colors.warn,
          }}
        >
          {msg}
        </div>
      )}

      {/* ── Crop Modal ── */}
      <ImageCropperModal
        open={!!cropFile}
        file={cropFile}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
