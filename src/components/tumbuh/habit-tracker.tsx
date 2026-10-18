import { useMemo, useState } from "react";
import {
  Search,
  Compass,
  CalendarCheck,
  Map,
  Plus,
  Check,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  CircleCheck,
  Info,
  Pencil,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  activities,
  categories,
  categoryName,
  evidenceInfo,
  sources,
  findActivity,
  type Activity,
  type EvidenceLevel,
} from "@/lib/activities";
import { useHabitStore, todayKey, type Routine, type Reflection } from "@/lib/habit-store";

type Tab = "jelajahi" | "rutinitas" | "panduan";
const reflectionOptions: { id: Reflection; label: string }[] = [
  { id: "membantu", label: "Membantu" },
  { id: "biasa", label: "Biasa saja" },
  { id: "tidak-cocok", label: "Tidak cocok" },
];

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return (
    <span
      className={`evidence-badge evidence-${level.toLowerCase()}`}
      title={evidenceInfo[level].description}
    >
      {level}
    </span>
  );
}

function AddRoutineDialog({
  activity,
  onClose,
  onAdd,
}: {
  activity: Activity;
  onClose: () => void;
  onAdd: (trigger: string, frequency: Routine["frequency"], target: string) => void;
}) {
  const [trigger, setTrigger] = useState(activity.trigger);
  const [frequency, setFrequency] = useState<Routine["frequency"]>("harian");
  const [target, setTarget] = useState(activity.start);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>Tambahkan ke rutinitas saya</DialogTitle>
        <DialogDescription>{activity.title}</DialogDescription>
        <div className="form-field">
          <label htmlFor="rt-trigger">Pemicu / waktu</label>
          <input
            id="rt-trigger"
            className="text-input"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="Mis. setelah makan siang"
          />
        </div>
        <div className="form-field">
          <label htmlFor="rt-freq">Frekuensi</label>
          <select
            id="rt-freq"
            className="text-input"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Routine["frequency"])}
          >
            <option value="harian">Setiap hari</option>
            <option value="mingguan">Mingguan</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="rt-target">Target versi awal</label>
          <input
            id="rt-target"
            className="text-input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Mis. 10 menit jalan santai"
          />
        </div>
        <p className="storage-note">
          <HardDrive size={12} />
          Rutinitas disimpan di browser/perangkat ini saja.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={() => {
              onAdd(trigger.trim() || activity.trigger, frequency, target.trim() || activity.start);
              onClose();
            }}
          >
            <Plus size={14} />
            Simpan rutinitas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDetail({
  activity,
  onClose,
  onAdd,
}: {
  activity: Activity;
  onClose: () => void;
  onAdd: () => void;
}) {
  const info = evidenceInfo[activity.evidence];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg activity-detail">
        <div className="detail-head">
          <span className="small-label">{categoryName(activity.category)}</span>
          <EvidenceBadge level={activity.evidence} />
        </div>
        <DialogTitle>{activity.title}</DialogTitle>
        <DialogDescription className="sr-only">Detail aktivitas {activity.title}</DialogDescription>
        <div className="detail-section">
          <h4>Apa yang dilakukan</h4>
          <p>{activity.steps}</p>
        </div>
        <div className="detail-section">
          <h4>Kapan / pemicu yang disarankan</h4>
          <p>{activity.trigger}</p>
        </div>
        <div className="detail-section">
          <h4>Mengapa ini mungkin membantu</h4>
          <p>{activity.why}</p>
        </div>
        <div className="detail-section">
          <h4>Seberapa kuat buktinya</h4>
          <p>
            <strong>{info.title}.</strong> {activity.evidenceNote}
          </p>
        </div>
        <div className="detail-section">
          <h4>Keterbatasan &amp; batas aman</h4>
          <p>{activity.limits}</p>
        </div>
        <div className="detail-section">
          <h4>Versi awal yang mudah dicoba</h4>
          <p>{activity.start}</p>
        </div>
        <div className="detail-section">
          <h4>Cara mengevaluasi manfaatnya</h4>
          <p>{activity.measure}</p>
        </div>
        {activity.sourceKeys.length > 0 && (
          <div className="detail-section">
            <h4>Sumber</h4>
            <ul className="source-list">
              {activity.sourceKeys.map((key) => {
                const s = sources[key];
                if (!s) return null;
                return (
                  <li key={key}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <ExternalLink size={11} />
                    </a>
                    <span className="source-kind">{s.kind}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {activity.sourceKeys.length === 0 && (
          <p className="storage-note">
            <Info size={12} />
            Saran praktis umum; bukti langsung untuk format persis ini terbatas.
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onAdd}>
            <Plus size={14} />
            Tambahkan ke rutinitas saya
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Library({ onAdd }: { onAdd: (activity: Activity) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("semua");
  const [detail, setDetail] = useState<Activity | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter(
      (x) =>
        (category === "semua" || x.category === category) &&
        (!q ||
          x.title.toLowerCase().includes(q) ||
          x.steps.toLowerCase().includes(q) ||
          x.why.toLowerCase().includes(q)),
    );
  }, [query, category]);
  return (
    <>
      <div className="library-controls">
        <div className="search-box">
          <Search size={15} />
          <input
            className="text-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari aktivitas, mis. membaca, jalan, menabung…"
            aria-label="Cari aktivitas"
          />
        </div>
        <div className="filter-chips" role="group" aria-label="Filter kategori">
          <button
            className={`chip ${category === "semua" ? "is-active" : ""}`}
            onClick={() => setCategory("semua")}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.id ? "is-active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="evidence-legend">
          {(["A", "B", "C"] as EvidenceLevel[]).map((l) => (
            <span key={l} className="legend-item">
              <EvidenceBadge level={l} />
              {evidenceInfo[l].description}
            </span>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-panel">
          <p>
            Tidak ada aktivitas yang cocok dengan pencarian atau filter ini. Coba kata kunci atau
            kategori lain.
          </p>
        </div>
      ) : (
        <div className="activity-grid">
          {filtered.map((x) => (
            <article key={x.id} className="activity-card">
              <div className="activity-card-top">
                <span className="small-label">{categoryName(x.category)}</span>
                <EvidenceBadge level={x.evidence} />
              </div>
              <h3>{x.title}</h3>
              <p>{x.why}</p>
              <div className="activity-card-actions">
                <Button variant="outline" size="sm" onClick={() => setDetail(x)}>
                  Lihat detail
                </Button>
                <Button size="sm" onClick={() => onAdd(x)}>
                  <Plus size={13} />
                  Tambahkan
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {detail && (
        <ActivityDetail
          activity={detail}
          onClose={() => setDetail(null)}
          onAdd={() => {
            setDetail(null);
            onAdd(detail);
          }}
        />
      )}
    </>
  );
}

function RoutineCard({
  routine,
  store,
}: {
  routine: Routine;
  store: ReturnType<typeof useHabitStore>;
}) {
  const [editing, setEditing] = useState(false);
  const [trigger, setTrigger] = useState(routine.trigger);
  const [target, setTarget] = useState(routine.target);
  const [frequency, setFrequency] = useState(routine.frequency);
  const activity = findActivity(routine.activityId);
  if (!activity) return null;
  const today = todayKey();
  const todayCheckin = store.data.checkins.find(
    (c) => c.routineId === routine.id && c.date === today,
  );
  const history = store.data.checkins.filter((c) => c.routineId === routine.id);
  const helpful = history.filter((c) => c.reflection === "membantu").length;
  return (
    <article className={`routine-card ${routine.paused ? "is-paused" : ""}`}>
      <div className="routine-head">
        <div>
          <h3>{activity.title}</h3>
          <p className="routine-meta">
            {routine.trigger} · {routine.frequency === "harian" ? "Setiap hari" : "Mingguan"} ·
            Target: {routine.target}
          </p>
        </div>
        <EvidenceBadge level={activity.evidence} />
      </div>
      {editing ? (
        <div className="routine-edit">
          <div className="form-field">
            <label>Pemicu / waktu</label>
            <input
              className="text-input"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Frekuensi</label>
            <select
              className="text-input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Routine["frequency"])}
            >
              <option value="harian">Setiap hari</option>
              <option value="mingguan">Mingguan</option>
            </select>
          </div>
          <div className="form-field">
            <label>Target</label>
            <input
              className="text-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="dialog-actions">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => {
                store.updateRoutine(routine.id, {
                  trigger: trigger.trim() || routine.trigger,
                  target: target.trim() || routine.target,
                  frequency,
                });
                setEditing(false);
              }}
            >
              Simpan perubahan
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="routine-status">
            {routine.paused ? (
              <span className="small-label">Dijeda</span>
            ) : todayCheckin ? (
              <span className="status-done">
                <Check size={12} />
                Sudah dilakukan hari ini
              </span>
            ) : (
              <span className="small-label">Belum dilakukan hari ini</span>
            )}
          </div>
          {!routine.paused && !todayCheckin && (
            <Button size="sm" onClick={() => store.checkinToday(routine.id)}>
              <CircleCheck size={14} />
              Tandai dilakukan hari ini
            </Button>
          )}
          {todayCheckin && (
            <div className="reflection-box">
              <p>Apakah ini membantu tujuanmu?</p>
              <div className="reflection-options">
                {reflectionOptions.map((o) => (
                  <button
                    key={o.id}
                    className={`chip ${todayCheckin.reflection === o.id ? "is-active" : ""}`}
                    onClick={() => store.setReflection(routine.id, today, o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <p className="routine-history">
              Tercatat {history.length} kali dilakukan · {helpful} kali terasa membantu.
            </p>
          )}
          <div className="routine-actions">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} />
              Ubah
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => store.updateRoutine(routine.id, { paused: !routine.paused })}
            >
              {routine.paused ? (
                <>
                  <Play size={13} />
                  Lanjutkan
                </>
              ) : (
                <>
                  <Pause size={13} />
                  Jeda
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="danger-action"
              onClick={() => store.removeRoutine(routine.id)}
            >
              <Trash2 size={13} />
              Hapus
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function MyRoutines({
  store,
  onBrowse,
}: {
  store: ReturnType<typeof useHabitStore>;
  onBrowse: () => void;
}) {
  const { routines, checkins } = store.data;
  const active = routines.filter((r) => !r.paused);
  const totalDone = checkins.length;
  const reflected = checkins.filter((c) => c.reflection !== null);
  const helpful = checkins.filter((c) => c.reflection === "membantu").length;
  const notFit = checkins.filter((c) => c.reflection === "tidak-cocok").length;
  return (
    <>
      <div className="storage-banner">
        <HardDrive size={14} />
        <p>
          Rutinitas dan catatanmu disimpan hanya di browser/perangkat ini. Tidak ada akun, tidak ada
          data yang dikirim ke mana pun.
        </p>
      </div>
      {routines.length === 0 ? (
        <div className="empty-panel">
          <h3>Belum ada rutinitas yang dipilih.</h3>
          <p>
            Mulai dari satu aktivitas kecil yang terasa bermakna. Kamu bisa menjelajahi perpustakaan
            aktivitas dan menambahkannya ke sini.
          </p>
          <Button onClick={onBrowse}>
            <Compass size={14} />
            Jelajahi aktivitas
          </Button>
        </div>
      ) : (
        <>
          <section className="progress-summary" aria-label="Ringkasan progres">
            <h3>Ringkasan progresmu</h3>
            <div className="progress-stats">
              <div>
                <strong>{active.length}</strong>
                <span>rutinitas aktif</span>
              </div>
              <div>
                <strong>{totalDone}</strong>
                <span>tindakan dilakukan</span>
              </div>
              <div>
                <strong>{helpful}</strong>
                <span>terasa membantu</span>
              </div>
              <div>
                <strong>{notFit}</strong>
                <span>tidak cocok</span>
              </div>
            </div>
            <p className="progress-note">
              Yang diukur di sini adalah tindakan nyata dan manfaat yang kamu rasakan — bukan
              rentetan hari atau sekadar tanda centang.{" "}
              {reflected.length > 0 && helpful / reflected.length < 0.5
                ? "Sebagian aktivitas terasa kurang membantu; itu informasi berharga untuk menyesuaikan rutinitasmu."
                : "Terus perhatikan mana yang benar-benar membantu tujuanmu."}
            </p>
          </section>
          <div className="routine-list">
            {routines.map((r) => (
              <RoutineCard key={r.id} routine={r} store={store} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

const guideSteps = [
  {
    title: "Tentukan tujuan pribadi",
    body: "Mulai dari apa yang benar-benar penting untukmu, bukan yang terdengar bagus.",
    example: '"Aku ingin tidur lebih cukup karena siang hariku sering berat."',
    reason: "Tujuan yang bermakna membuat usaha terasa punya arah.",
    unsure:
      "Belum tahu tujuanmu? Pilih satu hal kecil yang akhir-akhir ini terasa berat, lalu mulai dari sana.",
  },
  {
    title: "Ubah tujuan menjadi tindakan yang terlihat",
    body: "Tujuan abstrak sulit dijalankan. Tulis tindakan yang bisa diamati: apa, kapan, di mana.",
    example: '"Lebih sehat" menjadi "jalan 10 menit setelah makan siang".',
    reason: "Tindakan konkret membuatmu tahu persis kapan sudah melakukannya.",
    unsure:
      "Belum tahu tindakannya? Jelajahi perpustakaan aktivitas dan pilih yang paling dekat dengan tujuanmu.",
  },
  {
    title: "Kenali hambatannya",
    body: "Tanyakan: apakah aku belum tahu caranya (kemampuan), tidak punya waktu/akses (kesempatan), atau tidak merasa ingin (motivasi)?",
    example: "Sering lupa membaca? Mungkin masalahnya pemicu, bukan kemauan.",
    reason: "Solusi yang tepat tergantung jenis hambatannya (kerangka COM-B).",
    unsure: "Belum tahu hambatannya? Coba jalankan beberapa hari dan catat kapan rencana gagal.",
  },
  {
    title: "Pilih versi awal yang realistis",
    body: "Kecilkan tindakan sampai terasa hampir terlalu mudah. Versi kecil yang terjadi lebih berharga daripada versi ideal yang tertunda.",
    example: "Membaca dua halaman, bukan satu bab.",
    reason: "Hambatan awal yang rendah membuat memulai jauh lebih mungkin.",
    unsure: "Belum tahu seberapa kecil? Pilih versi yang bisa selesai dalam lima menit.",
  },
  {
    title: "Tulis rencana jika–maka",
    body: 'Rumuskan: "JIKA [situasi], MAKA aku akan [tindakan]".',
    example: '"Jika selesai makan siang, maka aku jalan 10 menit."',
    reason:
      "Rencana jika–maka terbukti membantu niat menjadi tindakan (Gollwitzer & Sheeran, 2006).",
    unsure: "Belum tahu situasinya? Gunakan waktu makan atau rutinitas harian yang paling stabil.",
  },
  {
    title: "Kaitkan dengan pemicu yang konsisten",
    body: "Tempelkan kebiasaan baru pada rutinitas yang sudah otomatis kamu lakukan.",
    example: "Setelah menyeduh kopi pagi, buka buku.",
    reason: "Pemicu yang stabil membuat kebiasaan tidak bergantung pada ingatan.",
    unsure:
      "Belum tahu pemicunya? Daftar tiga hal yang pasti kamu lakukan setiap hari, lalu pilih satu.",
  },
  {
    title: "Kurangi hambatan lingkungan",
    body: "Tata lingkunganmu agar tindakan yang diinginkan jadi paling mudah dilakukan.",
    example: "Buku di meja, sepatu jalan di dekat pintu, ponsel di ruangan lain.",
    reason:
      "Kesempatan fisik adalah syarat perubahan perilaku; mengandalkan kemauan saja melelahkan.",
    unsure:
      "Belum tahu apa yang menghambat? Perhatikan apa yang kamu lakukan tepat sebelum menunda.",
  },
  {
    title: "Evaluasi apakah aktivitas membantu",
    body: 'Setelah beberapa waktu, tanya: apakah ini membantu tujuanku? Bukan sekadar "apakah aku rajin".',
    example: "Jalan pagi terasa melelahkan? Mungkin sore lebih cocok untukmu.",
    reason: "Kebiasaan yang bertahan adalah yang terasa bermakna dalam hidupmu.",
    unsure:
      "Belum tahu cara menilainya? Gunakan refleksi singkat setelah check-in di tab Rutinitas saya.",
  },
  {
    title: "Siapkan cara kembali setelah terganggu",
    body: "Keterlewatan itu normal dan tidak merusak proses. Tentukan aturan kembali yang lembut sebelum kamu membutuhkannya.",
    example: '"Kalau terlewat satu hari, besok aku lanjut dengan versi kecil."',
    reason:
      "Riset menunjukkan sesekali terlewat tidak menghentikan pembentukan kebiasaan (Lally dkk., 2010).",
    unsure:
      "Belum tahu aturannya? Mulai dengan: tidak menghukum diri, lanjut di kesempatan berikutnya.",
  },
];

function Guide() {
  const [openUnsure, setOpenUnsure] = useState<number | null>(null);
  return (
    <div className="guide-list">
      <p className="guide-intro">
        Sembilan tahap ini berurutan, bukan daftar tugas harian. Kerjakan dengan ritmemu; tidak ada
        yang harus selesai hari ini.
      </p>
      {guideSteps.map((s, i) => (
        <section key={s.title} className="guide-step">
          <div className="guide-number" aria-hidden="true">
            {i + 1}
          </div>
          <div className="guide-body">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <p className="guide-example">
              <strong>Contoh:</strong> {s.example}
            </p>
            <p className="guide-reason">
              <strong>Mengapa:</strong> {s.reason}
            </p>
            <button
              className="unsure-toggle"
              onClick={() => setOpenUnsure(openUnsure === i ? null : i)}
              aria-expanded={openUnsure === i}
            >
              {openUnsure === i ? "Tutup bantuan" : "Saya belum tahu"}
            </button>
            {openUnsure === i && <p className="unsure-box">{s.unsure}</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

export function HabitTracker() {
  const [tab, setTab] = useState<Tab>("jelajahi");
  const [adding, setAdding] = useState<Activity | null>(null);
  const store = useHabitStore();
  const tabs: { id: Tab; label: string; icon: typeof Compass }[] = [
    { id: "jelajahi", label: "Jelajahi aktivitas", icon: Compass },
    { id: "rutinitas", label: "Rutinitas saya", icon: CalendarCheck },
    { id: "panduan", label: "Panduan membangun kebiasaan", icon: Map },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Habit &amp; Routine Tracker</h1>
          <p>Perpustakaan aktivitas kebiasaan dengan dasar yang jelas — bukan sekadar checklist.</p>
        </div>
      </div>
      <div className="tab-bar" role="tablist" aria-label="Bagian Habit & Routine Tracker">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-button ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel">
        {tab === "jelajahi" && <Library onAdd={setAdding} />}
        {tab === "rutinitas" && <MyRoutines store={store} onBrowse={() => setTab("jelajahi")} />}
        {tab === "panduan" && <Guide />}
      </div>
      {adding && (
        <AddRoutineDialog
          activity={adding}
          onClose={() => setAdding(null)}
          onAdd={(trigger, frequency, target) => {
            store.addRoutine(adding.id, trigger, frequency, target);
            setTab("rutinitas");
          }}
        />
      )}
    </>
  );
}
