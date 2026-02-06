"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BRAND } from "@/lib/branding";
import { signOut, type Profile } from "@/lib/adminAuth";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className="block px-4 py-3 rounded-xl text-base font-semibold"
      style={{
        background: active ? BRAND.colors.brand : "transparent",
        color: "white",
      }}
    >
      {label}
    </Link>
  );
}

export function AdminShell(props: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen grid grid-cols-12" style={{ background: BRAND.colors.bg }}>
      <aside className="col-span-3 p-5" style={{ borderRight: `1px solid ${BRAND.colors.panel}` }}>
        <div className="text-white text-xl font-extrabold mb-1">Okul Pano</div>
        <div className="text-sm mb-5" style={{ color: BRAND.colors.muted }}>
          {props.profile.full_name ?? "Kullanıcı"} • {props.profile.role}
        </div>

        <div className="space-y-2">
          <NavItem href="/admin" label="Gösterge Paneli" />
          <NavItem href="/admin/announcements" label="Ana Ekran" />
          <NavItem href="/admin/duties" label="Nöbetçi Öğretmen" />
          <NavItem href="/admin/schedule/templates" label="Zil Programı" />
          <NavItem href="/admin/schedule/overrides" label="Özel Gün Programı" />
          <NavItem href="/admin/ticker" label="Alt Bant (Ticker)" />
          <NavItem href="/admin/school-info" label="Okul Bilgileri" />
        </div>

        <div className="mt-8">
          <button
            className="w-full px-4 py-3 rounded-xl font-semibold"
            style={{ background: BRAND.colors.panel, color: "white" }}
            onClick={async () => {
              await signOut();
              router.replace("/admin/login");
            }}
          >
            Çıkış Yap
          </button>
        </div>

        <div className="mt-6 text-xs" style={{ color: BRAND.colors.muted }}>
          TV ekranı: <a className="underline" href="/player">/player</a>
        </div>
      </aside>

      <main className="col-span-9 p-7">
        <div className="max-w-5xl">{props.children}</div>
      </main>
    </div>
  );
}
