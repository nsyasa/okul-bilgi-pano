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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const urls = value ?? [];

  const validateImage = (file: File): Promise<ImageInfo> => {
    return new Promise((resolve, reject) => {
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

  const selectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setMsg("Resimler kontrol ediliyor...");

    try {
      const validatedImages = await Promise.all(files.slice(0, 10 - urls.length).map(validateImage));
      setPendingImages(validatedImages);
      setMsg(validatedImages.some(img => img.warnings.length > 0) 
        ? "⚠️ Bazı resimlerde uyarılar var. Yine de yükleyebilirsiniz."
        : "✅ Resimler hazır. Yükle butonuna basın.");
    } catch (err: any) {
      setMsg(`Hata: ${err.message}`);
    } finally {
      e.target.value = "";
    }
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

      {/* Resim Seçme Butonu */}
      {urls.length + pendingImages.length < 10 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={selectFiles}
            disabled={uploading || pendingImages.length > 0}
          />
          <PrimaryButton
            type="button"
            disabled={uploading || pendingImages.length > 0}
            onClick={() => inputRef.current?.click()}
          >
            + Resim Seç ({urls.length + pendingImages.length}/10)
          </PrimaryButton>
          
          <div className="text-xs mt-3 p-3 rounded-lg" style={{ background: BRAND.colors.bg, color: BRAND.colors.muted }}>
            <div className="font-semibold mb-1">📸 Resim Önerileri:</div>
            <div>• <b>Minimum:</b> 1280x720 piksel (HD Ready)</div>
            <div>• <b>Önerilen:</b> 1920x1080 piksel (Full HD)</div>
            <div>• <b>En-Boy Oranı:</b> 16:9 (yatay resimler)</div>
            <div>• <b>Dosya Boyutu:</b> Max 5MB</div>
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
