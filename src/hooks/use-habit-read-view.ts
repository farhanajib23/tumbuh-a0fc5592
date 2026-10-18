import { useCallback, useEffect, useState } from 'react';
import { dateKey } from '@/lib/habit-metrics';
import { readHabitView } from '@/lib/habit-read-view';
import { HABIT_STORAGE_KEY, type LoadResult, type StorageLike } from '@/lib/habit-storage';

export function useHabitReadView() {
  const [view, setView] = useState<{ date: string; loaded: LoadResult } | null>(null);
  const refresh = useCallback(() => {
    let storage: StorageLike | null = null;
    try { storage = window.localStorage; } catch { /* Tidak ada data pribadi yang dicatat. */ }
    setView({ date: dateKey(new Date()), loaded: readHabitView(storage) });
  }, []);
  useEffect(() => {
    refresh();
    const changed = (event: StorageEvent) => { if (event.key === HABIT_STORAGE_KEY || event.key === null) refresh(); };
    const visible = () => { if (!document.hidden) refresh(); };
    const timer = window.setInterval(visible, 60000);
    window.addEventListener('focus', refresh); window.addEventListener('storage', changed);
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('storage', changed); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  return { view, refresh };
}
