"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/branding";
import { FieldLabel, TextArea } from "./FormBits";
import type { BellSlot } from "@/types/player";

export function JsonSlotsEditor(props: {
  label: string;
  value: BellSlot[];
  onChange: (v: BellSlot[]) => void;
  hint?: string;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(props.value ?? [], null, 2));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRaw(JSON.stringify(props.value ?? [], null, 2));
    setErr(null);
  }, [props.value]);

  const example = useMemo(() => {
    const ex: BellSlot[] = [
      { start: "08:30", end: "09:10", kind: "lesson", label: "1. Ders" },
      { start: "09:10", end: "09:20", kind: "break", label: "Teneffüs" }
    ];
    return JSON.stringify(ex, null, 2);
  }, []);

  return (
    <div>
      <FieldLabel>{props.label}</FieldLabel>
      {props.hint ? <div className="text-xs mb-2" style={{ color: BRAND.colors.muted }}>{props.hint}</div> : null}
      <TextArea
        value={raw}
        onChange={(e) => {
          const v = e.target.value;
          setRaw(v);
          try {
            const parsed = JSON.parse(v);
            if (!Array.isArray(parsed)) throw new Error("JSON array olmalı");
            for (const s of parsed) {
              if (!s.start || !s.end || !s.kind) throw new Error("start/end/kind zorunlu");
            }
            setErr(null);
            props.onChange(parsed);
          } catch (e: any) {
            setErr(e?.message ?? "JSON hatası");
          }
        }}
      />
      {err ? <div className="text-sm mt-2" style={{ color: "#F1C40F" }}>⚠ {err}</div> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm" style={{ color: BRAND.colors.muted }}>Örnek JSON</summary>
        <pre className="mt-2 p-3 rounded-xl text-xs overflow-auto" style={{ background: BRAND.colors.panel, color: "white" }}>{example}</pre>
      </details>
    </div>
  );
}
