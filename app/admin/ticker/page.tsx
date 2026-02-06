"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { TickerItem } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";

type Form = Partial<TickerItem> & { id?: string };

export default function TickerPage() {
  return <AuthGate>{(profile) => <TickerInner profile={profile} />}</AuthGate>;
}

function TickerInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await sb.from("ticker_items").select("*").order("priority", { ascending: false }).limit(200);
    if (!error) setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => setEditing({ text: "", is_active: true, priority: 50, start_at: null, end_at: null });

  const save = async () => {
    if (!editing) return;
    setMsg(null);
    const payload: any = {
      text: (editing.text ?? "").trim(),
      is_active: !!editing.is_active,
      priority: Number(editing.priority ?? 50),
      start_at: editing.start_at || null,
      end_at: editing.end_at || null,
    };
    if (!payload.text) {
      setMsg("Metin boş olamaz.");
      return;
    }

    const res = editing.id ? await sb.from("ticker_items").update(payload).eq("id", editing.id) : await sb.from("ticker_items").insert(payload);
    if (res.error) setMsg(res.error.message);
    else {
      setEditing(null);
      setMsg("Kaydedildi.");
      await load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("ticker_items").delete().eq("id", id);
    if (!error) await load();
  };

  return (
    <AdminShell profile={profile}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-3xl font-extrabold">Alt Bant (Ticker)</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            Sürekli dönen hatırlatmaları yönetin.
          </div>
        </div>
        <PrimaryButton type="button" onClick={startNew}>
          + Yeni
        </PrimaryButton>
      </div>

      {msg ? (
        <div className="text-sm mt-3" style={{ color: BRAND.colors.warn }}>
          • {msg}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((t) => (
            <div key={t.id} className="p-5 rounded-2xl flex items-start justify-between gap-4" style={{ background: BRAND.colors.panel }}>
              <div className="min-w-0">
                <div className="text-white text-lg font-extrabold">{t.text}</div>
                <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                  Aktif: <b>{String(t.is_active)}</b> • Öncelik: <b>{t.priority}</b>
                  {t.start_at ? ` • Başlangıç: ${new Date(t.start_at).toLocaleString("tr-TR")}` : ""}
                  {t.end_at ? ` • Bitiş: ${new Date(t.end_at).toLocaleString("tr-TR")}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditing(t);
                    setMsg(null);
                  }}
                >
                  Düzenle
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => del(t.id)}>
                  Sil
                </SecondaryButton>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm" style={{ color: BRAND.colors.muted }}>
            Kayıt yok.
          </div>
        )}
      </div>

      {editing ? (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-2xl p-6 rounded-2xl overflow-auto max-h-[90vh]" style={{ background: BRAND.colors.bg }}>
            <div className="flex items-center justify-between">
              <div className="text-white text-2xl font-extrabold">{editing.id ? "Ticker Düzenle" : "Yeni Ticker"}</div>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Kapat
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel>Metin</FieldLabel>
                <TextInput value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Öncelik (0–100)</FieldLabel>
                  <TextInput type="number" value={String(editing.priority ?? 50)} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Aktif</FieldLabel>
                  <select
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ background: BRAND.colors.panel, color: "white" }}
                    value={String(!!editing.is_active)}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.value === "true" })}
                  >
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Başlangıç (ISO, opsiyonel)</FieldLabel>
                  <TextInput
                    placeholder="2026-02-03T08:00:00+03:00"
                    value={editing.start_at ?? ""}
                    onChange={(e) => setEditing({ ...editing, start_at: e.target.value || null })}
                  />
                </div>
                <div>
                  <FieldLabel>Bitiş (ISO, opsiyonel)</FieldLabel>
                  <TextInput
                    placeholder="2026-02-03T18:00:00+03:00"
                    value={editing.end_at ?? ""}
                    onChange={(e) => setEditing({ ...editing, end_at: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <SecondaryButton type="button" onClick={() => setEditing(null)}>
                  İptal
                </SecondaryButton>
                <PrimaryButton type="button" onClick={save}>
                  Kaydet
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
