"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { FieldLabel, PrimaryButton, SecondaryButton } from "@/components/admin/FormBits";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import toast from "react-hot-toast";
import type { LessonScheduleEntry } from "@/types/player";
import * as XLSX from "xlsx";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function LessonSchedulePage() {
    return <AuthGate>{(profile) => <LessonScheduleInner profile={profile} />}</AuthGate>;
}

function LessonScheduleInner({ profile }: { profile: any }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const [entries, setEntries] = useState<LessonScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmData, setConfirmData] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);
    const [parsedData, setParsedData] = useState<{ teacher_name: string; day_of_week: number; lesson_number: number; class_name: string | null }[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await sb
            .from("lesson_schedule")
            .select("*")
            .order("teacher_name", { ascending: true })
            .limit(2000);
        if (!error) setEntries((data ?? []) as any);
        setLoading(false);
    }, [sb]);

    useEffect(() => {
        load();
    }, [load]);

    // Parse Excel file
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON with header row
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                if (jsonData.length < 2) {
                    toast.error("Excel dosyası boş veya geçersiz format.");
                    return;
                }

                const results = parseExcelRows(jsonData);

                if (results.length === 0) {
                    toast.error("Veri parse edilemedi. Lütfen Excel formatını kontrol edin.");
                    return;
                }

                setParsedData(results);
                toast.success(`${results.length} kayıt bulundu. Yüklemek için "Veritabanına Yükle" butonuna tıklayın.`);
            } catch (err: any) {
                toast.error("Excel okuma hatası: " + err.message);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // Parse Excel rows - handles the format where columns are: Teacher | Day1-Lesson1 | Day1-Lesson2 | ... | Day5-Lesson10
    const parseExcelRows = (rows: any[][]) => {
        const results: { teacher_name: string; day_of_week: number; lesson_number: number; class_name: string | null }[] = [];

        const header = rows[0];

        // Determine structure: check if header has day/lesson info or just numbers
        // Expected: First column is teacher name, next 50 columns are Day1-L1, Day1-L2, ..., Day5-L10
        const columnMap: { col: number; day: number; lesson: number }[] = [];

        for (let col = 1; col < header.length; col++) {
            const cell = String(header[col] || "").trim();
            const mapping = parseHeaderCell(cell, col);
            if (mapping) {
                columnMap.push({ col, ...mapping });
            }
        }

        // If no mappings found, assume simple structure: 50 columns = 5 days x 10 lessons
        if (columnMap.length === 0 && header.length > 1) {
            for (let col = 1; col < Math.min(header.length, 51); col++) {
                const dayIndex = Math.floor((col - 1) / 10);
                const lessonNum = ((col - 1) % 10) + 1;
                if (dayIndex < 5) {
                    columnMap.push({ col, day: dayIndex + 1, lesson: lessonNum });
                }
            }
        }

        // Parse teacher rows
        for (let row = 1; row < rows.length; row++) {
            const cells = rows[row];
            const teacherName = String(cells[0] || "").trim();
            if (!teacherName) continue;

            for (const cm of columnMap) {
                const className = cells[cm.col] ? String(cells[cm.col]).trim() : null;
                results.push({
                    teacher_name: teacherName,
                    day_of_week: cm.day,
                    lesson_number: cm.lesson,
                    class_name: className || null,
                });
            }
        }

        return results;
    };

    // Parse header cell to get day/lesson mapping
    const parseHeaderCell = (cell: string, colIndex: number): { day: number; lesson: number } | null => {
        if (!cell) return null;

        // Try to parse number (1-10)
        const num = parseInt(cell);
        if (!isNaN(num) && num >= 1 && num <= 10) {
            // Check pattern - every 10 columns is a new day
            const dayIndex = Math.floor((colIndex - 1) / 10);
            if (dayIndex < 5) {
                return { day: dayIndex + 1, lesson: num };
            }
        }

        // Try to parse "Pzt-1", "Pazartesi 3", etc.
        const dayMap: Record<string, number> = {
            "pzt": 1, "pazartesi": 1,
            "sal": 2, "salı": 2, "sali": 2,
            "çar": 3, "çarş": 3, "çarsamba": 3, "çarşamba": 3, "car": 3, "carsamba": 3,
            "per": 4, "perş": 4, "persembe": 4, "perşembe": 4,
            "cum": 5, "cuma": 5,
        };

        const lower = cell.toLowerCase();
        for (const [key, dayNum] of Object.entries(dayMap)) {
            if (lower.startsWith(key)) {
                const rest = lower.replace(key, "").replace(/[-\s.]/g, "");
                const lessonNum = parseInt(rest);
                if (!isNaN(lessonNum) && lessonNum >= 1 && lessonNum <= 10) {
                    return { day: dayNum, lesson: lessonNum };
                }
            }
        }

        return null;
    };

    const handleImport = () => {
        if (parsedData.length === 0) {
            toast.error("Önce Excel dosyası yükleyin.");
            return;
        }

        setConfirmData({
            title: "Ders Programını Yükle",
            desc: `${parsedData.length} kayıt bulundu. Mevcut tüm ders programı silinecek ve yeni verilerle değiştirilecek.\n\nDevam etmek istiyor musunuz?`,
            action: async () => {
                setConfirmOpen(false);
                setImporting(true);
                const loadingToast = toast.loading("Yükleniyor...");

                try {
                    // Delete all existing
                    const { error: delErr } = await sb
                        .from("lesson_schedule")
                        .delete()
                        .neq("id", "00000000-0000-0000-0000-000000000000");
                    if (delErr) throw delErr;

                    // Insert in batches
                    const batchSize = 100;
                    for (let i = 0; i < parsedData.length; i += batchSize) {
                        const batch = parsedData.slice(i, i + batchSize);
                        const { error } = await sb.from("lesson_schedule").insert(batch);
                        if (error) throw error;
                    }

                    toast.success(`✅ ${parsedData.length} kayıt yüklendi`, { id: loadingToast });
                    setParsedData([]);
                    setFileName(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    await load();
                } catch (err: any) {
                    toast.error("Hata: " + err.message, { id: loadingToast });
                } finally {
                    setImporting(false);
                }
            },
        });
        setConfirmOpen(true);
    };

    const handleClearAll = () => {
        setConfirmData({
            title: "Tüm Programı Sil",
            desc: "Tüm ders programı verileri silinecek. Bu işlem geri alınamaz.",
            action: async () => {
                setConfirmOpen(false);
                const loadingToast = toast.loading("Siliniyor...");
                try {
                    const { error } = await sb
                        .from("lesson_schedule")
                        .delete()
                        .neq("id", "00000000-0000-0000-0000-000000000000");
                    if (error) throw error;
                    toast.success("Tüm veriler silindi", { id: loadingToast });
                    await load();
                } catch (err: any) {
                    toast.error("Hata: " + err.message, { id: loadingToast });
                }
            },
        });
        setConfirmOpen(true);
    };

    // Group entries by teacher
    const teachers = useMemo(() => {
        const map = new Map<string, LessonScheduleEntry[]>();
        for (const e of entries) {
            if (!map.has(e.teacher_name)) map.set(e.teacher_name, []);
            map.get(e.teacher_name)!.push(e);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "tr"));
    }, [entries]);

    return (
        <AdminShell profile={profile}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="text-white text-2xl font-bold tracking-tight">Ders Programı</div>
                    <div className="text-sm mt-1 text-white/40">
                        Öğretmen ders programını Excel dosyasından yükleyin.
                    </div>
                </div>
                <div className="flex gap-2">
                    {entries.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2.5 rounded-lg font-semibold text-sm text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                            Tümünü Sil
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Section */}
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-6 bg-brand rounded-full"></div>
                    <h3 className="text-white font-bold text-sm">Excel Dosyası Yükle</h3>
                </div>

                <div className="mb-4">
                    <FieldLabel>Excel Dosyası (.xlsx, .xls)</FieldLabel>
                    <div className="flex gap-3 items-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="excel-upload"
                        />
                        <label
                            htmlFor="excel-upload"
                            className="flex-1 px-4 py-4 rounded-xl bg-black/30 border border-white/10 hover:border-brand/50 transition-all cursor-pointer text-center"
                        >
                            {fileName ? (
                                <div className="flex items-center justify-center gap-3">
                                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-white font-medium">{fileName}</span>
                                    <span className="text-emerald-400 text-sm">({parsedData.length} kayıt)</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-white/50 text-sm">Dosya seçmek için tıklayın veya sürükleyin</span>
                                    <span className="text-white/30 text-xs">.xlsx, .xls veya .csv</span>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {parsedData.length > 0 && (
                    <div className="flex gap-3">
                        <PrimaryButton onClick={handleImport} disabled={importing}>
                            {importing ? "Yükleniyor..." : "📥 Veritabanına Yükle"}
                        </PrimaryButton>
                        <SecondaryButton onClick={() => {
                            setParsedData([]);
                            setFileName(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }}>
                            İptal
                        </SecondaryButton>
                    </div>
                )}

                <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Excel Format Bilgisi</div>
                    <div className="text-xs text-white/40 leading-relaxed">
                        İlk sütun öğretmen adı olmalı. Sonraki sütunlar her gün için 1-10 ders numaralarını içermeli.
                        <br />
                        Örnek: <span className="text-white/60 font-mono">Öğretmen | 1 | 2 | 3 | ... | 10 | 1 | 2 | ... </span> (5 gün × 10 ders = 50 sütun)
                    </div>
                </div>
            </div>

            {/* Current Data Preview */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-white font-bold text-sm">Mevcut Program</h3>
                    <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono">
                        {teachers.length} öğretmen • {entries.length} kayıt
                    </span>
                </div>

                {loading ? (
                    <div className="text-white/40 text-sm py-8 text-center">Yükleniyor...</div>
                ) : teachers.length === 0 ? (
                    <div className="text-center py-16 px-6 text-white/30 text-sm border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
                        <div className="text-4xl mb-3 opacity-30">📋</div>
                        <p className="font-medium text-white/50 mb-1">Henüz ders programı yüklenmemiş</p>
                        <p className="text-xs opacity-60">Yukarıdan Excel dosyası yükleyebilirsiniz.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/10">
                                    <th className="text-left py-3 px-3 text-white/40 font-medium sticky left-0 bg-[#0a0a0f]">Öğretmen</th>
                                    {DAYS.map((day, di) => (
                                        LESSONS.map((lesson) => (
                                            <th
                                                key={`${di}-${lesson}`}
                                                className="text-center py-2 px-1 text-white/30 font-normal min-w-[40px]"
                                                title={`${day} - ${lesson}. Ders`}
                                            >
                                                <span className="text-[9px]">{lesson === 1 ? `${day.slice(0, 2)}` : ""}</span>
                                                <span className="text-[9px] block">{lesson}</span>
                                            </th>
                                        ))
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {teachers.slice(0, 30).map(([name, teacherEntries]) => (
                                    <tr key={name} className="border-b border-white/5 hover:bg-white/[0.02]">
                                        <td className="py-2 px-3 text-white font-medium whitespace-nowrap sticky left-0 bg-[#0a0a0f]">{name}</td>
                                        {DAYS.map((_, dayIndex) => (
                                            LESSONS.map((lessonNum) => {
                                                const entry = teacherEntries.find(
                                                    (e) => e.day_of_week === dayIndex + 1 && e.lesson_number === lessonNum
                                                );
                                                return (
                                                    <td
                                                        key={`${dayIndex}-${lessonNum}`}
                                                        className={`text-center py-1 px-1 ${entry?.class_name ? "text-emerald-400 font-medium" : "text-white/10"}`}
                                                    >
                                                        {entry?.class_name || "·"}
                                                    </td>
                                                );
                                            })
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {teachers.length > 30 && (
                            <div className="text-center py-3 text-white/30 text-xs border-t border-white/5">
                                ve {teachers.length - 30} öğretmen daha...
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title={confirmData?.title || ""}
                description={confirmData?.desc}
                destructive
                confirmText="Onayla"
                onConfirm={confirmData?.action || (() => { })}
                onCancel={() => setConfirmOpen(false)}
            />
        </AdminShell>
    );
}
