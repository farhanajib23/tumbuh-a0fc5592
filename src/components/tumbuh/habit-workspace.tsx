import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Heart, Sprout, Target, Users } from "lucide-react";
import { habitCatalog, habitCategories } from "@/lib/habit-catalog";
import { addDays, dateKey, dayProgress, findEntry, isDateKey, isScheduledOn, parseDateKey, weekSummary } from "@/lib/habit-metrics";
import { emptyHabitData, type Habit, type HabitData, type HabitEntry } from "@/lib/habit-model";
import { HABIT_STORAGE_KEY, type StorageLike } from "@/lib/habit-storage";
import { commitHabitData, readHabitSnapshot, recordHabitEntry, undoHabitEntry, type HabitSnapshot } from "@/lib/habit-transactions";
import { HabitTracker } from "./habit-tracker";

const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${action} bg-primary text-primary-foreground`;
const icons = [Heart, BookOpen, Sprout, Target, Users];
const targets: Record<string, number> = { "daily-movement": 20, reading: 15, "skill-practice": 20, "focus-session": 25 };
const errors: Record<string, string> = {
  unavailable: "Penyimpanan browser tidak tersedia. Perubahan belum disimpan.",
  "recovery-required": "Data membutuhkan pemulihan. Penulisan diblokir agar data asli tidak tertimpa.",
  conflict: "Data berubah di tab lain. Muat ulang data sebelum mencoba lagi; input belum disimpan.",
  "invalid-data": "Data belum sesuai format yang didukung. Perubahan tidak disimpan.",
  quota: "Penyimpanan penuh. Perubahan belum disimpan; jangan hapus data browser sebelum mencadangkannya.",
  unknown: "Penyimpanan gagal. Perubahan belum disimpan.",
};

function EntryControls({ habit, entry, disabled, onRecord, onUndo }: {
  habit: Habit; entry: HabitEntry | undefined; disabled: boolean;
  onRecord: (value: number | null, done: boolean) => boolean; onUndo: () => void;
}) {
  const [value, setValue] = useState(entry?.value?.toString() ?? "");
  const [error, setError] = useState("");
  const template = habitCatalog.find((item) => item.id === habit.templateId);
  const quantity = template?.inputKind === "quantity";
  const supported = quantity || template?.inputKind === "binary";
  if (!supported) return <p className="text-sm text-muted-foreground">Jenis pencatatan ini belum didukung di workspace baru.</p>;
  return <div className="space-y-3">
    {quantity ? <form className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const actual = Number(value);
      if (!value.trim() || !Number.isFinite(actual) || actual < 0) { setError("Masukkan angka nol atau lebih."); return; }
      setError("");
      onRecord(actual, habit.target === null ? actual > 0 : actual >= habit.target);
    }}>
      <label className="block text-sm" htmlFor={`actual-${habit.id}`}>Nilai aktual {habit.name}</label>
      <div className="flex flex-wrap gap-2">
        <input id={`actual-${habit.id}`} className="text-input min-h-11 min-w-0 flex-1" type="number" min="0" step="any" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} aria-describedby={error ? `error-${habit.id}` : undefined} />
        <button type="submit" className={primary} disabled={disabled}>Simpan {habit.name}</button>
      </div>
      {error && <p id={`error-${habit.id}`} role="alert" className="text-sm text-destructive">{error}</p>}
    </form> : <button type="button" className={primary} disabled={disabled} onClick={() => onRecord(null, true)}>Tandai {habit.name} selesai</button>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={action} disabled={disabled} onClick={() => onRecord(null, false)}>Catat tidak dilakukan</button>
      {entry && <button type="button" className={action} disabled={disabled} onClick={onUndo} aria-label={`Batalkan catatan ${habit.name}`}>Batalkan catatan</button>}
    </div>
  </div>;
}

export function HabitWorkspace() {
  const [snapshot, setSnapshot] = useState<HabitSnapshot | null>(null);
  const storage = useRef<StorageLike | null>(null);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<Record<string, string>>({});
  const [customTargets, setCustomTargets] = useState<Record<string, string>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [stale, setStale] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function reload() {
    try { storage.current = window.localStorage; } catch { storage.current = null; }
    setSnapshot(readHabitSnapshot(storage.current));
    setStale(false);
    setMessage("");
    setError("");
  }

  useEffect(() => {
    reload();
    function refreshDate() {
      const key = dateKey(new Date());
      setToday(key);
      setDate((previous) => previous || key);
    }
    function externalChange(event: StorageEvent) {
      if (event.key === HABIT_STORAGE_KEY || event.key === null) {
        setStale(true);
        setError(errors["conflict"] ?? "Data berubah di tab lain.");
      }
    }
    refreshDate();
    const timer = window.setInterval(refreshDate, 60000);
    window.addEventListener("focus", refreshDate);
    window.addEventListener("storage", externalChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
      window.removeEventListener("storage", externalChange);
    };
  }, []);

  const data = snapshot?.loaded.data ?? emptyHabitData();
  const status = snapshot?.loaded.status;
  const writable = !stale && (status === "ok" || status === "empty");

  function persist(next: HabitData): boolean {
    setMessage("");
    if (!snapshot || !writable) { setError("Penyimpanan belum siap. Muat ulang data sebelum melanjutkan."); return false; }
    const result = commitHabitData(storage.current, snapshot, next);
    if (!result.ok) {
      setError(errors[result.reason] ?? "Perubahan belum disimpan.");
      if (result.reason === "conflict") setStale(true);
      return false;
    }
    setSnapshot(result.snapshot);
    setError("");
    setMessage("Perubahan tersimpan di browser ini.");
    return true;
  }

  function activate() {
    const templates = habitCatalog.filter((item) => selected.includes(item.id));
    if (templates.length < 1 || templates.length > 3) { setError("Pilih satu sampai tiga kebiasaan terlebih dahulu."); return; }
    const now = new Date();
    const start = dateKey(now);
    const additions: Habit[] = [];
    for (const template of templates) {
      if (template.inputKind !== "binary" && template.inputKind !== "quantity") { setError("Input khusus kebiasaan ini sedang disiapkan."); return; }
      if (data.habits.some((habit) => habit.templateId === template.id)) { setError("Kebiasaan tersebut sudah ditambahkan."); return; }
      const numeric = template.inputKind === "quantity" ? Number(customTargets[template.id] ?? targets[template.id] ?? 1) : null;
      if (numeric !== null && (!Number.isFinite(numeric) || numeric <= 0)) { setError("Target harus berupa angka lebih dari nol."); return; }
      additions.push({
        id: window.crypto.randomUUID(), templateId: template.id, name: template.name,
        categoryId: template.categoryId, purpose: purposes[template.id]?.trim() ?? "",
        unit: numeric === null ? null : "menit", target: numeric, status: "active", inactiveFrom: null,
        scheduleHistory: [{ from: start, schedule: { kind: "daily" } }],
        reminderTime: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
      });
    }
    if (persist({ ...data, habits: [...data.habits, ...additions] })) { setSelected([]); setCatalogOpen(false); }
  }

  function record(habit: Habit, value: number | null, done: boolean): boolean {
    const previous = findEntry(data.entries, habit.id, date);
    const changed = recordHabitEntry(data, {
      habitId: habit.id, date, done, value, note: previous?.note ?? null,
      reflection: previous?.reflection ?? null, updatedAt: new Date().toISOString(),
    }, dateKey(new Date()));
    if (!changed.ok) { setMessage(""); setError(changed.reason === "not-scheduled" ? "Kebiasaan tidak dijadwalkan pada tanggal ini." : "Periksa tanggal dan nilai pencatatan."); return false; }
    return persist(changed.data);
  }

  if (!snapshot || !date) return <p role="status" className="py-8 text-muted-foreground">Menyiapkan ruang kebiasaanmu…</p>;
  const progress = dayProgress(data.habits, data.entries, date);
  const week = weekSummary(data.habits, data.entries, date);
  const showCatalog = data.habits.length === 0 || catalogOpen;
  const blocked = status !== "ok" && status !== "empty";

  return <div className="mx-auto max-w-6xl space-y-8">
    <section className="rounded-lg border border-border bg-secondary p-5 sm:p-8">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Sprout size={18} aria-hidden="true" />Langkah kecil, alasan yang berarti</p>
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Kebiasaan yang tumbuh bersamamu</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Kenali alasanmu, lakukan yang realistis, lalu pelajari pengalamanmu. Satu hari terlewat bukan berarti kamu gagal.</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Data tersimpan pada browser ini, bukan tersinkronisasi antarperangkat. Penyimpanan lokal bukan perlindungan dari orang lain yang memakai browser yang sama.</p>
    </section>

    {(error || blocked) && <div role="alert" className="rounded-lg border border-destructive bg-card p-4 text-sm text-foreground">{error || "Data tidak dapat digunakan untuk penulisan biasa. Data asli tidak ditimpa oleh workspace ini."}</div>}
    <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={action} type="button" aria-label="Tanggal sebelumnya" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={18} /></button>
        <label className="sr-only" htmlFor="habit-date">Tanggal pencatatan</label>
        <input id="habit-date" className="text-input min-h-11 w-auto max-w-full" type="date" value={date} max={today} onChange={(event) => { if (isDateKey(event.target.value) && event.target.value <= today) setDate(event.target.value); }} />
        <button className={action} type="button" aria-label="Tanggal berikutnya" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}><ChevronRight size={18} /></button>
        <button className={action} type="button" onClick={() => setDate(dateKey(new Date()))}>Hari ini</button>
      </div>
      <button className={action} type="button" onClick={reload}>Muat ulang data</button>
    </div>

    <section className="rounded-lg border border-border bg-card p-5 sm:p-6" aria-label="Progres tanggal dipilih">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-bold">{new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(parseDateKey(date))}</h2><p className="mt-2 text-sm text-muted-foreground">{progress.done} selesai dari {progress.scheduled} kebiasaan terjadwal.</p></div>
        <span className="text-3xl font-bold text-primary">{progress.percent === null ? "—" : `${progress.percent}%`}</span>
      </div>
      <progress className="mt-4 h-3 w-full" style={{ accentColor: "var(--primary)" }} max={100} value={progress.percent ?? 0} aria-label="Persentase pelaksanaan terjadwal" />
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{progress.percent === null ? "Belum ada kebiasaan terjadwal pada tanggal ini; bukan nilai kegagalan." : "Persentase dihitung dari kebiasaan yang dijadwalkan, bukan dari seluruh katalog atau ukuran hasil kehidupan."}</p>
    </section>

    <div className="flex flex-wrap gap-3">
      <label className="min-w-0 flex-1"><span className="sr-only">Cari kebiasaan aktif</span><input className="text-input min-h-11" placeholder="Cari kebiasaan aktif…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">Filter kategori kebiasaan</span><select className="text-input min-h-11 max-w-full" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Semua kategori</option>{habitCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className={action} aria-expanded={showCatalog} onClick={() => setCatalogOpen(!catalogOpen)}>Pilih kebiasaan</button>
    </div>

    {data.habits.length === 0 && <p className="text-sm leading-relaxed text-muted-foreground">Belum ada kebiasaan baru yang aktif. Mulai dengan dua atau tiga yang paling relevan; memilih satu pun boleh.</p>}
    {data.habits.length > 0 && !data.habits.some((habit) => (category === "all" || habit.categoryId === category) && habit.name.toLowerCase().includes(query.trim().toLowerCase())) && <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Tidak ada kebiasaan yang cocok. Coba ubah pencarian atau kategori.</p>}
    {habitCategories.map((group, index) => {
      const habits = data.habits.filter((habit) => habit.categoryId === group.id && (category === "all" || category === group.id) && habit.name.toLowerCase().includes(query.trim().toLowerCase()));
      if (!habits.length) return null;
      const Icon = icons[index] ?? Sprout;
      return <section key={group.id} className="space-y-4" aria-label={group.name}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Icon size={20} className="text-primary" aria-hidden="true" />{group.name}<span className="text-xs font-normal text-muted-foreground">{habits.length} kebiasaan</span></h2>
        <div className="grid gap-4 lg:grid-cols-2">{habits.map((habit) => {
          const entry = findEntry(data.entries, habit.id, date);
          const scheduled = isScheduledOn(habit, date);
          const state = !scheduled ? "Tidak dijadwalkan" : !entry ? "Belum dicatat" : entry.done ? "Selesai" : entry.value !== null && entry.value > 0 ? "Tercatat sebagian" : "Tidak dilakukan";
          return <article key={habit.id} className={`min-w-0 rounded-lg border border-border p-5 ${entry?.done ? "bg-secondary" : "bg-card"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-bold">{habit.name}</h3><span className="rounded-md border border-border px-2 py-1 text-xs">{state}</span></div>
            <p className="mb-4 mt-2 break-words text-sm text-muted-foreground">Target: {habit.target === null ? "Satu tindakan bermakna" : `${habit.target} ${habit.unit ?? ""}`} · setiap hari sejak diaktifkan</p>
            <EntryControls key={`${habit.id}-${date}`} habit={habit} entry={entry} disabled={!writable || !scheduled} onRecord={(value, done) => record(habit, value, done)} onUndo={() => { const changed = undoHabitEntry(data, habit.id, date); if (changed.ok) persist(changed.data); }} />
            <details className="mt-4 border-t border-border pt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary focus-visible:outline-2">Alasan dan catatan target</summary><p className="break-words text-sm leading-relaxed text-muted-foreground">{habit.purpose || "Alasan pribadi belum diisi."} Target adalah komitmen pelaksanaan, bukan jaminan hasil.</p></details>
          </article>;
        })}</div>
      </section>;
    })}

    {showCatalog && <section className="space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6" aria-label="Katalog kebiasaan">
      <h2 className="text-xl font-bold">Mulai dari yang bermakna</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Pilih hingga tiga per langkah. Jadwal awal setiap hari; pilihan hari dan pengaturan lanjutan belum tersedia pada versi ini. Target menit adalah contoh, bukan aturan universal.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{habitCatalog.map((template) => {
        const supported = template.inputKind === "binary" || template.inputKind === "quantity";
        const added = data.habits.some((habit) => habit.templateId === template.id);
        const chosen = selected.includes(template.id);
        return <div key={template.id} className={`min-w-0 rounded-lg border p-4 ${chosen ? "border-primary bg-secondary" : "border-border"}`}>
          <p className="mb-2 text-xs text-muted-foreground">{habitCategories.find((item) => item.id === template.categoryId)?.name}</p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" aria-label={`Pilih ${template.name}`} checked={chosen} disabled={!writable || !supported || added || (!chosen && selected.length >= 3)} onChange={() => setSelected((previous) => chosen ? previous.filter((id) => id !== template.id) : [...previous, template.id])} /><span className="text-sm font-bold">{template.name}</span></label>
          <p className="text-sm leading-relaxed text-muted-foreground">{template.purpose}</p>
          {!supported && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Input khusus sedang disiapkan; belum dapat diaktifkan. Tidak dicatat sebagai checkbox biasa.</p>}
          {added && <p className="mt-2 text-xs text-primary">Sudah ditambahkan.</p>}
          {chosen && <div className="mt-3 space-y-3">
            <label className="block text-sm">Alasan pribadi untuk {template.name}<input className="text-input mt-1 min-h-11" maxLength={500} value={purposes[template.id] ?? ""} onChange={(event) => setPurposes({ ...purposes, [template.id]: event.target.value })} /></label>
            {template.inputKind === "quantity" && <label className="block text-sm">Target menit untuk {template.name}<input className="text-input mt-1 min-h-11" type="number" min="1" step="1" value={customTargets[template.id] ?? String(targets[template.id] ?? 1)} onChange={(event) => setCustomTargets({ ...customTargets, [template.id]: event.target.value })} /></label>}
          </div>}
        </div>;
      })}</div>
      <button className={primary} type="button" disabled={!writable || selected.length === 0} onClick={activate}>Aktifkan {selected.length} kebiasaan</button>
    </section>}

    <section className="rounded-lg border border-border bg-card p-5 sm:p-6" aria-label="Ringkasan tujuh hari">
      <h2 className="text-lg font-bold">Tujuh hari, satu kesempatan belajar</h2>
      <p className="mt-2 text-sm text-muted-foreground">{week.scheduled === 0 ? "Belum ada jadwal untuk diringkas pada periode ini." : `${week.done} dari ${week.scheduled} kesempatan terjadwal selesai (${week.percent}%). Ini pelaksanaan, bukan penilaian dirimu.`}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">{week.days.map((day) => <button key={day.date} type="button" className={`${action} flex-col px-2 ${day.date === date ? "bg-secondary text-primary" : "bg-background"}`} onClick={() => setDate(day.date)} aria-label={`Lihat tanggal ${day.date}`}><span>{parseDateKey(day.date).getDate()}</span><span className="text-xs">{day.scheduled ? `${day.done}/${day.scheduled}` : "—"}</span></button>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Tanda — berarti tidak ada jadwal. Refleksi mingguan dan riwayat perubahan target belum tersedia di workspace ini.</p>
    </section>

    <details className="rounded-lg border border-border bg-card p-5" onToggle={(event) => setLegacyOpen(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary focus-visible:outline-2">Buka pustaka aktivitas dan rutinitas lama</summary>
      <p className="my-4 text-sm leading-relaxed text-muted-foreground">Data lama tetap memakai penyimpanan v1 yang terpisah. Tidak ada migrasi atau penghapusan otomatis ke workspace baru.</p>
      {legacyOpen && <HabitTracker />}
    </details>
  </div>;
}
