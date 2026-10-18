import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HabitWorkspace } from '@/components/tumbuh/habit-workspace';

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

async function activate(names: string[]) {
  render(<HabitWorkspace />);
  for (const name of names) fireEvent.click(await screen.findByRole('checkbox', { name: `Pilih ${name}` }));
  fireEvent.click(screen.getByRole('button', { name: `Aktifkan ${names.length} kebiasaan` }));
}

describe('UI premium workspace habit', () => {
  it('menampilkan hero progres kosong tanpa menyebutnya kegagalan', async () => {
    render(<HabitWorkspace />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Kebiasaan yang tumbuh bersamamu' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Persentase pelaksanaan terjadwal' })).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByText(/bukan kegagalan/)).toBeInTheDocument();
  });
  it('menampilkan tujuh tombol tanggal pada strip minggu', async () => {
    render(<HabitWorkspace />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('button', { name: /^Lihat tanggal \d{4}-\d{2}-\d{2}$/ })).toHaveLength(7);
  });
  it('menyaring kartu melalui chip kategori dan mengembalikan semua kebiasaan', async () => {
    await activate(['Membaca', 'Jurnal Harian']);
    expect(await screen.findByLabelText('Nilai aktual Membaca')).toBeInTheDocument();
    expect(screen.getByLabelText('Isi jurnal Jurnal Harian')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Belajar & Pengembangan Diri/ }));
    expect(screen.getByLabelText('Nilai aktual Membaca')).toBeInTheDocument();
    expect(screen.queryByLabelText('Isi jurnal Jurnal Harian')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Semua/ }));
    expect(screen.getByLabelText('Isi jurnal Jurnal Harian')).toBeInTheDocument();
  });
  it('memperbarui hero setelah pencatatan tersimpan', async () => {
    await activate(['Membaca']);
    fireEvent.change(await screen.findByLabelText('Nilai aktual Membaca'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Membaca' }));
    expect(screen.getByRole('progressbar', { name: 'Persentase pelaksanaan terjadwal' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/Nikmati jedanya/)).toBeInTheDocument();
  });
});
