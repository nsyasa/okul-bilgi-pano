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
const PAGE_SIZE = 20; // Sayfalama boyutu

export default function LessonSchedulePage() {
    return <AuthGate>{(profile) => <LessonScheduleInner profile={profile} />}</AuthGate>;
}

function LessonScheduleInner({ profile }: { profile: any }) {
    const sb = useMemo(() => supabaseBrowser(), []);
    const [entries, setEntries] = useState<LessonScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmData, setConfirmData] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);
    const [parsedData, setParsedData] = useState<{ teacher_name: string; day_of_week: number; lesson_number: number; class_name: string | null }[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Düzenleme durumu
    const [editMode, setEditMode] = useState(false);
    const [editedEntries, setEditedEntries] = useState<Map<string, string | null>>(new Map());
    const [currentPage, setCurrentPage] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        // Tüm kayıtları çek (sınırsız)
        const { data, error } = await sb
            .from("lesson_schedule")
            .select("*")
            .order("teacher_name", { ascending: true });
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

        // If no mappings found, assume simple structure: ALL columns = 5 days x 10 lessons
        // Her 10 sütun bir gün, toplam 50 sütun olmalı
        if (columnMap.length === 0 && header.length > 1) {
            const totalColumns = header.length - 1; // Öğretmen sütunu hariç
            for (let col = 1; col <= totalColumns; col++) {
                const dayIndex = Math.floor((col - 1) / 10);
                const lessonNum = ((col - 1) % 10) + 1;
                if (dayIndex < 5) {
                    columnMap.push({ col, day: dayIndex + 1, lesson: lessonNum });
                }
            }
        }

        // Parse teacher rows - TÜM satırları işle
        for (let row = 1; row < rows.length; row++) {
            const cells = rows[row];
            if (!cells || cells.length === 0) continue;

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

                    // Insert in batches (daha büyük batch ile hızlandır)
                    const batchSize = 500;
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

    // Düzenleme işlemleri
    const handleCellEdit = (entryId: string, value: string) => {
        setEditedEntries(prev => {
            const newMap = new Map(prev);
            newMap.set(entryId, value || null);
            return newMap;
        });
    };

    const handleSaveChanges = async () => {
        if (editedEntries.size === 0) {
            toast.error("Değişiklik yapılmadı.");
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading("Kaydediliyor...");

        try {
            // Batch update
            const updates = Array.from(editedEntries.entries());
            for (const [id, class_name] of updates) {
                const { error } = await sb
                    .from("lesson_schedule")
                    .update({ class_name })
                    .eq("id", id);
                if (error) throw error;
            }

            toast.success(`✅ ${updates.length} kayıt güncellendi`, { id: loadingToast });
            setEditedEntries(new Map());
            setEditMode(false);
            await load();
        } catch (err: any) {
            toast.error("Hata: " + err.message, { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedEntries(new Map());
        setEditMode(false);
    };

    // Excel Şablonu İndir
    const handleDownloadTemplate = () => {
        const wsData: (string | number)[][] = [];

        // Başlık satırı
        const header: (string | number)[] = ["Öğretmen Adı"];
        for (let day = 0; day < 5; day++) {
            for (let lesson = 1; lesson <= 10; lesson++) {
                header.push(lesson);
            }
        }
        wsData.push(header);

        // Örnek satırlar
        wsData.push(["Örnek Öğretmen 1", "9-A", "10-B", "", "11-C", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        wsData.push(["Örnek Öğretmen 2", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ders Programı");

        // Sütun genişlikleri
        ws["!cols"] = [{ wch: 25 }, ...Array(50).fill({ wch: 8 })];

        XLSX.writeFile(wb, "ders_programi_sablonu.xlsx");
        toast.success("Şablon indirildi");
    };

    // Mevcut Programı Excel olarak İndir
    const handleDownloadCurrent = () => {
        if (teachers.length === 0) {
            toast.error("İndirilecek veri yok.");
            return;
        }

        const wsData: (string | number | null)[][] = [];

        // Başlık satırları
        const dayHeader: (string | number)[] = [""];
        const lessonHeader: (string | number)[] = ["Öğretmen Adı"];

        for (let day = 0; day < 5; day++) {
            for (let lesson = 1; lesson <= 10; lesson++) {
                dayHeader.push(lesson === 1 ? DAYS[day] : "");
                lessonHeader.push(lesson);
            }
        }
        wsData.push(dayHeader);
        wsData.push(lessonHeader);

        // Öğretmen verileri
        for (const [teacherName, teacherEntries] of teachers) {
            const row: (string | number | null)[] = [teacherName];
            for (let day = 1; day <= 5; day++) {
                for (let lesson = 1; lesson <= 10; lesson++) {
                    const entry = teacherEntries.find(
                        e => e.day_of_week === day && e.lesson_number === lesson
                    );
                    row.push(entry?.class_name || "");
                }
            }
            wsData.push(row);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ders Programı");

        // Sütun genişlikleri
        ws["!cols"] = [{ wch: 25 }, ...Array(50).fill({ wch: 8 })];

        XLSX.writeFile(wb, "ders_programi.xlsx");
        toast.success("Program indirildi");
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

    // Sayfalama
    const totalPages = Math.ceil(teachers.length / PAGE_SIZE);
    const paginatedTeachers = teachers.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    return (
        <AdminShell profile={profile}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="text-white text-2xl font-bold tracking-tight">Ders Programı</div>
                    <div className="text-sm mt-1 text-white/40">
                        Öğretmen ders programını Excel dosyasından yükleyin veya düzenleyin.
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Şablon İndir */}
                    <button
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Şablon İndir
                    </button>

                    {/* Programı İndir */}
                    {entries.length > 0 && (
                        <button
                            onClick={handleDownloadCurrent}
                            className="px-4 py-2.5 rounded-lg font-semibold text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Programı İndir
                        </button>
                    )}

                    {/* Düzenleme Modu */}
                    {entries.length > 0 && !editMode && (
                        <button
                            onClick={() => setEditMode(true)}
                            className="px-4 py-2.5 rounded-lg font-semibold text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Düzenle
                        </button>
                    )}

                    {/* Kaydet / İptal Butonları (Düzenleme Modunda) */}
                    {editMode && (
                        <>
                            <button
                                onClick={handleSaveChanges}
                                disabled={saving || editedEntries.size === 0}
                                className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-brand hover:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {saving ? "Kaydediliyor..." : `Kaydet (${editedEntries.size})`}
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            >
                                İptal
                            </button>
                        </>
                    )}

                    {/* Tümünü Sil */}
                    {entries.length > 0 && !editMode && (
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
                    {editMode && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold animate-pulse ml-2">
                            ✏️ Düzenleme Modu
                        </span>
                    )}
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
                    <>
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/10">
                                        <th className="text-left py-3 px-3 text-white/40 font-medium sticky left-0 bg-[#0a0a0f] z-10">Öğretmen</th>
                                        {DAYS.map((day, di) => (
                                            LESSONS.map((lesson) => (
                                                <th
                                                    key={`${di}-${lesson}`}
                                                    className="text-center py-2 px-1 text-white/30 font-normal min-w-[50px]"
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
                                    {paginatedTeachers.map(([name, teacherEntries]) => (
                                        <tr key={name} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-2 px-3 text-white font-medium whitespace-nowrap sticky left-0 bg-[#0a0a0f] z-10">{name}</td>
                                            {DAYS.map((_, dayIndex) => (
                                                LESSONS.map((lessonNum) => {
                                                    const entry = teacherEntries.find(
                                                        (e) => e.day_of_week === dayIndex + 1 && e.lesson_number === lessonNum
                                                    );
                                                    const entryId = entry?.id || "";
                                                    const currentValue = editedEntries.has(entryId)
                                                        ? editedEntries.get(entryId) || ""
                                                        : entry?.class_name || "";

                                                    return (
                                                        <td
                                                            key={`${dayIndex}-${lessonNum}`}
                                                            className={`text-center py-1 px-0.5 ${editMode
                                                                    ? "p-0"
                                                                    : entry?.class_name
                                                                        ? "text-emerald-400 font-medium"
                                                                        : "text-white/10"
                                                                }`}
                                                        >
                                                            {editMode && entry ? (
                                                                <input
                                                                    type="text"
                                                                    value={currentValue}
                                                                    onChange={(e) => handleCellEdit(entryId, e.target.value)}
                                                                    className="w-full min-w-[45px] px-1 py-1 text-center text-xs bg-black/40 border border-white/10 rounded focus:border-brand focus:outline-none text-white"
                                                                    placeholder="·"
                                                                />
                                                            ) : (
                                                                entry?.class_name || "·"
                                                            )}
                                                        </td>
                                                    );
                                                })
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Sayfalama */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-2">
                                <div className="text-xs text-white/40">
                                    Sayfa {currentPage + 1} / {totalPages}
                                    <span className="ml-2">
                                        ({currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, teachers.length)} / {teachers.length} öğretmen)
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(0)}
                                        disabled={currentPage === 0}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        ⏮ İlk
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                        disabled={currentPage === 0}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        ◀ Önceki
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage === totalPages - 1}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Sonraki ▶
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages - 1)}
                                        disabled={currentPage === totalPages - 1}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Son ⏭
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
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
