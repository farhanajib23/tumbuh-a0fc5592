// Katalog awal; tidak menggantikan pustaka aktivitas atau ID rutinitas lama.
export const habitCategories = [
  { id: 'health', name: 'Kesehatan & Energi', tone: 'sage' },
  { id: 'learning', name: 'Belajar & Pengembangan Diri', tone: 'blue' },
  { id: 'awareness', name: 'Kesadaran Diri & Refleksi', tone: 'rose' },
  { id: 'focus', name: 'Fokus & Pengelolaan Waktu', tone: 'violet' },
  { id: 'connection', name: 'Finansial & Hubungan', tone: 'ochre' },
] as const;

export type HabitCategoryId = (typeof habitCategories)[number]['id'];
export type HabitInputKind = 'quantity' | 'time' | 'binary' | 'journal' | 'mood';
export interface HabitTemplate {
  readonly id: string;
  readonly name: string;
  readonly categoryId: HabitCategoryId;
  readonly purpose: string;
  readonly inputKind: HabitInputKind;
  readonly targetExample: string;
}

// Target berikut contoh awal yang dapat disesuaikan, bukan dosis optimal.
// Tidak ada habit yang otomatis aktif hanya karena terdaftar di katalog.
export const habitCatalog = [
  { id: 'daily-movement', name: 'Aktivitas Fisik Harian', categoryId: 'health', purpose: 'Membantu menjaga kebugaran dan energi.', inputKind: 'quantity', targetExample: 'Bergerak selama 20 menit' },
  { id: 'consistent-sleep', name: 'Tidur Konsisten', categoryId: 'health', purpose: 'Membangun pola tidur yang lebih teratur; pencatatan bukan diagnosis kesehatan.', inputKind: 'time', targetExample: 'Pilih jam tidur atau waktu bangun' },
  { id: 'reading', name: 'Membaca', categoryId: 'learning', purpose: 'Memperluas pengetahuan dan wawasan.', inputKind: 'quantity', targetExample: 'Membaca selama 15 menit' },
  { id: 'skill-practice', name: 'Latihan Keterampilan', categoryId: 'learning', purpose: 'Mengembangkan keterampilan yang dipilih sendiri.', inputKind: 'quantity', targetExample: 'Latihan selama 20 menit' },
  { id: 'daily-journal', name: 'Jurnal Harian', categoryId: 'awareness', purpose: 'Memahami pengalaman, pikiran, dan pembelajaran.', inputKind: 'journal', targetExample: 'Satu entri jurnal singkat' },
  { id: 'emotion-checkin', name: 'Check-in Emosi', categoryId: 'awareness', purpose: 'Mengenali suasana hati tanpa menyimpulkan diagnosis psikologis.', inputKind: 'mood', targetExample: 'Pilih suasana hati; catatan konteks opsional' },
  { id: 'daily-priorities', name: 'Menentukan Prioritas Harian', categoryId: 'focus', purpose: 'Mengarahkan perhatian pada hal yang penting.', inputKind: 'binary', targetExample: 'Tentukan maksimal tiga prioritas' },
  { id: 'focus-session', name: 'Sesi Fokus', categoryId: 'focus', purpose: 'Mengerjakan sesuatu dengan perhatian terarah.', inputKind: 'quantity', targetExample: 'Satu sesi fokus selama 25 menit' },
  { id: 'expense-awareness', name: 'Catat Pengeluaran', categoryId: 'connection', purpose: 'Menyadari arus uang; banyaknya transaksi bukan ukuran keberhasilan.', inputKind: 'binary', targetExample: 'Catat pengeluaran yang terjadi hari ini' },
  { id: 'meaningful-connection', name: 'Menjaga Hubungan Bermakna', categoryId: 'connection', purpose: 'Memelihara hubungan tanpa menilai kualitas dari jumlah pesan.', inputKind: 'binary', targetExample: 'Lakukan satu tindakan bermakna untuk orang terdekat' },
] as const satisfies readonly HabitTemplate[];
