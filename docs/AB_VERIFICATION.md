# Kelompok A-B: paket pertama

Baseline: preview/github-pages pada 48b31b7cd08940b9ed80c7cf155bfb389f0c6d33.

## Batas perubahan
- Tambahan CSS ber-scope app-shell; font global, logo, palette kandidat, registry modul, dan rute lama dipertahankan. Font baru tidak ditambahkan. Kontras belum dinyatakan lolos.
- Sidebar desktop 248 px; drawer di bawah 1024 px; bottom navigation di bawah 768 px memakai modul tersedia pada registry, bukan rute yang belum dibuat.
- Tambahan skip link, fokus drawer, Escape, pemulihan fokus, penguncian scroll, dan inert pada drawer tertutup.
- Dashboard membaca v2 melalui parser yang sama, dengan adapter yang menolak penulisan backup. Data yang recovered/unreadable/unavailable tidak dipakai sebagai ringkasan lengkap.
- Completion memakai dayProgress/weekSummary yang tidak diubah. Label parsial mengikuti kondisi UI yang sudah ada. Capaian angka ditampilkan terpisah per kebiasaan menggunakan target efektif pada tanggal tersebut, tanpa agregasi lintas satuan.
- Tren 7/30 hari adalah rentang bergulir, bukan target kalender mingguan/bulanan baru. Tabel menjadi alternatif tekstual grafik. Isi jurnal dan catatan tidak dirender pada Dashboard.
- Tidak ada perubahan habit-model, habit-metrics, habit-storage, habit-transactions, skema, autentikasi, API, AGENTS.md, maupun data pengguna. V1 tetap terpisah.
- Koreksi audit: v2 sudah memiliki backup mentah pada jalur pemulihan. Belum ada UI ekspor lengkap. Dashboard baru tidak memicu backup tersebut.

## Belum termasuk
Kalender/Riwayat dan Statistik lengkap beserta rute detail; target kalender Mingguan/Bulanan; skip; jeda/lanjut; arsip; badge; migrasi; Inter global.

## Pengujian
Test baru disediakan di src/test/habit-read-view.test.tsx. Test, lint, typecheck, build, rasio kontras, dan browser belum dijalankan oleh asisten saat paket disiapkan.

Perintah yang mengikuti proyek dan workflow:
```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run test
bun run lint
TUMBUH_PAGES=true bun run build
```
Lint pada workflow preview tetap non-blocking; deployment bukan bukti lint lulus. Jangan mencatat raw storage, token, atau isi jurnal dalam log.

## Verifikasi manual pada profil browser uji
- [ ] Periksa 320, 375, 768, 1024, dan 1440 px, light/dark, tanpa overflow tidak sengaja.
- [ ] Pada mobile, buka Menu, Tab/Shift+Tab dalam drawer, tutup dengan Escape, dan periksa fokus kembali.
- [ ] Semua modul lama dan dialog fokus tetap dapat dibuka; placeholder tetap jujur.
- [ ] Dashboard kosong tidak membuat data v2.
- [ ] Catat habit lewat /habit, kembali ke Dashboard; pastikan angka sesuai dan catatan pribadi tidak ditampilkan.
- [ ] Bandingkan completion dengan capaian target yang lebih dari/kurang dari 100%; keduanya tidak digabung.
- [ ] Ganti tren 7/30 hari dan baca tabel rincian dengan keyboard.
- [ ] Uji data rusak hanya pada profil uji; Dashboard menampilkan error dan tidak menulis atau membuat backup.
- [ ] Uji pembaruan dari tab lain dan saat melewati tengah malam.
- [ ] Audit kontras terukur sebelum menyatakan 4.5:1 atau 3:1 tercapai.

Rollback melalui revert commit terkait, bukan force-push, reset published history, atau penghapusan storage.
