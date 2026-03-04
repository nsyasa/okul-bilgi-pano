// ⚡ Bolt: Cache Intl.DateTimeFormat instances to prevent expensive re-instantiation
const trFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });

export function ymdNowTR() {
  return trFormatter.format(new Date());
}
