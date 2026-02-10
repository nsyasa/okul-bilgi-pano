"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Announcement, PlayerRotationSettings } from "@/types/player";
import { toast } from "react-hot-toast";

export default function FlowPage() {
    return <AuthGate>{(profile) => <FlowInner profile={profile} />}</AuthGate>;
}

function FlowInner({ profile }: { profile: any }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const [items, setItems] = useState<Announcement[]>([]);
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
        const { data, error } = await sb
            .from("announcements")
            .select("*")
            .neq("status", "draft") // Sadece yayında veya onay bekleyenleri gösterelim
            .order("flow_order", { ascending: true }) // Sıraya göre getir
            .order("created_at", { ascending: false }); // Fallback

        if (error) {
            toast.error("Yüklenirken hata oluştu: " + error.message);
        } else {
            setItems((data ?? []) as any);
        }
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

    // Swap functionality
    const move = async (index: number, direction: "up" | "down") => {
        if (saving) return; // Prevent double clicks

        const newItems = [...items];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        // Boundary checks
        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        // Optimistic UI update
        const temp = newItems[index];
        newItems[index] = newItems[targetIndex];
        newItems[targetIndex] = temp;
        setItems(newItems);

        setSaving(true);
        try {
            // Update both items in DB
            const itemA = newItems[index];
            const itemB = newItems[targetIndex];

            const orderA = itemB.flow_order ?? 0;
            const orderB = itemA.flow_order ?? 0;

            const p1 = sb.from("announcements").update({ flow_order: orderB }).eq("id", itemA.id);
            const p2 = sb.from("announcements").update({ flow_order: orderA }).eq("id", itemB.id);

            await Promise.all([p1, p2]);

            itemA.flow_order = orderB;
            itemB.flow_order = orderA;

            toast.success("Sıralama güncellendi");
        } catch (e) {
            toast.error("Sıralama kaydedilemedi.");
            await load(); // Revert on error
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminShell profile={profile}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Akış Sırası</h1>
                <p className="text-white/40 mt-1">Duyuruların ekranda dönme sırasını belirleyin.</p>
            </div>

            {/* Döngü Ayarları */}
            <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xl">↺</div>
                        <div>
                            <div className="text-white font-bold">Döngü Ayarları</div>
                            <div className="text-xs text-white/40">Süreleri buradan yönetin</div>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-white/10 hidden lg:block"></div>

                    <div className="flex items-center gap-4 flex-wrap flex-1">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <span className="text-xl">🎥</span>
                            <div>
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Video</div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        className="w-12 bg-transparent text-white font-bold outline-none"
                                        value={rotation.videoSeconds}
                                        onChange={(e) => setRotation({ ...rotation, videoSeconds: Math.max(5, Number(e.target.value)) })}
                                    />
                                    <span className="text-xs text-white/40">sn</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <span className="text-xl">🖼️</span>
                            <div>
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Resim</div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        className="w-12 bg-transparent text-white font-bold outline-none"
                                        value={rotation.imageSeconds}
                                        onChange={(e) => setRotation({ ...rotation, imageSeconds: Math.max(5, Number(e.target.value)) })}
                                    />
                                    <span className="text-xs text-white/40">sn</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <span className="text-xl">📢</span>
                            <div>
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Duyuru</div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        className="w-12 bg-transparent text-white font-bold outline-none"
                                        value={rotation.textSeconds}
                                        onChange={(e) => setRotation({ ...rotation, textSeconds: Math.max(5, Number(e.target.value)) })}
                                    />
                                    <span className="text-xs text-white/40">sn</span>
                                </div>
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer select-none group">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-white group-hover:text-brand transition-colors">Otomatik Döngü</div>
                                    <div className="text-[10px] text-white/40">{rotation.enabled ? "Aktif" : "Pasif"}</div>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${rotation.enabled ? "bg-brand" : "bg-white/10"}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${rotation.enabled ? "translate-x-6" : ""}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={rotation.enabled}
                                    onChange={(e) => setRotation({ ...rotation, enabled: e.target.checked })}
                                />
                            </label>

                            <button
                                onClick={saveSettings}
                                disabled={savingRotation}
                                className="px-6 py-3 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold shadow-lg shadow-brand/20 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {savingRotation ? "..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-white/40 animate-pulse">Yükleniyor...</div>
            ) : (
                <div className="space-y-2 max-w-4xl">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-white/20 font-mono text-sm w-6 text-center">{idx + 1}</div>

                                {/* Icon based on type */}
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-xl">
                                    {item.display_mode === 'big' ? '📢' : item.display_mode === 'image' ? '🖼️' : '📝'}
                                </div>

                                {item.image_url || (item.image_urls && item.image_urls.length > 0) ? (
                                    <div className="w-16 h-10 rounded-lg bg-white/10 overflow-hidden relative">
                                        <img
                                            src={item.image_url || (item.image_urls ? item.image_urls[0] : "") || ""}
                                            className="w-full h-full object-cover opacity-80"
                                            alt=""
                                        />
                                    </div>
                                ) : null}

                                <div>
                                    <div className="text-white font-bold text-lg line-clamp-1">{item.title}</div>
                                    <div className="text-xs text-white/40 flex items-center gap-3 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {item.status === 'published' ? 'Yayında' : 'Onay Bekliyor'}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-[10px]">
                                            ⏱️ {item.display_mode === 'image' ? rotation.imageSeconds : rotation.textSeconds}sn
                                        </span>
                                        <span>• {new Date(item.created_at).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => move(idx, "up")}
                                    disabled={idx === 0 || saving}
                                    className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                    title="Yukarı Taşı"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => move(idx, "down")}
                                    disabled={idx === items.length - 1 || saving}
                                    className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                    title="Aşağı Taşı"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-xl">
                            Sıralanacak aktif duyuru bulunamadı.
                        </div>
                    )}
                </div>
            )}
        </AdminShell>
    );
}
