"use client";

import { BRAND } from "@/lib/branding";
import type { Announcement } from "@/types/player";
import { FieldLabel, PrimaryButton, SecondaryButton, Select, TextArea, TextInput } from "./FormBits";
import { ImageUploader } from "./ImageUploader";
import { MultiImageUploader } from "./MultiImageUploader";
import { useState } from "react";

export type AnnouncementFormState = Partial<Announcement> & { id?: string };

interface AnnouncementFormProps {
    initialState: AnnouncementFormState;
    onClose: () => void;
    onSave: (data: AnnouncementFormState) => Promise<void>;
    busy: boolean;
    // Parent component's tab state helps determine the title for new items
    // Or we can rely on display_mode if it's correctly set in initialState
    titleOverride?: string;
}

export function AnnouncementForm({ initialState, onClose, onSave, busy, titleOverride }: AnnouncementFormProps) {
    const [formData, setFormData] = useState<AnnouncementFormState>(initialState);

    const getTitle = () => {
        if (titleOverride) return titleOverride;

        // Fallback logic based on data
        const mode = formData.display_mode;
        const isEdit = !!formData.id;

        if (mode === "big") return isEdit ? "Ana Duyuru Düzenle" : "Yeni Ana Duyuru";
        if (mode === "image") return isEdit ? "Resim Slaytı Düzenle" : "Yeni Resim Slaytı";
        return isEdit ? "Duyuru Düzenle" : "Yeni Duyuru";
    };

    const toLocalInput = (iso: string | null | undefined) => {
        if (!iso) return "";
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}>
            <div className="w-full max-w-3xl p-6 rounded-2xl overflow-auto max-h-[90vh]" style={{ background: BRAND.colors.bg }}>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="text-white text-2xl font-extrabold">
                        {getTitle()}
                    </div>
                    <SecondaryButton type="button" onClick={onClose}>
                        Kapat
                    </SecondaryButton>
                </div>

                {/* Form Fields */}
                <div className="mt-5 grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                        <FieldLabel>Başlık</FieldLabel>
                        <TextInput
                            value={formData.title ?? ""}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="col-span-2">
                        <FieldLabel>Metin</FieldLabel>
                        <TextArea
                            value={formData.body ?? ""}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        />
                    </div>

                    <div className="col-span-2">
                        <FieldLabel>Görsel (Tek Resim - Eski Yöntem)</FieldLabel>
                        <ImageUploader
                            value={formData.image_url ?? null}
                            onChange={(url) => setFormData({ ...formData, image_url: url })}
                        />
                    </div>

                    <div className="col-span-2">
                        <FieldLabel>Resim Galerisi (Çoklu Resim - Yeni)</FieldLabel>
                        <MultiImageUploader
                            value={formData.image_urls ?? null}
                            onChange={(urls) => setFormData({ ...formData, image_urls: urls })}
                        />
                        <div className="text-xs mt-2" style={{ color: BRAND.colors.muted }}>
                            En fazla 10 resim. Resimler TV ekranında otomatik döner (3sn aralıklarla).
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Kategori</FieldLabel>
                        <Select
                            value={formData.category ?? "general"}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        >
                            <option value="general">Genel</option>
                            <option value="event">Etkinlik</option>
                            <option value="special_day">Belirli Gün/Hafta</option>
                            <option value="health">Sağlık/Hareket</option>
                            <option value="info">Bilgi</option>
                            <option value="sensitive">Hassas (Editör Onayı)</option>
                        </Select>
                    </div>

                    <div>
                        <FieldLabel>Durum</FieldLabel>
                        <Select
                            value={formData.status ?? "draft"}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="draft">Taslak</option>
                            <option value="pending_review">Onay Bekliyor</option>
                            <option value="approved">Onaylandı</option>
                            <option value="published">Yayınla</option>
                            <option value="rejected">Reddedildi</option>
                        </Select>
                        <div className="text-xs mt-2" style={{ color: BRAND.colors.muted }}>
                            Not: Kategori “Hassas” ise “Yayınla” seçsen bile sistem “Onay Bekliyor”a çevirir.
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Gösterim Tipi</FieldLabel>
                        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: BRAND.colors.panel, color: "white" }}>
                            {formData.display_mode === "big" ? "Ana Duyuru" : formData.display_mode === "image" ? "Resim Slaytı" : "Duyuru"}
                        </div>
                    </div>

                    <div>
                        <FieldLabel>Öncelik (0–100)</FieldLabel>
                        <TextInput
                            type="number"
                            value={String(formData.priority ?? 50)}
                            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <FieldLabel>Başlangıç Tarihi</FieldLabel>
                        <TextInput
                            type="datetime-local"
                            value={toLocalInput(formData.start_at)}
                            onChange={(e) => setFormData({ ...formData, start_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                    </div>

                    <div>
                        <FieldLabel>Bitiş Tarihi</FieldLabel>
                        <TextInput
                            type="datetime-local"
                            value={toLocalInput(formData.end_at)}
                            onChange={(e) => setFormData({ ...formData, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <SecondaryButton type="button" onClick={onClose}>
                        İptal
                    </SecondaryButton>
                    <PrimaryButton disabled={busy} type="button" onClick={() => onSave(formData)}>
                        {busy ? "Kaydediliyor…" : "Kaydet"}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
