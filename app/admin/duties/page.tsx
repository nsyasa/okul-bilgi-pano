"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
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

  // Confirm State
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          // Tüm eski verileri temizle
          const { error: wipeError } = await sb.from("duty_teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (wipeError) throw wipeError;

          // Toplu veri ekle
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

          // 7 gün önceki aynı günü bul
          const previousWeekDate = new Date(currentDate.getTime() - 7 * 864e5);
          const previousDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(previousWeekDate);

          // Geçen haftanın verilerini çek
          const { data: previousDuties, error: fetchError } = await sb
            .from("duty_teachers")
            .select("*")
            .eq("date", previousDateKey);

          if (fetchError) throw fetchError;

          if (!previousDuties || previousDuties.length === 0) {
            toast.error("⚠️ Geçen hafta aynı gün için veri bulunamadı.", { id: loadingToast });
            return;
          }

          // Önce bugünkü verileri temizle
          await sb.from("duty_teachers").delete().eq("date", date);

          // Yeni verileri ekle
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

  return (
    <AdminShell profile={profile}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white text-3xl font-extrabold">Nöbetçi Öğretmen</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            Tarihe göre nöbetçi öğretmenleri girin.
          </div>
        </div>
        <a href="/admin/duties/template">
          <SecondaryButton type="button">📋 Haftalık Şablon</SecondaryButton>
        </a>
      </div>

      {/* Toplu İçe Aktarma Bölümü */}
      <div className="mt-5 p-5 rounded-2xl" style={{ background: BRAND.colors.panel, border: `2px solid ${BRAND.colors.info}` }}>
        <div className="text-white text-lg font-bold mb-2">⚡ Hızlı İşlemler</div>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-sm mb-2" style={{ color: BRAND.colors.muted }}>
              Seçili tarih için geçen haftanın aynı gününden nöbetçi öğretmenleri kopyala
            </div>
            <SecondaryButton type="button" onClick={copyFromPreviousWeek} disabled={copying}>
              {copying ? "Kopyalanıyor..." : "📋 Geçen Haftadan Kopyala"}
            </SecondaryButton>
          </div>
          <div className="flex-1">
            <div className="text-sm mb-2" style={{ color: BRAND.colors.muted }}>
              Gerçek nöbet çizelgesinden (5 Ocak - 13 Şubat 2026) tüm verileri içe aktar
            </div>
            <PrimaryButton type="button" onClick={importSchedule} disabled={importing}>
              {importing ? "İçe aktarılıyor..." : "🔄 Nöbet Çizelgesini İçe Aktar"}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Manuel Ekleme Bölümü */}
      <div className="mt-5 grid grid-cols-3 gap-5">
        <div>
          <FieldLabel>Tarih</FieldLabel>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2" />

        <div>
          <FieldLabel>Öğretmen Ad Soyad</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Enes Erdoğan Yaşa" />
        </div>
        <div>
          <FieldLabel>Bölge/Alan</FieldLabel>
          <TextInput value={area} onChange={(e) => setArea(e.target.value)} placeholder="Örn: Giriş Kat" />
        </div>
        <div>
          <FieldLabel>Not</FieldLabel>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsiyonel" />
        </div>

        <div className="col-span-3 flex items-center gap-3">
          <PrimaryButton type="button" onClick={add} disabled={!name.trim()}>
            + Ekle
          </PrimaryButton>
          {/* msg removed */}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length ? (
          items.map((d) => (
            <div key={d.id} className="p-5 rounded-2xl flex items-center justify-between" style={{ background: BRAND.colors.panel }}>
              <div>
                <div className="text-white text-lg font-extrabold">{d.name}</div>
                <div className="text-sm" style={{ color: BRAND.colors.muted }}>
                  {d.area ?? ""}
                  {d.note ? ` • ${d.note}` : ""}
                </div>
              </div>
              <SecondaryButton type="button" onClick={() => del(d.id)}>
                Sil
              </SecondaryButton>
            </div>
          ))
        ) : (
          <div className="text-sm mt-3" style={{ color: BRAND.colors.muted }}>
            Bu tarih için kayıt yok.
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
