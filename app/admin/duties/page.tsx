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

export default function DutiesPage() {
  return <AuthGate>{(profile) => <DutiesInner profile={profile} />}</AuthGate>;
}

function DutiesInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [date, setDate] = useState<string>(ymdNowTR());
  const [items, setItems] = useState<DutyTeacher[]>([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [copying, setCopying] = useState(false);

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
    setMsg(null);
    const payload = {
      date,
      name: name.trim(),
      area: area.trim() || null,
      note: note.trim() || null,
    };
    const { error } = await sb.from("duty_teachers").insert(payload);
    if (error) setMsg(error.message);
    else {
      setName("");
      setArea("");
      setNote("");
      setMsg("Eklendi.");
      await load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("duty_teachers").delete().eq("id", id);
    if (!error) await load();
  };

  const importSchedule = async () => {
    if (!confirm("TÜM nöbetçi öğretmen kayıtları silinip çizelgedeki veriler (5 Ocak - 13 Şubat 2026) tekrar yüklenecek. Devam edilsin mi?")) return;
    
    setImporting(true);
    setMsg("İçe aktarılıyor...");
    
    try {
      const { allData, dates } = generateDutySchedule("2026-01-05", "2026-02-13");

      // Tüm eski verileri temizle
      const { error: wipeError } = await sb.from("duty_teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (wipeError) throw wipeError;

      // Toplu veri ekle
      const { error } = await sb.from("duty_teachers").insert(allData);
      
      if (error) {
        setMsg("Hata: " + error.message);
      } else {
        setMsg(`✅ Başarılı! ${allData.length} kayıt eklendi (${dates.length} gün)`);
        await load();
      }
    } catch (err: any) {
      setMsg("Hata: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const copyFromPreviousWeek = async () => {
    if (!confirm("Geçen haftanın aynı gününden kopyalansın mı?")) return;
    
    setCopying(true);
    setMsg("Kopyalanıyor...");
    
    try {
      const currentDate = new Date(date + "T12:00:00");
      const currentWeekday = currentDate.getDay();
      
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
        setMsg("⚠️ Geçen hafta aynı gün için veri bulunamadı.");
        return;
      }
      
      // Önce bugünkü verileri temizle
      await sb.from("duty_teachers").delete().eq("date", date);
      
      // Yeni verileri ekle
      const newDuties = previousDuties.map((d: any) => ({
        date: date,
        name: d.name,
        area: d.area,
        note: d.note
      }));
      
      const { error: insertError } = await sb.from("duty_teachers").insert(newDuties);
      
      if (insertError) throw insertError;
      
      setMsg(`✅ ${newDuties.length} kayıt kopyalandı (${previousDateKey}'den)`);
      await load();
    } catch (err: any) {
      setMsg("Hata: " + err.message);
    } finally {
      setCopying(false);
    }
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
          <SecondaryButton type="button">
            📋 Haftalık Şablon
          </SecondaryButton>
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
          {msg ? (
            <div className="text-sm" style={{ color: BRAND.colors.warn }}>
              • {msg}
            </div>
          ) : null}
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
    </AdminShell>
  );
}
