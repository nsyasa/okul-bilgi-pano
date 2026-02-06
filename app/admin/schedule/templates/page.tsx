"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { BellSlot } from "@/types/player";
import { JsonSlotsEditor } from "@/components/admin/JsonSlotsEditor";
import { PrimaryButton } from "@/components/admin/FormBits";

type TemplateRow = { id: string; key: "mon_thu" | "fri"; slots: BellSlot[] };

export default function TemplatesPage() {
  return <AuthGate>{(profile) => <TemplatesInner profile={profile} />}</AuthGate>;
}

function TemplatesInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [monThu, setMonThu] = useState<BellSlot[]>([]);
  const [fri, setFri] = useState<BellSlot[]>([]);
  const [rowIds, setRowIds] = useState<{ mon_thu?: string; fri?: string }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await sb.from("schedule_templates").select("*").limit(10);
    if (error) return;
    const rows = (data ?? []) as any as TemplateRow[];
    const a = rows.find((r) => r.key === "mon_thu");
    const b = rows.find((r) => r.key === "fri");
    setRowIds({ mon_thu: a?.id, fri: b?.id });
    setMonThu((a?.slots as any) ?? []);
    setFri((b?.slots as any) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const loadDefaultSchedule = () => {
    if (!confirm("Gerçek ders programı yüklenecek. Mevcut veriler silinecek. Devam edilsin mi?")) return;

    // Pazartesi-Perşembe programı
    const monThuSlots: BellSlot[] = [
      { start: "08:30", end: "09:10", label: "1. Ders", kind: "lesson" },
      { start: "09:10", end: "09:20", label: "Teneffüs", kind: "break" },
      { start: "09:20", end: "10:00", label: "2. Ders", kind: "lesson" },
      { start: "10:00", end: "10:10", label: "Teneffüs", kind: "break" },
      { start: "10:10", end: "10:50", label: "3. Ders", kind: "lesson" },
      { start: "10:50", end: "11:00", label: "Teneffüs", kind: "break" },
      { start: "11:00", end: "11:40", label: "4. Ders", kind: "lesson" },
      { start: "11:40", end: "11:50", label: "Teneffüs", kind: "break" },
      { start: "11:50", end: "12:30", label: "5. Ders", kind: "lesson" },
      { start: "12:30", end: "13:10", label: "Öğle Arası", kind: "lunch" },
      { start: "13:10", end: "13:50", label: "6. Ders", kind: "lesson" },
      { start: "13:50", end: "14:10", label: "Teneffüs", kind: "break" },
      { start: "14:10", end: "14:50", label: "7. Ders", kind: "lesson" },
      { start: "14:50", end: "15:00", label: "Teneffüs", kind: "break" },
      { start: "15:00", end: "15:40", label: "8. Ders", kind: "lesson" },
      { start: "15:40", end: "16:10", label: "Teneffüs", kind: "break" },
      { start: "16:10", end: "16:30", label: "9. Ders", kind: "lesson" },
      { start: "16:30", end: "17:10", label: "Teneffüs", kind: "break" },
      { start: "17:10", end: "17:20", label: "10. Ders", kind: "lesson" }
    ];

    // Cuma programı (farklı)
    const friSlots: BellSlot[] = [
      { start: "08:30", end: "09:10", label: "1. Ders", kind: "lesson" },
      { start: "09:10", end: "09:20", label: "Teneffüs", kind: "break" },
      { start: "09:20", end: "10:00", label: "2. Ders", kind: "lesson" },
      { start: "10:00", end: "10:10", label: "Teneffüs", kind: "break" },
      { start: "10:10", end: "10:50", label: "3. Ders", kind: "lesson" },
      { start: "10:50", end: "11:00", label: "Teneffüs", kind: "break" },
      { start: "11:00", end: "11:40", label: "4. Ders", kind: "lesson" },
      { start: "11:40", end: "11:50", label: "Teneffüs", kind: "break" },
      { start: "11:50", end: "12:30", label: "5. Ders", kind: "lesson" },
      { start: "12:30", end: "13:00", label: "Öğle Arası", kind: "lunch" },
      { start: "13:00", end: "13:40", label: "6. Ders", kind: "lesson" },
      { start: "13:40", end: "14:10", label: "Teneffüs", kind: "break" },
      { start: "14:10", end: "14:50", label: "7. Ders", kind: "lesson" },
      { start: "14:50", end: "15:00", label: "Teneffüs", kind: "break" },
      { start: "15:00", end: "15:40", label: "8. Ders", kind: "lesson" },
      { start: "15:40", end: "15:50", label: "Teneffüs", kind: "break" },
      { start: "15:50", end: "16:30", label: "9. Ders", kind: "lesson" },
      { start: "16:30", end: "16:40", label: "Teneffüs", kind: "break" },
      { start: "16:40", end: "17:20", label: "10. Ders", kind: "lesson" }
    ];

    setMonThu(monThuSlots);
    setFri(friSlots);
    setMsg("✅ Gerçek ders programı yüklendi. Lütfen 'Kaydet' butonuna tıklayın.");
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const up1 = rowIds.mon_thu
        ? sb.from("schedule_templates").update({ slots: monThu }).eq("id", rowIds.mon_thu)
        : sb.from("schedule_templates").insert({ key: "mon_thu", slots: monThu });
      const up2 = rowIds.fri
        ? sb.from("schedule_templates").update({ slots: fri }).eq("id", rowIds.fri)
        : sb.from("schedule_templates").insert({ key: "fri", slots: fri });

      const [r1, r2] = await Promise.all([up1, up2]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      setMsg("Kaydedildi.");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell profile={profile}>
      <div className="text-white text-3xl font-extrabold">Zil Programı (Template)</div>
      <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
        Pazartesi–Perşembe aynı, Cuma farklı template.
      </div>

      {/* Toplu Yükleme Butonu */}
      <div className="mt-5 p-5 rounded-2xl" style={{ background: BRAND.colors.panel, border: `2px solid ${BRAND.colors.info}` }}>
        <div className="text-white text-lg font-bold mb-2">⏰ Gerçek Ders Programı</div>
        <div className="text-sm mb-3" style={{ color: BRAND.colors.muted }}>
          Şehit Muhammed İslam Altuğ Anadolu İmam Hatip Lisesi'nin gerçek ders saatlerini tek tuşla yükleyin.
          <br />• Pazartesi-Perşembe: 08:30-17:20 (10 ders)
          <br />• Cuma: 08:30-17:20 (10 ders, farklı saatler)
        </div>
        <PrimaryButton type="button" onClick={loadDefaultSchedule}>
          🔄 Gerçek Ders Programını Yükle
        </PrimaryButton>
      </div>

      {msg ? (
        <div className="text-sm mt-3" style={{ color: BRAND.colors.warn }}>
          • {msg}
        </div>
      ) : null}

      <div className="mt-5 space-y-6">
        <div className="p-5 rounded-2xl" style={{ background: BRAND.colors.panel }}>
          <JsonSlotsEditor
            label="Pazartesi–Perşembe (mon_thu)"
            value={monThu}
            onChange={setMonThu}
            hint="Zaman formatı HH:MM. kind: lesson | break | lunch"
          />
        </div>

        <div className="p-5 rounded-2xl" style={{ background: BRAND.colors.panel }}>
          <JsonSlotsEditor label="Cuma (fri)" value={fri} onChange={setFri} hint="Zaman formatı HH:MM. kind: lesson | break | lunch" />
        </div>

        <div className="flex justify-end">
          <PrimaryButton disabled={busy} type="button" onClick={save}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </PrimaryButton>
        </div>
      </div>
    </AdminShell>
  );
}
