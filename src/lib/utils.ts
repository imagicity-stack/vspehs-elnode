import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fullName(s: { firstName: string; lastName: string }) {
  return `${s.firstName} ${s.lastName}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ageFromDob(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < d.getDate())) years--;
  months = (months + 12) % 12;
  return `${years}y ${months}m`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - new Date(now.toDateString()).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${-diff} days ago`;
  return `in ${diff} days`;
}

/**
 * Local-calendar ISO date (YYYY-MM-DD). Deliberately not `toISOString()`, which
 * converts to UTC and so returns *yesterday* for any local time before the UTC
 * offset (00:00–05:30 in IST) — attendance would be filed against the wrong day.
 */
export function isoDate(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO() {
  return isoDate();
}

/** Local wall-clock time as "HH:mm" — the format punch times are stored in. */
export function nowHHMM(d: Date = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "09:05" → "9:05 AM". Returns "—" for a missing/invalid time. */
export function formatTime(hhmm?: string) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${period}`;
}

/** Deterministic pastel colour from a string (used for avatars / gradients). */
export function colorFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue} 70% 92%)`, fg: `hsl(${hue} 65% 35%)`, solid: `hsl(${hue} 65% 55%)` };
}

export const gradientFor = (key: string) => {
  const palettes = [
    "from-rose-200 to-orange-200",
    "from-sky-200 to-indigo-200",
    "from-emerald-200 to-teal-200",
    "from-violet-200 to-fuchsia-200",
    "from-amber-200 to-yellow-200",
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
  return palettes[Math.abs(h) % palettes.length];
};
