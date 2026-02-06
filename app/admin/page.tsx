"use client";

import Link from "next/link";
import { BRAND } from "@/lib/branding";
import { AuthGate } from "@/components/admin/AuthGate";
import { AdminShell } from "@/components/admin/AdminShell";

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block p-6 rounded-2xl hover:opacity-95" style={{ background: BRAND.colors.panel }}>
      <div className="text-white text-xl font-extrabold">{title}</div>
      <div className="text-sm mt-2" style={{ color: BRAND.colors.muted }}>{desc}</div>
    </Link>
  );
}

export default function AdminHome() {
  return (
    <AuthGate>
      {(profile) => (
        <AdminShell profile={profile}>
          <div className="text-white text-3xl font-extrabold mb-2">Gösterge Paneli</div>
          <div className="text-sm mb-6" style={{ color: BRAND.colors.muted }}>
            İçerikleri buradan yönetirsiniz. TV ekranı otomatik güncellenir.
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Card title="Duyurular" desc="Haber/duyuru ekle, planla, yayınla." href="/admin/announcements" />
            <Card title="Nöbetçi Öğretmen" desc="Günlük nöbetçi listesini yönet." href="/admin/duties" />
            <Card title="Nöbet Şablonu" desc="Haftalık şablon oluştur, Excel'den aktar." href="/admin/duties/template" />
            <Card title="Zil Programı" desc="Mon-Thu ve Cuma template’lerini düzenle." href="/admin/schedule/templates" />
            <Card title="Özel Gün Programı" desc="Deneme/sınav günleri için override ekle." href="/admin/schedule/overrides" />
            <Card title="Alt Bant (Ticker)" desc="Dönen hatırlatmalar ve uyarılar." href="/admin/ticker" />
            <Card title="YouTube Videoları" desc="Ana ekranda oynatılacak videoları yönet." href="/admin/youtube" />
            <Card title="Okul Bilgileri" desc="Sabit tanıtım kartlarını yönet." href="/admin/school-info" />
          </div>

          <div className="mt-8">
            <a className="underline text-sm" href="/player" style={{ color: BRAND.colors.muted }}>TV ekranını aç: /player</a>
          </div>
        </AdminShell>
      )}
    </AuthGate>
  );
}
