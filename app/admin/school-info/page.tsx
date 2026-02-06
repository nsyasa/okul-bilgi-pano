"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { SchoolInfo } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextArea, TextInput } from "@/components/admin/FormBits";

type Form = Partial<SchoolInfo> & { id?: string };

export default function SchoolInfoPage() {
  return <AuthGate>{(profile) => <SchoolInfoInner profile={profile} />}</AuthGate>;
}

function SchoolInfoInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<SchoolInfo[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await sb.from("school_info").select("*").order("title", { ascending: true }).limit(200);
    if (!error) setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => setEditing({ title: "", body: "" });

  const save = async () => {
    if (!editing) return;
    setMsg(null);
    const payload: any = { title: (editing.title ?? "").trim(), body: editing.body ?? "" };
    if (!payload.title) {
      setMsg("Başlık boş olamaz.");
      return;
    }

    const res = editing.id ? await sb.from("school_info").update(payload).eq("id", editing.id) : await sb.from("school_info").insert(payload);
    if (res.error) setMsg(res.error.message);
    else {
      setEditing(null);
      setMsg("Kaydedildi.");
      await load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("school_info").delete().eq("id", id);
    if (!error) await load();
  };

  return (
    <AdminShell profile={profile}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-3xl font-extrabold">Okul Bilgileri</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            Player’da dönen “Okul” kartları.
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
          items.map((i) => (
            <div key={i.id} className="p-5 rounded-2xl flex items-start justify-between gap-4" style={{ background: BRAND.colors.panel }}>
              <div className="min-w-0">
                <div className="text-white text-lg font-extrabold">{i.title}</div>
                <div className="text-sm mt-2 text-white whitespace-pre-line">
                  {String(i.body).slice(0, 200)}
                  {String(i.body).length > 200 ? "…" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditing(i);
                    setMsg(null);
                  }}
                >
                  Düzenle
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => del(i.id)}>
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
              <div className="text-white text-2xl font-extrabold">{editing.id ? "Düzenle" : "Yeni Kart"}</div>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Kapat
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel>Başlık</FieldLabel>
                <TextInput value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Metin</FieldLabel>
                <TextArea value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
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
