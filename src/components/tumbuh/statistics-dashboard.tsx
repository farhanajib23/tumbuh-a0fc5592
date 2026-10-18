import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useHabitReadView } from "@/hooks/use-habit-read-view";
import { periodReport, stateLabels } from "@/lib/habit-explore";
import { isDateKey } from "@/lib/habit-metrics";
import type { HabitData } from "@/lib/habit-model";
import "./habit-explore.css";
import "./statistics-dashboard.css";

const number = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("id-ID", { maximumFractionDigits: 1 });

export function StatisticsDashboard() {
  const { view, refresh } = useHabitReadView();
  if (!view) {
    return <p role="status">Menyiapkan ringkasan statistik…</p>;
  }
  if (view.loaded.status !== "ok" && view.loaded.status !== "empty") {
    return (
      <section className="t-panel">
        <h1>Statistik belum dapat ditampilkan</h1>
        <p role="alert">
          {view.loaded.status === "unavailable"
            ? "Penyimpanan browser tidak tersedia."
            : "Data membutuhkan pemeriksaan; ringkasan parsial tidak dianggap lengkap."}
          {" "}Data asli tidak diubah oleh halaman ini.
        </p>
        <button type="button" className="t-action" onClick={refresh}>
          Coba baca ulang
        </button>
      </section>
    );
  }
  if (view.loaded.data.habits.length === 0 && view.loaded.data.entries.length === 0) {
    return (
      <section className="t-panel">
        <h1>Mulai dari satu catatan kecil</h1>
        <p>Belum ada data kebiasaan untuk diringkas. Data rutinitas lama tetap terpisah.</p>
        <Link className="t-action" to="/habit" search={{}}>
          Buka Harian
        </Link>
      </section>
    );
  }
  return (
    <StatisticsDashboardBody data={view.loaded.data} today={view.date} onRefresh={refresh} />
  );
}

