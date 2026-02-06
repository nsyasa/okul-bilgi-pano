"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { BellSlot } from "@/types/player";
import { JsonSlotsEditor } from "@/components/admin/JsonSlotsEditor";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { ymdNowTR } from "@/lib/validate";

type OverrideRow = { id: string; date: string; slots: BellSlot[]; note: string | null };

export default function OverridesPage() {
  return <AuthGate>{(profile) => <OverridesInner profile={profile} />}</AuthGate>;
}

function OverridesInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [date, setDate] = useState(ymdNowTR());
  const [note, setNote] = useState("Deneme/Sınav Günü");
  const [slots, setSlots] = useState<BellSlot[]>([]);
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await sb.from("schedule_overrides").select("*").order("date", { ascending: true }).limit(200);
    if (!error) setRows((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const existing = rows.find((r) => r.date === date);
      if (existing) {
        const { error } = await sb.from("schedule_overrides").update({ slots, note }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("schedule_overrides").insert({ date, slots, note });
        if (error) throw error;
      }
      setMsg("Kaydedildi.");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Hata");
    } finally {
      setBusy(false);
    }
  };

  const edit = (r: OverrideRow) => {
    setDate(r.date);
    setNote(r.note ?? "");
    setSlots((r.slots as any) ?? []);
    setMsg(null);
  };

  const del = async (r: OverrideRow) => {
    if (!confirm(`${r.date} override silinsin mi?`)) return;
    const { error } = await sb.from("schedule_overrides").delete().eq("id", r.id);
    if (!error) await load();
  };

  return (
    <AdminShell profile={profile}>
      <div className="text-white text-3xl font-extrabold">Özel Gün Programı (Override)</div>
      <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
        Deneme/sınav günleri için tarih bazlı zil programı tanımlayın.
      </div>

      {msg ? (
        <div className="text-sm mt-3" style={{ color: BRAND.colors.warn }}>
          • {msg}
        </div>
      ) : null}

      <div className="mt-5 p-5 rounded-2xl" style={{ background: BRAND.colors.panel }}>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <FieldLabel>Tarih</FieldLabel>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Not</FieldLabel>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="col-span-2">
            <JsonSlotsEditor label="O günün slotları" value={slots} onChange={setSlots} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <PrimaryButton disabled={busy} type="button" onClick={save}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-7">
        <div className="text-white text-xl font-extrabold mb-3">Mevcut Override’lar</div>
        <div className="space-y-3">
          {rows.length ? (
            rows.map((r) => (
              <div key={r.id} className="p-5 rounded-2xl flex items-start justify-between gap-4" style={{ background: BRAND.colors.panel }}>
                <div>
                  <div className="text-white text-lg font-extrabold">{r.date}</div>
                  <div className="text-sm" style={{ color: BRAND.colors.muted }}>
                    {r.note ?? ""}
                  </div>
                  <div className="text-xs mt-2" style={{ color: BRAND.colors.muted }}>
                    {(r.slots ?? []).length} slot
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton type="button" onClick={() => edit(r)}>
                    Düzenle
                  </SecondaryButton>
                  <SecondaryButton type="button" onClick={() => del(r)}>
                    Sil
                  </SecondaryButton>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm" style={{ color: BRAND.colors.muted }}>
              Henüz override yok.
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
