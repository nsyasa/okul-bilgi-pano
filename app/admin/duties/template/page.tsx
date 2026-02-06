"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import { DUTY_WEEKLY_TEMPLATE } from "@/lib/dutySchedule";

export default function DutyTemplatePage() {
  return <AuthGate>{(profile) => <DutyTemplateInner profile={profile} />}</AuthGate>;
}

interface TemplateTeacher {
  area: string;
  name: string;
}

interface WeeklyTemplate {
  monday: TemplateTeacher[];
  tuesday: TemplateTeacher[];
  wednesday: TemplateTeacher[];
  thursday: TemplateTeacher[];
  friday: TemplateTeacher[];
}

const AREAS = ["NÖBETÇİ İDARECİ", "BAHÇE", "GİRİŞ KAT", "1.KAT", "2.KAT", "3.KAT"];

const DEFAULT_TEMPLATE: WeeklyTemplate = DUTY_WEEKLY_TEMPLATE;

const cloneTemplate = () => JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as WeeklyTemplate;

function DutyTemplateInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [template, setTemplate] = useState<WeeklyTemplate>(cloneTemplate());
  const [msg, setMsg] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    // localStorage'dan şablonu yükle, yoksa varsayılan şablonu kaydet
    const saved = localStorage.getItem("duty_weekly_template");
    if (saved) {
      try {
        setTemplate(JSON.parse(saved));
      } catch {}
    } else {
      // İlk kez açılıyorsa, varsayılan şablonu kaydet
      localStorage.setItem("duty_weekly_template", JSON.stringify(DEFAULT_TEMPLATE));
      setTemplate(cloneTemplate());
      setMsg("✅ Varsayılan şablon yüklendi");
    }
  }, []);

  const saveTemplate = () => {
    localStorage.setItem("duty_weekly_template", JSON.stringify(template));
    setMsg("✅ Şablon kaydedildi");
  };

  const resetTemplate = () => {
    setTemplate(cloneTemplate());
    localStorage.setItem("duty_weekly_template", JSON.stringify(DEFAULT_TEMPLATE));
    setMsg("✅ Varsayılan şablon yüklendi");
  };

  const updateTeacher = (day: keyof WeeklyTemplate, index: number, name: string) => {
    setTemplate(prev => ({
      ...prev,
      [day]: prev[day].map((t, i) => i === index ? { ...t, name } : t)
    }));
  };

  const applyToWeek = async () => {
    if (!startDate) {
      setMsg("⚠️ Başlangıç tarihi seçin");
      return;
    }

    const startDateObj = new Date(startDate + "T12:00:00");
    if (Number.isNaN(startDateObj.getTime())) {
      setMsg("⚠️ Geçersiz tarih");
      return;
    }

    const weekday = startDateObj.getDay();
    if (weekday !== 1) {
      setMsg("⚠️ Başlangıç tarihi Pazartesi olmalı");
      return;
    }

    if (!confirm(`${startDate} tarihinden başlayarak bu şablon uygulanacak. Devam edilsin mi?`)) return;

    setMsg("Uygulanıyor...");

    try {
      const baseDate = startDateObj;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      
      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(currentDate);
        
        // O günün şablonunu al
        const dayTemplate = template[days[i]];
        const teachers = dayTemplate.filter(t => t.name.trim());
        
        if (teachers.length > 0) {
          // Önce o tarihi temizle
          const { error: deleteError } = await sb.from("duty_teachers").delete().eq("date", dateKey);
          if (deleteError) throw deleteError;
          
          // Yeni verileri ekle
          const records = teachers.map(t => ({
            date: dateKey,
            name: t.name.trim(),
            area: t.area,
            note: null
          }));
          
          const { error: insertError } = await sb.from("duty_teachers").insert(records);
          if (insertError) throw insertError;
        }
      }
      
      setMsg("✅ Şablon başarıyla uygulandı!");
    } catch (err: any) {
      setMsg("❌ Hata: " + err.message);
    }
  };

  const downloadExcel = () => {
    // CSV formatında indir (Excel'de açılabilir)
    const days = [
      { key: 'monday', label: 'PAZARTESİ' },
      { key: 'tuesday', label: 'SALI' },
      { key: 'wednesday', label: 'ÇARŞAMBA' },
      { key: 'thursday', label: 'PERŞEMBE' },
      { key: 'friday', label: 'CUMA' }
    ];

    let csv = "GÜN,ALAN,ÖĞRETMENLERİN İSİMLERİ\n";
    
    days.forEach(day => {
      AREAS.forEach(area => {
        csv += `${day.label},${area},\n`;
      });
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nobet_cizelgesi_sablon.csv";
    link.click();
    setMsg("📥 Excel şablonu indirildi");
  };

  const downloadFilledExcel = () => {
    const days = [
      { key: 'monday', label: 'PAZARTESİ' },
      { key: 'tuesday', label: 'SALI' },
      { key: 'wednesday', label: 'ÇARŞAMBA' },
      { key: 'thursday', label: 'PERŞEMBE' },
      { key: 'friday', label: 'CUMA' }
    ] as const;

    let csv = "GÜN,ALAN,ÖĞRETMENLERİN İSİMLERİ\n";

    days.forEach(day => {
      AREAS.forEach(area => {
        const row = template[day.key].find(t => t.area === area);
        csv += `${day.label},${area},${row?.name ?? ""}\n`;
      });
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nobet_cizelgesi_dolu.csv";
    link.click();
    setMsg("📥 Dolu Excel indirildi");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMsg("❌ Lütfen CSV dosyası yükleyin");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.replace(/^\uFEFF/, "").split('\n').slice(1); // İlk satır başlık
        
        const newTemplate: WeeklyTemplate = {
          monday: AREAS.map(a => ({ area: a, name: "" })),
          tuesday: AREAS.map(a => ({ area: a, name: "" })),
          wednesday: AREAS.map(a => ({ area: a, name: "" })),
          thursday: AREAS.map(a => ({ area: a, name: "" })),
          friday: AREAS.map(a => ({ area: a, name: "" })),
        };

        const dayMap: Record<string, keyof WeeklyTemplate> = {
          'PAZARTESİ': 'monday',
          'SALI': 'tuesday',
          'ÇARŞAMBA': 'wednesday',
          'PERŞEMBE': 'thursday',
          'CUMA': 'friday'
        };

        lines.forEach(line => {
          const [day, area, name] = line.split(',').map(s => s.trim());
          if (day && area && name && dayMap[day]) {
            const dayKey = dayMap[day];
            const areaIndex = AREAS.indexOf(area);
            if (areaIndex >= 0) {
              newTemplate[dayKey][areaIndex].name = name;
            }
          }
        });

        setTemplate(newTemplate);
        setMsg("✅ Excel dosyası yüklendi");
      } catch (err) {
        setMsg("❌ Dosya okuma hatası");
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <AdminShell profile={profile}>
      <div className="text-white text-3xl font-extrabold">Haftalık Nöbet Şablonu</div>
      <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
        Bir kere şablon oluştur, istediğin haftaya uygula
      </div>

      {/* Excel İşlemleri */}
      <div className="mt-5 p-5 rounded-2xl" style={{ background: BRAND.colors.panel, border: `2px solid ${BRAND.colors.brand}` }}>
        <div className="text-white text-lg font-bold mb-3">📊 Excel ile İşlemler</div>
        <div className="flex gap-3">
          <SecondaryButton type="button" onClick={downloadExcel}>
            📥 Boş Excel Şablonunu İndir
          </SecondaryButton>
          <SecondaryButton type="button" onClick={downloadFilledExcel}>
            📥 Dolu Excel'i İndir
          </SecondaryButton>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <SecondaryButton type="button">
              📤 Excel'den Yükle
            </SecondaryButton>
          </label>
        </div>
        <div className="text-xs mt-2" style={{ color: BRAND.colors.muted }}>
          1) Boş şablonu indir → 2) Excel'de doldur → 3) CSV olarak kaydet → 4) Yükle
        </div>
      </div>

      {/* Şablon Tablosu */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-white text-left p-3 rounded-tl-xl" style={{ background: BRAND.colors.panel }}>ALAN</th>
              <th className="text-white p-3" style={{ background: BRAND.colors.panel }}>PAZARTESİ</th>
              <th className="text-white p-3" style={{ background: BRAND.colors.panel }}>SALI</th>
              <th className="text-white p-3" style={{ background: BRAND.colors.panel }}>ÇARŞAMBA</th>
              <th className="text-white p-3" style={{ background: BRAND.colors.panel }}>PERŞEMBE</th>
              <th className="text-white p-3 rounded-tr-xl" style={{ background: BRAND.colors.panel }}>CUMA</th>
            </tr>
          </thead>
          <tbody>
            {AREAS.map((area, areaIdx) => (
              <tr key={area}>
                <td className="text-white font-bold p-3" style={{ background: BRAND.colors.bg }}>
                  {area}
                </td>
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(day => (
                  <td key={day} className="p-2" style={{ background: BRAND.colors.bg }}>
                    <TextInput
                      value={template[day][areaIdx].name}
                      onChange={(e) => updateTeacher(day, areaIdx, e.target.value)}
                      placeholder="Öğretmen adı"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kaydet ve Uygula */}
      <div className="mt-5 p-5 rounded-2xl" style={{ background: BRAND.colors.panel }}>
        <div className="flex gap-5 items-end">
          <div className="flex-1">
            <FieldLabel>Şablonu Uygulanacak Pazartesi Tarihi</FieldLabel>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Örn: 2026-02-10"
            />
            <div className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
              Bu tarihten başlayarak 5 güne (Pzt-Cuma) şablon uygulanacak
            </div>
          </div>
          <SecondaryButton type="button" onClick={saveTemplate}>
            💾 Şablonu Kaydet
          </SecondaryButton>
          <PrimaryButton type="button" onClick={applyToWeek} disabled={!startDate}>
            ✅ Seçili Haftaya Uygula
          </PrimaryButton>
        </div>
      </div>

      {msg && (
        <div className="mt-3 text-sm" style={{ color: BRAND.colors.warn }}>
          {msg}
        </div>
      )}
    </AdminShell>
  );
}
