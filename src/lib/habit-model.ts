import type { HabitCategoryId } from './habit-catalog';

export type HabitStatus = 'active' | 'paused' | 'archived';
export type HabitReflection = 'membantu' | 'biasa' | 'tidak-cocok';

// days memakai getDay(): 0 = Minggu ... 6 = Sabtu.
export type Schedule = { kind: 'daily' } | { kind: 'days'; days: number[] };

// Perubahan jadwal berlaku mulai tanggal 'from' agar riwayat lama tidak berubah.
export interface ScheduleEntry {
  from: string;
  schedule: Schedule;
}

export interface Habit {
  id: string;
  templateId: string | null;
  name: string;
  categoryId: HabitCategoryId;
  purpose: string;
  unit: string | null;
  target: number | null;
  status: HabitStatus;
  // Tanggal mulai habit dijeda/diarsipkan; hari sebelumnya tetap dihitung.
  inactiveFrom: string | null;
  scheduleHistory: ScheduleEntry[];
  reminderTime: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pelaksanaan (done, value), refleksi, dan catatan dipisahkan dari hasil.
export interface HabitEntry {
  habitId: string;
  date: string;
  done: boolean;
  value: number | null;
  note: string | null;
  reflection: HabitReflection | null;
  updatedAt: string;
}

export interface HabitData {
  version: 2;
  habits: Habit[];
  entries: HabitEntry[];
}

export function emptyHabitData(): HabitData {
  return { version: 2, habits: [], entries: [] };
}
