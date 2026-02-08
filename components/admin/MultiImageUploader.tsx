"use client";

import { useRef, useState } from "react";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { PrimaryButton, SecondaryButton } from "./FormBits";

type ImageInfo = {
  file: File;
  preview: string;
  width: number;
  height: number;
  ratio: number;
  sizeKB: number;
  warnings: string[];
};

export function MultiImageUploader({ value, onChange }: { value: string[] | null; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [pendingImages, setPendingImages] = useState<ImageInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const urls = value ?? [];

  const validateImage = (file: File): Promise<ImageInfo> => {
    return new Promise((resolve, reject) => {
      // Basic type check
      if (!file.type.startsWith("image/")) {
        reject(new Error(`"${file.name}" bir resim dosyası değil.`));
        return;
      }

      const img = new Image();
      const preview = URL.createObjectURL(file);

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const ratio = width / height;
        const sizeKB = Math.round(file.size / 1024);
        const warnings: string[] = [];

        // Boyut kontrolü
        if (width < 1280 || height < 720) {
          warnings.push(`⚠️ Düşük çözünürlük: ${width}x${height} (Min: 1280x720)`);
        }

        // En-boy oranı kontrolü (16:9 = 1.77)
        if (ratio < 1.3 || ratio > 2.0) {
          warnings.push(`⚠️ En-boy oranı TV için uygun değil (${ratio.toFixed(2)}:1)`);
        }

        // Dosya boyutu kontrolü
        if (sizeKB > 5000) {
          warnings.push(`⚠️ Büyük dosya: ${sizeKB}KB (Tavsiye: <5MB)`);
        }

        resolve({ file, preview, width, height, ratio, sizeKB, warnings });
      };

      img.onerror = () => {
        reject(new Error("Resim yüklenemedi"));
      };

      img.src = preview;
    });
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) return;

    if (uploading || pendingImages.length > 0) {
      setMsg("⚠️ Önce mevcut işlemi tamamlayın.");
      return;
    }

    const remainingSlots = 10 - urls.length;
    if (remainingSlots <= 0) {
      setMsg("⚠️ Maksimum 10 resim limitine ulaştınız.");
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setMsg("Resimler kontrol ediliyor...");

    try {
      const validatedImages = await Promise.all(filesToProcess.map(validateImage));
      setPendingImages(validatedImages);
      setMsg(validatedImages.some(img => img.warnings.length > 0)
        ? "⚠️ Bazı resimlerde uyarılar var. Yine de yükleyebilirsiniz."
        : "✅ Resimler hazır. Yükle butonuna basın.");
    } catch (err: any) {
      setMsg(`Hata: ${err.message}`);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const selectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const uploadPending = async () => {
    if (!pendingImages.length) return;

    setUploading(true);
    setMsg("Yükleniyor...");

    try {
      const sb = supabaseBrowser();
      const newUrls: string[] = [];

      for (const imgInfo of pendingImages) {
        const ext = imgInfo.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { data, error } = await sb.storage.from("pano-media").upload(fileName, imgInfo.file, { upsert: false });

        if (error) throw error;
        if (!data) throw new Error("Upload failed, no data returned");

        const { data: publicData } = sb.storage.from("pano-media").getPublicUrl(data.path);
        newUrls.push(publicData.publicUrl);

        // Preview URL'lerini temizle
        URL.revokeObjectURL(imgInfo.preview);
      }

      onChange([...urls, ...newUrls]);
      setPendingImages([]);
      setMsg(`✅ ${newUrls.length} resim yüklendi!`);
    } catch (err: any) {
      setMsg(`Hata: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const cancelPending = () => {
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
    setPendingImages([]);
    setMsg("");
  };

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  // Drag Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading || pendingImages.length > 0 || urls.length >= 10) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (uploading || pendingImages.length > 0 || urls.length >= 10) return;

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  return (
    <div>
      {/* Yüklenmiş Resimler */}
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
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bekleyen Resimler (Önizleme) */}
      {pendingImages.length > 0 && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: BRAND.colors.panel }}>
          <div className="text-xs font-semibold mb-3" style={{ color: BRAND.colors.muted }}>
            Yüklenecek Resimler ({pendingImages.length})
          </div>
          <div className="space-y-3">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <img src={img.preview} alt="Önizleme" className="w-20 h-20 rounded-lg object-cover" style={{ background: BRAND.colors.bg }} />
                <div className="flex-1 text-xs">
                  <div className="text-white font-semibold">{img.file.name}</div>
                  <div style={{ color: BRAND.colors.muted }}>
                    {img.width}x{img.height} • {img.ratio.toFixed(2)}:1 • {img.sizeKB}KB
                  </div>
                  {img.warnings.map((w, i) => (
                    <div key={i} className="text-xs mt-1" style={{ color: BRAND.colors.warn }}>
                      {w}
                    </div>
                  ))}
                  {img.warnings.length === 0 && (
                    <div className="text-xs mt-1" style={{ color: BRAND.colors.ok }}>
                      ✅ Uygun resim
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <PrimaryButton type="button" onClick={uploadPending} disabled={uploading}>
              {uploading ? "Yükleniyor..." : `${pendingImages.length} Resmi Yükle`}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={cancelPending} disabled={uploading}>
              İptal
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* Resim Seçme Butonu ve DragDrop Alanı */}
      {urls.length + pendingImages.length < 10 && (
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
            disabled={uploading || pendingImages.length > 0}
          />

          <div className="mb-3 text-4xl">📸</div>
          <div className="text-center">
            <PrimaryButton
              type="button"
              disabled={uploading || pendingImages.length > 0}
              onClick={() => inputRef.current?.click()}
            >
              + Resim Seç
            </PrimaryButton>
          </div>
          <div className="mt-2 text-xs text-center" style={{ color: BRAND.colors.muted }}>
            veya resimleri buraya sürükleyip bırakın
          </div>
          <div className="text-xs mt-4 text-center" style={{ color: BRAND.colors.muted }}>
            Max 10 resim • Önerilen: 1920x1080 (16:9) • Max 5MB
          </div>
        </div>
      )}

      {msg && (
        <div className="text-sm mt-3 p-2 rounded" style={{ background: BRAND.colors.bg, color: msg.includes("✅") ? BRAND.colors.ok : BRAND.colors.warn }}>
          {msg}
        </div>
      )}
    </div>
  );
}
