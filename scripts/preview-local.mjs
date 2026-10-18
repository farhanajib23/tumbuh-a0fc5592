import { spawnSync } from 'node:child_process';

const cwd = new URL('../', import.meta.url);
const version = spawnSync('bun', ['--version'], { cwd, encoding: 'utf8' });
if (version.error || version.status !== 0) {
  console.error('Bun belum tersedia. Pasang Bun, lalu jalankan bun install --frozen-lockfile dari root proyek.');
  process.exit(1);
}
console.log('Menjalankan preview lokal TUMBUH.');
console.log('Jika server berhasil berjalan, buka http://127.0.0.1:5173/habit');
console.log('Tekan Ctrl+C untuk menghentikan server.');
const result = spawnSync('bun', ['run', 'dev', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd, stdio: 'inherit' });
if (result.error) console.error('Server gagal dijalankan:', result.error.message);
process.exit(result.status ?? 1);
