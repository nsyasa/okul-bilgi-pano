"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BRAND } from "@/lib/branding";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { PrimaryButton, SecondaryButton } from "@/components/admin/FormBits";
import toast from "react-hot-toast";

export default function DutiesPage() {
  return <AuthGate>{(profile) => <DutiesInner profile={profile} />}</AuthGate>;
}

interface TemplateEntry {
  id?: string;
  day_of_week: number;
  area: string;
  teacher_name: string;
}

const AREAS = ["NÖBETÇİ İDARECİ", "3.KAT", "2.KAT", "1.KAT", "GİRİŞ KAT", "BAHÇE"];
const DAYS = [
  { num: 1, label: "PAZARTESİ", short: "Pzt" },
  { num: 2, label: "SALI", short: "Sal" },
  { num: 3, label: "ÇARŞAMBA", short: "Çar" },
  { num: 4, label: "PERŞEMBE", short: "Per" },
  { num: 5, label: "CUMA", short: "Cum" },
];

function DutiesInner({ profile }: { profile: any }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [template, setTemplate] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

      // Eksik alanları tamamla
      const fullTemplate: TemplateEntry[] = [];
      DAYS.forEach(day => {
        AREAS.forEach(area => {
          const existing = (data || []).find((d: any) => d.day_of_week === day.num && d.area === area);
          if (existing) {
            fullTemplate.push(existing);
          } else {
            fullTemplate.push({ day_of_week: day.num, area, teacher_name: "" });
          }
        });
      });
      setTemplate(fullTemplate);
    } catch (err: unknown) {
      toast.error("Yükleme hatası: " + (err instanceof Error ? err.message : String(err)));
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

      toast.success(`✅ ${toInsert.length} nöbetçi kaydedildi`, { id: loadingToast });
      setEditMode(false);
      await loadTemplate();
    } catch (err: unknown) {
      toast.error("Kaydetme hatası: " + (err instanceof Error ? err.message : String(err)), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  // Excel'den yükle (CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading("Excel okunuyor...");

    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, "").split('\n').filter(l => l.trim());

      // Başlık satırını atla
      const dataLines = lines.slice(1);

      const newTemplate: TemplateEntry[] = [];
      DAYS.forEach(day => {
        AREAS.forEach(area => {
          newTemplate.push({ day_of_week: day.num, area, teacher_name: "" });
        });
      });

      const dayMap: Record<string, number> = {
        'PAZARTESİ': 1, 'PAZARTESI': 1,
        'SALI': 2,
        'ÇARŞAMBA': 3, 'CARSAMBA': 3,
        'PERŞEMBE': 4, 'PERSEMBE': 4,
        'CUMA': 5
      };

      dataLines.forEach(line => {
        const parts = line.split(',').map(s => s.trim().replace(/"/g, ''));
        if (parts.length >= 3) {
          const [dayStr, area, ...nameParts] = parts;
          // Virgülden sonraki parçaları da al (birden fazla isim olabilir)
          const name = nameParts.join(', ').trim();
          const dayNum = dayMap[dayStr.toUpperCase()];
          if (dayNum && name) {
            const idx = newTemplate.findIndex(t => t.day_of_week === dayNum && t.area === area);
            if (idx >= 0) {
              // Eğer zaten isim varsa, birleştir
              const current = newTemplate[idx].teacher_name;
              if (current) {
                newTemplate[idx].teacher_name = current + ", " + name;
              } else {
                newTemplate[idx].teacher_name = name;
              }
            }
          }
        }
      });

      setTemplate(newTemplate);
      setEditMode(true);
      toast.success("✅ Excel yüklendi. Kaydet'e tıklayın.", { id: loadingToast });
    } catch (err: unknown) {
      toast.error("Excel okuma hatası: " + (err instanceof Error ? err.message : String(err)), { id: loadingToast });
    }

    // Input'u sıfırla
    e.target.value = "";
  };

  // Örnek Excel indir
  const downloadExcelTemplate = () => {
    let csv = "GÜN,ALAN,ÖĞRETMEN\n";
    DAYS.forEach(day => {
      AREAS.forEach(area => {
        const entry = template.find(t => t.day_of_week === day.num && t.area === area);
        csv += `${day.label},${area},${entry?.teacher_name || ""}\n`;
      });
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nobetci_programi.csv";
    link.click();
    toast.success("📥 Excel indirildi");
  };

  // Alan için renk
  const getAreaColor = (area: string) => {
    if (area.includes("İDARE")) return "bg-purple-500/20 text-purple-300";
    if (area.includes("3.KAT")) return "bg-blue-500/20 text-blue-300";
    if (area.includes("2.KAT")) return "bg-cyan-500/20 text-cyan-300";
    if (area.includes("1.KAT")) return "bg-emerald-500/20 text-emerald-300";
    if (area.includes("GİRİŞ")) return "bg-amber-500/20 text-amber-300";
    if (area.includes("BAHÇE")) return "bg-green-500/20 text-green-300";
    return "bg-white/10 text-white/50";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-white text-2xl font-bold">Nöbetçi Öğretmen</div>
          <div className="text-sm text-white/40 mt-1">
            Haftalık nöbet programını yönetin
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <>
              <SecondaryButton type="button" onClick={downloadExcelTemplate}>
                📥 Excel İndir
              </SecondaryButton>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                  📤 Excel Yükle
                </div>
              </label>
              <PrimaryButton type="button" onClick={() => setEditMode(true)}>
                ✏️ Düzenle
              </PrimaryButton>
            </>
          ) : (
            <>
              <SecondaryButton type="button" onClick={() => { setEditMode(false); loadTemplate(); }}>
                İptal
              </SecondaryButton>
              <PrimaryButton type="button" onClick={saveTemplate} disabled={saving}>
                {saving ? "Kaydediliyor..." : "💾 Kaydet"}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {/* Haftalık Tablo */}
      <div className="rounded-xl overflow-hidden border border-white/10" style={{ background: BRAND.colors.panel }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/40 text-xs uppercase font-medium w-32">Alan</th>
                {DAYS.map(day => (
                  <th key={day.num} className="p-4 text-white text-xs uppercase font-medium text-center">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AREAS.map((area, areaIdx) => (
                <tr key={area} className={areaIdx < AREAS.length - 1 ? "border-b border-white/5" : ""}>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getAreaColor(area)}`}>
                      {area}
                    </span>
                  </td>
                  {DAYS.map(day => {
                    const entry = template.find(t => t.day_of_week === day.num && t.area === area);
                    const names = entry?.teacher_name?.split(',').map(n => n.trim()).filter(n => n) || [];
                    return (
                      <td key={day.num} className="p-2 text-center align-top">
                        {editMode ? (
                          <textarea
                            value={entry?.teacher_name || ""}
                            onChange={(e) => updateTeacher(day.num, area, e.target.value)}
                            placeholder="İsim1, İsim2"
                            rows={2}
                            className="w-full px-2 py-1.5 rounded-lg bg-black/30 text-white text-xs border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all placeholder:text-white/20 text-center resize-none"
                          />
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {names.length > 0 ? names.map((name, i) => (
                              <div key={i} className="text-xs text-white">{name}</div>
                            )) : (
                              <div className="text-xs text-white/20">—</div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bilgi Notu */}
      <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-emerald-300 font-medium text-sm">Nasıl Çalışır?</div>
            <div className="text-emerald-300/70 text-xs mt-1">
              • Bu program her hafta otomatik olarak uygulanır.<br />
              • Excel&apos;den yüklemek için CSV formatında dosya kullanın (GÜN, ALAN, ÖĞRETMEN sütunları).<br />
              • Değişiklik yaptıktan sonra &quot;Kaydet&quot; butonuna tıklamayı unutmayın.
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
