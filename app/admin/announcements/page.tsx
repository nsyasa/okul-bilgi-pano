"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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
  const [tab, setTab] = useState<"videos" | "big" | "image">("videos");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [showPassive, setShowPassive] = useState(true);

  // Confirm State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);



  const load = async () => {
    setLoading(true);
    const { data, error } = await sb.from("announcements").select("*").order("priority", { ascending: false }).limit(200);
    setLoading(false);
    if (!error) setItems((data ?? []) as Announcement[]);
  };

  const loadVideos = async () => {
    setVideoLoading(true);
    const { data, error } = await sb.from("youtube_videos").select("*").order("priority", { ascending: false }).limit(200);
    setVideoLoading(false);
    if (!error) setVideos((data ?? []) as YouTubeVideo[]);
  };



  const searchParams = useSearchParams();

  useEffect(() => {
    load();
    loadVideos();

    if (searchParams.get("new") === "true") {
      startNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Aktif ve Pasif olarak grupla
  const now = useMemo(() => new Date(), [items, videos]);

  const { activeAnnouncements, passiveAnnouncements } = useMemo(() => {
    const byTab = tab === "big"
      ? items.filter((x) => (x.display_mode ?? "small") === "big")
      : tab === "image"
        ? items.filter((x) => (x.display_mode ?? "small") === "image")
        : [];

    const withStatus = byTab.map((x) => ({
      ...x,
      _isActive: x.status === "published" && inWindow(x, now),
    }));

    return {
      activeAnnouncements: withStatus.filter((x) => x._isActive).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
      passiveAnnouncements: withStatus.filter((x) => !x._isActive).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    };
  }, [items, tab, now]);

  const { activeVideos, passiveVideos } = useMemo(() => {
    const withStatus = videos.map((x) => ({
      ...x,
      _isActive: x.is_active && inWindowVideo(x, now),
    }));

    return {
      activeVideos: withStatus.filter((x) => x._isActive).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
      passiveVideos: withStatus.filter((x) => !x._isActive).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    };
  }, [videos, now]);

  const startNew = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    setEditing({
      title: "",
      body: "",
      image_url: null,
      image_urls: null,
      priority: 50,
      status: "published",
      category: "general",
      display_mode: tab === "big" ? "big" : tab === "image" ? "image" : "small",
      start_at: now.toISOString(),
      end_at: end.toISOString(),
      approved_label: false,
    });
  };

  const startNewVideo = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    setEditingVideo({
      title: "",
      url: "",
      is_active: true,
      priority: 50,
      start_at: now.toISOString(),
      end_at: end.toISOString(),
    });
  };

  const save = async (formData: AnnouncementFormState) => {
    setBusy(true);
    try {
      const payload: Partial<Announcement> = {
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

      setEditing(null);
      await load();
      toast.success("Başarıyla kaydedildi.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu.");
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
    const payload: Partial<Announcement> = next ? { status: "published" } : { status: "draft" };
    if (next && a.category === "sensitive") {
      payload.status = "pending_review";
      payload.approved_label = false;
    }
    const { error } = await sb.from("announcements").update(payload).eq("id", a.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Yayına alındı." : "Yayından kaldırıldı.");
      await load();
    }
  };

  const toggleVideoActive = async (v: YouTubeVideo, next: boolean) => {
    const { error } = await sb.from("youtube_videos").update({ is_active: next }).eq("id", v.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Yayına alındı." : "Yayından kaldırıldı.");
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
      const payload: Partial<YouTubeVideo> = {
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu.");
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

  type ContentCardProps =
    | { item: Announcement; type: "announcement"; isActive: boolean }
    | { item: YouTubeVideo; type: "video"; isActive: boolean };

  // İçerik Kartı Bileşeni - Daha Kompakt
  const ContentCard = ({ item, type, isActive }: ContentCardProps) => {
    const isAnnouncement = type === "announcement";
    const announcementItem = isAnnouncement ? (item as Announcement) : null;
    const videoItem = !isAnnouncement ? (item as YouTubeVideo) : null;
    const hasImage = isAnnouncement && announcementItem && (announcementItem.image_url || announcementItem.image_urls?.[0]);

    return (
      <div className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${isActive
        ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
        : "bg-white/[0.03] border border-white/10 hover:border-white/20"
        }`}>
        {/* Görsel veya Video İkonu */}
        <div className="relative h-28 bg-black/20 overflow-hidden">
          {isAnnouncement && announcementItem && hasImage ? (
            <img src={announcementItem.image_url || announcementItem.image_urls?.[0]} alt="" className="w-full h-full object-cover" />
          ) : isAnnouncement ? (
            <div className="w-full h-full flex items-center justify-center text-white/10">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/30 to-red-800/30">
              <div className="text-4xl">▶️</div>
            </div>
          )}

          {/* Yayın Durumu Badge */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isActive
            ? "bg-emerald-500 text-white shadow-lg"
            : "bg-black/60 text-white/60"
            }`}>
            {isActive ? "● Yayında" : "Pasif"}
          </div>

          {/* Resim Sayısı */}
          {isAnnouncement && announcementItem && (announcementItem.image_urls?.length ?? 0) > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-md text-[10px] text-white font-mono">
              {announcementItem.image_urls!.length} resim
            </div>
          )}
        </div>

        {/* İçerik */}
        <div className="p-3">
          <h3 className="text-white font-semibold text-sm truncate mb-1">
            {item.title || (isAnnouncement ? "Başlıksız Duyuru" : "YouTube Video")}
          </h3>

          {isAnnouncement && announcementItem?.body && (
            <p className="text-white/40 text-xs line-clamp-2 mb-2">{announcementItem.body}</p>
          )}

          {!isAnnouncement && videoItem?.url && (
            <p className="text-white/30 text-[10px] font-mono truncate mb-2">{videoItem.url}</p>
          )}

          {/* Alt Bilgiler */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 font-mono">#{item.priority}</span>
              {isAnnouncement && announcementItem?.category && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                  {announcementItem.category === 'general' ? 'Genel' : announcementItem.category === 'event' ? 'Etkinlik' : announcementItem.category}
                </span>
              )}
            </div>

            {/* Hızlı Aksiyonlar */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Toggle Yayın */}
              <button
                onClick={() => isAnnouncement && announcementItem ? toggleAnnouncementActive(announcementItem, !isActive) : videoItem && toggleVideoActive(videoItem, !isActive)}
                className={`p-1.5 rounded-lg transition-colors ${isActive
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40"
                  }`}
                title={isActive ? "Yayından Kaldır" : "Yayına Al"}
              >
                {isActive ? "⏸" : "▶"}
              </button>

              {/* Düzenle */}
              <button
                onClick={() => isAnnouncement && announcementItem ? setEditing(announcementItem) : videoItem && setEditingVideo(videoItem)}
                className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                title="Düzenle"
              >
                ✎
              </button>

              {/* Sil */}
              <button
                onClick={() => isAnnouncement && announcementItem ? del(announcementItem.id) : videoItem && delVideo(videoItem.id)}
                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 transition-colors"
                title="Sil"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Boş Durum Bileşeni
  const EmptyState = ({ type }: { type: "video" | "announcement" }) => (
    <div className="text-center py-12 px-6 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02]">
      <div className="text-4xl mb-3 opacity-30">{type === "video" ? "🎥" : "📢"}</div>
      <p className="text-white/50 font-medium">Henüz içerik yok</p>
      <button
        onClick={type === "video" ? startNewVideo : startNew}
        className="mt-4 px-4 py-2 rounded-lg bg-brand/80 hover:bg-brand text-white text-sm font-semibold transition-colors"
      >
        + {type === "video" ? "Video Ekle" : "Duyuru Ekle"}
      </button>
    </div>
  );

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold">Ana Ekran İçerikleri</h1>
          <p className="text-sm mt-1 text-white/40">
            Video, ana duyuru ve resim slaytı içeriklerini yönetin.
          </p>
        </div>

        {/* Yeni Ekle Butonu */}
        <PrimaryButton type="button" onClick={tab === "videos" ? startNewVideo : startNew}>
          {tab === "videos" ? "+ Yeni Video" : tab === "big" ? "+ Yeni Duyuru" : "+ Yeni Resim Slaytı"}
        </PrimaryButton>
      </div>

      {/* Tab Seçimi - Modern Tasarım */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { key: "videos", label: "🎥 Video", count: activeVideos.length },
          { key: "big", label: "📢 Duyuru", count: activeAnnouncements.length },
          { key: "image", label: "🖼️ Resim Slaytı", count: activeAnnouncements.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "videos" | "big" | "image")}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${tab === t.key
              ? "bg-brand text-white shadow-lg shadow-brand/30"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {t.key === "videos" ? activeVideos.length : (t.key === "big" ? items.filter(x => x.display_mode === "big").filter(x => x.status === "published" && inWindow(x, now)).length : items.filter(x => x.display_mode === "image").filter(x => x.status === "published" && inWindow(x, now)).length)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Döngü Ayarları - Compact */}


      {/* İçerik Alanı */}
      {tab === "videos" ? (
        /* VIDEO SEKMESİ */
        videoLoading ? (
          <div className="text-center py-12 text-white/50 animate-pulse">Videolar yükleniyor...</div>
        ) : (
          <div className="space-y-8">
            {/* Yayındaki Videolar */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                <h2 className="text-white font-bold">Yayındaki Videolar</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-mono">
                  {activeVideos.length}
                </span>
              </div>

              {activeVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeVideos.map((v: YouTubeVideo) => (
                    <ContentCard key={v.id} item={v} type="video" isActive={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                  Yayında video yok
                </div>
              )}
            </section>

            {/* Pasif Videolar */}
            <section>
              <button
                onClick={() => setShowPassive(!showPassive)}
                className="flex items-center gap-3 mb-4 group cursor-pointer"
              >
                <div className="w-1.5 h-6 bg-white/20 rounded-full"></div>
                <h2 className="text-white/60 font-bold group-hover:text-white transition-colors">Pasif Videolar</h2>
                <span className="text-xs bg-white/10 text-white/40 px-2 py-1 rounded-full font-mono">
                  {passiveVideos.length}
                </span>
                <span className="text-white/30 text-sm ml-2">{showPassive ? "▼" : "▶"}</span>
              </button>

              {showPassive && passiveVideos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {passiveVideos.map((v: YouTubeVideo) => (
                    <ContentCard key={v.id} item={v} type="video" isActive={false} />
                  ))}
                </div>
              )}

              {showPassive && passiveVideos.length === 0 && (
                <div className="text-center py-4 text-white/20 text-sm">Pasif video yok</div>
              )}
            </section>

            {activeVideos.length === 0 && passiveVideos.length === 0 && (
              <EmptyState type="video" />
            )}
          </div>
        )
      ) : (
        /* DUYURU SEKMELERİ (big / image) */
        loading ? (
          <div className="text-center py-12 text-white/50 animate-pulse">Veriler yükleniyor...</div>
        ) : (
          <div className="space-y-8">
            {/* Yayındaki Duyurular */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                <h2 className="text-white font-bold">Yayında</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-mono">
                  {activeAnnouncements.length}
                </span>
              </div>

              {activeAnnouncements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeAnnouncements.map((a: Announcement) => (
                    <ContentCard key={a.id} item={a} type="announcement" isActive={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                  Yayında içerik yok
                </div>
              )}
            </section>

            {/* Pasif Duyurular */}
            <section>
              <button
                onClick={() => setShowPassive(!showPassive)}
                className="flex items-center gap-3 mb-4 group cursor-pointer"
              >
                <div className="w-1.5 h-6 bg-white/20 rounded-full"></div>
                <h2 className="text-white/60 font-bold group-hover:text-white transition-colors">Pasif / Taslak</h2>
                <span className="text-xs bg-white/10 text-white/40 px-2 py-1 rounded-full font-mono">
                  {passiveAnnouncements.length}
                </span>
                <span className="text-white/30 text-sm ml-2">{showPassive ? "▼" : "▶"}</span>
              </button>

              {showPassive && passiveAnnouncements.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {passiveAnnouncements.map((a: Announcement) => (
                    <ContentCard key={a.id} item={a} type="announcement" isActive={false} />
                  ))}
                </div>
              )}

              {showPassive && passiveAnnouncements.length === 0 && (
                <div className="text-center py-4 text-white/20 text-sm">Pasif içerik yok</div>
              )}
            </section>

            {activeAnnouncements.length === 0 && passiveAnnouncements.length === 0 && (
              <EmptyState type="announcement" />
            )}
          </div>
        )
      )}

      {/* Duyuru Düzenleme Modal */}
      {editing && (
        <AnnouncementForm
          initialState={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      )}

      {/* Video Düzenleme Modal */}
      {editingVideo && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-lg p-6 rounded-2xl" style={{ background: BRAND.colors.bg }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-xl font-bold">
                {editingVideo.id ? "Video Düzenle" : "Yeni Video"}
              </h2>
              <button onClick={() => setEditingVideo(null)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Başlık (opsiyonel)</FieldLabel>
                <TextInput
                  value={editingVideo.title ?? ""}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  placeholder="Video başlığı"
                />
              </div>

              <div>
                <FieldLabel>YouTube URL *</FieldLabel>
                <TextInput
                  value={editingVideo.url ?? ""}
                  onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Öncelik</FieldLabel>
                  <TextInput
                    type="number"
                    value={String(editingVideo.priority ?? 50)}
                    onChange={(e) => setEditingVideo({ ...editingVideo, priority: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel>Durum</FieldLabel>
                  <select
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{ background: BRAND.colors.panel }}
                    value={editingVideo.is_active ? "true" : "false"}
                    onChange={(e) => setEditingVideo({ ...editingVideo, is_active: e.target.value === "true" })}
                  >
                    <option value="true">Yayında</option>
                    <option value="false">Pasif</option>
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

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
      )}

      {/* Onay Dialog */}
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
