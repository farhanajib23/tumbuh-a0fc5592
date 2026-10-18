import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HabitTargetPanel } from '@/components/tumbuh/habit-target-panel';
import type { Habit } from '@/lib/habit-model';

const habit: Habit = { id: 'reading-test', templateId: 'reading', name: 'Membaca', categoryId: 'learning', purpose: '', target: 15, unit: 'menit', status: 'active', inactiveFrom: null, scheduleHistory: [{ from: '2026-10-01', schedule: { kind: 'daily' } }], reminderTime: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
afterEach(() => cleanup());

describe('Label target dan deskripsi satuan', () => {
  it('memisahkan nama input dari deskripsi dan mempertahankan payload target', () => {
    const onChange = vi.fn(() => true);
    render(<HabitTargetPanel habit={habit} today="2026-10-18" disabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ubah target Membaca' }));
    const input = screen.getByLabelText('Target baru Membaca', { exact: true });
    expect(input).toBe(screen.getByRole('spinbutton', { name: /^Target baru Membaca$/ }));
    expect(input).toHaveAccessibleDescription('Satuan tetap: menit');
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Jadwalkan target Membaca' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-19', { target: 30, unit: 'menit' });
  });
  it('mempertahankan input dan menampilkan error ketika penyimpanan ditolak pemanggil', () => {
    const onChange = vi.fn(() => false);
    render(<HabitTargetPanel habit={habit} today="2026-10-18" disabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ubah target Membaca' }));
    fireEvent.change(screen.getByLabelText('Target baru Membaca', { exact: true }), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Jadwalkan target Membaca' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Target belum disimpan');
    expect(screen.getByLabelText('Target baru Membaca', { exact: true })).toHaveValue(30);
  });
});
