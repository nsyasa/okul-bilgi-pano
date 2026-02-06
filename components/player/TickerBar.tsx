"use client";

import { BRAND } from "@/lib/branding";
import type { TickerItem } from "@/types/player";

function isInWindow(item: TickerItem, now: Date) {
  const t = now.getTime();
  const s = item.start_at ? new Date(item.start_at).getTime() : null;
  const e = item.end_at ? new Date(item.end_at).getTime() : null;
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  return true;
}

export function TickerBar(props: { ticker: TickerItem[]; now: Date; isAlert?: boolean }) {
  const items = (props.ticker ?? [])
    .filter((x) => x.is_active)
    .filter((x) => isInWindow(x, props.now))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const text = items.length ? items.map((x) => x.text).join("   •   ") : "Okulumuz panosuna hoş geldiniz. İyi dersler.";

  return (
    <div className="w-full overflow-hidden py-6 px-6 rounded-2xl" style={{ background: props.isAlert ? BRAND.colors.danger : BRAND.colors.brand, borderTop: `2px solid ${BRAND.colors.ok}` }}>
      <div className="whitespace-nowrap text-white text-2xl font-bold animate-marquee">
        {text}
        <span className="mx-12">{text}</span>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          min-width: 200%;
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
}
