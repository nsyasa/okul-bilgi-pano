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

// Slot tablosu bileşeni
function SlotTable({ slots, title }: { slots: BellSlot[]; title: string }) {
  if (!slots.length) {
    return (
      <div className="text-white/40 text-sm py-4 text-center">
        Program tanımlanmamış
      </div>
    );
  }

  const kindColors: Record<string, string> = {
    lesson: "bg-emerald-500/20 text-emerald-300",
    break: "bg-amber-500/20 text-amber-300",
    lunch: "bg-rose-500/20 text-rose-300",
  };

  const kindLabels: Record<string, string> = {
    lesson: "Ders",
    break: "Teneffüs",
    lunch: "Öğle",
  };

  return (
    <div>
      <div className="text-white font-semibold text-sm mb-2">{title}</div>
      <div className="rounded-xl overflow-hidden border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-white/50 text-xs uppercase">
              <th className="px-3 py-2 text-left font-medium">Saat</th>
              <th className="px-3 py-2 text-left font-medium">Etiket</th>
              <th className="px-3 py-2 text-left font-medium">Tür</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, idx) => (
              <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 text-white font-mono text-xs">
                  {slot.start} - {slot.end}
                </td>
                <td className="px-3 py-2 text-white/80">{slot.label}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kindColors[slot.kind] || "bg-white/10 text-white/50"}`}>
                    {kindLabels[slot.kind] || slot.kind}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [monThu, setMonThu] = useState<BellSlot[]>([]);
  const [fri, setFri] = useState<BellSlot[]>([]);
  const [rowIds, setRowIds] = useState<{ mon_thu?: string; fri?: string }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
    setEditMode(true);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = [];
      if (rowIds.mon_thu) payload.push({ id: rowIds.mon_thu, key: "mon_thu", slots: monThu });
      else payload.push({ key: "mon_thu", slots: monThu });

      if (rowIds.fri) payload.push({ id: rowIds.fri, key: "fri", slots: fri });
      else payload.push({ key: "fri", slots: fri });

      const { error } = await sb.from("schedule_templates").upsert(payload);

      if (error) throw error;

      setMsg("✅ Kaydedildi.");
      setEditMode(false);
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Hata");
    } finally {
      setBusy(false);
    }
  };

  const lessonCount = (slots: BellSlot[]) => slots.filter(s => s.kind === "lesson").length;
  const getTimeRange = (slots: BellSlot[]) => {
    if (!slots.length) return "—";
    return `${slots[0].start} - ${slots[slots.length - 1].end}`;
  };

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-white text-2xl font-bold">Zil Programı</div>
          <div className="text-sm text-white/40 mt-1">
            Hafta içi ve Cuma için ders saatlerini yönetin
          </div>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Düzenle
          </button>
        )}
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: msg.includes("✅") ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)", color: msg.includes("✅") ? "#10b981" : "#f59e0b" }}>
          {msg}
        </div>
      )}

      {!editMode ? (
        /* Görüntüleme Modu */
        <div className="space-y-6">
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/40 text-xs font-medium uppercase tracking-wide">Pazartesi - Perşembe</div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  {lessonCount(monThu)} ders
                </span>
              </div>
              <div className="text-white text-lg font-mono">{getTimeRange(monThu)}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/40 text-xs font-medium uppercase tracking-wide">Cuma</div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  {lessonCount(fri)} ders
                </span>
              </div>
              <div className="text-white text-lg font-mono">{getTimeRange(fri)}</div>
            </div>
          </div>

          {/* Program Tabloları */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl" style={{ background: BRAND.colors.panel }}>
              <SlotTable slots={monThu} title="Pazartesi - Perşembe" />
            </div>
            <div className="p-4 rounded-xl" style={{ background: BRAND.colors.panel }}>
              <SlotTable slots={fri} title="Cuma" />
            </div>
          </div>

          {/* Hızlı Yükleme */}
          <div className="p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium text-sm">Varsayılan Programı Yükle</div>
                <div className="text-white/40 text-xs mt-1">Okulun gerçek ders saatlerini tek tıkla yükleyin</div>
              </div>
              <button
                onClick={loadDefaultSchedule}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-brand/20 text-brand hover:bg-brand/30 transition-colors"
              >
                Yükle
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Düzenleme Modu */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="font-medium text-sm">Düzenleme Modu</span>
            </div>
            <button
              onClick={() => { setEditMode(false); load(); }}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
            >
              İptal
            </button>
          </div>

          {/* Hızlı Yükleme Butonu */}
          <div className="p-4 rounded-xl" style={{ background: BRAND.colors.panel, border: `2px solid ${BRAND.colors.info}` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-sm">⏰ Gerçek Ders Programı</div>
                <div className="text-white/40 text-xs mt-1">Okulun gerçek saatlerini yükle (10 ders)</div>
              </div>
              <button onClick={loadDefaultSchedule} className="px-4 py-2 rounded-lg font-medium text-sm bg-brand text-white hover:brightness-110 transition-all">
                Yükle
              </button>
            </div>
          </div>

          {/* JSON Editörler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl" style={{ background: BRAND.colors.panel }}>
              <JsonSlotsEditor
                label="Pazartesi–Perşembe (mon_thu)"
                value={monThu}
                onChange={setMonThu}
                hint="kind: lesson | break | lunch"
              />
            </div>
            <div className="p-4 rounded-xl" style={{ background: BRAND.colors.panel }}>
              <JsonSlotsEditor
                label="Cuma (fri)"
                value={fri}
                onChange={setFri}
                hint="kind: lesson | break | lunch"
              />
            </div>
          </div>

          {/* Kaydet Butonu */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setEditMode(false); load(); }}
              className="px-5 py-2.5 rounded-lg font-medium text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              İptal
            </button>
            <PrimaryButton disabled={busy} type="button" onClick={save}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
