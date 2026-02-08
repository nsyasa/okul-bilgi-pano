"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
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

    const payload: any = {
      title: (editing.title ?? "").trim() || null,
      url: (editing.url ?? "").trim(),
      is_active: !!editing.is_active,
      priority: Number(editing.priority ?? 50),
      start_at: fromLocalInput(editing.start_at ?? ""),
      end_at: fromLocalInput(editing.end_at ?? ""),
    };

    if (!payload.url) return;
    if (!getYouTubeId(payload.url)) return;

    const res = editing.id
      ? await sb.from("youtube_videos").update(payload).eq("id", editing.id)
      : await sb.from("youtube_videos").insert(payload);

    if (!res.error) {
      setEditing(null);
      await load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("youtube_videos").delete().eq("id", id);
    if (!error) await load();
  };

  const toggleActive = async (item: YouTubeVideo) => {
    await sb.from("youtube_videos").update({ is_active: !item.is_active }).eq("id", item.id);
    await load();
  };

  const getThumbnail = (url: string) => {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  };

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">YouTube Videoları</div>
          <div className="text-sm mt-1 text-white/40">
            Ana ekranda oynatılacak videoları yönetin.
          </div>
        </div>
        <button
          onClick={startNew}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-brand hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Video
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length ? (
          items.map((v) => {
            const thumb = getThumbnail(v.url);
            return (
              <div
                key={v.id}
                className={`group rounded-xl border overflow-hidden transition-all ${v.is_active
                    ? "bg-white/[0.03] border-white/5 hover:border-white/15"
                    : "bg-white/[0.01] border-white/5 opacity-50 hover:opacity-100"
                  }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black/30">
                  {thumb && (
                    <img src={thumb} alt="" className="w-full h-full object-cover opacity-80" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${v.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/20 text-white/60"}`}>
                      {v.is_active ? "AKTİF" : "PASİF"}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="text-white font-medium text-sm line-clamp-1 mb-1">
                    {v.title || "YouTube Video"}
                  </div>
                  <div className="text-[11px] text-white/30 flex items-center gap-2">
                    <span>Öncelik: {v.priority}</span>
                    {v.start_at && <span>• {new Date(v.start_at).toLocaleDateString("tr-TR")}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => toggleActive(v)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${v.is_active
                          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                        }`}
                    >
                      {v.is_active ? "✓ Aktif" : "○ Pasif"}
                    </button>
                    <button
                      onClick={() => setEditing(v)}
                      className="w-9 h-9 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
                      title="Düzenle"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => del(v.id)}
                      className="w-9 h-9 rounded-lg bg-red-500/5 text-red-400/50 hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors"
                      title="Sil"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
            <div className="text-4xl mb-3 opacity-30">🎬</div>
            <p className="font-medium text-white/50 mb-1">Henüz video eklenmemiş</p>
            <p className="text-xs opacity-60">"Yeni Video" butonuyla YouTube videoları ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-white text-lg font-bold">{editing.id ? "Video Düzenle" : "Yeni Video"}</div>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel>Başlık (Opsiyonel)</FieldLabel>
                <TextInput
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Örn: Okul Tanıtım Videosu"
                />
              </div>

              <div>
                <FieldLabel>YouTube URL *</FieldLabel>
                <TextInput
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {editing.url && getYouTubeId(editing.url) && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-black/30">
                    <img
                      src={`https://img.youtube.com/vi/${getYouTubeId(editing.url)}/mqdefault.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Öncelik (0–100)</FieldLabel>
                  <TextInput
                    type="number"
                    value={String(editing.priority ?? 50)}
                    onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel>Durum</FieldLabel>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_active: true })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${editing.is_active
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20"
                        }`}
                    >
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_active: false })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!editing.is_active
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20"
                        }`}
                    >
                      Pasif
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Başlangıç (Opsiyonel)</FieldLabel>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm"
                    value={toLocalInput(editing.start_at)}
                    onChange={(e) => setEditing({ ...editing, start_at: e.target.value || null })}
                  />
                </div>
                <div>
                  <FieldLabel>Bitiş (Opsiyonel)</FieldLabel>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm"
                    value={toLocalInput(editing.end_at)}
                    onChange={(e) => setEditing({ ...editing, end_at: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
      )}
    </AdminShell>
  );
}