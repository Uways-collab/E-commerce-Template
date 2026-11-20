import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format integer minor units into a localised currency string. */
export function formatMoney(
  minor: number,
  currency = "NGN",
  locale = "en-NG",
  options: Intl.NumberFormatOptions = {},
): string {
  const value = minor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatCompactMoney(minor: number, currency = "NGN", locale = "en-NG") {
  const value = minor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: value >= 100_000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export function formatDate(value: string | Date, locale = "en-GB") {
  const date = typeof value === "string" ? new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date, locale = "en-GB") {
  const date = typeof value === "string" ? new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function newId(prefix = "") {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return prefix ? `${prefix}_${raw}` : raw;
}

export function orderNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `PPH-${out}`;
}

/** Parse a JSON column, returning `fallback` if it is empty or malformed. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function percentOff(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function truncate(text: string, max = 160) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toInt(value: FormDataEntryValue | null | undefined, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBool(value: FormDataEntryValue | null | undefined) {
  const v = String(value ?? "").toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

/** Convert "#a4573a" to the "164 87 58" triplet used by CSS custom properties. */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "0 0 0";
  const num = Number.parseInt(full, 16);
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

export function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}
