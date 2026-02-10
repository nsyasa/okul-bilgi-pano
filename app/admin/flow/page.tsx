"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Announcement } from "@/types/player";
import { toast } from "react-hot-toast";

export default function FlowPage() {
    return <AuthGate>{(profile) => <FlowInner profile={profile} />}</AuthGate>;
}

function FlowInner({ profile }: { profile: any }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    useEffect(() => {
        load();
    }, []);

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
            // We swap their flow_order values. 
            // Note: This relies on them having flow_order set. Backfill should ensure this.
            // If flow_order is null, we might need to handle it.

            const itemA = newItems[index]; // The one that moved to 'index'
            const itemB = newItems[targetIndex]; // The one that moved to 'targetIndex'

            // Important: We need to know what the 'flow_order' SHOULD be for these positions.
            // Ideally, the list is completely consecutive. 
            // But if there are gaps, simply swapping values works best.

            const orderA = itemB.flow_order ?? 0; // The value from the item that WAS at 'index'
            const orderB = itemA.flow_order ?? 0; // The value from the item that WAS at 'targetIndex'

            // Wait for both updates
            const p1 = sb.from("announcements").update({ flow_order: orderB }).eq("id", itemA.id);
            const p2 = sb.from("announcements").update({ flow_order: orderA }).eq("id", itemB.id);

            await Promise.all([p1, p2]);

            // Update local state flow_order to match reality
            itemA.flow_order = orderB;
            itemB.flow_order = orderA;

            // No full reload needed, just toast
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
                                {item.image_url || (item.image_urls && item.image_urls.length > 0) ? (
                                    <div className="w-12 h-8 rounded bg-white/10 overflow-hidden relative">
                                        {/* Basit thumbnail */}
                                        <img
                                            src={item.image_url || (item.image_urls ? item.image_urls[0] : "") || ""}
                                            className="w-full h-full object-cover opacity-60"
                                            alt=""
                                        />
                                    </div>
                                ) : (
                                    <div className="w-12 h-8 rounded bg-white/5 flex items-center justify-center text-xs text-white/20">
                                        TXT
                                    </div>
                                )}
                                <div>
                                    <div className="text-white font-medium line-clamp-1">{item.title}</div>
                                    <div className="text-xs text-white/40 flex items-center gap-2">
                                        <span className={`px-1.5 rounded-sm ${item.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {item.status === 'published' ? 'Yayında' : 'Onay Bekliyor'}
                                        </span>
                                        <span>• {new Date(item.created_at).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => move(idx, "up")}
                                    disabled={idx === 0 || saving}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                    title="Yukarı Taşı"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => move(idx, "down")}
                                    disabled={idx === items.length - 1 || saving}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
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
