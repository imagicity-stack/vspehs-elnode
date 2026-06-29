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

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