export function StatisticsDashboardBody({
  data,
  today,
  onRefresh,
}: {
  data: HabitData;
  today: string;
  onRefresh: () => void;
}) {
  const [end, setEnd] = useState(today);
  const [length, setLength] = useState<7 | 30>(7);
  const [habitId, setHabitId] = useState("all");
  const descriptionId = useId();
  const report = periodReport(data, end, length, habitId);
  const measured = report.perHabit.filter((row) => row.measurement);
  const hasNewPresets = report.perHabit.some((row) =>
    row.habit.templateId?.startsWith("daily-"),
  );
  return (
    <div className="hs-root">
      <header className="page-heading">
        <div>
          <h1>Statistik kebiasaan</h1>
          <p>Kenali perjalananmu, lalu pilih langkah berikutnya yang realistis.</p>
        </div>
        <button type="button" className="t-action" onClick={onRefresh}>
          Perbarui statistik
        </button>
      </header>
      <section className="t-panel hs-controls" aria-label="Filter statistik">
        <h2>Lihat periode yang berarti untukmu</h2>
        <div className="hx-filters">
          <label>
            Kebiasaan
            <select
              className="text-input"
              value={habitId}
              onChange={(event) => setHabitId(event.target.value)}
            >
              <option value="all">Semua kebiasaan</option>
              {data.habits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Akhir periode statistik
            <input
              className="text-input"
              type="date"
              value={end}
              max={today}
              onChange={(event) => {
                if (isDateKey(event.target.value) && event.target.value <= today) {
                  setEnd(event.target.value);
                }
              }}
            />
          </label>
        </div>
        <div className="t-row">
          <div className="t-period" role="group" aria-label="Rentang statistik">
            {([7, 30] as const).map((value) => (
              <button
                className="t-action"
                type="button"
                key={value}
                aria-pressed={length === value}
                onClick={() => setLength(value)}
              >
                {value} hari
              </button>
            ))}
          </div>
          <button
            className="t-action"
            type="button"
            onClick={() => {
              setEnd(today);
              setLength(7);
              setHabitId("all");
            }}
          >
            Hapus filter
          </button>
        </div>
      </section>
      <section className="t-panel hs-summary" aria-label="Ringkasan penyelesaian">
        <h2>Progres periode ini</h2>
        <p>{report.from} sampai {report.end}</p>
        <div
          className="t-progress-ring"
          role="progressbar"
          aria-label="Penyelesaian kebiasaan terjadwal"
          aria-describedby={descriptionId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={report.trend.percent ?? undefined}
          aria-valuetext={
            report.trend.percent === null ? "Tidak ada jadwal" : `${report.trend.percent}%`
          }
          style={{
            background:
              report.trend.percent === null
                ? "var(--muted)"
                : `conic-gradient(var(--primary) ${report.trend.percent * 3.6}deg, var(--muted) 0deg)`,
          }}
        >
          <span>{report.trend.percent === null ? "—" : `${report.trend.percent}%`}</span>
        </div>
        <p id={descriptionId} className="hs-denominator">
          {report.trend.done} dari {report.trend.scheduled} kesempatan terjadwal selesai.
          {report.trend.percent === null ? " Tidak ada jadwal; bukan kegagalan." : ""}
        </p>
        <dl className="t-counts">
          {(Object.keys(report.counts) as Array<keyof typeof report.counts>).map((state) => (
            <div key={state}>
              <dt>{stateLabels[state]}</dt>
              <dd>{report.counts[state]}</dd>
            </div>
          ))}
        </dl>
        <p className="hp-muted">
          Ring menunjukkan penyelesaian terjadwal, bukan rata-rata capaian target angka.
          Belum dicatat tidak dianggap gagal. Konsistensi memakai rasio yang sama, bukan skor baru.
        </p>
      </section>
      <section className="t-panel hs-analytics" aria-label="Analitik kebiasaan">
        <h2>Tren pelaksanaan</h2>
        <p>Persentase penyelesaian per hari selama {length} hari, berakhir pada {end}.</p>
        {report.trend.scheduled === 0 ? (
          <p className="hp-empty">Tidak ada jadwal dalam periode ini. Ubah filter atau periode.</p>
        ) : (
          <div className="t-trend" aria-hidden="true">
            {report.trend.days.map((day) => (
              <div key={day.date}>
                <i style={{ height: `${day.percent ?? 0}%` }} />
              </div>
            ))}
          </div>
        )}
        <p className="hp-muted">
          Tinggi batang menunjukkan penyelesaian, bukan volume aktivitas. Rincian membedakan
          hari tanpa jadwal dari penyelesaian 0%.
        </p>
        <details>
          <summary>Tabel rincian tren</summary>
          <div className="t-table-wrap" role="region" aria-label="Rincian tren" tabIndex={0}>
            <table>
              <caption>Tren pelaksanaan {length} hari</caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Selesai</th>
                  <th scope="col">Terjadwal</th>
                  <th scope="col">Penyelesaian</th>
                </tr>
              </thead>
              <tbody>
                {report.trend.days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{day.date}</th>
                    <td>{day.done}</td>
                    <td>{day.scheduled}</td>
                    <td>{day.percent === null ? "Tidak ada jadwal" : `${day.percent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <div className="t-table-wrap" role="region" aria-label="Per kebiasaan" tabIndex={0}>
          <table>
            <caption>Penyelesaian per kebiasaan</caption>
            <thead>
              <tr>
                <th scope="col">Kebiasaan</th>
                <th scope="col">Selesai / terjadwal</th>
                <th scope="col">Penyelesaian</th>
              </tr>
            </thead>
            <tbody>
              {report.perHabit.map((row) => (
                <tr key={row.habit.id}>
                  <th scope="row">{row.habit.name}</th>
                  <td>{row.progress.done}/{row.progress.scheduled}</td>
                  <td>{row.progress.percent === null ? "—" : `${row.progress.percent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="t-panel hs-analytics" aria-label="Capaian target angka">
        <h2>Target dan realisasi</h2>
        <p>
          Akumulasi target harian efektif dibanding nilai yang tercatat. Ini bukan target hasil
          mingguan atau bulanan. Satuan berbeda tidak dijumlahkan atau dirata-ratakan.
        </p>
        {measured.length === 0 ? (
          <p className="hp-empty">Belum ada target angka yang dikenali laporan dalam pilihan ini.</p>
        ) : (
          <div className="t-table-wrap" role="region" aria-label="Target dan aktual" tabIndex={0}>
            <table>
              <caption>Capaian target angka per kebiasaan</caption>
              <thead>
                <tr>
                  <th scope="col">Kebiasaan</th>
                  <th scope="col">Target periode</th>
                  <th scope="col">Aktual tercatat</th>
                  <th scope="col">Cakupan</th>
                  <th scope="col">Capaian</th>
                </tr>
              </thead>
              <tbody>
                {measured.map(({ habit, measurement }) =>
                  measurement ? (
                    <tr key={habit.id}>
                      <th scope="row">{habit.name}</th>
                      <td>{number(measurement.planned)} {measurement.unit}</td>
                      <td>{number(measurement.actual)} {measurement.unit}</td>
                      <td>{measurement.recorded}/{measurement.scheduled} hari</td>
                      <td>
                        {measurement.attainment === null
                          ? "—"
                          : `${number(measurement.attainment)}%`}
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="hp-muted">
          — berarti nilai atau target belum tersedia, bukan otomatis nol. Cakupan adalah jumlah
          hari dengan angka tercatat dibanding hari terjadwal.
        </p>
      </section>
      <aside className="t-panel hs-notes" aria-label="Batasan statistik">
        <h2>Angka sebagai petunjuk, bukan penilaian diri</h2>
        <p>Belum ada kesimpulan pola, manfaat, diagnosis, badge, atau skor pertumbuhan baru.</p>
        {hasNewPresets && (
          <p>
            Laporan lama belum mengenali semua target angka preset baru dan progres parsial
            subkomponen workout/salat. Rincian komponen tetap tersedia di Harian; ring memakai
            status selesai tersimpan. Redesign ini tidak mengubah aturan tersebut.
          </p>
        )}
        {report.ignored > 0 && (
          <p>{report.ignored} catatan di luar jadwal atau tanpa kebiasaan tidak masuk rasio.</p>
        )}
        <Link className="t-action" to="/habit" search={{ view: "riwayat" }}>
          Tinjau riwayat
        </Link>
      </aside>
    </div>
  );
}
