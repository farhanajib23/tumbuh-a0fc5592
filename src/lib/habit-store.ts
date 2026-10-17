import { useEffect, useState } from 'react';

export type Reflection = 'membantu' | 'biasa' | 'tidak-cocok';

export interface Routine {
  id: string;
  activityId: string;
  trigger: string;
  frequency: 'harian' | 'mingguan';
  target: string;
  paused: boolean;
  createdAt: string;
}

export interface Checkin {
  routineId: string;
  date: string; // YYYY-MM-DD
  reflection: Reflection | null;
}

interface HabitData { routines: Routine[]; checkins: Checkin[]; }

const KEY = 'tumbuh-habit-v1';
const empty: HabitData = { routines: [], checkins: [] };

function load(): HabitData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<HabitData>;
    return { routines: Array.isArray(parsed.routines) ? parsed.routines : [], checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [] };
  } catch { return empty; }
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useHabitStore() {
  const [data, setData] = useState<HabitData>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => { setData(load()); setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* penyimpanan penuh/ditolak */ } } }, [data, ready]);

  const addRoutine = (activityId: string, trigger: string, frequency: Routine['frequency'], target: string) => {
    const routine: Routine = { id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, activityId, trigger, frequency, target, paused: false, createdAt: new Date().toISOString() };
    setData(d => ({ ...d, routines: [...d.routines, routine] }));
    return routine.id;
  };
  const updateRoutine = (id: string, patch: Partial<Routine>) =>
    setData(d => ({ ...d, routines: d.routines.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const removeRoutine = (id: string) =>
    setData(d => ({ routines: d.routines.filter(r => r.id !== id), checkins: d.checkins.filter(c => c.routineId !== id) }));
  const checkinToday = (routineId: string) => {
    const date = todayKey();
    setData(d => d.checkins.some(c => c.routineId === routineId && c.date === date) ? d : { ...d, checkins: [...d.checkins, { routineId, date, reflection: null }] });
  };
  const setReflection = (routineId: string, date: string, reflection: Reflection) =>
    setData(d => ({ ...d, checkins: d.checkins.map(c => c.routineId === routineId && c.date === date ? { ...c, reflection } : c) }));

  return { data, ready, addRoutine, updateRoutine, removeRoutine, checkinToday, setReflection };
}
