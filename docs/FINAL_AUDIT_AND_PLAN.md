# Audit dan rencana pelaksanaan final TUMBUH

Baseline source: preview/github-pages pada 1fa387e8a53532bcc80ff53284f5c8798969023e. Main tidak digabung atau ditulis. Paket ini fokus stabilisasi publikasi, bukan menyatakan 13 fase selesai.

## 1. Ringkasan audit
- React 19, TanStack Start/Router, Vite 8 melalui pembungkus Lovable, Tailwind 4, komponen Radix/shadcn. React state/hooks dipakai pada fitur habit; QueryClientProvider ada pada root.
- Source rute: /, /habit, /modul/$module. Harian/Riwayat/Statistik memakai search tervalidasi pada /habit. Sidebar dan registry modul yang sudah ada dipertahankan.
- V1 dan v2 tersimpan terpisah di localStorage. V2 memiliki parser, backup mentah pada recovery, transaksi snapshot, target efektif historis, dan pembacaan tanpa penulisan untuk Dashboard/Riwayat/Statistik. Tidak ditemukan backend bisnis/database/autentikasi pada audit sebelumnya; layanan atau sistem yang tidak ditemukan tidak dibuat-buat. Integrasi Lovable/error reporting dan Google Fonts yang ada tidak dihapus.
- Typography saat ini Plus Jakarta Sans dan Manrope. Inter belum dipasang. Palette kandidat OKLCH dan token light/dark ada; rasio kontras belum diukur.
- Workflow publikasi memicu preview/github-pages, memeriksa TypeScript/test, melaporkan lint non-blocking, membangun artifact statis dan melakukan deploy. Sebelum paket ini, identitas versi live belum diverifikasi setelah deploy.
- AGENTS.md melarang rewrite history dan masih memuat aturan awal UI-only; aturan historis ini tidak diedit diam-diam. Paket ini tidak menyimpan input pengguna.

## 2. Baseline perilaku yang dilindungi
- Completion tetap dayProgress/weekSummary: done dibagi kesempatan terjadwal; hari tanpa jadwal menghasilkan null. Belum dicatat bukan label gagal.
- Target angka dan tidur memakai tanggal efektif; perubahan berlaku paling cepat besok. Catatan historis tidak dihitung ulang otomatis.
- UI parsial turunan tidak diubah menjadi status tersimpan baru. Koreksi dan undo tetap memakai transaksi yang sudah ada.
- Dataset pribadi dan isi jurnal tidak dibaca oleh fitur identitas build dan tidak dikirim dalam pemeriksaan versi.

## 3. Daftar file paket ini
- src/components/tumbuh/build-status.tsx: menampilkan SHA/branch build dan pemeriksaan metadata same-origin atas permintaan pengguna. Tidak memakai storage.
- src/components/tumbuh/app-shell.tsx: memasang komponen versi setelah konten agar terlihat juga pada mobile.
- .github/workflows/pages-deploy.yml: menginjeksi dua metadata build publik dan memverifikasi SHA/branch live setelah deploy, dengan retry terbatas. Tidak menambah izin atau dependency; gerbang lama tidak dilemahkan.
- src/test/build-status.test.tsx: tujuh skenario metadata, base path, perbedaan versi, HTTP error, payload invalid dan build tanpa identitas.
- Dokumen ini: baseline, scope, risiko dan verifikasi.

## 4. Selesai dalam source sebelum paket ini / belum selesai
Tersedia dalam source: Dashboard baca-saja v2, pencatatan biner/angka/jurnal/emosi/waktu, koreksi tanggal, target historis, navigasi responsif, Kalender/Riwayat dan filter, statistik bergulir 7/30 hari dengan tabel alternatif. Keberadaan source bukan bukti browser lulus.
Belum selesai: target hasil Mingguan/Bulanan dan tugas pendukung; halaman periode kalender lengkap; status skip; lifecycle jeda/lanjut/arsip yang mempertahankan seluruh sejarah; badge/milestone; insight tervalidasi; ekspor lengkap; audit kontras dan seluruh breakpoint; pengujian browser. Katalog saat audit berisi 10 habit; nama habit ke-11 tidak ditebak.

## 5. Hasil pengujian yang benar-benar tersedia
Pengguna melaporkan run 1fa387e hijau. Asisten belum membaca hasil job deployment secara langsung. Pada saat paket ini disiapkan, tujuh test baru, lint, typecheck dan build paket baru belum dijalankan. Tidak ada klaim visual, kontras atau aksesibilitas menyeluruh telah lulus.
Perintah proyek: bun run tsc --noEmit; bun run test; bun run lint; TUMBUH_PAGES=true bun run build. Workflow Pages memasukkan VITE_BUILD_SHA dan VITE_BUILD_BRANCH ketika membangun artifact.

## 6. Risiko dan persetujuan
- Pemeriksaan versi baru adalah gerbang wajib setelah deploy. HTTP/network error, format invalid, atau SHA/branch berbeda membuat langkah ini gagal; langkah deploy sebelumnya dapat sudah berhasil. Tidak ada rollback otomatis. Retry maksimal 12, timeout request 5 detik, jeda 5 detik; langkah dibatasi 3 menit.
- Metadata cocok bukan bukti seluruh HTML/aset/interaksi benar. Pengujian browser tetap wajib. Build pada publikasi lain yang tidak menyuplai metadata ditandai tidak diketahui, bukan dianggap rusak.
- VITE_BUILD_SHA dan VITE_BUILD_BRANCH adalah metadata publik, bukan secret. Tidak ada env lain yang diekspos.
- Perubahan skema/status/scoring, outcome Mingguan/Bulanan, definisi badge, migrasi, izin, dan penggantian font global perlu persetujuan spesifik sebelum implementasi.
- Tahap berikutnya setelah publikasi terverifikasi: audit kontras terukur, regresi navigasi/fokus pada browser, lalu rancangan periode mingguan/bulanan yang memisahkan kebiasaan dan outcome.

## 7. Verifikasi manual
1. Periksa workflow publikasi commit paket ini: TypeScript, Test, build, artifact, deploy, kemudian Verifikasi commit yang tersaji di live. Lint tetap dilaporkan terpisah.
2. Buka URL pada output deployment, bukan mengasumsikan publikasi lain memakai branch yang sama.
3. Cari bagian Versi aplikasi. Cocokkan Kode dimuat dengan commit run, lalu tekan Periksa versi live.
4. Jika bagian versi tidak ada, belum ada bukti bahwa kode paket ini sedang dimuat; jangan hapus data browser.
5. Uji Dashboard, Harian, Riwayat dan Statistik pada 320,375,768,1024,1440 px, light/dark, keyboard dan reduced motion. Checklist perilaku ada pada AB_VERIFICATION.md dan CD_VERIFICATION.md.
6. Catatan pribadi tetap memakai browser yang sama; gunakan profil uji untuk uji kegagalan storage. Jangan mencetak storage/secret/jurnal dalam log.

Rollback menggunakan revert commit terkait, tanpa force-push, amend riwayat terbit, atau penghapusan data pengguna.
