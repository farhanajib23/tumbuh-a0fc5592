import { describe, expect, it } from 'vitest';
import { componentProgress, dailyPresets } from '../lib/habit-daily-presets';

describe('Sebelas kebiasaan harian pribadi', () => {
  it('memiliki tepat sebelas ID unik dan frekuensi harian', () => {
    expect(dailyPresets).toHaveLength(11);
    expect(new Set(dailyPresets.map((item) => item.id)).size).toBe(11);
    expect(dailyPresets.every((item) => item.frequency === 'daily')).toBe(true);
  });
  it('mempertahankan target dan satuan yang diminta', () => {
    const actual = dailyPresets.filter((item) => item.kind === 'quantity').map((item) => [item.id, item.target, item.unit]);
    expect(actual).toEqual([['daily-water', 4000, 'ml'], ['daily-meditation', 7, 'menit'], ['daily-walking', 5000, 'langkah'], ['daily-reading-30', 30, 'menit'], ['daily-social-detox', 90, 'menit']]);
    expect(dailyPresets.find((item) => item.id === 'daily-wake-0430')?.targetTime).toBe('04:30');
  });
  it('menyediakan lima sesi push-up dan seluruh komponen workout', () => {
    const components = dailyPresets.find((item) => item.id === 'daily-workout')?.components ?? [];
    expect(components).toHaveLength(8);
    expect(components.filter((item) => item.id.startsWith('pushup-')).reduce((sum, item) => sum + item.target, 0)).toBe(100);
    expect(components.slice(5).map((item) => [item.id, item.target, item.unit])).toEqual([['pullup', 7, 'repetisi'], ['plank', 1, 'menit'], ['weightlifting', 5, 'menit']]);
  });
  it('menyediakan lima salat tanpa jam lokal buatan', () => {
    const prayer = dailyPresets.find((item) => item.id === 'daily-prayer');
    expect(prayer?.components?.map((item) => item.id)).toEqual(['subuh', 'zuhur', 'asar', 'magrib', 'isya']);
    expect(prayer?.targetTime).toBeUndefined();
  });
  it('tidak mewajibkan durasi untuk sesi belajar dan journaling', () => {
    for (const id of ['daily-learning-content', 'daily-journaling-session']) {
      expect(dailyPresets.find((item) => item.id === id)).toMatchObject({ kind: 'checklist', target: 1, unit: 'sesi' });
    }
  });
  it('membedakan belum dicatat, nol, parsial, selesai, dan koreksi', () => {
    const components = [{ id: 'a', name: 'A', target: 20, unit: 'repetisi' }, { id: 'b', name: 'B', target: 1, unit: 'menit' }];
    expect(componentProgress(components, {})).toBe('unrecorded');
    expect(componentProgress(components, { a: 0 })).toBe('incomplete');
    expect(componentProgress(components, { a: 20 })).toBe('partial');
    expect(componentProgress(components, { a: 20, b: 1 })).toBe('complete');
    expect(componentProgress(components, { a: 19, b: 1 })).toBe('partial');
    expect(componentProgress(components, { unrelated: 100 })).toBe('unrecorded');
    expect(() => componentProgress(components, { a: -1 })).toThrow();
    expect(() => componentProgress(components, { a: Number.NaN })).toThrow();
    expect(() => componentProgress([], {})).toThrow();
  });
});
