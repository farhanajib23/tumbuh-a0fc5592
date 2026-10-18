export interface DailyComponent {
  id: string;
  name: string;
  target: number;
  unit: string;
}
export interface DailyPreset {
  id: string;
  name: string;
  frequency: "daily";
  kind: "quantity" | "time" | "checklist" | "components";
  target: number | null;
  unit: string | null;
  targetTime?: string;
  description: string;
  components?: readonly DailyComponent[];
}

// Configuration only: importing this module never activates habits or writes data.
export const dailyPresets: readonly DailyPreset[] = [
  {
    id: "daily-wake-0430",
    name: "Bangun pagi pukul 04.30",
    frequency: "daily",
    kind: "time",
    target: null,
    unit: null,
    targetTime: "04:30",
    description:
      "Catat waktu bangun aktual. Tampilkan selisih terhadap 04.30; membuka aplikasi tidak menandai selesai.",
  },
  {
    id: "daily-water",
    name: "Minum air putih",
    frequency: "daily",
    kind: "quantity",
    target: 4000,
    unit: "ml",
    description:
      "Target pribadi awal, bukan rekomendasi universal. Kebutuhan cairan dipengaruhi makanan, aktivitas, cuaca, dan kondisi kesehatan. Jangan memaksakan target atau minum banyak sekaligus.",
  },
  {
    id: "daily-workout",
    name: "Workout harian",
    frequency: "daily",
    kind: "components",
    target: null,
    unit: null,
    description:
      "Catat tiap komponen secara terpisah. Jangan berlatih melalui rasa sakit; target dapat disesuaikan. Tidak ada penjumlahan repetisi dan menit menjadi satu skor.",
    components: [
      { id: "pushup-subuh", name: "Push-up setelah Subuh", target: 20, unit: "repetisi" },
      { id: "pushup-zuhur", name: "Push-up setelah Zuhur", target: 20, unit: "repetisi" },
      { id: "pushup-asar", name: "Push-up setelah Asar", target: 20, unit: "repetisi" },
      { id: "pushup-magrib", name: "Push-up setelah Magrib", target: 20, unit: "repetisi" },
      { id: "pushup-isya", name: "Push-up setelah Isya", target: 20, unit: "repetisi" },
      { id: "pullup", name: "Pull-up", target: 7, unit: "repetisi" },
      { id: "plank", name: "Plank", target: 1, unit: "menit" },
      { id: "weightlifting", name: "Weightlifting", target: 5, unit: "menit" },
    ],
  },
  {
    id: "daily-meditation",
    name: "Meditasi",
    frequency: "daily",
    kind: "quantity",
    target: 7,
    unit: "menit",
    description:
      "Duduk nyaman, amati napas alami, sadari pikiran tanpa menghakimi, lalu kembali ke napas. Praktik ini tidak harus selalu menghasilkan perasaan tenang dan bukan janji manfaat medis.",
  },
  {
    id: "daily-prayer",
    name: "Salat lima waktu tepat waktu",
    frequency: "daily",
    kind: "components",
    target: null,
    unit: null,
    description:
      "Catat pelaksanaan dan ketepatan waktu secara manual. Tidak ada jadwal lokal, verifikasi otomatis, atau penandaan otomatis.",
    components: [
      { id: "subuh", name: "Subuh", target: 1, unit: "pelaksanaan" },
      { id: "zuhur", name: "Zuhur", target: 1, unit: "pelaksanaan" },
      { id: "asar", name: "Asar", target: 1, unit: "pelaksanaan" },
      { id: "magrib", name: "Magrib", target: 1, unit: "pelaksanaan" },
      { id: "isya", name: "Isya", target: 1, unit: "pelaksanaan" },
    ],
  },
  {
    id: "daily-learning-content",
    name: "Menonton podcast atau video pembelajaran",
    frequency: "daily",
    kind: "checklist",
    target: 1,
    unit: "sesi",
    description:
      "Satu sesi konten yang sengaja dipilih untuk belajar, bukan durasi wajib. Durasi, judul, sumber, dan satu pembelajaran bersifat opsional.",
  },
  {
    id: "daily-journaling-session",
    name: "Journaling",
    frequency: "daily",
    kind: "checklist",
    target: 1,
    unit: "sesi",
    description:
      "Tandai sesi jurnal; 5–10 menit hanya panduan opsional. Isi jurnal tidak disalin ke Habit Tracker. Integrasi modul Journal memerlukan pemeriksaan terpisah.",
  },
  {
    id: "daily-walking",
    name: "Berjalan 5.000 langkah",
    frequency: "daily",
    kind: "quantity",
    target: 5000,
    unit: "langkah",
    description:
      "Catat langkah aktual secara manual. Tidak ada data perangkat atau realisasi yang dibuat otomatis.",
  },
  {
    id: "daily-reading-30",
    name: "Membaca buku atau novel",
    frequency: "daily",
    kind: "quantity",
    target: 30,
    unit: "menit",
    description:
      "Catat durasi membaca. Judul dan halaman bersifat opsional; target ini berbeda dari target hasil halaman mingguan dan tidak mengganti target membaca lama.",
  },
  {
    id: "daily-social-detox",
    name: "Social detox",
    frequency: "daily",
    kind: "quantity",
    target: 90,
    unit: "menit",
    description:
      "Catat durasi tanpa media sosial. Pekerjaan, komunikasi mendesak, dan kebutuhan penting tidak harus dianggap gagal. Tidak ada pemantauan aktivitas perangkat.",
  },
  {
    id: "daily-make-bed",
    name: "Merapikan tempat tidur",
    frequency: "daily",
    kind: "checklist",
    target: 1,
    unit: "kali",
    description:
      "Tandai secara manual setelah merapikan tempat tidur. Tidak ditandai otomatis berdasarkan waktu bangun.",
  },
];

export type ComponentProgress = "unrecorded" | "partial" | "incomplete" | "complete";
// Completion contract for new composite habits only; no weighting or score.
export function componentProgress(
  components: readonly DailyComponent[],
  values: Readonly<Record<string, number | undefined>>,
): ComponentProgress {
  if (components.length === 0) throw new Error("Komponen wajib tidak boleh kosong.");
  const actuals = components.map((component) => values[component.id]);
  if (actuals.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0)))
    throw new Error("Nilai komponen harus angka nol atau lebih.");
  if (actuals.every((value) => value === undefined)) return "unrecorded";
  if (components.every((component, index) => (actuals[index] ?? 0) >= component.target))
    return "complete";
  return actuals.some((value) => value !== undefined && value > 0) ? "partial" : "incomplete";
}
