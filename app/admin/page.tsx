"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ymdNowTR } from "@/lib/validate";

// Icons for cards
const Icons = {
  announcement: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  duty: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  template: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  ticker: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  preview: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

function QuickActionCard({ title, desc, href, icon, color }: { title: string; desc: string; href: string; icon: React.ReactNode; color: string }) {
  return (
    <Link href={href} className="group block">
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all h-full">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm group-hover:text-brand transition-colors">{title}</div>
            <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{desc}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatsCard({ label, value, subtext, href, icon }: { label: string; value: string | number; subtext?: string; href?: string; icon?: React.ReactNode }) {
  const content = (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all h-full group">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</div>
          <div className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</div>
          {subtext && <div className="mt-1 text-[11px] text-white/40">{subtext}</div>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  return content;
}

// Preview Tool Component
function PreviewTool() {
  // Get current Istanbul time as default
  const getDefaultDateTime = () => {
    const now = new Date();
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const trFormatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const formatted = trFormatter.format(now).replace(" ", "T");
    return formatted;
  };

  const [previewAt, setPreviewAt] = useState("");
  const [ttl, setTtl] = useState("60");
  const [mode, setMode] = useState<"freeze" | "run">("freeze");

  const handlePreview = useCallback(() => {
    if (!previewAt) return;

    // datetime-local değeri timezone içermez.
    // Proje her yerde Europe/Istanbul kullandığı için direkt "YYYY-MM-DDTHH:mm" formatında gönderiyoruz.
    // Player tarafında bu değer parse edilerek kullanılıyor.
    const url = `/player?previewAt=${encodeURIComponent(previewAt)}&previewTtlSec=${ttl}&previewMode=${mode}`;
    window.open(url, "_blank");
  }, [previewAt, ttl, mode]);

  const handleReset = useCallback(() => {
    setPreviewAt("");
  }, []);

  const handleNow = useCallback(() => {
    setPreviewAt(getDefaultDateTime());
  }, []);

  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          {Icons.preview}
        </div>
        <div>
          <div className="text-white font-bold text-sm">Zaman Önizleme</div>
          <div className="text-[10px] text-white/40">Farklı bir tarih/saat için TV ekranını test edin</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* DateTime Input */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-1.5">Tarih / Saat</label>
          <input
            type="datetime-local"
            value={previewAt}
            onChange={(e) => setPreviewAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* TTL Select */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-1.5">Süre (TTL)</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
          >
            <option value="30">30 saniye</option>
            <option value="60">60 saniye</option>
            <option value="120">2 dakika</option>
            <option value="300">5 dakika</option>
            <option value="600">10 dakika</option>
          </select>
        </div>

        {/* Mode Select */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/30 block mb-1.5">Mod</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "freeze" | "run")}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
          >
            <option value="freeze">Dondur (sabit saat)</option>
            <option value="run">Akıt (ilerleyen saat)</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleNow}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            title="Şu anki zamanı ayarla"
          >
            Şimdi
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            disabled={!previewAt}
          >
            Temizle
          </button>
          <button
            onClick={handlePreview}
            disabled={!previewAt}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Önizle
          </button>
        </div>
      </div>

      <div className="text-[10px] text-white/30">
        💡 Seçilen saat için player yeni sekmede açılır. TTL süresi dolunca otomatik olarak gerçek zamana döner.
      </div>
    </div>
  );
}

export default function AdminHome() {
  return (
    <AuthGate>
      {(profile) => <Dashboard profile={profile} />}
    </AuthGate>
  );
}

function Dashboard({ profile }: { profile: any }) {
  const [stats, setStats] = useState({
    dutyCount: 0,
    publishedAnnouncements: 0,
    lastUpdate: null as string | null,
    loading: true,
  });

  useEffect(() => {
    const sb = supabaseBrowser();
    const today = ymdNowTR();

    async function loadStats() {
      const dutyPromise = sb.from("duty_teachers").select("id", { count: "exact", head: true }).eq("date", today);
      const announcementPromise = sb.from("announcements").select("id", { count: "exact", head: true }).eq("status", "published");
      const lastAnnouncementPromise = sb.from("announcements").select("updated_at").order("updated_at", { ascending: false }).limit(1).single();
      const lastDutyPromise = sb.from("duty_teachers").select("created_at").order("created_at", { ascending: false }).limit(1).single();

      const [dutyRes, annRes, lastAnn, lastDuty] = await Promise.all([
        dutyPromise,
        announcementPromise,
        lastAnnouncementPromise,
        lastDutyPromise
      ]);

      let lastUpdateDate: Date | null = null;
      if (lastAnn.data?.updated_at) {
        lastUpdateDate = new Date(lastAnn.data.updated_at);
      }
      if (lastDuty.data?.created_at) {
        const d = new Date(lastDuty.data.created_at);
        if (!lastUpdateDate || d > lastUpdateDate) {
          lastUpdateDate = d;
        }
      }

      setStats({
        dutyCount: dutyRes.count ?? 0,
        publishedAnnouncements: annRes.count ?? 0,
        lastUpdate: lastUpdateDate ? lastUpdateDate.toLocaleString("tr-TR", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        }) : "—",
        loading: false,
      });
    }

    loadStats();
  }, []);

  return (
    <AdminShell profile={profile}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">Gösterge Paneli</div>
          <div className="text-sm mt-1 text-white/40">
            Hoş geldin, <span className="text-white/60">{profile.full_name || "Kullanıcı"}</span>. İçerikleri buradan yönetebilirsin.
          </div>
        </div>

        <Link href="/admin/announcements?new=true">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-brand hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Hızlı Duyuru
          </button>
        </Link>
      </div>

      {/* Preview Tool */}
      <PreviewTool />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          label="Bugünkü Nöbetçiler"
          value={stats.loading ? "..." : stats.dutyCount}
          subtext={stats.dutyCount === 0 && !stats.loading ? "Henüz girilmedi" : "Kişi görevli"}
          href="/admin/duties"
          icon={Icons.duty}
        />
        <StatsCard
          label="Yayındaki Duyurular"
          value={stats.loading ? "..." : stats.publishedAnnouncements}
          subtext="TV ekranında dönüyor"
          href="/admin/announcements"
          icon={Icons.announcement}
        />
        <StatsCard
          label="Son Güncelleme"
          value={stats.loading ? "..." : (stats.lastUpdate || "—")}
          subtext="Sistemdeki son işlem"
          icon={Icons.calendar}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Hızlı Erişim</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickActionCard
            title="Duyurular"
            desc="Haber ve slaytlar"
            href="/admin/announcements"
            icon={Icons.announcement}
            color="bg-blue-500/10 text-blue-400"
          />
          <QuickActionCard
            title="Nöbetçi Öğretmen"
            desc="Günlük liste"
            href="/admin/duties"
            icon={Icons.duty}
            color="bg-purple-500/10 text-purple-400"
          />
          <QuickActionCard
            title="Nöbet Şablonu"
            desc="Haftalık taslak"
            href="/admin/duties/template"
            icon={Icons.template}
            color="bg-amber-500/10 text-amber-400"
          />
          <QuickActionCard
            title="Zil Programı"
            desc="Ders saatleri"
            href="/admin/schedule/templates"
            icon={Icons.bell}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <QuickActionCard
            title="Özel Gün"
            desc="Sınav/etkinlik"
            href="/admin/schedule/overrides"
            icon={Icons.calendar}
            color="bg-rose-500/10 text-rose-400"
          />
          <QuickActionCard
            title="Alt Bant"
            desc="Kayan yazı"
            href="/admin/ticker"
            icon={Icons.ticker}
            color="bg-cyan-500/10 text-cyan-400"
          />
          <QuickActionCard
            title="YouTube"
            desc="Video listesi"
            href="/admin/youtube"
            icon={Icons.youtube}
            color="bg-red-500/10 text-red-400"
          />
          <QuickActionCard
            title="Okul Bilgileri"
            desc="Sol panel"
            href="/admin/school-info"
            icon={Icons.school}
            color="bg-indigo-500/10 text-indigo-400"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
        <a className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-2" href="/player" target="_blank">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          TV Ekranını Aç
        </a>
        <div className="text-[10px] text-white/20">
          v2.1
        </div>
      </div>
    </AdminShell>
  );
}
