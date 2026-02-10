"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { TickerItem } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import toast from "react-hot-toast";

type Form = Partial<TickerItem> & { id?: string };

export default function TickerPage() {
  return <AuthGate>{(profile) => <TickerInner profile={profile} />}</AuthGate>;
}

function TickerInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);

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

  const load = async () => {
    const { data, error } = await sb.from("ticker_items").select("*").order("priority", { ascending: false }).limit(200);
    if (!error) setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setEditing({ text: "", is_active: true, priority: 50, start_at: now.toISOString(), end_at: null });
  };

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      text: (editing.text ?? "").trim(),
      is_active: !!editing.is_active,
      priority: Number(editing.priority ?? 50),
      start_at: fromLocalInput(editing.start_at || ""),
      end_at: fromLocalInput(editing.end_at || ""),
    };
    if (!payload.text) {
      toast.error("Metin boş olamaz.");
      return;
    }

    const res = editing.id ? await sb.from("ticker_items").update(payload).eq("id", editing.id) : await sb.from("ticker_items").insert(payload);
    if (res.error) toast.error(res.error.message);
    else {
      setEditing(null);
      toast.success("Kaydedildi.");
      await load();
    }
  };

  const del = (id: string) => {
    setConfirmData({
      title: "Ticker'ı Sil",
      desc: "Bu mesaj silinecek.",
      action: async () => {
        const { error } = await sb.from("ticker_items").delete().eq("id", id);
        if (!error) {
          await load();
          toast.success("Silindi");
        } else {
          toast.error("Hata: " + error.message);
        }
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const toggleActive = async (item: TickerItem) => {
    await sb.from("ticker_items").update({ is_active: !item.is_active }).eq("id", item.id);
    await load();
  };

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">Alt Bant (Ticker)</div>
          <div className="text-sm mt-1 text-white/40">
            Ekranın alt kısmında sürekli dönen mesajları yönetin.
          </div>
        </div>
        <button
          onClick={startNew}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-brand hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Mesaj
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length ? (
          items.map((t) => (
            <div
              key={t.id}
              className={`group p-4 rounded-xl border transition-all ${t.is_active
                ? "bg-white/[0.03] border-white/5 hover:border-white/15"
                : "bg-white/[0.01] border-white/5 opacity-50 hover:opacity-100"
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleActive(t)}
                  className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${t.is_active
                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-white/5 text-white/30 hover:bg-white/10"
                    }`}
                  title={t.is_active ? "Pasif Yap" : "Aktif Yap"}
                >
                  {t.is_active ? "✓" : "○"}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm leading-relaxed">{t.text}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
                    <span className="flex items-center gap-1">
                      <span className="text-white/50">Öncelik:</span> {t.priority}
                    </span>
                    {t.start_at && (
                      <span>
                        <span className="text-white/50">Başlangıç:</span> {new Date(t.start_at).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                    {t.end_at && (
                      <span>
                        <span className="text-white/50">Bitiş:</span> {new Date(t.end_at).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(t)}
                    className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
                    title="Düzenle"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => del(t.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/5 text-red-400/50 hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors"
                    title="Sil"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
            <div className="text-4xl mb-3 opacity-30">📝</div>
            <p className="font-medium text-white/50 mb-1">Henüz ticker mesajı yok</p>
            <p className="text-xs opacity-60">Yukarıdaki "Yeni Mesaj" butonuyla ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-white text-lg font-bold">{editing.id ? "Ticker Düzenle" : "Yeni Ticker"}</div>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel>Mesaj Metni *</FieldLabel>
                <TextInput
                  value={editing.text ?? ""}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  placeholder="Örn: Yarın öğrenci toplantısı var..."
                />
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
                  <FieldLabel>Başlangıç Tarihi (Opsiyonel)</FieldLabel>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm"
                    value={toLocalInput(editing.start_at)}
                    onChange={(e) => setEditing({ ...editing, start_at: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Bitiş Tarihi (Opsiyonel)</FieldLabel>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl outline-none bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm"
                    value={toLocalInput(editing.end_at)}
                    onChange={(e) => setEditing({ ...editing, end_at: e.target.value })}
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
