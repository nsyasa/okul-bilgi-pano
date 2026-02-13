"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { FieldLabel, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/FormBits";
import toast from "react-hot-toast";

export default function DutyTemplatePage() {
  return <AuthGate>{(profile) => <DutyTemplateInner profile={profile} />}</AuthGate>;
}

interface TemplateEntry {
  id?: string;
  day_of_week: number;
  area: string;
  teacher_name: string;
}

const AREAS = ["NÖBETÇİ İDARECİ", "BAHÇE", "GİRİŞ KAT", "1.KAT", "2.KAT", "3.KAT"];
const DAYS = [
  { num: 1, label: "PAZARTESİ" },
  { num: 2, label: "SALI" },
  { num: 3, label: "ÇARŞAMBA" },
  { num: 4, label: "PERŞEMBE" },
  { num: 5, label: "CUMA" },
];

function DutyTemplateInner({ profile }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [template, setTemplate] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Şablonu Supabase'den yükle
  const loadTemplate = async () => {
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("duty_templates")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("area", { ascending: true });

      if (error) throw error;

      // Eğer veri yoksa boş şablon oluştur
      if (!data || data.length === 0) {
        const emptyTemplate: TemplateEntry[] = [];
        DAYS.forEach(day => {
          AREAS.forEach(area => {
            emptyTemplate.push({ day_of_week: day.num, area, teacher_name: "" });
          });
        });
        setTemplate(emptyTemplate);
      } else {
        // Eksik alanları tamamla
        const fullTemplate: TemplateEntry[] = [];
        DAYS.forEach(day => {
          AREAS.forEach(area => {
            const existing = data.find((d: any) => d.day_of_week === day.num && d.area === area);
            if (existing) {
              fullTemplate.push(existing);
            } else {
              fullTemplate.push({ day_of_week: day.num, area, teacher_name: "" });
            }
          });
        });
        setTemplate(fullTemplate);
      }
    } catch (err: any) {
      toast.error("Yükleme hatası: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, []);

  // Öğretmen adını güncelle
  const updateTeacher = (dayNum: number, area: string, name: string) => {
    setTemplate(prev =>
      prev.map(t =>
        t.day_of_week === dayNum && t.area === area
          ? { ...t, teacher_name: name }
          : t
      )
    );
  };

  // Şablonu Supabase'e kaydet
  const saveTemplate = async () => {
    setSaving(true);
    const loadingToast = toast.loading("Kaydediliyor...");

    try {
      // Önce tüm eski kayıtları sil
      const { error: deleteError } = await sb
        .from("duty_templates")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      // Sadece dolu olanları ekle
      const toInsert = template
        .filter(t => t.teacher_name.trim())
        .map(t => ({
          day_of_week: t.day_of_week,
          area: t.area,
          teacher_name: t.teacher_name.trim(),
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await sb.from("duty_templates").insert(toInsert);
        if (insertError) throw insertError;
      }

      toast.success(`✅ ${toInsert.length} kayıt kaydedildi`, { id: loadingToast });
      await loadTemplate();
    } catch (err: any) {
      toast.error("Kaydetme hatası: " + err.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  // Belirli bir gün için öğretmen sayısı
  const getDayCount = (dayNum: number) => {
    return template.filter(t => t.day_of_week === dayNum && t.teacher_name.trim()).length;
  };

  // Alan için renk
  const getAreaColor = (area: string) => {
    if (area.includes("İDARE")) return "text-purple-400";
    if (area.includes("3.KAT")) return "text-blue-400";
    if (area.includes("2.KAT")) return "text-cyan-400";
    if (area.includes("1.KAT")) return "text-emerald-400";
    if (area.includes("GİRİŞ")) return "text-amber-400";
    if (area.includes("BAHÇE")) return "text-green-400";
    return "text-white/50";
  };

  if (loading) {
    return (
      <AdminShell profile={profile}>
        <div className="flex items-center justify-center py-20">
          <div className="text-white/50">Yükleniyor...</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-white text-2xl font-bold">Haftalık Nöbet Şablonu</div>
          <div className="text-sm text-white/40 mt-1">
            Bir kere tanımla, her hafta otomatik uygulansın
          </div>
        </div>
        <div className="flex gap-3">
          <a href="/admin/duties">
            <SecondaryButton type="button">← Tarihe Göre</SecondaryButton>
          </a>
          <PrimaryButton type="button" onClick={saveTemplate} disabled={saving}>
            {saving ? "Kaydediliyor..." : "💾 Kaydet"}
          </PrimaryButton>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {DAYS.map(day => (
          <div key={day.num} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div className="text-white/40 text-[10px] uppercase tracking-wider">{day.label}</div>
            <div className="text-white text-lg font-bold mt-1">{getDayCount(day.num)}</div>
            <div className="text-white/30 text-[10px]">nöbetçi</div>
          </div>
        ))}
      </div>

      {/* Şablon Tablosu */}
      <div className="rounded-xl overflow-hidden border border-white/10" style={{ background: BRAND.colors.panel }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-white/40 text-xs uppercase font-medium">Alan</th>
              {DAYS.map(day => (
                <th key={day.num} className="p-3 text-white text-xs uppercase font-medium text-center">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((area, areaIdx) => (
              <tr key={area} className={areaIdx < AREAS.length - 1 ? "border-b border-white/5" : ""}>
                <td className={`p-3 font-bold text-sm ${getAreaColor(area)}`}>
                  {area}
                </td>
                {DAYS.map(day => {
                  const entry = template.find(t => t.day_of_week === day.num && t.area === area);
                  return (
                    <td key={day.num} className="p-2">
                      <input
                        type="text"
                        value={entry?.teacher_name || ""}
                        onChange={(e) => updateTeacher(day.num, area, e.target.value)}
                        placeholder="Öğretmen adı"
                        className="w-full px-3 py-2 rounded-lg bg-black/30 text-white text-sm border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all placeholder:text-white/20"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bilgi Notu */}
      <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-emerald-300 font-medium text-sm">Nasıl Çalışır?</div>
            <div className="text-emerald-300/70 text-xs mt-1">
              • Bu şablon her hafta otomatik olarak uygulanır.<br />
              • Belirli bir güne özel değişiklik yapmak için &quot;Tarihe Göre&quot; sayfasını kullanın.<br />
              • Player önce tarihe özel kayıt var mı bakar, yoksa bu şablonu kullanır.
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
