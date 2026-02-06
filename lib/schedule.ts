import type { BellSlot } from "@/types/player";

export type NowStatus =
  | { state: "closed"; nextInSec: number | null; nextLabel: string | null }
  | { state: "lesson" | "break" | "lunch"; nextInSec: number; nextLabel: string | null; currentEndsAt: Date };

function parseHHMM(base: Date, hhmm: string) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function computeNowStatus(now: Date, slots: BellSlot[]): NowStatus {
  if (!slots?.length) return { state: "closed", nextInSec: null, nextLabel: null };

  const firstStart = parseHHMM(now, slots[0].start);
  const lastEnd = parseHHMM(now, slots[slots.length - 1].end);

  if (now < firstStart) {
    const nextInSec = Math.max(0, Math.floor((firstStart.getTime() - now.getTime()) / 1000));
    return { state: "closed", nextInSec, nextLabel: "Okul Başlangıcı" };
  }

  if (now >= lastEnd) {
    return { state: "closed", nextInSec: null, nextLabel: null };
  }

  for (const slot of slots) {
    const s = parseHHMM(now, slot.start);
    const e = parseHHMM(now, slot.end);
    if (now >= s && now < e) {
      const nextInSec = Math.max(0, Math.floor((e.getTime() - now.getTime()) / 1000));
      const nextLabel = slot.kind === "lesson" ? "Teneffüs" : "Ders";
      return { state: slot.kind, nextInSec, nextLabel, currentEndsAt: e };
    }
  }

  const next = slots
    .map((sl) => ({ sl, s: parseHHMM(now, sl.start) }))
    .filter((x) => x.s > now)
    .sort((a, b) => a.s.getTime() - b.s.getTime())[0];

  if (!next) return { state: "closed", nextInSec: null, nextLabel: null };

  const nextInSec = Math.max(0, Math.floor((next.s.getTime() - now.getTime()) / 1000));
  return { state: "closed", nextInSec, nextLabel: next.sl.label ?? "Sonraki" };
}

export function pickSlotsForToday(params: {
  dateKey: string; // YYYY-MM-DD
  weekday: number; // 0..6
  templates: { key: "mon_thu" | "fri"; slots: BellSlot[] }[];
  overrides: { date: string; slots: BellSlot[] }[];
}): { slots: BellSlot[]; note?: string } {
  const ov = params.overrides.find((o) => o.date === params.dateKey);
  if (ov) return { slots: ov.slots, note: "Özel Program" };

  const isFri = params.weekday === 5;
  const key = isFri ? "fri" : "mon_thu";
  const t = params.templates.find((x) => x.key === key);
  return { slots: t?.slots ?? [], note: isFri ? "Cuma Programı" : "Hafta İçi Program" };
}

export function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
