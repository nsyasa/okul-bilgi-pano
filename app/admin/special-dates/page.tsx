"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { SpecialDate } from "@/types/player";
import { type Profile } from "@/lib/adminAuth";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { ymdNowTR } from "@/lib/validate";

const TYPE_OPTIONS: { value: SpecialDate["type"]; label: string; color: string }[] = [
    { value: "holiday", label: "Tatil", color: "bg-red-500" },
    { value: "special_week", label: "Özel Hafta", color: "bg-purple-500" },
    { value: "event", label: "Etkinlik", color: "bg-blue-500" },
    { value: "exam", label: "Sınav", color: "bg-amber-500" },
    { value: "closure", label: "Kapanış", color: "bg-gray-500" },
];

const ICON_OPTIONS = ["🎉", "📚", "🎓", "🌸", "🌳", "❄️", "🏫", "📝", "🎭", "🎪", "🎈", "⚽", "🎵", "🌍", "💚", "🔔", "🕯️", "🇹🇷"];

export default function SpecialDatesPage() {
    return <AuthGate>{(profile) => <SpecialDatesInner profile={profile} />}</AuthGate>;
}

function SpecialDatesInner({ profile }: { profile: Profile }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const today = ymdNowTR();

    const [items, setItems] = useState<SpecialDate[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState("");
    const [type, setType] = useState<SpecialDate["type"]>("event");
    const [icon, setIcon] = useState("🎉");
    const [color, setColor] = useState("#8B5CF6");
    const [isActive, setIsActive] = useState(true);

    // View State
    const [showAll, setShowAll] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data, error } = await sb
            .from("special_dates")
            .select("*")
            .order("start_date", { ascending: true });
        if (!error) setItems((data ?? []) as SpecialDate[]);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [sb]);

    // Categorize items
    const categorized = useMemo(() => {
        const now = new Date(today);
        const past: SpecialDate[] = [];
        const current: SpecialDate[] = [];
        const upcoming: SpecialDate[] = [];

        items.forEach((item) => {
            const start = new Date(item.start_date);
            const end = item.end_date ? new Date(item.end_date) : start;

            if (end < now) {
                past.push(item);
            } else if (start <= now && end >= now) {
                current.push(item);
            } else {
                upcoming.push(item);
            }
        });

        return { past: past.reverse(), current, upcoming };
    }, [items, today]);

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setDescription("");
        setStartDate(today);
        setEndDate("");
        setType("event");
        setIcon("🎉");
        setColor("#8B5CF6");
        setIsActive(true);
        setMsg(null);
    };

    const edit = (item: SpecialDate) => {
        setEditingId(item.id);
        setName(item.name);
        setDescription(item.description ?? "");
        setStartDate(item.start_date);
        setEndDate(item.end_date ?? "");
        setType(item.type);
        setIcon(item.icon);
        setColor(item.color);
        setIsActive(item.is_active);
        setMsg(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const save = async () => {
        if (!name.trim()) return setMsg("İsim zorunludur.");
        if (!startDate) return setMsg("Başlangıç tarihi zorunludur.");

        setBusy(true);
        setMsg(null);

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            start_date: startDate,
            end_date: endDate || null,
            type,
            icon,
            color,
            is_active: isActive,
        };

        try {
            if (editingId) {
                const { error } = await sb.from("special_dates").update(payload).eq("id", editingId);
                if (error) throw error;
            } else {
                const { error } = await sb.from("special_dates").insert(payload);
                if (error) throw error;
            }
            setMsg("Kayıt başarıyla kaydedildi.");
            await load();
            resetForm();
        } catch (e: any) {
            setMsg(e?.message ?? "Kayıt başarısız.");
        } finally {
            setBusy(false);
        }
    };

    const del = async (item: SpecialDate) => {
        if (!confirm(`"${item.name}" silinsin mi?`)) return;
        const { error } = await sb.from("special_dates").delete().eq("id", item.id);
        if (!error) await load();
    };

    const toggleActive = async (item: SpecialDate) => {
        await sb.from("special_dates").update({ is_active: !item.is_active }).eq("id", item.id);
        await load();
    };

    const getTypeInfo = (t: SpecialDate["type"]) => TYPE_OPTIONS.find((o) => o.value === t) ?? TYPE_OPTIONS[0];

    const renderCard = (item: SpecialDate, isPast = false) => {
        const typeInfo = getTypeInfo(item.type);
        const isEditing = editingId === item.id;

        return (
            <div
                key={item.id}
                className={`group p-4 rounded-xl border transition-all relative overflow-hidden ${isEditing
                        ? "bg-brand/10 border-brand/50 ring-1 ring-brand/30"
                        : isPast
                            ? "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"
                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
            >
                {isEditing && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand"></div>}

                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: item.color + "20" }}
                    >
                        {item.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-base leading-tight line-clamp-1">{item.name}</span>
                            {!item.is_active && (
                                <span className="text-[10px] font-bold bg-white/10 text-white/40 px-1.5 py-0.5 rounded">PASIF</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeInfo.color}/20 text-${typeInfo.color.replace("bg-", "")}`} style={{ backgroundColor: typeInfo.color.replace("bg-", "") + "20", color: typeInfo.color.replace("bg-", "").includes("gray") ? "#9CA3AF" : undefined }}>
                                {typeInfo.label}
                            </span>
                            <span className="font-mono">
                                {new Date(item.start_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                {item.end_date && item.end_date !== item.start_date && (
                                    <> — {new Date(item.end_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</>
                                )}
                            </span>
                        </div>

                        {item.description && (
                            <div className="text-xs text-white/40 line-clamp-2 leading-relaxed">{item.description}</div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => toggleActive(item)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors ${item.is_active ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/5 text-white/30 hover:bg-white/10"}`}
                            title={item.is_active ? "Pasif Yap" : "Aktif Yap"}
                        >
                            {item.is_active ? "✓" : "○"}
                        </button>
                        <button
                            onClick={() => edit(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                            title="Düzenle"
                        >
                            ✎
                        </button>
                        <button
                            onClick={() => del(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/5 text-red-400/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Sil"
                        >
                            🗑
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminShell profile={profile}>
            <div className="mb-8">
                <div className="text-white text-3xl font-extrabold tracking-tight">Belirli Gün ve Haftalar</div>
                <div className="text-sm mt-2 opacity-60 text-white max-w-2xl">
                    Okul takvimindeki önemli günleri, haftaları ve etkinlikleri tanımlayın. Bu bilgiler panoda gösterilir.
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Form */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden ring-1 ring-white/5 shadow-2xl">
                        <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                {editingId ? "Düzenle" : "Yeni Ekle"}
                                {editingId && <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-1 rounded border border-brand/20">Düzenleniyor</span>}
                            </h2>
                            {editingId && (
                                <button onClick={resetForm} className="text-xs text-white/50 hover:text-white underline">
                                    İptal
                                </button>
                            )}
                        </div>

                        <div className="p-5 space-y-5">
                            {msg && (
                                <div className={`p-3 rounded-lg text-sm font-medium border ${msg.includes("başarı") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                    {msg}
                                </div>
                            )}

                            <div>
                                <FieldLabel>İsim *</FieldLabel>
                                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 23 Nisan Ulusal Egemenlik" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Başlangıç *</FieldLabel>
                                    <input
                                        type="date"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-all font-mono text-sm"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>Bitiş (Opsiyonel)</FieldLabel>
                                    <input
                                        type="date"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-all font-mono text-sm"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Tür</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {TYPE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setType(opt.value)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${type === opt.value ? `${opt.color} text-white border-transparent` : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>İkon</FieldLabel>
                                    <div className="flex flex-wrap gap-1.5 p-2 bg-black/20 rounded-xl border border-white/5 max-h-24 overflow-y-auto">
                                        {ICON_OPTIONS.map((ic) => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setIcon(ic)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all ${icon === ic ? "bg-white/20 ring-2 ring-brand" : "hover:bg-white/10"}`}
                                            >
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>Renk</FieldLabel>
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full h-12 rounded-xl border border-white/10 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Açıklama (Opsiyonel)</FieldLabel>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Kısa bir açıklama..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-all text-sm min-h-[80px] resize-none"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-5 h-5 accent-brand" />
                                <span className="text-sm text-white/80">Aktif (Panoda göster)</span>
                            </label>
                        </div>

                        <div className="p-5 bg-black/20 border-t border-white/5 flex justify-end gap-3">
                            {editingId && (
                                <SecondaryButton type="button" onClick={resetForm}>
                                    Vazgeç
                                </SecondaryButton>
                            )}
                            <PrimaryButton disabled={busy} type="button" onClick={save}>
                                {busy ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Right: List */}
                <div className="lg:col-span-7 space-y-6">
                    {loading ? (
                        <div className="p-12 text-center text-white/50 animate-pulse bg-white/5 rounded-2xl">Yükleniyor...</div>
                    ) : (
                        <>
                            {/* Current */}
                            {categorized.current.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Şu An Aktif</h3>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">{categorized.current.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {categorized.current.map((item) => renderCard(item))}
                                    </div>
                                </div>
                            )}

                            {/* Upcoming */}
                            {categorized.upcoming.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Yaklaşan</h3>
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">{categorized.upcoming.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {categorized.upcoming.map((item) => renderCard(item))}
                                    </div>
                                </div>
                            )}

                            {/* Past (Collapsible) */}
                            {categorized.past.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowAll(!showAll)}
                                        className="flex items-center gap-2 mb-4 group"
                                    >
                                        <div className="w-2 h-6 bg-white/20 rounded-full"></div>
                                        <h3 className="text-white/50 font-bold text-sm uppercase tracking-wider group-hover:text-white/80 transition-colors">
                                            Geçmiş
                                        </h3>
                                        <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded-full font-bold">{categorized.past.length}</span>
                                        <span className="text-xs text-white/30 ml-2">{showAll ? "▲ Gizle" : "▼ Göster"}</span>
                                    </button>
                                    {showAll && (
                                        <div className="space-y-3">
                                            {categorized.past.map((item) => renderCard(item, true))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Empty State */}
                            {items.length === 0 && (
                                <div className="text-center py-16 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">
                                    <div className="text-5xl mb-4 opacity-30">📅</div>
                                    <p className="font-medium text-white/50 mb-2">Henüz tanımlanmış özel gün yok</p>
                                    <p className="text-xs opacity-60">Soldaki formdan yeni bir gün veya hafta ekleyebilirsiniz.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AdminShell>
    );
}
