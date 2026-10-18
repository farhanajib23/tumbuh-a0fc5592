import {
  LayoutDashboard,
  CircleCheck,
  BookOpen,
  Flag,
  Wallet,
  GraduationCap,
  BatteryMedium,
  ChartNoAxesCombined,
} from "lucide-react";

export const modules = [
  {
    id: "dashboard",
    name: "Life Dashboard",
    description: "Lihat gambaran perjalanan pertumbuhanmu.",
    icon: LayoutDashboard,
    tone: "sage",
    available: true,
  },
  {
    id: "habit",
    name: "Habit & Routine Tracker",
    description: "Bangun kebiasaan kecil yang berarti.",
    icon: CircleCheck,
    tone: "blue",
    available: true,
    path: "/habit",
  },
  {
    id: "journal",
    name: "Journal & Self-Reflection",
    description: "Ruang untuk mendengar dan memahami diri.",
    icon: BookOpen,
    tone: "rose",
    available: false,
  },
  {
    id: "goals",
    name: "Goals & Action Planner",
    description: "Ubah tujuan menjadi langkah yang nyata.",
    icon: Flag,
    tone: "violet",
    available: false,
  },
  {
    id: "finance",
    name: "Personal Finance",
    description: "Kelola keuangan dengan lebih sadar.",
    icon: Wallet,
    tone: "ochre",
    available: false,
  },
  {
    id: "learning",
    name: "Learning & Skill Development",
    description: "Terus belajar, buka kemungkinan baru.",
    icon: GraduationCap,
    tone: "blue",
    available: false,
  },
  {
    id: "energy",
    name: "Time & Energy Management",
    description: "Temukan ritme yang baik untuk dirimu.",
    icon: BatteryMedium,
    tone: "sage",
    available: false,
  },
  {
    id: "insights",
    name: "Growth Insights",
    description: "Kenali pola dan rayakan perjalananmu.",
    icon: ChartNoAxesCombined,
    tone: "violet",
    available: false,
  },
] as const;
export function findModule(id: string) {
  return modules.find((module) => module.id === id);
}
export function pageMeta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — TUMBUH` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — TUMBUH` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
