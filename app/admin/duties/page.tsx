"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { DutyTeacher } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { ymdNowTR } from "@/lib/validate";
import { generateDutySchedule } from "@/lib/dutySchedule";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import toast from "react-hot-toast";

export default function DutiesPage() {
  return <AuthGate>{(profile) => <DutiesInner profile={profile} />}</AuthGate>;
}

function DutiesInner({ profile }: { profile: any }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [date, setDate] = useState<string>(ymdNowTR());
  const [items, setItems] = useState<DutyTeacher[]>([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [importing, setImporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    title: string;
    desc: string;
    confirmText?: string;
    destructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  const load = async (d = date) => {
    const { data, error } = await sb.from("duty_teachers").select("*").eq("date", d).order("name", { ascending: true });
    if (!error) {
      const sorted = (data ?? []).sort((a: any, b: any) => {
        const getPriority = (area: string | null): number => {
          if (!area) return 5;
          const upper = area.toUpperCase();
          if (upper.includes("İDARE") || upper.includes("NÖBETÇİ İDARECİ")) return 0;
          if (upper.includes("3.KAT") || upper.includes("3. KAT")) return 1;
          if (upper.includes("2.KAT") || upper.includes("2. KAT")) return 2;
          if (upper.includes("1.KAT") || upper.includes("1. KAT")) return 3;
          if (upper.includes("GİRİŞ")) return 4;
          if (upper.includes("BAHÇE")) return 5;
          return 5;
        };
        return getPriority(a.area) - getPriority(b.area);
      }) as any;
      setItems(sorted);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const add = async () => {
    const payload = {
      date,
      name: name.trim(),
      area: area.trim() || null,
      note: note.trim() || null,
    };
    const { error } = await sb.from("duty_teachers").insert(payload);
    if (error) toast.error("Hata: " + error.message);
    else {
      setName("");
      setArea("");
      setNote("");
      setShowAddForm(false);
      toast.success("Eklendi.");
      await load();
    }
  };

  const del = (id: string) => {
    setConfirmData({
      title: "Silinsin mi?",
      desc: "Bu nöbetçi kaydı silinecek.",
      destructive: true,
      confirmText: "Sil",
      action: async () => {
        const { error } = await sb.from("duty_teachers").delete().eq("id", id);
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

  const importSchedule = () => {
    setConfirmData({
      title: "Çizelgeyi İçe Aktar",
      desc: "DİKKAT: Mevcut TÜM kayıtlar silinecek ve Excel şablonundaki veriler (5 Ocak - 13 Şubat) yüklenecek.\n\nBu işlem geri alınamaz.",
      destructive: true,
      confirmText: "Evet, Hepsini Değiştir",
      action: async () => {
        setConfirmOpen(false);
        setImporting(true);
        const loadingToast = toast.loading("İçe aktarılıyor...");

        try {
          const { allData, dates } = generateDutySchedule("2026-01-05", "2026-02-13");

          const { error: wipeError } = await sb.from("duty_teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (wipeError) throw wipeError;

          const { error } = await sb.from("duty_teachers").insert(allData);

          if (error) {
            toast.error("Hata: " + error.message, { id: loadingToast });
          } else {
            toast.success(`✅ Başarılı! ${allData.length} kayıt eklendi`, { id: loadingToast });
            await load();
          }
        } catch (err: any) {
          toast.error("Hata: " + err.message, { id: loadingToast });
        } finally {
          setImporting(false);
        }
      },
    });
    setConfirmOpen(true);
  };

  const copyFromPreviousWeek = () => {
    setConfirmData({
      title: "Geçen Haftadan Kopyala",
      desc: `Bu tarih (${date}) için nöbetçiler, geçen haftanın aynı gününden kopyalanacak.\n\nMevcut kayıtlar silinecek.`,
      confirmText: "Kopyala",
      action: async () => {
        setConfirmOpen(false);
        setCopying(true);
        const loadingToast = toast.loading("Kopyalanıyor...");

        try {
          const currentDate = new Date(date + "T12:00:00");
          const previousWeekDate = new Date(currentDate.getTime() - 7 * 864e5);
          const previousDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(previousWeekDate);

          const { data: previousDuties, error: fetchError } = await sb
            .from("duty_teachers")
            .select("*")
            .eq("date", previousDateKey);

          if (fetchError) throw fetchError;

          if (!previousDuties || previousDuties.length === 0) {
            toast.error("⚠️ Geçen hafta aynı gün için veri bulunamadı.", { id: loadingToast });
            return;
          }

          await sb.from("duty_teachers").delete().eq("date", date);

          const newDuties = previousDuties.map((d: any) => ({
            date: date,
            name: d.name,
            area: d.area,
            note: d.note,
          }));

          const { error: insertError } = await sb.from("duty_teachers").insert(newDuties);

          if (insertError) throw insertError;

          toast.success(`✅ ${newDuties.length} kayıt kopyalandı`, { id: loadingToast });
          await load();
        } catch (err: any) {
          toast.error("Hata: " + err.message, { id: loadingToast });
        } finally {
          setCopying(false);
        }
      },
    });
    setConfirmOpen(true);
  };

  const getAreaColor = (area: string | null) => {
    if (!area) return "bg-white/5 text-white/40";
    const upper = area.toUpperCase();
    if (upper.includes("İDARE")) return "bg-purple-500/10 text-purple-400";
    if (upper.includes("3.KAT") || upper.includes("3. KAT")) return "bg-blue-500/10 text-blue-400";
    if (upper.includes("2.KAT") || upper.includes("2. KAT")) return "bg-cyan-500/10 text-cyan-400";
    if (upper.includes("1.KAT") || upper.includes("1. KAT")) return "bg-emerald-500/10 text-emerald-400";
    if (upper.includes("GİRİŞ")) return "bg-amber-500/10 text-amber-400";
    if (upper.includes("BAHÇE")) return "bg-green-500/10 text-green-400";
    return "bg-white/5 text-white/40";
  };

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">Nöbetçi Öğretmen</div>
          <div className="text-sm mt-1 text-white/40">
            Tarihe göre nöbetçi öğretmenleri yönetin.
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/admin/duties/template">
            <button className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Haftalık Şablon
            </button>
          </a>
        </div>
      </div>

      {/* Date Selector & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Date */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-2">Tarih Seç</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 text-white border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all text-sm font-mono"
          />
          <div className="mt-2 text-xs text-white/50">{formatDate(date)}</div>
        </div>

        {/* Copy from previous week */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-2">Geçen Hafta</label>
          <button
            onClick={copyFromPreviousWeek}
            disabled={copying}
            className="w-full px-4 py-3 rounded-lg bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copying ? "Kopyalanıyor..." : "Geçen Haftadan Kopyala"}
          </button>
        </div>

        {/* Import schedule */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-2">Toplu İçe Aktar</label>
          <button
            onClick={importSchedule}
            disabled={importing}
            className="w-full px-4 py-3 rounded-lg bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {importing ? "İçe aktarılıyor..." : "Çizelgeyi İçe Aktar"}
          </button>
        </div>
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-brand rounded-full"></div>
          <h3 className="text-white font-bold text-sm">Nöbetçiler</h3>
          <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono">{items.length} kişi</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-brand hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ekle
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-4 rounded-xl bg-brand/5 border border-brand/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <FieldLabel>Öğretmen Ad Soyad *</FieldLabel>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Enes YAŞA" />
            </div>
            <div>
              <FieldLabel>Bölge/Alan</FieldLabel>
              <TextInput value={area} onChange={(e) => setArea(e.target.value)} placeholder="Örn: 2. Kat" />
            </div>
            <div>
              <FieldLabel>Not (Opsiyonel)</FieldLabel>
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsiyonel" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <SecondaryButton type="button" onClick={() => setShowAddForm(false)}>İptal</SecondaryButton>
            <PrimaryButton type="button" onClick={add} disabled={!name.trim()}>Kaydet</PrimaryButton>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.length ? (
          items.map((d) => (
            <div
              key={d.id}
              className="group p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold text-sm shrink-0">
                {d.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm">{d.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {d.area && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${getAreaColor(d.area)}`}>
                      {d.area}
                    </span>
                  )}
                  {d.note && <span className="text-[11px] text-white/30">{d.note}</span>}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => del(d.id)}
                className="w-8 h-8 rounded-lg bg-red-500/5 text-red-400/50 hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                title="Sil"
              >
                🗑
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-16 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
            <div className="text-4xl mb-3 opacity-30">👩‍🏫</div>
            <p className="font-medium text-white/50 mb-1">Bu tarih için nöbetçi yok</p>
            <p className="text-xs opacity-60">"Ekle" butonuyla veya geçen haftadan kopyalayarak ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmData?.title || ""}
        description={confirmData?.desc}
        destructive={confirmData?.destructive}
        confirmText={confirmData?.confirmText}
        onConfirm={confirmData?.action || (() => { })}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminShell>
  );
}
