import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CategoryChips, DotStrip, ProgressRing, WeekStrip, recentDays } from '@/components/tumbuh/habit-overview';
import type { Habit, HabitEntry } from '@/lib/habit-model';

afterEach(() => cleanup());

const habit: Habit = { id: 'h1', templateId: 'reading', name: 'Membaca', categoryId: 'learning', purpose: '', target: 15, unit: 'menit', status: 'active', inactiveFrom: null, scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'daily' } }], reminderTime: null, createdAt: '', updatedAt: '' };
const entry = (date: string, done: boolean): HabitEntry => ({ habitId: 'h1', date, done, value: null, note: null, reflection: null, updatedAt: '2026-10-18T00:00:00Z' });

describe('Komponen ringkasan habit', () => {
  it('menghitung status tujuh hari terakhir dengan hari belum dicatat netral', () => {
    const days = recentDays(habit, [entry('2026-10-18', true), entry('2026-10-17', false)], '2026-10-18');
    expect(days).toHaveLength(7);
    expect(days.at(-1)?.state).toBe('done');
    expect(days.at(-2)?.state).toBe('partial');
    expect(days[0]?.state).toBe('none');
  });
  it('menandai hari sebelum jadwal dimulai sebagai tidak terjadwal', () => {
    expect(recentDays(habit, [], '2026-10-03')[0]?.state).toBe('off');
  });
  it('menyediakan semantik progressbar dan mengabaikan nilai di luar rentang', () => {
    render(<ProgressRing percent={140} label="Progres uji">100</ProgressRing>);
    const bar = screen.getByRole('progressbar', { name: 'Progres uji' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
  it('tidak mengumumkan nilai ketika belum ada jadwal', () => {
    render(<ProgressRing percent={null} label="Kosong" />);
    expect(screen.getByRole('progressbar', { name: 'Kosong' })).not.toHaveAttribute('aria-valuenow');
  });
  it('merangkum titik tujuh hari untuk pembaca layar', () => {
    render(<DotStrip days={recentDays(habit, [entry('2026-10-18', true)], '2026-10-18')} />);
    expect(screen.getByRole('img', { name: /1 dari 7 kesempatan terjadwal selesai/ })).toBeInTheDocument();
  });
  it('memilih tanggal dari strip minggu dan menandai pilihan aktif', () => {
    const picked: string[] = [];
    const days = [{ date: '2026-10-17', scheduled: 1, done: 1, percent: 100 }, { date: '2026-10-18', scheduled: 0, done: 0, percent: null }];
    render(<WeekStrip days={days} selected="2026-10-18" today="2026-10-18" onSelect={(date) => picked.push(date)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lihat tanggal 2026-10-17' }));
    expect(picked).toEqual(['2026-10-17']);
    expect(screen.getByRole('button', { name: 'Lihat tanggal 2026-10-18' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('menampilkan jumlah per kategori dan meneruskan pilihan filter', () => {
    const chosen: string[] = [];
    render(<CategoryChips habits={[habit]} value="all" onChange={(value) => chosen.push(value)} />);
    fireEvent.click(screen.getByRole('button', { name: /Belajar & Pengembangan Diri/ }));
    expect(chosen).toEqual(['learning']);
    expect(screen.getByRole('button', { name: /Semua/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
