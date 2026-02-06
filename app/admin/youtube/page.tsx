"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { YouTubeVideo } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";

type Form = Partial<YouTubeVideo> & { id?: string };

export default function YouTubePage() {
  return <AuthGate>{(profile) => <YouTubeInner profile={profile} />}</AuthGate>;
}

function YouTubeInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<YouTubeVideo[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromLocalInput = (val: string) => {
    if (!val) return null;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const getYouTubeId = (input: string) => {
    try {
      const url = new URL(input);
      if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "");
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      if (url.searchParams.has("v")) return url.searchParams.get("v");
    } catch {
      const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
      if (match) return match[1];
    }
    return null;
  };

  const load = async () => {
    const { data, error } = await sb.from("youtube_videos").select("*").order("priority", { ascending: false }).limit(200);
    if (!error) setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => setEditing({ title: "", url: "", is_active: true, priority: 50, start_at: null, end_at: null });

  const save = async () => {
    if (!editing) return;
    setMsg(null);

    const payload: any = {
      title: (editing.title ?? "").trim() || null,
      url: (editing.url ?? "").trim(),
      is_active: !!editing.is_active,
      priority: Number(editing.priority ?? 50),
      start_at: fromLocalInput(editing.start_at ?? ""),
      end_at: fromLocalInput(editing.end_at ?? ""),
    };

    if (!payload.url) {
      setMsg("Video URL boş olamaz.");
      return;
    }

    if (!getYouTubeId(payload.url)) {
      setMsg("Geçerli bir YouTube video linki girin.");
      return;
    }

    const res = editing.id
      ? await sb.from("youtube_videos").update(payload).eq("id", editing.id)
      : await sb.from("youtube_videos").insert(payload);

    if (res.error) setMsg(res.error.message);
    else {
      setEditing(null);
      setMsg("Kaydedildi.");
      await load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("youtube_videos").delete().eq("id", id);
    if (!error) await load();
  };

  return (
    <AdminShell profile={profile}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-3xl font-extrabold">YouTube Videoları</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            Ana ekranda oynatılacak videoları yönetin.
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
          items.map((v) => (
            <div key={v.id} className="p-5 rounded-2xl flex items-start justify-between gap-4" style={{ background: BRAND.colors.panel }}>
              <div className="min-w-0">
                <div className="text-white text-lg font-extrabold">{v.title || "YouTube Video"}</div>
                <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                  Aktif: <b>{String(v.is_active)}</b> • Öncelik: <b>{v.priority}</b>
                  {v.start_at ? ` • Başlangıç: ${new Date(v.start_at).toLocaleString("tr-TR")}` : ""}
                  {v.end_at ? ` • Bitiş: ${new Date(v.end_at).toLocaleString("tr-TR")}` : ""}
                </div>
                <div className="text-xs mt-2" style={{ color: BRAND.colors.muted }}>
                  {v.url}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditing(v);
                    setMsg(null);
                  }}
                >
                  Düzenle
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => del(v.id)}>
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
              <div className="text-white text-2xl font-extrabold">{editing.id ? "Video Düzenle" : "Yeni Video"}</div>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Kapat
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel>Başlık (opsiyonel)</FieldLabel>
                <TextInput value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>

              <div>
                <FieldLabel>YouTube URL</FieldLabel>
                <TextInput value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
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
                  <FieldLabel>Başlangıç</FieldLabel>
                  <TextInput
                    type="datetime-local"
                    value={toLocalInput(editing.start_at)}
                    onChange={(e) => setEditing({ ...editing, start_at: e.target.value || null })}
                  />
                </div>
                <div>
                  <FieldLabel>Bitiş</FieldLabel>
                  <TextInput
                    type="datetime-local"
                    value={toLocalInput(editing.end_at)}
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