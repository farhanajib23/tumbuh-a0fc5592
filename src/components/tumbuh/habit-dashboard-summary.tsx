import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useHabitReadView } from "@/hooks/use-habit-read-view";
import { summarizeHabitView } from "@/lib/habit-read-view";
import { parseDateKey } from "@/lib/habit-metrics";

const number = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
export function HabitDashboardSummary() {
  const { view, refresh } = useHabitReadView();
  const [period, setPeriod] = useState<7 | 30>(7);
  if (!view)
    return (
      <section className="t-panel" aria-label="Ringkasan habit">
        <p role="status">Membaca ringkasan kebiasaan…</p>
      </section>
    );
  if (view.loaded.status !== "ok" && view.loaded.status !== "empty")
    return (
      <section className="t-panel" aria-label="Ringkasan habit">
        <h2>Ringkasan belum dapat ditampilkan</h2>
        <p role="alert">
          {view.loaded.status === "unavailable"
            ? "Penyimpanan browser tidak dapat dibaca."
            : "Data membutuhkan pemeriksaan. Ringkasan parsial tidak digunakan sebagai hasil lengkap."}{" "}
          Data asli tidak ditulis atau dihapus oleh Dashboard.
        </p>
        <button type="button" className="t-action" onClick={refresh}>
          Coba baca ulang
        </button>
      </section>
    );
  if (view.loaded.data.habits.length === 0)
    return (
      <section className="t-panel" aria-label="Ringkasan habit">
        <h2>Mulai dari satu kebiasaan yang berarti</h2>
        <p>
          Belum ada kebiasaan di workspace v2. Rutinitas lama v1 tetap tersedia secara terpisah di
          halaman Habit.
        </p>
        <Link className="t-action" to="/habit">
          Pilih kebiasaan
        </Link>
      </section>
    );
  const summary = summarizeHabitView(view.loaded.data, view.date);
  const trend = period === 7 ? summary.seven : summary.thirty;
  const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  const labels = {
    done: "Selesai",
    partial: "Parsial",
    recordedNotDone: "Tidak dilakukan / di luar toleransi",
    unrecorded: "Belum dicatat",
  };
  return (
    <section className="t-panel t-dashboard" aria-label="Ringkasan habit">
      <div className="t-summary-top">
        <div
          className="t-progress-ring"
          aria-hidden="true"
          style={{
            background:
              summary.day.percent === null
                ? "var(--muted)"
                : `conic-gradient(var(--primary) ${summary.day.percent * 3.6}deg, var(--muted) 0deg)`,
          }}
        >
          <span>{summary.day.percent === null ? "—" : `${summary.day.percent}%`}</span>
        </div>
        <div>
          <h2>Ringkasan kebiasaan hari ini</h2>
          <p>
            {dateFormat.format(parseDateKey(view.date))} · {summary.day.done} dari{" "}
            {summary.day.scheduled} kesempatan terjadwal selesai
            {summary.day.percent === null
              ? ". Tidak ada jadwal; bukan kegagalan."
              : ` (${summary.day.percent}%).`}
          </p>
          <dl className="t-counts">
            {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
              <div key={key}>
                <dt>{labels[key]}</dt>
                <dd>{summary.counts[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p>
        Persentase penyelesaian memakai aturan yang sudah ada: jumlah selesai dibagi kesempatan
        terjadwal. Belum dicatat tidak diberi label gagal. Parsial adalah label tampilan untuk
        catatan bernilai positif yang belum selesai; bukan status tersimpan baru.
      </p>
      <div className="t-row">
        <h3>Tren pelaksanaan</h3>
        <div className="t-period" role="group" aria-label="Rentang tren">
          {([7, 30] as const).map((length) => (
            <button
              key={length}
              type="button"
              className="t-action"
              aria-pressed={period === length}
              onClick={() => setPeriod(length)}
            >
              {length} hari
            </button>
          ))}
        </div>
      </div>
      <p>
        {trend.done} dari {trend.scheduled} kesempatan terjadwal selesai ·{" "}
        {trend.percent === null ? "Belum ada jadwal" : `${trend.percent}%`}. Rentang bergulir
        berakhir hari ini, bukan target minggu atau bulan kalender.
      </p>
      <div className="t-trend" aria-hidden="true">
        {trend.days.map((day) => (
          <div key={day.date}>
            <i style={{ height: `${day.percent ?? 0}%` }} />
          </div>
        ))}
      </div>
      <details>
        <summary>Rincian tren dalam tabel</summary>
        <div
          className="t-table-wrap"
          role="region"
          aria-label="Tabel tren yang dapat digulir"
          tabIndex={0}
        >
          <table>
            <caption>Tren penyelesaian {period} hari terakhir</caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Selesai</th>
                <th scope="col">Terjadwal</th>
                <th scope="col">Penyelesaian</th>
              </tr>
            </thead>
            <tbody>
              {trend.days.map((day) => (
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
      <h3>Target terukur vs realisasi hari ini</h3>
      <p>
        Capaian per kebiasaan adalah nilai aktual dibagi target yang berlaku hari ini. Tidak
        dirata-ratakan dengan penyelesaian kebiasaan. Tanda — berarti tidak ada nilai angka yang
        dicatat, bukan nol.
      </p>
      {summary.measured.length === 0 ? (
        <p>
          Tidak ada target angka yang terjadwal hari ini. Jurnal, emosi, dan waktu tidur tidak
          dipaksa menjadi skor angka.
        </p>
      ) : (
        <div
          className="t-table-wrap"
          role="region"
          aria-label="Tabel target dan realisasi yang dapat digulir"
          tabIndex={0}
        >
          <table>
            <caption>Target dan realisasi angka hari ini</caption>
            <thead>
              <tr>
                <th scope="col">Kebiasaan</th>
                <th scope="col">Target</th>
                <th scope="col">Aktual</th>
                <th scope="col">Capaian target</th>
              </tr>
            </thead>
            <tbody>
              {summary.measured.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.name}</th>
                  <td>
                    {number(row.target)} {row.unit}
                  </td>
                  <td>{row.actual === null ? "—" : `${number(row.actual)} ${row.unit ?? ""}`}</td>
                  <td>{row.attainment === null ? "—" : `${number(row.attainment)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>
        {summary.counts.unrecorded > 0
          ? `${summary.counts.unrecorded} kebiasaan terjadwal belum dicatat. Pilih satu yang ingin kamu perhatikan berikutnya.`
          : "Catatan yang sudah ada tetap tersimpan. Kamu boleh meninjau atau mengoreksinya di halaman Habit."}
      </p>
      <div className="t-row">
        <Link className="t-action" to="/habit">
          Lanjutkan pencatatan
        </Link>
        <button className="t-action" type="button" onClick={refresh}>
          Perbarui ringkasan
        </button>
      </div>
      <p className="t-footnote">
        Sumber: workspace habit v2 pada browser ini, bukan seluruh modul pertumbuhan. Rutinitas v1
        tetap terpisah. Tidak ada diagnosis, kesimpulan sebab-akibat, badge baru, atau sinkronisasi
        akun pada ringkasan ini.
      </p>
    </section>
  );
}
