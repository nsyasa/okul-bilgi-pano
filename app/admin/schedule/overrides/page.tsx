"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { fetchMyProfile, type Profile } from "@/lib/adminAuth";
import type { BellSlot } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { ymdNowTR } from "@/lib/validate";

type OverrideRow = { id: string; date: string; slots: BellSlot[]; note: string | null };

const DEFAULT_EXAMPLE_SLOTS: BellSlot[] = [
  { start: "09:30", end: "10:10", kind: "lesson", label: "1. Sınav" },
  { start: "10:10", end: "10:30", kind: "break", label: "Teneffüs" },
  { start: "10:30", end: "11:10", kind: "lesson", label: "2. Sınav" },
  { start: "11:10", end: "11:50", kind: "lunch", label: "Öğle Arası" },
];

export default function OverridesPage() {
  return <AuthGate>{(profile) => <OverridesInner profile={profile} />}</AuthGate>;
}

function OverridesInner({ profile }: { profile: Profile }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [date, setDate] = useState(ymdNowTR());
  const [note, setNote] = useState("Sınav Günü");
  const [slots, setSlots] = useState<BellSlot[]>([]);
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Slot adding inputs
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("09:40");
  const [newKind, setNewKind] = useState<"lesson" | "break" | "lunch">("lesson");
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    const { data, error } = await sb.from("schedule_overrides").select("*").order("date", { ascending: true }).limit(50);
    if (!error) setRows((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, [sb]);

  const save = async () => {
    if (!date) return setMsg("Tarih seçiniz.");
    setBusy(true);
    setMsg(null);
    try {
      if (editingId) {
        const { error } = await sb.from("schedule_overrides").update({ date, slots, note }).eq("id", editingId);
        if (error) throw error;
      } else {
        const existing = rows.find((r) => r.date === date);
        if (existing) {
          if (!confirm("Bu tarih için zaten bir kayıt var. Güncellensin mi?")) {
            setBusy(false);
            return;
          }
          const { error } = await sb.from("schedule_overrides").update({ slots, note }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from("schedule_overrides").insert({ date, slots, note });
          if (error) throw error;
        }
      }
      setMsg("Program başarıyla kaydedildi.");
      await load();
      if (!editingId) resetForm(); // Only reset if it was a new creation, keep editing open if editing
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(ymdNowTR());
    setNote("Sınav Günü");
    setSlots([]);
    setMsg(null);
  };

  const edit = (r: OverrideRow) => {
    setEditingId(r.id);
    setDate(r.date);
    setNote(r.note ?? "");
    setSlots((r.slots as any) ?? []);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (r: OverrideRow) => {
    if (!confirm(`${r.date} tarihli program silinsin mi?`)) return;
    const { error } = await sb.from("schedule_overrides").delete().eq("id", r.id);
    if (!error) await load();
  };

  const addSlot = () => {
    if (!newStart || !newEnd) return;
    const s: BellSlot = { start: newStart, end: newEnd, kind: newKind, label: newLabel || (newKind === 'lesson' ? 'Ders' : newKind === 'break' ? 'Teneffüs' : 'Öğle Arası') };
    const next = [...slots, s].sort((a, b) => a.start.localeCompare(b.start));
    setSlots(next);
  };

  const removeSlot = (index: number) => {
    const next = [...slots];
    next.splice(index, 1);
    setSlots(next);
  };

  const loadExample = () => {
    if (slots.length > 0 && !confirm("Mevcut slotlar silinecek. Devam edilsin mi?")) return;
    setSlots([...DEFAULT_EXAMPLE_SLOTS]);
  };

  return (
    <AdminShell profile={profile}>
      <div className="mb-8">
        <div className="text-white text-3xl font-extrabold tracking-tight">Özel Gün Programı</div>
        <div className="text-sm mt-2 opacity-60 text-white max-w-2xl">
          Belirli tarihler için özel zil programları oluşturun (Sınav, Yarım Gün vb.). Bu programlar, belirtilen tarihte standart programın yerine geçer.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden ring-1 ring-white/5 shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                {editingId ? "Programı Düzenle" : "Yeni Program Oluştur"}
                {editingId && <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-1 rounded border border-brand/20">Düzenleniyor</span>}
              </h2>
              {editingId && <button onClick={resetForm} className="text-xs text-white/50 hover:text-white underline decoration-white/30 hover:decoration-white transition-all">İptal</button>}
            </div>

            <div className="p-6 space-y-8">
              {msg && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${msg.includes("Hata") || msg.includes("edilemedi") || msg.includes("seçiniz") ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                  {msg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FieldLabel>Tarih</FieldLabel>
                  <input
                    type="date"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-all font-mono"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Not / Açıklama</FieldLabel>
                  <TextInput
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Örn: 1. Dönem Final Sınavları"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>
              </div>

              {/* Slot Builder */}
              <div className="rounded-xl bg-black/20 border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 bg-brand rounded-full"></div>
                    <h3 className="font-bold text-white text-sm">Zaman Çizelgesi</h3>
                    <span className="bg-white/10 text-white/60 text-[10px] px-2 py-0.5 rounded-full font-mono">{slots.length} Slot</span>
                  </div>
                  <button
                    onClick={loadExample}
                    type="button"
                    className="text-xs text-brand hover:text-brand-light font-medium transition-colors flex items-center gap-1.5 bg-brand/5 hover:bg-brand/10 px-3 py-1.5 rounded-lg border border-brand/10"
                  >
                    ✨ Örnek Plan Yükle
                  </button>
                </div>

                {slots.length === 0 ? (
                  <div className="py-12 px-6 border-2 border-dashed border-white/5 rounded-xl text-center text-white/30 text-sm flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors cursor-default">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-1 grayscale opacity-50">📅</div>
                    <div className="font-medium text-white/50">Henüz slot eklenmemiş</div>
                    <div className="text-xs max-w-xs opacity-50 leading-relaxed">
                      Manuel olarak aşağıdan slot ekleyebilir veya sağ üstteki &quot;Örnek Plan Yükle&quot; butonunu kullanabilirsiniz.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 relative">
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/5 rounded-full ml-[6.5rem] hidden sm:block"></div>
                    {slots.map((s, idx) => (
                      <div key={idx} className="group relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:bg-white/10">
                        <div className="w-28 text-sm font-mono text-white text-center bg-black/40 rounded-lg py-2 border border-white/5 shadow-sm">
                          {s.start} - {s.end}
                        </div>
                        <div className={`text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider min-w-[80px] text-center border shadow-sm ${s.kind === 'lesson' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          s.kind === 'break' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                          {s.kind === 'lesson' ? 'DERS' : s.kind === 'break' ? 'TENEFFÜS' : 'ÖĞLE'}
                        </div>
                        <div className="flex-1 text-sm text-white/90 font-medium pl-2 border-l border-white/10 sm:border-0 sm:pl-0">
                          {s.label || <span className="text-white/20 italic">Etiket yok</span>}
                        </div>
                        <button
                          onClick={() => removeSlot(idx)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all absolute top-2 right-2 sm:static"
                          title="Sil"
                          aria-label="Sil"
                        >
                          <span aria-hidden="true">🗑</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div className="my-6 border-t border-white/5"></div>

                {/* Add Slot Control */}
                <div className="p-1">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 pl-1">YENİ SLOT EKLE</div>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="grid grid-cols-2 gap-3 w-full sm:w-auto flex-1">
                      <div>
                        <label className="text-[10px] text-white/50 block mb-1.5 ml-1">Başlangıç</label>
                        <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-brand focus:ring-1 focus:ring-brand/50 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/50 block mb-1.5 ml-1">Bitiş</label>
                        <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-brand focus:ring-1 focus:ring-brand/50 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="w-full sm:w-[140px]">
                      <label className="text-[10px] text-white/50 block mb-1.5 ml-1">Tür</label>
                      <select value={newKind} onChange={e => setNewKind(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-brand focus:ring-1 focus:ring-brand/50 outline-none transition-all appearance-none">
                        <option value="lesson">Ders</option>
                        <option value="break">Teneffüs</option>
                        <option value="lunch">Öğle Arası</option>
                      </select>
                    </div>
                    <div className="w-full sm:flex-[2]">
                      <label className="text-[10px] text-white/50 block mb-1.5 ml-1">Etiket</label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        placeholder="Örn: Matematik Sınavı"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-brand focus:ring-1 focus:ring-brand/50 outline-none transition-all placeholder:text-white/20"
                        onKeyDown={(e) => e.key === 'Enter' && addSlot()}
                      />
                    </div>
                    <button
                      onClick={addSlot}
                      type="button"
                      className="w-full sm:w-auto h-[42px] px-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all border border-white/5 hover:border-white/20 active:scale-95"
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] text-white/30 ml-1">* İpucu: Hızlı eklemek için etiket alanında Enter&apos;a basabilirsiniz.</div>
                </div>

              </div>
            </div>

            <div className="p-6 bg-black/20 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl">
              {editingId && (
                <SecondaryButton type="button" onClick={resetForm}>
                  Vazgeç
                </SecondaryButton>
              )}
              <PrimaryButton disabled={busy} type="button" onClick={save}>
                {busy ? "Kaydediliyor..." : (editingId ? "Değişiklikleri Kaydet" : "Programı Kaydet")}
              </PrimaryButton>
            </div>
          </div>
        </div>

        {/* Right Column: List (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-4">
            <div className="text-white font-bold text-lg">Kayıtlı Programlar</div>
            <div className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded border border-brand/20">{rows.length} ADET</div>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {rows.length === 0 ? (
              <div className="text-center py-12 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">
                <div className="text-4xl mb-3 opacity-30">📭</div>
                <p>Henüz tanımlanmış bir özel gün programı yok.</p>
              </div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className={`p-4 rounded-xl border transition-all group relative overflow-hidden ${editingId === r.id ? 'bg-brand/5 border-brand/40 shadow-[0_0_20px_rgba(var(--brand-rgb),0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                  {editingId === r.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand"></div>}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono font-bold text-xl leading-none mb-1.5 ${new Date(r.date) < new Date(ymdNowTR()) ? 'text-white/40' : 'text-brand'}`}>
                        {new Date(r.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-xs text-white/30 font-mono mb-3">{new Date(r.date).toLocaleDateString('tr-TR', { weekday: 'long' })} • {r.date}</div>

                      <div className="text-white text-sm font-medium line-clamp-2 mb-2 leading-snug">{r.note || <span className="opacity-50 italic">İsimsiz</span>}</div>

                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold bg-black/30 px-2 py-1 rounded text-white/50 border border-white/5">
                          {r.slots?.length || 0} SLOT
                        </div>
                        {new Date(r.date).toDateString() === new Date().toDateString() && (
                          <div className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 animate-pulse">
                            BUGÜN
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-3">
                      <button
                        onClick={() => edit(r)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/70 hover:bg-white/20 hover:text-white transition-all border border-white/5 hover:border-white/20"
                        title="Düzenle"
                        aria-label="Düzenle"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                      <button
                        onClick={() => del(r)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/5 text-red-400/70 hover:bg-red-500/20 hover:text-red-400 transition-all border border-red-500/5 hover:border-red-500/20"
                        title="Sil"
                        aria-label="Sil"
                      >
                        <span aria-hidden="true">🗑</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
