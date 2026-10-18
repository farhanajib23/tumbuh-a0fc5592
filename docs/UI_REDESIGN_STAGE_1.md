# UI redesign: audit dan tahap pertama

## Baseline yang diperiksa
Source preview setelah merge PR #2. Pemeriksaan ini berbasis source, bukan browser visual atau hasil CI.

- React, TanStack Router/Start, Vite, Tailwind dan CSS komponen sudah digunakan.
- Route aktual: Dashboard, Habit, root, serta halaman modul dinamis. Route Mingguan/Bulanan terpisah belum ditemukan.
- Font saat ini Manrope dan Plus Jakarta Sans dari Google Fonts; keduanya dipertahankan.
- Foundation sudah memiliki spacing, sidebar 248 px, keyboard focus dan reduced motion.
- Ringkasan Dashboard sudah membedakan completion dari target attainment, tetapi ring dan hitungan berdampingan pada desktop.
- Panel 11 kebiasaan dan workspace lama dipertahankan. Penyimpanan lokal v2, data v1, scoring, target historis, autentikasi dan API tidak diubah oleh tahap ini. Audit menyeluruh autentikasi/database belum selesai.

## Implementasi tahap pertama
Stylesheet tambahan dibatasi pada .app-shell dan dipasang melalui stylesheet URL di root. Menambahkan kandidat semantic roles light/dark, kontras border kontrol, skala radius dan spacing, ukuran teks, grid satu kolom di bawah 768 px, kontrol sentuh, safe-area tablet/mobile, serta ring Dashboard di atas ringkasan pada semua lebar. Tidak membuat halaman atau data contoh.

## Perhitungan kandidat warna
Rasio luminansi relatif sRGB: putih pada forest #24483D = 10.15:1; teks #243B32 pada ivory #F8F7F2 = 11.21:1; teks sekunder #526359 pada putih = 6.39:1. Sage #9BAF98 pada putih = 2.34:1, tidak dipakai sebagai teks normal. Dark: #F2F4EF pada #192B24 = 13.43:1; #B9C8BD pada #192B24 = 8.54:1; #102019 pada #A9C6AD = 9.15:1. Perhitungan ini hanya pasangan statis, bukan audit seluruh state, warna komposit, kategori, grafik atau aksesibilitas aplikasi. Warna masih kandidat untuk review.

## Belum selesai
Audit seluruh state dan kontras kategori; uji keyboard; pengujian visual 320, 375, 768, 1024 dan 1440 px; halaman Detail, Mingguan/Bulanan; peningkatan Kalender/Statistik; kesesuaian metrik komponen workout/salat di seluruh ringkasan. Tidak mengubah formula untuk menyamarkan keterbatasan.

## Pengujian
Tidak mengklaim lint, TypeScript, test atau build lulus: belum dijalankan dalam penyiapan patch ini. Workflow branch fitur yang ada digunakan untuk pemeriksaan setelah commit. Browser runner belum tersedia.

## Verifikasi manual setelah publikasi berhasil
Buka Dashboard dengan data aktual dan tanpa data; pastikan ring di atas hitungan dan analitik; periksa label target vs realisasi. Buka Habit pribadi dan workspace lama, catat nilai kecil lalu koreksi, refresh dan pastikan data sama. Uji light/dark, keyboard, zoom 200%, viewport referensi, safe-area dan form panjang. Periksa tidak ada kontrol tertutup bottom navigation. Jangan hapus penyimpanan browser.

## Rollback
Revert commit UI tahap ini untuk melepas stylesheet dan pemasangannya. Tidak memerlukan migrasi atau penghapusan data.
