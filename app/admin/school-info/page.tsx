"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Profile } from "@/lib/adminAuth";
import type { SchoolInfo } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, TextArea, TextInput } from "@/components/admin/FormBits";
import { ImageUploader } from "@/components/admin/ImageUploader";

type Form = Partial<SchoolInfo> & { id?: string };

export default function SchoolInfoPage() {
  return <AuthGate>{(profile) => <SchoolInfoInner profile={profile} />}</AuthGate>;
}

function SchoolInfoInner({ profile }: { profile: Profile }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<SchoolInfo[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    school_name_line1: "",
    school_name_line2: "",
    school_logo_url: "",
    footer_bg_color: "", // default brand color
  });

  const load = async () => {
    const { data, error } = await sb.from("school_info").select("*").order("title", { ascending: true }).limit(200);
    if (!error) setItems((data ?? []) as SchoolInfo[]);
  };

  const loadSettings = async () => {
    const { data } = await sb.from("player_settings").select("*").in("key", ["school_name_line1", "school_name_line2", "school_logo_url", "footer_bg_color"]);

    if (data) {
      const newSettings = { ...settings };
      data.forEach((row: { key: string; value: string }) => {
        if (row.key === "school_name_line1") newSettings.school_name_line1 = row.value;
        if (row.key === "school_name_line2") newSettings.school_name_line2 = row.value;
        if (row.key === "school_logo_url") newSettings.school_logo_url = row.value;
        if (row.key === "footer_bg_color") newSettings.footer_bg_color = row.value;
      });
      setSettings(newSettings);
    }
  };

  useEffect(() => {
    load();
    loadSettings();
  }, []);

  const startNew = () => setEditing({ title: "", body: "" });

  const save = async () => {
    if (!editing) return;
    const payload: Partial<SchoolInfo> = { title: (editing.title ?? "").trim(), body: editing.body ?? "" };
    if (!payload.title) return;

    const res = editing.id ? await sb.from("school_info").update(payload).eq("id", editing.id) : await sb.from("school_info").insert(payload);
    if (!res.error) {
      setEditing(null);
      await load();
    }
  };

  const saveSettings = async () => {
    const upsert = async (key: string, value: string) => {
      const { error } = await sb.from("player_settings").upsert({ key, value }, { onConflict: "key" });
      return error;
    };

    const err1 = await upsert("school_name_line1", settings.school_name_line1.trim());
    const err2 = await upsert("school_name_line2", settings.school_name_line2.trim());
    const err3 = await upsert("school_logo_url", settings.school_logo_url);
    const err4 = await upsert("footer_bg_color", settings.footer_bg_color);

    if (!err1 && !err2 && !err3 && !err4) {
      alert("Ayarlar kaydedildi!");
      setShowSettings(false);
    } else {
      alert("Kaydederken hata oluştu.");
    }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await sb.from("school_info").delete().eq("id", id);
    if (!error) await load();
  };

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">Okul Bilgileri</div>
          <div className="text-sm mt-1 text-white/40">
            Player&apos;da sol panelde dönen bilgi kartları ve genel okul ayarları.
          </div>
        </div>
        <div className="flex gap-3">
          <SecondaryButton onClick={() => setShowSettings(true)}>
            ⚙️ Okul Ayarları
          </SecondaryButton>
          <button
            onClick={startNew}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-brand hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kart
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length ? (
          items.map((i) => (
            <div
              key={i.id}
              className="group p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm mb-1">{i.title}</div>
                  <div className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                    {String(i.body).slice(0, 150)}
                    {String(i.body).length > 150 ? "…" : ""}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(i)}
                    className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
                    title="Düzenle"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => del(i.id)}
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
            <div className="text-4xl mb-3 opacity-30">🏫</div>
            <p className="font-medium text-white/50 mb-1">Henüz bilgi kartı yok</p>
            <p className="text-xs opacity-60">&quot;Yeni Kart&quot; butonuyla okul bilgilerini ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-white text-lg font-bold">{editing.id ? "Kartı Düzenle" : "Yeni Kart"}</div>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel>Başlık *</FieldLabel>
                <TextInput
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Örn: Misyon"
                />
              </div>

              <div>
                <FieldLabel>İçerik</FieldLabel>
                <TextArea
                  value={editing.body ?? ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  placeholder="Kart içeriği..."
                />
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="text-white text-lg font-bold">Okul Ayarları</div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldLabel>Okul Adı (1. Satır)</FieldLabel>
                  <TextInput
                    value={settings.school_name_line1}
                    onChange={(e) => setSettings({ ...settings, school_name_line1: e.target.value })}
                    placeholder="Örn: ŞEHİT MUHAMMED İSLAM ALTUĞ"
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Okul Adı (2. Satır)</FieldLabel>
                  <TextInput
                    value={settings.school_name_line2}
                    onChange={(e) => setSettings({ ...settings, school_name_line2: e.target.value })}
                    placeholder="Örn: ANADOLU İMAM HATİP LİSESİ"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Okul Logosu</FieldLabel>
                {/* ImageUploader'ı dynamic import veya doğrudan import edebiliriz. Dosya başında import etmeliyiz. */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <ImageUploader
                    value={settings.school_logo_url || null}
                    onChange={(url: string | null) => setSettings({ ...settings, school_logo_url: url || "" })}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Alt Bant (Footer) Rengi</FieldLabel>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.footer_bg_color || "#4B3FA7"}
                    onChange={(e) => setSettings({ ...settings, footer_bg_color: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer bg-transparent border border-white/20"
                  />
                  <div className="text-xs text-white/50">Varsayılan: #4B3FA7</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <SecondaryButton type="button" onClick={() => setShowSettings(false)}>
                  İptal
                </SecondaryButton>
                <PrimaryButton type="button" onClick={saveSettings}>
                  Ayarları Kaydet
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
