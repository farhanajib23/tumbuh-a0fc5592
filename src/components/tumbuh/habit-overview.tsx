import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, Sparkles, Sprout } from "lucide-react";
import { habitCategories } from "@/lib/habit-catalog";
import {
  addDays,
  findEntry,
  isScheduledOn,
  parseDateKey,
  type DayProgress,
  type WeekSummary,
} from "@/lib/habit-metrics";
import type { Habit, HabitEntry } from "@/lib/habit-model";

export type DayState = "off" | "none" | "done" | "partial";

export function recentDays(
  habit: Habit,
  entries: HabitEntry[],
  endKey: string,
  length = 7,
): Array<{ date: string; state: DayState }> {
  const days: Array<{ date: string; state: DayState }> = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const date = addDays(endKey, -i);
    const entry = findEntry(entries, habit.id, date);
    days.push({
      date,
      state: !isScheduledOn(habit, date)
        ? "off"
        : !entry
          ? "none"
          : entry.done
            ? "done"
            : "partial",
    });
  }
  return days;
}

export function ProgressRing({
  percent,
  size = 132,
  stroke = 11,
  label,
  decorative = false,
  children,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  decorative?: boolean;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent ?? 0));
  const semantics = decorative
    ? { "aria-hidden": true as const }
    : {
        role: "progressbar",
        "aria-label": label ?? "Progres",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        ...(percent === null ? {} : { "aria-valuenow": value }),
      };
  return (
    <div
      className={`hp-ring ${size > 100 ? "is-large" : ""} ${percent === 100 ? "is-complete" : ""}`}
      style={{ width: size, height: size }}
      {...semantics}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="hp-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="hp-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="hp-ring-center">{children}</div>
    </div>
  );
}

export function DotStrip({ days }: { days: Array<{ date: string; state: DayState }> }) {
  const scheduled = days.filter((day) => day.state !== "off").length;
  const done = days.filter((day) => day.state === "done").length;
  return (
    <div
      className="hp-dots"
      role="img"
      aria-label={`Tujuh hari terakhir: ${done} dari ${scheduled} kesempatan terjadwal selesai`}
    >
      {days.map((day) => (
        <i
          key={day.date}
          className={`hp-dot is-${day.state}`}
          title={day.date}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function HabitHero({
  dateLabel,
  progress,
  unrecorded,
  weekPercent,
  privacy,
}: {
  dateLabel: string;
  progress: DayProgress;
  unrecorded: number;
  weekPercent: number | null;
  privacy: string;
}) {
  const note =
    progress.percent === null
      ? "Tidak ada jadwal pada tanggal ini; bukan kegagalan."
      : progress.percent === 100
        ? "Semua kebiasaan terjadwal pada tanggal ini sudah selesai. Nikmati jedanya."
        : "Persentase mengukur pelaksanaan terjadwal, bukan hasil kehidupan. Suasana hati apa pun dihitung sebagai check-in.";
  return (
    <section className="hp-hero hp-rise" aria-label="Progres tanggal dipilih">
      <div>
        <p className="hp-eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          Langkah kecil, alasan yang berarti
        </p>
        <h1>Kebiasaan yang tumbuh bersamamu</h1>
        <p className="hp-lead">
          Kenali alasanmu, lakukan yang realistis, lalu pelajari pengalamanmu. Satu hari terlewat
          bukan berarti kamu gagal.
        </p>
        <p className="hp-privacy">{privacy}</p>
        <h2>
          <CalendarDays
            size={15}
            aria-hidden="true"
            style={{ display: "inline", marginRight: 8, verticalAlign: "-2px" }}
          />
          {dateLabel}
        </h2>
        <p className="hp-hero-note">
          {progress.done} selesai dari {progress.scheduled} kebiasaan terjadwal. {note}
        </p>
        <div className="hp-stats">
          <div className="hp-stat">
            <strong>{progress.done}</strong>
            <span>Selesai</span>
          </div>
          <div className="hp-stat">
            <strong>{unrecorded}</strong>
            <span>Belum dicatat</span>
          </div>
          <div className="hp-stat">
            <strong>{weekPercent === null ? "—" : `${weekPercent}%`}</strong>
            <span>Tujuh hari</span>
          </div>
        </div>
      </div>
      <ProgressRing percent={progress.percent} label="Persentase pelaksanaan terjadwal">
        {progress.percent === null ? (
          <Sprout size={40} aria-hidden="true" />
        ) : (
          `${progress.percent}%`
        )}
      </ProgressRing>
    </section>
  );
}

export function WeekStrip({
  days,
  selected,
  today,
  onSelect,
}: {
  days: WeekSummary["days"];
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
  return (
    <div className="hp-week">
      {days.map((day) => (
        <button
          key={day.date}
          type="button"
          className={`hp-day ${day.date === selected ? "is-selected" : ""} ${day.date === today ? "is-today" : ""} ${day.scheduled === 0 ? "is-off" : ""}`}
          style={{ "--fill": `${day.percent ?? 0}%` } as CSSProperties}
          aria-pressed={day.date === selected}
          aria-label={`Lihat tanggal ${day.date}`}
          onClick={() => onSelect(day.date)}
        >
          <span className="hp-day-name">{weekday.format(parseDateKey(day.date))}</span>
          <strong>{parseDateKey(day.date).getDate()}</strong>
          <span className="hp-day-meta">
            {day.scheduled ? `${day.done}/${day.scheduled}` : "—"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({
  habits,
  value,
  onChange,
}: {
  habits: Habit[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="hp-chips" role="group" aria-label="Filter kategori kebiasaan">
      <button
        type="button"
        className={`hp-chip ${value === "all" ? "is-active" : ""}`}
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
      >
        Semua<span className="hp-chip-count">{habits.length}</span>
      </button>
      {habitCategories.map((category) => {
        const count = habits.filter((habit) => habit.categoryId === category.id).length;
        return (
          <button
            key={category.id}
            type="button"
            className={`hp-chip ${value === category.id ? "is-active" : ""}`}
            aria-pressed={value === category.id}
            onClick={() => onChange(category.id)}
          >
            {category.name}
            <span className="hp-chip-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
