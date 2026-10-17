# Preview lokal TUMBUH

Preview ini menjalankan aplikasi asli, bukan mockup. Katalog baru belum otomatis mengubah tampilan Habit Tracker.

## Persiapan

Gunakan Git, Node.js, dan Bun yang kompatibel dengan dependency proyek. Versi minimum runtime belum ditetapkan atau diverifikasi dalam panduan ini. Instalasi membutuhkan internet.

Untuk salinan baru:

```bash
git clone --branch feature/habit-tracker-premium https://github.com/farhanajib23/tumbuh-a0fc5592.git
cd tumbuh-a0fc5592
bun install --frozen-lockfile
node scripts/preview-local.mjs
```

Jika memakai salinan lama, periksa git status terlebih dahulu. Jangan menimpa perubahan lokal atau memakai reset --hard. Pastikan branch fitur dan commit terbaru sudah tersedia sebelum menjalankan peluncur.

## Buka di browser

Setelah terminal mengonfirmasi server berhasil berjalan, buka:

- Dashboard: http://127.0.0.1:5173/
- Habit Tracker: http://127.0.0.1:5173/habit

Server dibatasi ke komputer ini. Biarkan terminal terbuka. Tekan Ctrl+C untuk berhenti. Port yang terpakai akan menyebabkan kegagalan, bukan perpindahan port otomatis.

## Batasan

Peluncur tidak menginstal dependency, tidak membuat commit, dan tidak membuktikan build atau test lulus. Proses pengembangan dapat menghasilkan file lokal; periksa git status sesudahnya. Jangan langsung commit file hasil generator.

Data browser pada localhost, 127.0.0.1, port, atau protokol berbeda memakai origin berbeda. Data pada preview lama tidak otomatis muncul di alamat ini. Jangan menyalin jurnal, emosi, atau data pribadi ke laporan error.

Jika gagal, simpan versi node --version dan bun --version serta pesan error yang sudah disamarkan dari rahasia. Jangan mengganti lockfile, dependency, atau konfigurasi untuk memaksa preview berjalan.

## Status verifikasi

Panduan dan peluncur ini belum diuji dengan instalasi dependency atau browser. UI premium masih dikembangkan pada branch fitur; main tidak diubah oleh penambahan ini.
