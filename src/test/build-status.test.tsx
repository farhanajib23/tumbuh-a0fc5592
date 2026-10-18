import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BuildStatus } from '@/components/tumbuh/build-status';

const sha = 'a'.repeat(40); const old = 'b'.repeat(40); const branch = 'preview/github-pages';
const request = vi.fn();
const response = (payload: unknown, ok = true) => ({ ok, json: async () => payload }) as Response;
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const open = (commit = sha) => render(<BuildStatus commit={commit} branch={branch} baseUrl="/tumbuh-a0fc5592/" />);
const verify = () => fireEvent.click(screen.getByRole('button', { name: 'Periksa versi live' }));

describe('Identitas build dan versi live', () => {
  it('menampilkan identitas kode tanpa request otomatis', () => {
    open(); expect(screen.getByText(/Kode dimuat:/)).toHaveTextContent('aaaaaaa'); expect(request).not.toHaveBeenCalled();
  });
  it('memakai base path situs dan hanya menyatakan cocok saat commit serta branch sama', async () => {
    request.mockResolvedValue(response({ commit: sha, branch })); open(); verify();
    expect(await screen.findByText(/Identitas build cocok/)).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(expect.stringContaining('/tumbuh-a0fc5592/preview-version.json?'), expect.objectContaining({ cache: 'no-store' }));
  });
  it('menampilkan perbedaan commit tanpa menyarankan penghapusan data', async () => {
    request.mockResolvedValue(response({ commit: old, branch })); open(); verify();
    expect(await screen.findByText(/Versi berbeda:/)).toHaveTextContent('tanpa menghapus data browser');
  });
  it('menolak kecocokan ketika branch berbeda', async () => {
    request.mockResolvedValue(response({ commit: sha, branch: 'main' })); open(); verify();
    expect(await screen.findByText(/Versi berbeda:/)).toBeInTheDocument();
  });
  it('membedakan kegagalan HTTP dari bukti situs mati', async () => {
    request.mockResolvedValue(response({}, false)); open(); verify();
    expect(await screen.findByText(/Penanda versi live tidak dapat diverifikasi/)).toHaveTextContent('bukan bukti situs mati');
  });
  it('tidak menampilkan payload tak valid sebagai metadata versi', async () => {
    request.mockResolvedValue(response({ commit: 'PRIVATE_SENTINEL', branch })); open(); verify();
    expect(await screen.findByText(/Penanda versi live tidak dapat diverifikasi/)).toBeInTheDocument(); expect(screen.queryByText(/PRIVATE_SENTINEL/)).not.toBeInTheDocument();
  });
  it('tidak mengklaim cocok pada build tanpa identitas', async () => {
    request.mockResolvedValue(response({ commit: sha, branch })); open(''); verify();
    expect(await screen.findByText(/kecocokan belum dapat dipastikan/)).toBeInTheDocument();
  });
});
