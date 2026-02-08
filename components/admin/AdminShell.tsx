"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut, type Profile } from "@/lib/adminAuth";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`block px-4 py-3 rounded-xl text-base font-semibold transition-colors ${active ? "bg-brand text-brand-foreground" : "bg-transparent text-white hover:bg-white/5"
        }`}
    >
      {label}
    </Link>
  );
}

export function AdminShell(props: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Rota değişince drawer kapansın
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // ESC tuşuna basınca kapansın
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:grid md:grid-cols-12 relative bg-bg text-white">

      {/* Mobile Header (Sadece < md ekranlarda görünür) */}
      <div
        className="md:hidden flex items-center justify-between p-4 border-b border-white/10 sticky top-0 z-30 bg-panel"
      >
        <div className="text-white font-bold text-lg">Okul Pano Admin</div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Menüyü Aç"
        >
          {/* Hamburger Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay (Sadece Mobilde ve Açıkken) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Hem Desktop hem Mobile Drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 p-5 overflow-y-auto transform transition-transform duration-300 ease-in-out shadow-2xl bg-bg border-r border-panel
          md:relative md:translate-x-0 md:col-span-3 md:w-auto md:block md:shadow-none md:z-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar Header (Logo + Close Button) */}
        <div className="flex items-start justify-between mb-6 md:block">
          <div>
            <div className="text-white text-xl font-extrabold mb-1">Okul Pano</div>
            <div className="text-sm text-muted">
              {props.profile.full_name ?? "Kullanıcı"} • {props.profile.role}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-white rounded-lg hover:bg-white/10"
            aria-label="Menüyü Kapat"
          >
            {/* Close Icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
            className="w-full px-4 py-3 rounded-xl font-semibold transition-opacity hover:opacity-90 bg-panel text-white"
            onClick={async () => {
              await signOut();
              router.replace("/admin/login");
            }}
          >
            Çıkış Yap
          </button>
        </div>

        <div className="mt-6 text-xs text-muted">
          TV ekranı: <a className="underline hover:text-white transition-colors" href="/player">/player</a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-7 md:col-span-9 w-full min-w-0">
        <div className="max-w-5xl mx-auto md:mx-0">{props.children}</div>
      </main>
    </div>
  );
}
