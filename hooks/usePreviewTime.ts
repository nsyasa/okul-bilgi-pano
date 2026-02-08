"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export type PreviewMode = "freeze" | "run";

export interface PreviewState {
    /** If true, we're in preview mode */
    isActive: boolean;
    /** The effective "now" time to use for all calculations */
    effectiveNow: Date;
    /** Remaining TTL in seconds */
    remainingTtl: number;
    /** Human-readable preview time */
    previewTimeStr: string;
    /** Exit preview mode */
    exitPreview: () => void;
}

const DEFAULT_TTL_SEC = 120;

function parsePreviewAt(val: string | null): Date | null {
    if (!val) return null;

    try {
        // Try ISO format first
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;

        // Try "YYYY-MM-DDTHH:mm" format (no timezone = assume local/TR)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
            const d2 = new Date(val + ":00");
            if (!isNaN(d2.getTime())) return d2;
        }

        return null;
    } catch {
        return null;
    }
}

export function usePreviewTime(): PreviewState {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Parse query params
    const previewAtParam = searchParams.get("previewAt");
    const previewTtlSec = parseInt(searchParams.get("previewTtlSec") || String(DEFAULT_TTL_SEC), 10) || DEFAULT_TTL_SEC;
    const previewMode: PreviewMode = (searchParams.get("previewMode") as PreviewMode) || "freeze";

    const previewAt = useMemo(() => parsePreviewAt(previewAtParam), [previewAtParam]);

    // Track when preview started (real time)
    const [previewStartReal, setPreviewStartReal] = useState<number | null>(null);

    // Real-time clock for TTL tracking
    const [realNow, setRealNow] = useState(() => Date.now());

    // Initialize preview start time when previewAt changes
    useEffect(() => {
        if (previewAt) {
            setPreviewStartReal(Date.now());
        } else {
            setPreviewStartReal(null);
        }
    }, [previewAt]);

    // Update real clock every second
    useEffect(() => {
        const id = setInterval(() => setRealNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // Calculate remaining TTL
    const remainingTtl = useMemo(() => {
        if (!previewStartReal || !previewAt) return 0;
        const elapsed = Math.floor((realNow - previewStartReal) / 1000);
        return Math.max(0, previewTtlSec - elapsed);
    }, [previewStartReal, realNow, previewTtlSec, previewAt]);

    // Auto-exit when TTL expires
    useEffect(() => {
        if (previewAt && remainingTtl <= 0 && previewStartReal) {
            // TTL expired, exit preview
            exitPreviewInternal();
        }
    }, [remainingTtl, previewAt, previewStartReal]);

    // Calculate effective now
    const effectiveNow = useMemo(() => {
        if (!previewAt || !previewStartReal) {
            return new Date();
        }

        if (previewMode === "freeze") {
            // Freeze mode: always return previewAt
            return previewAt;
        } else {
            // Run mode: previewAt + elapsed real time
            const elapsedMs = realNow - previewStartReal;
            return new Date(previewAt.getTime() + elapsedMs);
        }
    }, [previewAt, previewStartReal, previewMode, realNow]);

    const exitPreviewInternal = useCallback(() => {
        // Remove preview params from URL without reload
        const params = new URLSearchParams(searchParams.toString());
        params.delete("previewAt");
        params.delete("previewTtlSec");
        params.delete("previewMode");

        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        router.replace(newUrl, { scroll: false });

        // Also reset state immediately
        setPreviewStartReal(null);
    }, [searchParams, router]);

    const exitPreview = useCallback(() => {
        exitPreviewInternal();
    }, [exitPreviewInternal]);

    const previewTimeStr = useMemo(() => {
        if (!previewAt) return "";
        return effectiveNow.toLocaleString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }, [previewAt, effectiveNow]);

    return {
        isActive: !!previewAt && !!previewStartReal && remainingTtl > 0,
        effectiveNow,
        remainingTtl,
        previewTimeStr,
        exitPreview,
    };
}
