import type { BookingDraft } from './types';

const KEY = 'carshare_draft';

export const draft = {
  save(d: BookingDraft): void {
    localStorage.setItem(KEY, JSON.stringify(d));
  },
  load(): BookingDraft | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as BookingDraft) : null;
    } catch {
      return null;
    }
  },
  clear(): void {
    localStorage.removeItem(KEY);
  },
};
