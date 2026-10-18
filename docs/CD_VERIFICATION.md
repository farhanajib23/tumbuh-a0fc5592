# Kalender/Riwayat dan Statistik: paket lanjutan yang disetujui

Baseline: preview/github-pages pada 94f72e93d3164afe2a39dbfae07595e5583884cb. Istilah C-D pada paket ini mengikuti klarifikasi pengguna: Kalender/Riwayat dan Statistik, bukan perubahan bisnis kelompok C pada audit awal.

## Implementasi
- /habit tetap menjadi pencatatan Harian. /habit?view=riwayat dan /habit?view=statistik adalah tampilan terpisah melalui search tervalidasi. Rute dan routeTree lama tidak dibangun ulang. Link lama tanpa search tetap valid.
- Kalender Senin-Minggu, pilihan bulan, tanggal mendatang nonaktif, legenda simbol/teks, pilihan tanggal mengubah rentang daftar menjadi satu hari. Kalender dan daftar menjelaskan cakupan filter masing-masing.
- Daftar mendukung habit/status/rentang, reset, pagination 25 baris, dan maksimum 366 hari per pencarian dengan pesan eksplisit. Seluruh periode tetap dapat ditelusuri dengan mengganti rentang.
- Target saat itu memakai habitAtDate. Koreksi dilakukan melalui UI Harian yang sudah ada: pengguna memilih tanggal di sana. Tidak ada deep link koreksi otomatis atau kontrak penulisan baru.
- Catatan di luar jadwal dan tanpa habit tetap ditampilkan, tidak dimasukkan dalam statistik terjadwal. Baris belum dicatat diturunkan dari jadwal, bukan dimasukkan ke storage.
- Isi catatan pribadi hanya dirender setelah detail dibuka. Statistik tidak merender isi jurnal/catatan.
- Statistik 7/30 hari dengan tanggal akhir, filter habit, distribusi label status, tren dan tabel, penyelesaian per habit, serta akumulasi target efektif harian dan realisasi angka terpisah dengan cakupan pencatatan. Satuan berbeda tidak dijumlahkan. Belum dicatat tidak dipaksakan menjadi nilai aktual nol.
- Tidak ada scoring baru, badge, target hasil mingguan/bulanan, migrasi, dependency, atau perubahan model/metrics/storage/transaksi. Semua pembacaan memakai adapter baca-saja sebelumnya.
- Filter berada di memori tampilan; tidak disimpan di URL atau data habit. Simpan input Harian sebelum berpindah tampilan.

## Verifikasi
Delapan test regresi disediakan; belum dijalankan saat perubahan disiapkan. Typecheck, lint, test, build, deployment, kontras dan pengujian browser belum dinyatakan lolos. Perintah mengikuti docs/AB_VERIFICATION.md. Workflow deploy yang sudah ada tidak diubah.

Checklist manual pada profil uji:
- [ ] Buka /habit, /habit?view=riwayat, /habit?view=statistik dan refresh masing-masing.
- [ ] Uji keyboard, light/dark dan lebar 320, 375, 768, 1024, 1440 px. Kalender boleh bergulir di region sendiri; halaman tidak boleh overflow.
- [ ] Pilih tanggal dan filter status/habit/rentang; uji reset, batas rentang dan pagination.
- [ ] Pastikan catatan pribadi tidak terlihat sebelum detail dibuka.
- [ ] Cocokkan target lama dan baru pada tanggal efektif, tanpa mengubah status tersimpan.
- [ ] Cocokkan completion dengan dayProgress/weekSummary dan akumulasi angka dengan target masing-masing tanggal.
- [ ] Periksa baris tanpa jadwal, tanpa habit, belum dicatat, actual nol, serta error storage.
- [ ] Uji koreksi lewat Harian dengan tanggal yang dipilih manual, lalu kembali ke Riwayat.
- [ ] Pastikan data v1/v2 tidak berubah hanya karena membuka dua tampilan baru.

Rollback dengan revert commit, bukan force-push atau penghapusan data browser.
