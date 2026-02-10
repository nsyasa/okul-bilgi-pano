"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Announcement, PlayerRotationSettings, YouTubeVideo } from "@/types/player";
import { toast } from "react-hot-toast";

export default function FlowPage() {
    return <AuthGate>{(profile) => <FlowInner profile={profile} />}</AuthGate>;
}

type FlowItem = {
    id: string;
    kind: "announcement" | "video";
    title: string;
    flow_order: number;
    created_at: string;
    is_active: boolean; // Normalized: announcement.status === 'published', video.is_active === true
    image?: string;
    type_label: "Video" | "Resim" | "Duyuru";
    duration_source: "videoSeconds" | "imageSeconds" | "textSeconds";
    original: Announcement | YouTubeVideo;
};

function FlowInner({ profile }: { profile: any }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const [items, setItems] = useState<FlowItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [rotation, setRotation] = useState<PlayerRotationSettings>({
        enabled: true,
        videoSeconds: 30,
        imageSeconds: 10,
        textSeconds: 10,
    });
    const [savingRotation, setSavingRotation] = useState(false);

    // Fetch items sorted by flow_order
    const load = async () => {
        setLoading(true);

        // 1. Fetch Announcements (ALL)
        const { data: announcements, error: annError } = await sb
            .from("announcements")
            .select("*")
            .neq("status", "draft") // Draft = tamamen gizli, ama Passive = rejected/pending? 
            // User asked for "Passive" list. Maybe we should fetch draft too?
            // Let's fetch everything except deleted (if implement soft delete).
            // Actually, user wants "Active" vs "Passive". 
            // "Active" = published. "Passive" = anything else visible in admin?
            // Let's fetch ALL for now and let UI filter.
            .order("created_at", { ascending: false });

        // 2. Fetch Videos (ALL)
        const { data: videos, error: vidError } = await sb
            .from("youtube_videos")
            .select("*")
            .order("created_at", { ascending: false });

        if (annError || vidError) {
            toast.error("Veri yüklenirken hata oluştu.");
            setLoading(false);
            return;
        }

        // 3. Merge and Normalize
        const merged: FlowItem[] = [];

        (announcements as Announcement[] || []).forEach(a => {
            // "Matematik Duyurusu" cleanup logic could be here, but let's do sort first.
            const isImage = a.display_mode === 'image';
            merged.push({
                id: a.id,
                kind: "announcement",
                title: a.title,
                flow_order: a.flow_order ?? 0,
                created_at: a.created_at,
                is_active: a.status === 'published',
                image: a.image_url || (a.image_urls && a.image_urls.length > 0 ? a.image_urls[0] : undefined),
                type_label: isImage ? "Resim" : (a.display_mode === 'big' ? "Duyuru" : "Metin"),
                duration_source: isImage ? "imageSeconds" : "textSeconds",
                original: a
            });
        });

        (videos as YouTubeVideo[] || []).forEach(v => {
            merged.push({
                id: v.id,
                kind: "video",
                title: v.title || "İsimsiz Video",
                flow_order: (v as any).flow_order ?? 0, // Cast because API might not see flow_order yet
                created_at: (v as any).created_at, // created_at exists on video
                is_active: v.is_active,
                image: `https://img.youtube.com/vi/${v.url}/mqdefault.jpg`, // Simple thumbnail
                type_label: "Video",
                duration_source: "videoSeconds",
                original: v
            });
        });

        // 4. Sort
        // Primary: flow_order ASC
        // Secondary: created_at DESC
        merged.sort((a, b) => {
            if (a.flow_order !== b.flow_order) return a.flow_order - b.flow_order;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setItems(merged);
        setLoading(false);
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

    useEffect(() => {
        load();
        loadSettings();
    }, []);

    const saveSettings = async () => {
        setSavingRotation(true);
        const { error } = await sb.from("player_settings").upsert({ key: "rotation", value: rotation });
        if (error) toast.error("Hata: " + error.message);
        else toast.success("Ayarlar kaydedildi.");
        setSavingRotation(false);
    };

    const move = async (item: FlowItem, direction: "up" | "down", listContext: FlowItem[]) => {
        if (saving) return;

        const index = listContext.findIndex(x => x.id === item.id);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= listContext.length) return;

        const targetItem = listContext[targetIndex];

        // Optimistic Update
        // We swap their order in the full 'items' list.
        // Finding them in main list
        const mainIndexA = items.findIndex(x => x.id === item.id);
        const mainIndexB = items.findIndex(x => x.id === targetItem.id);

        const newItems = [...items];
        const temp = newItems[mainIndexA];
        newItems[mainIndexA] = newItems[mainIndexB];
        newItems[mainIndexB] = temp;

        // Recalculate flow_order based on new positions?
        // Actually simpler: Swap their flow_order values.
        const orderA = targetItem.flow_order;
        const orderB = item.flow_order;

        // Update local state details to reflect swap
        newItems[mainIndexA].flow_order = orderA;
        newItems[mainIndexB].flow_order = orderB;

        // Re-sort locally to ensure UI consistency
        newItems.sort((a, b) => {
            if (a.flow_order !== b.flow_order) return a.flow_order - b.flow_order;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setItems(newItems);
        setSaving(true);

        try {
            // Update DB
            const updates = [];

            // Update Item A
            if (item.kind === 'announcement') {
                updates.push(sb.from("announcements").update({ flow_order: orderA }).eq("id", item.id));
            } else {
                updates.push(sb.from("youtube_videos").update({ flow_order: orderA }).eq("id", item.id));
            }

            // Update Item B
            if (targetItem.kind === 'announcement') {
                updates.push(sb.from("announcements").update({ flow_order: orderB }).eq("id", targetItem.id));
            } else {
                updates.push(sb.from("youtube_videos").update({ flow_order: orderB }).eq("id", targetItem.id));
            }

            await Promise.all(updates);
            toast.success("Sıralama güncellendi");
        } catch (e) {
            toast.error("Sıralama hatası");
            await load(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (item: FlowItem) => {
        if (saving) return;
        setSaving(true);

        const newStatus = !item.is_active;

        try {
            if (item.kind === 'announcement') {
                // Toggle between 'published' and 'draft' (or 'rejected'?)
                // User said "Pasife Al". 'draft' removes it from public view.
                const statusStr = newStatus ? 'published' : 'draft';
                await sb.from("announcements").update({ status: statusStr }).eq("id", item.id);
            } else {
                await sb.from("youtube_videos").update({ is_active: newStatus }).eq("id", item.id);
            }

            toast.success(newStatus ? "Yayına alındı" : "Pasife alındı");

            // Update local state
            setItems(prev => prev.map(x => x.id === item.id ? { ...x, is_active: newStatus } : x));

        } catch (e) {
            toast.error("İşlem başarısız");
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (item: FlowItem) => {
        if (!confirm("Bu içeriği silmek istediğinize emin misiniz?")) return;
        setSaving(true);
        try {
            if (item.kind === 'announcement') {
                await sb.from("announcements").delete().eq("id", item.id);
            } else {
                await sb.from("youtube_videos").delete().eq("id", item.id);
            }
            toast.success("Silindi");
            setItems(prev => prev.filter(x => x.id !== item.id));
        } catch (e) {
            toast.error("Silinemedi");
        } finally {
            setSaving(false);
        }
    };

    // Split items
    const activeItems = useMemo(() => items.filter(x => x.is_active), [items]);
    const passiveItems = useMemo(() => items.filter(x => !x.is_active), [items]);

    return (
        <AdminShell profile={profile}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Akış Sırası</h1>
                <p className="text-white/40 mt-1">Duyuruların ve videoların ekranda dönme sırasını belirleyin.</p>
            </div>

            {/* Döngü Ayarları */}
            <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                {/* (UI Code for settings - Keeping simpler for brevity as previous implementation was good) */}
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xl">↺</div>
                        <div>
                            <div className="text-white font-bold">Döngü Süreleri</div>
                            <div className="text-xs text-white/40">Her içerik türü için varsayılan süre</div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {/* Video Input */}
                        <div className="bg-white/5 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="text-lg">🎥</span>
                            <input
                                type="number"
                                className="w-12 bg-transparent text-white font-bold text-center outline-none"
                                value={rotation.videoSeconds}
                                onChange={(e) => setRotation({ ...rotation, videoSeconds: Number(e.target.value) })}
                            />
                            <span className="text-xs text-white/40">sn</span>
                        </div>
                        {/* Image Input */}
                        <div className="bg-white/5 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="text-lg">🖼️</span>
                            <input
                                type="number"
                                className="w-12 bg-transparent text-white font-bold text-center outline-none"
                                value={rotation.imageSeconds}
                                onChange={(e) => setRotation({ ...rotation, imageSeconds: Number(e.target.value) })}
                            />
                            <span className="text-xs text-white/40">sn</span>
                        </div>
                        {/* Text Input */}
                        <div className="bg-white/5 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="text-lg">📢</span>
                            <input
                                type="number"
                                className="w-12 bg-transparent text-white font-bold text-center outline-none"
                                value={rotation.textSeconds}
                                onChange={(e) => setRotation({ ...rotation, textSeconds: Number(e.target.value) })}
                            />
                            <span className="text-xs text-white/40">sn</span>
                        </div>

                        <button
                            onClick={saveSettings}
                            disabled={savingRotation}
                            className="px-4 py-2 bg-brand hover:bg-brand-hover rounded-lg text-white font-bold text-sm transition-colors"
                        >
                            {savingRotation ? "..." : "Kaydet"}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-white/40 animate-pulse">Yükleniyor...</div>
            ) : (
                <div className="space-y-8 max-w-4xl">

                    {/* AKTİF LİSTE */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <h2 className="text-lg font-bold text-white">Yayındaki İçerikler</h2>
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/60">{activeItems.length}</span>
                        </div>

                        <div className="space-y-2">
                            {activeItems.map((item, idx) => (
                                <FlowListItem
                                    key={item.id}
                                    item={item}
                                    index={idx}
                                    total={activeItems.length}
                                    onMove={(d) => move(item, d, activeItems)}
                                    onToggle={() => toggleStatus(item)}
                                    onDelete={() => deleteItem(item)}
                                    rotation={rotation}
                                />
                            ))}
                            {activeItems.length === 0 && (
                                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-white/30 text-sm">
                                    Yayında içerik yok.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PASİF LİSTE */}
                    {passiveItems.length > 0 && (
                        <div className="opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3 mb-4 mt-8">
                                <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                <h2 className="text-lg font-bold text-white">Pasif / Bekleyenler</h2>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/60">{passiveItems.length}</span>
                            </div>

                            <div className="space-y-2">
                                {passiveItems.map((item, idx) => (
                                    <FlowListItem
                                        key={item.id}
                                        item={item}
                                        index={idx}
                                        total={passiveItems.length}
                                        onMove={() => { }} // Pasif listede sıralama yok
                                        onToggle={() => toggleStatus(item)}
                                        onDelete={() => deleteItem(item)}
                                        rotation={rotation}
                                        isPassive
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </AdminShell>
    );
}

function FlowListItem({ item, index, total, onMove, onToggle, onDelete, rotation, isPassive }: {
    item: FlowItem,
    index: number,
    total: number,
    onMove: (d: "up" | "down") => void,
    onToggle: () => void,
    onDelete: () => void,
    rotation: PlayerRotationSettings,
    isPassive?: boolean
}) {
    const icon = item.kind === 'video' ? '🎥' : item.type_label === 'Resim' ? '🖼️' : '📢';
    const duration = rotation[item.duration_source] || 10;

    return (
        <div className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${isPassive ? 'bg-black/20 border-white/5' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'}`}>
            <div className="flex items-center gap-4 overflow-hidden">
                {!isPassive && <div className="text-white/20 font-mono text-sm w-6 text-center">{index + 1}</div>}

                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-xl shrink-0">
                    {icon}
                </div>

                {item.image ? (
                    <div className="w-16 h-10 rounded bg-black/50 overflow-hidden relative shrink-0">
                        <img
                            src={item.image}
                            className="w-full h-full object-cover opacity-80"
                            alt=""
                        />
                    </div>
                ) : (
                    <div className="w-16 h-10 rounded bg-white/5 flex items-center justify-center text-[10px] text-white/20 shrink-0">
                        NO IMG
                    </div>
                )}

                <div className="min-w-0">
                    <div className={`font-medium truncate ${isPassive ? 'text-white/50' : 'text-white'}`}>{item.title}</div>
                    <div className="text-xs text-white/40 flex items-center gap-3">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{item.type_label}</span>
                        <span className="flex items-center gap-1">⏱️ {duration}sn</span>
                        <span className="hidden sm:inline">• {new Date(item.created_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4">
                {/* Active/Passive Toggle */}
                <button
                    onClick={onToggle}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${item.is_active
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                >
                    {item.is_active ? "Pasife Al" : "Yayına Al"}
                </button>

                {/* Move Buttons (Only for active) */}
                {!isPassive && (
                    <div className="flex flex-col gap-0.5">
                        <button
                            onClick={() => onMove("up")}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-10"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                            onClick={() => onMove("down")}
                            disabled={index === total - 1}
                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-10"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                )}

                {/* Delete Button */}
                <button
                    onClick={onDelete}
                    className="p-2 text-white/20 hover:text-red-400 transition-colors"
                    title="Sil"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
}
