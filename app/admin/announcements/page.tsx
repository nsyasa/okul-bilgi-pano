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
  const [tab, setTab] = useState<"big" | "image" | "videos">("big");
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
    // 'small' is removed from logic, defaulting to empty or specific logic if needed.
    // tab types: "big" | "image" | "videos"
    const byTab = tab === "big"
      ? base.filter((x) => (x.display_mode ?? "small") === "big")
      : tab === "image"
        ? base.filter((x) => (x.display_mode ?? "small") === "image")
        : []; // "videos" tab uses separate logic

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
            Video, ana duyuru ve resim slaytı içeriklerini yönetin.
          </div>
        </div>
        {tab !== "videos" ? (
          <PrimaryButton type="button" onClick={startNew}>
            {tab === "big" ? "+ Yeni Ana Duyuru" : "+ Yeni Resim Slaytı"}
          </PrimaryButton>
        ) : (
          <PrimaryButton type="button" onClick={startNewVideo}>
            + Yeni Video
          </PrimaryButton>
        )}
      </div>

      {/* Rotation Settings - Modern Card */}
      <div className="mt-8 mb-8 overflow-hidden rounded-2xl border border-white/5 bg-white/5 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
        <div className="p-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4 min-w-[180px]">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand text-2xl">
              ↺
            </div>
            <div>
              <div className="text-white font-bold text-lg">Döngü Ayarları</div>
              <label className="flex items-center gap-2 cursor-pointer mt-1 opacity-70 hover:opacity-100 transition-opacity">
                <input type="checkbox" className="accent-brand" checked={rotation.enabled} onChange={(e) => setRotation({ ...rotation, enabled: e.target.checked })} />
                <span className="text-xs font-mono">{rotation.enabled ? "AKTİF" : "PASIF"}</span>
              </label>
            </div>
          </div>

          <div className="h-10 w-px bg-white/10 hidden md:block"></div>

          <div className="flex items-center gap-6 flex-wrap flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">Maks. Video</span>
              <div className="flex items-center gap-2">
                <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white w-20 text-sm focus:border-brand outline-none transition-colors" value={String(rotation.videoSeconds)} onChange={(e) => setRotation({ ...rotation, videoSeconds: Math.max(5, Number(e.target.value)) })} />
                <span className="text-xs text-white/30">sn</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">Her Resim</span>
              <div className="flex items-center gap-2">
                <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white w-20 text-sm focus:border-brand outline-none transition-colors" value={String(rotation.imageSeconds)} onChange={(e) => setRotation({ ...rotation, imageSeconds: Math.max(5, Number(e.target.value)) })} />
                <span className="text-xs text-white/30">sn</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">Her Duyuru</span>
              <div className="flex items-center gap-2">
                <input type="number" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white w-20 text-sm focus:border-brand outline-none transition-colors" value={String(rotation.textSeconds)} onChange={(e) => setRotation({ ...rotation, textSeconds: Math.max(5, Number(e.target.value)) })} />
                <span className="text-xs text-white/30">sn</span>
              </div>
            </div>
          </div>

          <div className="flex-none">
            <PrimaryButton disabled={savingRotation} type="button" onClick={saveSettings}>
              {savingRotation ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-8">
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => setTab("videos")}>
            Video
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setTab("big")}>
            Ana Duyuru
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

      <div className="mt-8">
        {tab !== "videos" ? (loading ? (
          <div className="p-12 text-center text-white/50 animate-pulse bg-white/5 rounded-2xl">
            Veriler yükleniyor...
          </div>
        ) : shown.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5 ring-1 ring-white/5 shadow-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20">
                <tr className="border-b border-white/5 text-white/40 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-5 py-4 w-16 text-center">#</th>
                  <th className="px-5 py-4 w-1/3">Başlık & İçerik</th>
                  <th className="px-5 py-4">Kategori / Öncelik</th>
                  <th className="px-5 py-4">Tarih</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((a: any) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-5 py-4 align-top">
                      <div className="w-16 h-12 rounded-lg bg-black/40 overflow-hidden relative shadow-sm border border-white/10">
                        {(a.image_url || a.image_urls?.[0]) ? (
                          <img src={a.image_url || a.image_urls[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10 text-[10px]">Görsel Yok</div>
                        )}
                        {a.display_mode === 'image' && <div className="absolute inset-0 bg-brand/20 flex items-center justify-center"><span className="text-white text-xs drop-shadow-md">📸</span></div>}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-bold text-white text-base leading-snug group-hover:text-brand transition-colors line-clamp-1">{a.title}</div>
                      {a.body && <div className="text-white/50 text-xs mt-1 line-clamp-2 leading-relaxed max-w-sm">{a.body}</div>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-2 items-start">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-white/5 text-xs text-white/80 border border-white/5 font-medium">
                          {a.category === 'general' ? 'Genel' : a.category === 'event' ? 'Etkinlik' : a.category === 'health' ? 'Sağlık' : a.category === 'special_day' ? 'Özel Gün' : a.category}
                        </div>
                        <span className="text-[10px] text-white/30 font-mono bg-black/20 px-1.5 py-0.5 rounded">Öncelik: {a.priority}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-1 text-xs text-white/60">
                        {a.start_at ? <span className="whitespace-nowrap flex items-center gap-1">📅 {new Date(a.start_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}</span> : <span className="opacity-30">—</span>}
                        {a.end_at ? <span className="whitespace-nowrap flex items-center gap-1 text-white/40">🏁 {new Date(a.end_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}</span> : null}
                      </div>
                      {a._activeNow && <div className="mt-2 text-[10px] font-bold text-green-400 flex items-center gap-1 animate-pulse">● YAYINDA</div>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      {a.status === 'published' ? <span className="inline-flex px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">Yayında</span> :
                        a.status === 'approved' ? <span className="inline-flex px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">Onaylandı</span> :
                          a.status === 'pending_review' ? <span className="inline-flex px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">Onay Bekliyor</span> :
                            a.status === 'rejected' ? <span className="inline-flex px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">Reddedildi</span> :
                              <span className="inline-flex px-2 py-1 rounded-md bg-white/5 text-white/50 text-xs font-semibold border border-white/10">Taslak</span>}

                      {a._activeNow && <div className="mt-2 text-[10px] text-white/30 flex items-center gap-1">
                        <input type="checkbox" className="accent-green-500" checked={true} readOnly /> Aktif
                      </div>}
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {/* Toggle Active Button (Quick Action) */}
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-emerald-500 cursor-pointer mr-2 opacity-50 hover:opacity-100"
                          checked={!!a._activeNow}
                          onChange={(e) => toggleAnnouncementActive(a, e.target.checked)}
                          title="Hızlı Yayınla/Kaldır"
                        />

                        {a.status === "pending_review" && canApprove(profile.role) && (
                          <button onClick={() => approveAndPublish(a)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors" title="Onayla">
                            ✓
                          </button>
                        )}
                        <button onClick={() => setEditing(a)} className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors" title="Düzenle">
                          ✎
                        </button>
                        <button onClick={() => del(a.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors" title="Sil">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center rounded-2xl border border-white/5 bg-white/5 border-dashed flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-4 opacity-30">📭</div>
            <div className="text-white font-medium text-lg">Kayıt bulunamadı</div>
            <div className="text-white/40 text-sm mt-1 max-w-xs leading-relaxed">Yeni bir ana duyuru veya resim slaytı ekleyerek başlayabilirsiniz.</div>
            <button onClick={startNew} className="mt-6 px-6 py-2 rounded-xl bg-brand text-white text-sm font-bold opacity-80 hover:opacity-100 transition-opacity">
              + Yeni Ekle
            </button>
          </div>
        )) : (videoLoading ? (
          <div className="p-12 text-center text-white/50 animate-pulse bg-white/5 rounded-2xl">
            Videolar yükleniyor...
          </div>
        ) : shownVideos.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5 ring-1 ring-white/5 shadow-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20">
                <tr className="border-b border-white/5 text-white/40 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-5 py-4 w-16 text-center">Tür</th>
                  <th className="px-5 py-4 w-1/3">Video Detayı</th>
                  <th className="px-5 py-4">Sıra / Link</th>
                  <th className="px-5 py-4">Tarih</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shownVideos.map((v: any) => (
                  <tr key={v.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-5 py-4 align-top">
                      <div className="w-16 h-12 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500 text-2xl border border-red-500/30">
                        ▶
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-bold text-white text-base leading-snug group-hover:text-red-400 transition-colors line-clamp-1">{v.title || "YouTube Video"}</div>
                      <div className="text-white/30 text-xs mt-1 truncate font-mono max-w-xs opacity-60 hover:opacity-100">{v.url}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="text-[10px] text-white/30 font-mono bg-black/20 px-1.5 py-0.5 rounded inline-block">Sıra: {v.priority}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-1 text-xs text-white/60">
                        {v.start_at ? <span className="whitespace-nowrap flex items-center gap-1">📅 {new Date(v.start_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}</span> : <span className="opacity-30">—</span>}
                      </div>
                      {v._activeNow && <div className="mt-2 text-[10px] font-bold text-green-400 flex items-center gap-1 animate-pulse">● YAYINDA</div>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      {v._activeNow ? (
                        <span className="inline-flex px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">Aktif</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-md bg-white/5 text-white/50 text-xs font-semibold border border-white/10">Pasif</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-emerald-500 cursor-pointer mr-2 opacity-50 hover:opacity-100"
                          checked={!!v._activeNow}
                          onChange={(e) => toggleVideoActive(v, e.target.checked)}
                          title="Hızlı Yayınla/Kaldır"
                        />
                        <button onClick={() => setEditingVideo(v)} className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors" title="Düzenle">
                          ✎
                        </button>
                        <button onClick={() => delVideo(v.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors" title="Sil">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center rounded-2xl border border-white/5 bg-white/5 border-dashed flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-4 opacity-30">🎥</div>
            <div className="text-white font-medium text-lg">Video bulunamadı</div>
            <div className="text-white/40 text-sm mt-1 max-w-xs leading-relaxed">YouTube videosu ekleyerek başlayabilirsiniz.</div>
            <button onClick={startNewVideo} className="mt-6 px-6 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold transition-colors">
              + Video Ekle
            </button>
          </div>
        ))}
      </div>

      {
        editing ? (
          <AnnouncementForm
            initialState={editing}
            onClose={() => setEditing(null)}
            onSave={save}
            busy={busy}
          />
        ) : null
      }

      {
        editingVideo ? (
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
        ) : null
      }
      <ConfirmDialog
        open={confirmOpen}
        title={confirmData?.title || ""}
        description={confirmData?.desc}
        destructive
        confirmText="Sil"
        onConfirm={confirmData?.action || (() => { })}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminShell >
  );
}
