// Gallery persistence (Stage 5) — port of the Meme Streeps gallery.ts pattern.
// Stores answered questions (with their resonance verdict) newest-first in
// localStorage, capped, for the history + per-entry re-share.

export interface GalleryEntry {
  id: string;
  question: string;
  answer: string;
  resonanceText: string;
  verdictLine: string;
  mode: 'free' | 'daily';
  timestamp: string;
}

const KEY = 'meme_gallery';
const MAX_ENTRIES = 200;

function read(): GalleryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GalleryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: GalleryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota / unavailable — degrade silently */
  }
}

function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `g-${Date.now().toString(36)}-${Math.trunc(performance.now()).toString(36)}`;
}

export function addGalleryEntry(entry: Omit<GalleryEntry, 'id' | 'timestamp'>): GalleryEntry {
  const created: GalleryEntry = { ...entry, id: newId(), timestamp: new Date().toISOString() };
  write([created, ...read()].slice(0, MAX_ENTRIES));
  return created;
}

export function getGalleryEntries(): GalleryEntry[] {
  return read();
}

export function removeGalleryEntry(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function clearGallery(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
