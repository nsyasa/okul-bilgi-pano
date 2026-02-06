"use client";

import { BRAND } from "@/lib/branding";
import type { Announcement } from "@/types/player";

export function AnnouncementSidebar({
  announcements,
  selectedIndex,
  onSelect,
}: {
  announcements: Announcement[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const filtered = announcements.filter(a => a.status === "published");

  if (!filtered.length) {
    return (
      <div className="h-full rounded-2xl p-6 flex items-center justify-center" style={{ background: BRAND.colors.panel }}>
        <div className="text-2xl text-center" style={{ color: BRAND.colors.muted }}>
          Duyuru yok
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl p-6 overflow-y-auto flex flex-col gap-3" style={{ background: BRAND.colors.panel }}>
      <div className="text-xl font-extrabold tracking-widest" style={{ color: BRAND.colors.brand }}>
        DUYURULAR
      </div>
      
      {filtered.map((ann, idx) => (
        <button
          key={ann.id}
          onClick={() => onSelect(idx)}
          className={`p-4 rounded-xl text-left transition-all ${
            idx === selectedIndex ? "ring-4" : "hover:opacity-80"
          }`}
          style={{
            background: BRAND.colors.bg,
            color: "white",
            borderColor: idx === selectedIndex ? BRAND.colors.brand : "transparent",
          }}
        >
          <div className="text-lg font-bold line-clamp-3">{ann.title}</div>
          <div className="text-sm mt-2 opacity-70">{ann.category || "Genel"}</div>
        </button>
      ))}
    </div>
  );
}
