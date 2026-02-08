"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Announcement, YouTubeVideo, PlayerRotationSettings } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { AnnouncementForm, AnnouncementFormState } from "@/components/admin/AnnouncementForm";
import { canApprove, type Profile } from "@/lib/adminAuth";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

type FormState = Partial<Announcement> & { id?: string };
type VideoForm = Partial<YouTubeVideo> & { id?: string };

function inWindow(a: Announcement, now: Date) {
  const t = now.getTime();
  const s = a.start_at ? new Date(a.start_at).getTime() : null;
  const e = a.end_at ? new Date(a.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

function inWindowVideo(v: YouTubeVideo, now: Date) {
  const t = now.getTime();
  const s = v.start_at ? new Date(v.start_at).getTime() : null;
  const e = v.end_at ? new Date(v.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

function ImagePreview({ imageUrl, imageUrls }: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const images = (imageUrls && imageUrls.length ? imageUrls : imageUrl ? [imageUrl] : []).filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setIdx((x) => (x + 1) % images.length);
    }, 2500);
    return () => clearInterval(id);
  }, [images.join("|")]);

  if (!images.length) return null;

  return (
    <div className="mt-3">
      <div className="relative w-full max-w-sm h-40 rounded-xl overflow-hidden" style={{ background: BRAND.colors.bg }}>
        <img src={images[idx]} alt="Duyuru görseli" className="w-full h-full object-cover" />
        {images.length > 1 ? (
          <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.7)", color: "white" }}>
            {idx + 1} / {images.length}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function AnnouncementsPage() {
  return (
    <AuthGate>
      {(profile) => (
        <Suspense fallback={<div className="text-white p-5">Yükleniyor...</div>}>
          <AnnouncementsInner profile={profile} />
        </Suspense>
      )}
    </AuthGate>
  );
}

function AnnouncementsInner({ profile }: { profile: Profile }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<Announcement[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Announcement["status"]>("all");
  const [tab, setTab] = useState<"small" | "big" | "image" | "videos">("small");
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);

  // Confirm State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);

  const [rotation, setRotation] = useState<PlayerRotationSettings>({
    enabled: true,
    videoSeconds: 30,
    imageSeconds: 10,
    textSeconds: 10,
  });
  const [savingRotation, setSavingRotation] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb.from("announcements").select("*").order("priority", { ascending: false }).limit(200);
    setLoading(false);
    if (!error) setItems((data ?? []) as any);
  };

  const loadVideos = async () => {
    setVideoLoading(true);
    const { data, error } = await sb.from("youtube_videos").select("*").order("priority", { ascending: false }).limit(200);
    setVideoLoading(false);
    if (!error) setVideos((data ?? []) as any);
  };

  const loadSettings = async () => {
    const { data, error } = await sb.from("player_settings").select("*").eq("key", "rotation").maybeSingle();
    if (!error && data?.value) {
      setRotation({
        enabled: true,
        videoSeconds: 30,
        imageSeconds: 10,
        textSeconds: 10,
        ...(data.value as any),
      });
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    load();
    loadVideos();
    loadSettings();

    if (searchParams.get("new") === "true") {
      startNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async () => {
    setSavingRotation(true);
    const { error } = await sb.from("player_settings").upsert({ key: "rotation", value: rotation });
    if (error) toast.error("Hata: " + error.message);
    else toast.success("Ayarlar kaydedildi.");
    setSavingRotation(false);
  };

  const shown = useMemo(() => {
    const now = new Date();
    const base = filter === "all" ? items : items.filter((x) => x.status === filter);
    const byTab = tab === "small"
      ? base.filter((x) => (x.display_mode ?? "small") === "small")
      : tab === "big"
        ? base.filter((x) => (x.display_mode ?? "small") === "big")
        : base.filter((x) => (x.display_mode ?? "small") === "image");
    const list = byTab
      .slice()
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((x) => ({ ...x, _activeNow: inWindow(x, now) })) as any[];
    if (!activeOnly) return list;
    return list.filter((x) => x._activeNow);
  }, [items, filter, tab, activeOnly]);

  const shownVideos = useMemo(() => {
    const now = new Date();
    const list = videos
      .slice()
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((x) => ({ ...x, _activeNow: x.is_active && inWindowVideo(x, now) })) as any[];
    if (!activeOnly) return list;
    return list.filter((x) => x._activeNow);
  }, [videos, activeOnly]);

  const startNew = () => {
    setEditing({
      title: "",
      body: "",
      image_url: null,
      image_urls: null,
      priority: 50,
      status: "draft",
      category: "general",
      display_mode: tab === "big" ? "big" : tab === "image" ? "image" : "small",
      start_at: null,
      end_at: null,
      approved_label: false,
    });
  };

  const startNewVideo = () => {
    setEditingVideo({
      title: "",
      url: "",
      is_active: true,
      priority: 50,
      start_at: null,
      end_at: null,
    });
  };

  const save = async (formData: AnnouncementFormState) => {
    setBusy(true);
    try {
      const payload: any = {
        title: (formData.title ?? "").trim(),
        body: formData.body ?? null,
        image_url: formData.image_url ?? null,
        image_urls: formData.image_urls ?? null,
        priority: Number(formData.priority ?? 50),
        status: formData.status ?? "draft",
        category: formData.category ?? "general",
        display_mode: formData.display_mode ?? "small",
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        approved_label: !!formData.approved_label,
      };

      // Hassas kategorilerde publish kilit: önce review
      if (payload.category === "sensitive" && payload.status === "published") {
        payload.status = "pending_review";
        payload.approved_label = false;
      }

      if (formData.id) {
        const { error } = await sb.from("announcements").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("announcements").insert(payload);
        if (error) throw error;
      }

      if (payload.display_mode === "big" && formData.id) {
        await sb.from("announcements").update({ display_mode: "small" }).neq("id", formData.id).eq("display_mode", "big");
      }

      setEditing(null);
      await load();
      toast.success("Başarıyla kaydedildi.");
    } catch (e: any) {
      toast.error(e?.message ?? "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  const del = (id: string) => {
    setConfirmData({
      title: "Duyuruyu Sil",
      desc: "Bu duyuru kalıcı olarak silinecek. Geri alınamaz.",
      action: async () => {
        const { error } = await sb.from("announcements").delete().eq("id", id);
        if (!error) {
          await load();
          toast.success("Silindi.");
        } else {
          toast.error("Hata: " + error.message);
        }
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const delVideo = (id: string) => {
    setConfirmData({
      title: "Videoyu Sil",
      desc: "Bu video listeden kaldırılacak.",
      action: async () => {
        const { error } = await sb.from("youtube_videos").delete().eq("id", id);
        if (!error) {
          await loadVideos();
          toast.success("Silindi.");
        } else {
          toast.error("Hata: " + error.message);
        }
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const toggleAnnouncementActive = async (a: Announcement, next: boolean) => {
    const payload: any = next ? { status: "published" } : { status: "draft" };
    if (next && a.category === "sensitive") {
      payload.status = "pending_review";
      payload.approved_label = false;
    }
    const { error } = await sb.from("announcements").update(payload).eq("id", a.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Aktif edildi." : "Pasif edildi.");
      await load();
    }
  };

  const toggleVideoActive = async (v: YouTubeVideo, next: boolean) => {
    const { error } = await sb.from("youtube_videos").update({ is_active: next }).eq("id", v.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Aktif edildi." : "Pasif edildi.");
      await loadVideos();
    }
  };

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

  const saveVideo = async () => {
    if (!editingVideo) return;
    setVideoBusy(true);
    try {
      const payload: any = {
        title: (editingVideo.title ?? "").trim() || null,
        url: (editingVideo.url ?? "").trim(),
        is_active: !!editingVideo.is_active,
        priority: Number(editingVideo.priority ?? 50),
        start_at: fromLocalInput(editingVideo.start_at ?? ""),
        end_at: fromLocalInput(editingVideo.end_at ?? ""),
      };

      if (!payload.url) {
        toast.error("Video URL boş olamaz.");
        return;
      }

      if (editingVideo.id) {
        const { error } = await sb.from("youtube_videos").update(payload).eq("id", editingVideo.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("youtube_videos").insert(payload);
        if (error) throw error;
      }

      setEditingVideo(null);
      await loadVideos();
      toast.success("Video kaydedildi.");
    } catch (e: any) {
      toast.error(e?.message ?? "Hata oluştu.");
    } finally {
      setVideoBusy(false);
    }
  };

  const approveAndPublish = async (a: Announcement) => {
    if (!canApprove(profile.role)) return;
    const { error } = await sb.from("announcements").update({ status: "published", approved_label: true }).eq("id", a.id);
    if (!error) {
      toast.success("Onaylandı ve yayınlandı.");
      await load();
    } else {
      toast.error("Hata: " + error.message);
    }
  };

  return (
    <AdminShell profile={profile}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-3xl font-extrabold">Ana Ekran</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            Video, ana duyuru, duyuru ve resim slaytı içeriklerini yönetin.
          </div>
        </div>
        {tab !== "videos" ? (
          <PrimaryButton type="button" onClick={startNew}>
            {tab === "big" ? "+ Yeni Ana Duyuru" : tab === "image" ? "+ Yeni Resim Slaytı" : "+ Yeni Duyuru"}
          </PrimaryButton>
        ) : (
          <PrimaryButton type="button" onClick={startNewVideo}>
            + Yeni Video
          </PrimaryButton>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 rounded-xl px-4 py-2" style={{ background: BRAND.colors.panel }}>
          <div className="text-sm font-semibold" style={{ color: BRAND.colors.muted }}>Döngü</div>
          <label className="flex items-center gap-2 text-sm" style={{ color: BRAND.colors.muted }}>
            <input type="checkbox" checked={rotation.enabled} onChange={(e) => setRotation({ ...rotation, enabled: e.target.checked })} />
            Açık
          </label>
          <div className="flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
            Video (sn)
            <TextInput
              type="number"
              value={String(rotation.videoSeconds)}
              onChange={(e) => setRotation({ ...rotation, videoSeconds: Math.max(5, Number(e.target.value)) })}
              style={{ width: 90 }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
            Resim (sn)
            <TextInput
              type="number"
              value={String(rotation.imageSeconds)}
              onChange={(e) => setRotation({ ...rotation, imageSeconds: Math.max(5, Number(e.target.value)) })}
              style={{ width: 90 }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
            Metin (sn)
            <TextInput
              type="number"
              value={String(rotation.textSeconds)}
              onChange={(e) => setRotation({ ...rotation, textSeconds: Math.max(5, Number(e.target.value)) })}
              style={{ width: 90 }}
            />
          </div>
          <PrimaryButton type="button" disabled={savingRotation} onClick={saveSettings}>
            {savingRotation ? "Kaydediliyor…" : "Kaydet"}
          </PrimaryButton>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => setTab("videos")}>
            Video
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setTab("big")}>
            Ana Duyuru
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setTab("small")}>
            Duyuru
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setTab("image")}>
            Resim Slaytı
          </SecondaryButton>
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: BRAND.colors.muted }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Sadece aktif
        </label>

        <div className="text-sm" style={{ color: BRAND.colors.muted }}>
          Filtre
        </div>
        <select
          className="px-4 py-2 rounded-xl"
          style={{ background: BRAND.colors.panel, color: "white" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          disabled={tab === "videos"}
        >
          <option value="all">Hepsi</option>
          <option value="draft">Taslak</option>
          <option value="pending_review">Onay Bekliyor</option>
          <option value="approved">Onaylandı</option>
          <option value="published">Yayında</option>
          <option value="rejected">Reddedildi</option>
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {tab !== "videos" ? (loading ? (
          <div className="text-white">Yükleniyor…</div>
        ) : shown.length ? (
          shown.map((a: any) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl"
              style={{
                background: BRAND.colors.panel,
                border: a._activeNow ? `2px solid ${BRAND.colors.ok}` : `2px solid transparent`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-white text-xl font-extrabold truncate">
                    {a.title}
                    {a._activeNow ? (
                      <span className="ml-3 text-xs px-2 py-1 rounded-full" style={{ background: BRAND.colors.bg, color: BRAND.colors.ok }}>
                        AKTİF
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
                    Durum: <b>{a.status}</b> • Kategori: <b>{a.category}</b> • Öncelik: <b>{a.priority}</b>
                  </div>
                  <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                    {a.start_at ? `Başlangıç: ${new Date(a.start_at).toLocaleString("tr-TR")}` : "Başlangıç: —"} •{" "}
                    {a.end_at ? `Bitiş: ${new Date(a.end_at).toLocaleString("tr-TR")}` : "Bitiş: —"}
                  </div>
                  <label className="mt-2 inline-flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
                    <input type="checkbox" checked={!!a._activeNow} onChange={(e) => toggleAnnouncementActive(a, e.target.checked)} />
                    Aktif
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {a.status === "pending_review" && canApprove(profile.role) ? (
                    <SecondaryButton type="button" onClick={() => approveAndPublish(a)}>
                      Onayla & Yayınla
                    </SecondaryButton>
                  ) : null}
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setEditing(a);
                    }}
                  >
                    Düzenle
                  </SecondaryButton>
                  <SecondaryButton type="button" onClick={() => del(a.id)}>
                    Sil
                  </SecondaryButton>
                </div>
              </div>

              {a.body ? (
                <div className="mt-3 text-sm text-white whitespace-pre-line">
                  {String(a.body).slice(0, 220)}
                  {String(a.body).length > 220 ? "…" : ""}
                </div>
              ) : null}

              <ImagePreview imageUrl={a.image_url} imageUrls={a.image_urls} />
            </div>
          ))
        ) : (
          <div className="text-sm" style={{ color: BRAND.colors.muted }}>
            Kayıt yok.
          </div>
        )) : (videoLoading ? (
          <div className="text-white">Yükleniyor…</div>
        ) : shownVideos.length ? (
          shownVideos.map((v: any) => (
            <div
              key={v.id}
              className="p-5 rounded-2xl"
              style={{
                background: BRAND.colors.panel,
                border: v._activeNow ? `2px solid ${BRAND.colors.ok}` : `2px solid transparent`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-white text-xl font-extrabold truncate">
                    {v.title || "YouTube Video"}
                    {v._activeNow ? (
                      <span className="ml-3 text-xs px-2 py-1 rounded-full" style={{ background: BRAND.colors.bg, color: BRAND.colors.ok }}>
                        AKTİF
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
                    Öncelik: <b>{v.priority}</b>
                  </div>
                  <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                    {v.start_at ? `Başlangıç: ${new Date(v.start_at).toLocaleString("tr-TR")}` : "Başlangıç: —"} •{" "}
                    {v.end_at ? `Bitiş: ${new Date(v.end_at).toLocaleString("tr-TR")}` : "Bitiş: —"}
                  </div>
                  <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>{v.url}</div>
                  <label className="mt-2 inline-flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
                    <input type="checkbox" checked={!!v._activeNow} onChange={(e) => toggleVideoActive(v, e.target.checked)} />
                    Aktif
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setEditingVideo(v);
                    }}
                  >
                    Düzenle
                  </SecondaryButton>
                  <SecondaryButton type="button" onClick={() => delVideo(v.id)}>
                    Sil
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm" style={{ color: BRAND.colors.muted }}>
            Kayıt yok.
          </div>
        ))}
      </div>

      {editing ? (
        <AnnouncementForm
          initialState={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      ) : null}

      {editingVideo ? (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-2xl p-6 rounded-2xl overflow-auto max-h-[90vh]" style={{ background: BRAND.colors.bg }}>
            <div className="flex items-center justify-between">
              <div className="text-white text-2xl font-extrabold">{editingVideo.id ? "Video Düzenle" : "Yeni Video"}</div>
              <SecondaryButton type="button" onClick={() => setEditingVideo(null)}>
                Kapat
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel>Başlık (opsiyonel)</FieldLabel>
                <TextInput value={editingVideo.title ?? ""} onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })} />
              </div>

              <div>
                <FieldLabel>YouTube URL</FieldLabel>
                <TextInput value={editingVideo.url ?? ""} onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Öncelik (0–100)</FieldLabel>
                  <TextInput type="number" value={String(editingVideo.priority ?? 50)} onChange={(e) => setEditingVideo({ ...editingVideo, priority: Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Aktif</FieldLabel>
                  <select
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ background: BRAND.colors.panel, color: "white" }}
                    value={String(!!editingVideo.is_active)}
                    onChange={(e) => setEditingVideo({ ...editingVideo, is_active: e.target.value === "true" })}
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
                    value={toLocalInput(editingVideo.start_at)}
                    onChange={(e) => setEditingVideo({ ...editingVideo, start_at: e.target.value || null })}
                  />
                </div>
                <div>
                  <FieldLabel>Bitiş</FieldLabel>
                  <TextInput
                    type="datetime-local"
                    value={toLocalInput(editingVideo.end_at)}
                    onChange={(e) => setEditingVideo({ ...editingVideo, end_at: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <SecondaryButton type="button" onClick={() => setEditingVideo(null)}>
                  İptal
                </SecondaryButton>
                <PrimaryButton disabled={videoBusy} type="button" onClick={saveVideo}>
                  {videoBusy ? "Kaydediliyor…" : "Kaydet"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmData?.title || ""}
        description={confirmData?.desc}
        destructive
        confirmText="Sil"
        onConfirm={confirmData?.action || (() => { })}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminShell>
  );
}
