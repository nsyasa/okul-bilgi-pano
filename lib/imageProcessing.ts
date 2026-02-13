/**
 * Image processing utilities for 16:9 TV export.
 * All functions are pure client-side canvas operations.
 */

/* ──────────────────── Helpers ──────────────────── */

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Görsel yüklenemedi"));
        };
        img.src = url;
    });
}

export function canvasToWebPBlob(
    canvas: HTMLCanvasElement,
    quality = 0.82
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("WebP export başarısız"));
            },
            "image/webp",
            quality
        );
    });
}

/* ──────────────── Cover Crop ──────────────── */

/**
 * Renders the user-selected crop area onto a canvas at target resolution.
 * `cropPixels` comes from react-easy-crop's `onCropComplete`.
 */
export function renderCoverCropToCanvas(
    img: HTMLImageElement,
    cropPixels: { x: number; y: number; width: number; height: number },
    outW = 1920,
    outH = 1080
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
        img,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        outW,
        outH
    );

    return canvas;
}

/* ──────────── Contain + Blur Background ──────────── */

/**
 * Renders the image inside a 16:9 canvas WITHOUT distortion.
 * Background = same image blurred & stretched to cover.
 * Foreground = image centered using "contain" logic.
 */
export function renderContainBlurToCanvas(
    img: HTMLImageElement,
    outW = 1920,
    outH = 1080,
    blurPx = 24
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    /* 1) Background: cover + blur */
    const coverScale = Math.max(outW / iw, outH / ih);
    const bgW = iw * coverScale;
    const bgH = ih * coverScale;
    const bgX = (outW - bgW) / 2;
    const bgY = (outH - bgH) / 2;

    // Try ctx.filter (works in Chrome, FF, Safari 16+)
    const supportsFilter = typeof ctx.filter !== "undefined";
    if (supportsFilter) {
        ctx.filter = `blur(${blurPx}px) brightness(0.6)`;
    }

    ctx.drawImage(img, bgX, bgY, bgW, bgH);

    // Reset filter
    if (supportsFilter) {
        ctx.filter = "none";
    } else {
        // Fallback: dim the background with a semi-transparent overlay
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, outW, outH);
    }

    /* 2) Foreground: contain (fit inside without crop) */
    const containScale = Math.min(outW / iw, outH / ih);
    const fgW = iw * containScale;
    const fgH = ih * containScale;
    const fgX = (outW - fgW) / 2;
    const fgY = (outH - fgH) / 2;

    // Subtle shadow behind foreground
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.drawImage(img, fgX, fgY, fgW, fgH);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    return canvas;
}
