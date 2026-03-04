"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { BRAND } from "@/lib/branding";
import {
    loadImageFromFile,
    canvasToWebPBlob,
    renderCoverCropToCanvas,
    renderContainBlurToCanvas,
} from "@/lib/imageProcessing";

/* ───────── Types ───────── */

export type CropResult = {
    blob: Blob;
    suggestedName: string;
    mode: "cover" | "contain_blur";
};

export type ImageCropperModalProps = {
    open: boolean;
    file: File | null;
    aspect?: number;       // default 16/9
    outWidth?: number;     // default 1920
    outHeight?: number;    // default 1080
    onCancel: () => void;
    onConfirm: (result: CropResult) => void;
};

/* ───────── Component ───────── */

export function ImageCropperModal({
    open,
    file,
    aspect = 16 / 9,
    outWidth = 1920,
    outHeight = 1080,
    onCancel,
    onConfirm,
}: ImageCropperModalProps) {
    const [mode, setMode] = useState<"cover" | "contain_blur">("contain_blur");
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [processing, setProcessing] = useState(false);
    const [blurPreview, setBlurPreview] = useState<string | null>(null);

    const objectUrlRef = useRef<string | null>(null);
    const blurPreviewUrlRef = useRef<string | null>(null);

    /* ── Load image when file changes ── */
    useEffect(() => {
        // Cleanup previous
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        if (blurPreviewUrlRef.current) {
            URL.revokeObjectURL(blurPreviewUrlRef.current);
            blurPreviewUrlRef.current = null;
        }
        setImgSrc(null);
        setImgEl(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedArea(null);
        setBlurPreview(null);
        setMode("contain_blur");

        if (!file) return;

        let cancelled = false;

        loadImageFromFile(file).then((img) => {
            if (cancelled) return;
            const url = img.src; // objectURL already set by loadImageFromFile
            objectUrlRef.current = url;
            setImgSrc(url);
            setImgEl(img);

            // Generate blur preview
            try {
                const canvas = renderContainBlurToCanvas(img, 480, 270, 12);
                const previewUrl = canvas.toDataURL("image/jpeg", 0.7);
                setBlurPreview(previewUrl);
            } catch { /* non-critical */ }
        }).catch(() => {
            /* toast handled by caller */
        });

        return () => { cancelled = true; };
    }, [file]);

    /* ── Cleanup on unmount or close ── */
    useEffect(() => {
        if (!open) {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            if (blurPreviewUrlRef.current) {
                URL.revokeObjectURL(blurPreviewUrlRef.current);
                blurPreviewUrlRef.current = null;
            }
        }
    }, [open]);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedArea(croppedPixels);
    }, []);

    /* ── Apply ── */
    const handleApply = useCallback(async () => {
        if (!imgEl) return;
        setProcessing(true);

        try {
            let canvas: HTMLCanvasElement;

            if (mode === "cover") {
                if (!croppedArea) return;
                canvas = renderCoverCropToCanvas(imgEl, croppedArea, outWidth, outHeight);
            } else {
                canvas = renderContainBlurToCanvas(imgEl, outWidth, outHeight);
            }

            const blob = await canvasToWebPBlob(canvas, 0.82);
            const suggestedName = `${Date.now()}_${mode}.webp`;

            onConfirm({ blob, suggestedName, mode });
        } catch (err: unknown) {
            console.error("Image processing failed:", err instanceof Error ? err.message : String(err));
            // Let caller handle via toast
        } finally {
            setProcessing(false);
        }
    }, [imgEl, mode, croppedArea, outWidth, outHeight, onConfirm]);

    /* ── Don't render if not open or no file ── */
    if (!open || !file) return null;

    const TAB_BASE = "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all";
    const TAB_ACTIVE = `${TAB_BASE} text-white shadow-lg`;
    const TAB_INACTIVE = `${TAB_BASE} bg-white/5 text-white/60 hover:bg-white/10`;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
        >
            <div
                className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
                style={{ background: BRAND.colors.bg, maxHeight: "92vh" }}
            >
                {/* ── Header ── */}
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BRAND.colors.panel}` }}>
                    <div>
                        <h2 className="text-white text-xl font-extrabold">Görseli Ekrana Uydur</h2>
                        <p className="text-xs mt-0.5" style={{ color: BRAND.colors.muted }}>
                            TV ekranına uygun (16:9) çıktı üretilecek — {outWidth}×{outHeight} WebP
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        aria-label="Kapat"
                        className="text-white/40 hover:text-white text-2xl leading-none px-2"
                        disabled={processing}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                {/* ── Mode Tabs ── */}
                <div className="px-6 py-3 flex gap-2" style={{ borderBottom: `1px solid ${BRAND.colors.panel}` }}>
                    <button
                        onClick={() => setMode("contain_blur")}
                        className={mode === "contain_blur" ? TAB_ACTIVE : TAB_INACTIVE}
                        style={mode === "contain_blur" ? { background: BRAND.colors.brand } : undefined}
                    >
                        🖼️ Sığdır (Blur)
                    </button>
                    <button
                        onClick={() => setMode("cover")}
                        className={mode === "cover" ? TAB_ACTIVE : TAB_INACTIVE}
                        style={mode === "cover" ? { background: BRAND.colors.brand } : undefined}
                    >
                        ✂️ Kırp (Cover)
                    </button>
                    <div className="flex-1" />
                    <span className="text-[10px] self-center" style={{ color: BRAND.colors.muted }}>
                        {mode === "contain_blur"
                            ? "Görsel bozulmadan sığdırılır, arka plan blur olur"
                            : "16:9 alana kırpılır, fazla kısımlar kesilir"}
                    </span>
                </div>

                {/* ── Crop / Preview Area ── */}
                <div className="flex-1 min-h-0 relative" style={{ background: "#111" }}>
                    {!imgSrc ? (
                        <div className="flex items-center justify-center h-full text-white/30">
                            Görsel yükleniyor…
                        </div>
                    ) : mode === "cover" ? (
                        /* react-easy-crop */
                        <div className="relative w-full" style={{ height: "400px" }}>
                            <Cropper
                                image={imgSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                showGrid
                                style={{
                                    containerStyle: { background: "#111" },
                                }}
                            />
                        </div>
                    ) : (
                        /* Blur preview */
                        <div className="flex items-center justify-center p-4" style={{ height: "400px" }}>
                            {blurPreview ? (
                                <img
                                    src={blurPreview}
                                    alt="Blur önizleme"
                                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                                    style={{ aspectRatio: "16/9", objectFit: "contain" }}
                                />
                            ) : (
                                <div className="text-white/30">Önizleme oluşturuluyor…</div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Zoom Slider (cover mode) ── */}
                {mode === "cover" && imgSrc && (
                    <div className="px-6 py-3 flex items-center gap-4" style={{ borderTop: `1px solid ${BRAND.colors.panel}` }}>
                        <span className="text-xs text-white/50 font-semibold shrink-0">Yakınlaştır</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-emerald-500"
                        />
                        <span className="text-xs text-white/50 font-mono w-10 text-right">×{zoom.toFixed(1)}</span>
                    </div>
                )}

                {/* ── Footer ── */}
                <div
                    className="px-6 py-4 flex items-center justify-end gap-3"
                    style={{ borderTop: `1px solid ${BRAND.colors.panel}` }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="px-5 py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 font-semibold text-sm transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={processing || !imgSrc}
                        className="px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                        style={{ background: processing ? BRAND.colors.muted : BRAND.colors.brand }}
                    >
                        {processing ? "İşleniyor…" : "✓ Uygula"}
                    </button>
                </div>
            </div>
        </div>
    );
}
