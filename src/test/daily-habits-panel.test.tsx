import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DailyHabitsPanel } from '../components/tumbuh/daily-habits-panel';
import { HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY, loadHabitData } from '../lib/habit-storage';
import type { HabitData } from '../lib/habit-model';

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const saved = (): HabitData => JSON.parse(window.localStorage.getItem(HABIT_STORAGE_KEY) ?? 'null') as HabitData;
async function activate() {
  render(<DailyHabitsPanel />);
  fireEvent.click(await screen.findByRole('button', { name: 'Aktifkan 11 kebiasaan yang belum ditambahkan' }));
}
describe('Panel sebelas kebiasaan harian', () => {
  it('menampilkan sebelas kartu, mengaktifkan sekali, dan menjaga data v1', async () => {
    window.localStorage.setItem(LEGACY_HABIT_STORAGE_KEY, 'data lama');
    await activate();
    expect(saved().habits).toHaveLength(11);
    expect(saved().entries).toEqual([]);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(11);
    expect(screen.queryByRole('button', { name: /Aktifkan/ })).not.toBeInTheDocument();
    cleanup(); render(<DailyHabitsPanel />);
    await screen.findByRole('button', { name: 'Simpan Minum air putih' });
    expect(saved().habits).toHaveLength(11);
    expect(window.localStorage.getItem(LEGACY_HABIT_STORAGE_KEY)).toBe('data lama');
  });
  it('menyimpan total air parsial, memuat ulang, mengoreksi, dan membatalkan', async () => {
    await activate();
    fireEvent.change(screen.getByLabelText('Total aktual Minum air putih (ml)'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Minum air putih' }));
    expect(saved().entries[0]).toMatchObject({ value: 500, done: false });
    expect(loadHabitData(window.localStorage).status).toBe('ok');
    cleanup(); render(<DailyHabitsPanel />);
    expect(await screen.findByLabelText('Total aktual Minum air putih (ml)')).toHaveValue(500);
    fireEvent.change(screen.getByLabelText('Total aktual Minum air putih (ml)'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Minum air putih' }));
    expect(saved().entries).toHaveLength(1);
    expect(saved().entries[0]?.value).toBe(750);
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan catatan Minum air putih' }));
    expect(saved().entries).toEqual([]);
  });
  it('tidak menandai workout selesai hanya dari satu sesi push-up', async () => {
    await activate();
    fireEvent.change(screen.getByLabelText('Push-up setelah Subuh — target 20 repetisi'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Workout harian' }));
    expect(saved().entries[0]).toMatchObject({ done: false, daily: { components: { 'pushup-subuh': 20 } } });
    const card = screen.getByRole('heading', { name: 'Workout harian' }).closest('article');
    if (!card) throw new Error('Kartu workout tidak ditemukan.');
    expect(within(card).getByText('Parsial')).toBeInTheDocument();
    expect(loadHabitData(window.localStorage).status).toBe('ok');
  });
  it('mencatat waktu bangun aktual tanpa penandaan otomatis', async () => {
    await activate();
    expect(saved().entries).toEqual([]);
    fireEvent.change(screen.getByLabelText('Waktu bangun aktual'), { target: { value: '04:45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Bangun pagi pukul 04.30' }));
    expect(saved().entries[0]).toMatchObject({ done: false, detail: { kind: 'time', event: 'wake', time: '04:45' } });
    expect(screen.getByText('Selisih input: 15 menit lebih lambat (tanggal yang sama).')).toBeInTheDocument();
    expect(loadHabitData(window.localStorage).status).toBe('ok');
  });
});
