"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/branding";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ymdNowTR } from "@/lib/validate";

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block p-6 rounded-2xl hover:opacity-95 transition-opacity" style={{ background: BRAND.colors.panel }}>
      <div className="text-white text-xl font-extrabold">{title}</div>
      <div className="text-sm mt-2" style={{ color: BRAND.colors.muted }}>{desc}</div>
    </Link>
  );
}

function StatsWidget({ label, value, subtext, href }: { label: string; value: string | number; subtext?: string; href?: string }) {
  const content = (
    <div className="p-5 rounded-2xl flex flex-col justify-between h-full" style={{ background: BRAND.colors.panel, border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="text-sm font-medium" style={{ color: BRAND.colors.muted }}>{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-white">{value}</div>
      {subtext && <div className="mt-1 text-xs" style={{ color: BRAND.colors.muted }}>{subtext}</div>}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full hover:scale-[1.02] transition-transform">{content}</Link>;
  }
  return content;
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
      // 1. Bugün nöbetçi sayısı
      const dutyPromise = sb.from("duty_teachers").select("id", { count: "exact", head: true }).eq("date", today);

      // 2. Yayında olan duyuru sayısı
      const announcementPromise = sb.from("announcements").select("id", { count: "exact", head: true }).eq("status", "published");

      // 3. Son güncelleme (announcements veya duties)
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
        }) : "Yok",
        loading: false,
      });
    }

    loadStats();
  }, []);

  return (
    <AdminShell profile={profile}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-white text-3xl font-extrabold">Gösterge Paneli</div>
          <div className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
            İçerikleri buradan yönetirsiniz. TV ekranı otomatik güncellenir.
          </div>
        </div>

        <Link href="/admin/announcements?new=true">
          <button
            type="button"
            className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm flex items-center gap-2"
            style={{ background: BRAND.colors.brand }}
          >
            <span>+</span> Hızlı Duyuru Ekle
          </button>
        </Link>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatsWidget
          label="Bugünkü Nöbetçiler"
          value={stats.loading ? "..." : stats.dutyCount}
          subtext={stats.dutyCount === 0 && !stats.loading ? "Henüz girilmedi" : "Kişi görevli"}
          href="/admin/duties"
        />
        <StatsWidget
          label="Yayındaki Duyurular"
          value={stats.loading ? "..." : stats.publishedAnnouncements}
          subtext="TV ekranında dönüyor"
          href="/admin/announcements"
        />
        <StatsWidget
          label="Son Güncelleme"
          value={stats.loading ? "..." : (stats.lastUpdate || "Yok")}
          subtext="Sistemdeki son işlem"
        />
      </div>

      <div className="text-sm font-semibold mb-4" style={{ color: BRAND.colors.muted }}>MENÜ</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card title="Duyurular" desc="Haber, duyuru ve slaytlar." href="/admin/announcements" />
        <Card title="Nöbetçi Öğretmen" desc="Günlük nöbet listesi." href="/admin/duties" />
        <Card title="Nöbet Şablonu" desc="Haftalık taslak ve Excel." href="/admin/duties/template" />
        <Card title="Zil Programı" desc="Ders saatlerini ayarla." href="/admin/schedule/templates" />
        <Card title="Özel Gün Programı" desc="Sınav/etkinlik saatleri." href="/admin/schedule/overrides" />
        <Card title="Alt Bant (Ticker)" desc="Kayan yazı duyuruları." href="/admin/ticker" />
        <Card title="YouTube Videoları" desc="TV'de oynayacak videolar." href="/admin/youtube" />
        <Card title="Okul Bilgileri" desc="Sabit sol panel kartları." href="/admin/school-info" />
      </div>

      <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
        <a className="underline text-sm hover:text-white transition-colors" href="/player" target="_blank" style={{ color: BRAND.colors.muted }}>
          📺 TV Ekranını Aç (/player)
        </a>
        <div className="text-xs" style={{ color: BRAND.colors.muted }}>
          Versiyon 2.1
        </div>
      </div>
    </AdminShell>
  );
}
