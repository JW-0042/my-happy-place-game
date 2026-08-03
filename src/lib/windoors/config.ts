import type { LucideIcon } from "lucide-react";
import {
  Bolt,
  CircleCheck,
  Download,
  FileCheck,
  HardDrive,
  Microchip,
  ShieldHalf,
  SprayCan,
} from "lucide-react";

export type AppKey =
  | "update"
  | "scan"
  | "defrag"
  | "cleanup"
  | "chkdsk"
  | "sfc"
  | "drivers"
  | "startup";

export type ColorKey =
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "teal"
  | "indigo"
  | "sky"
  | "rose";

/** Full static Tailwind class maps — dynamic `text-${color}-400` never works with Tailwind. */
export const COLOR_STYLES: Record<
  ColorKey,
  {
    icon: string;
    bar: string;
    button: string;
    border: string;
    badgeBg: string;
  }
> = {
  blue: {
    icon: "text-blue-400",
    bar: "#3b82f6",
    button: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400",
    border: "border-blue-400/60 bg-blue-950/80",
    badgeBg: "from-blue-500 to-cyan-400",
  },
  green: {
    icon: "text-emerald-400",
    bar: "#22c55e",
    button: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400",
    border: "border-emerald-400/60 bg-emerald-950/80",
    badgeBg: "from-green-500 to-emerald-400",
  },
  amber: {
    icon: "text-amber-400",
    bar: "#f59e0b",
    button: "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400",
    border: "border-amber-400/60 bg-amber-950/80",
    badgeBg: "from-amber-500 to-yellow-400",
  },
  purple: {
    icon: "text-purple-400",
    bar: "#a855f7",
    button: "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400",
    border: "border-purple-400/60 bg-purple-950/80",
    badgeBg: "from-purple-500 to-violet-400",
  },
  teal: {
    icon: "text-teal-400",
    bar: "#14b8a6",
    button: "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400",
    border: "border-teal-400/60 bg-teal-950/80",
    badgeBg: "from-teal-500 to-cyan-400",
  },
  indigo: {
    icon: "text-indigo-400",
    bar: "#6366f1",
    button: "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400",
    border: "border-indigo-400/60 bg-indigo-950/80",
    badgeBg: "from-indigo-500 to-violet-400",
  },
  sky: {
    icon: "text-sky-400",
    bar: "#0ea5e9",
    button: "bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400",
    border: "border-sky-400/60 bg-sky-950/80",
    badgeBg: "from-sky-500 to-blue-400",
  },
  rose: {
    icon: "text-rose-400",
    bar: "#f43f5e",
    button: "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400",
    border: "border-rose-400/60 bg-rose-950/80",
    badgeBg: "from-rose-500 to-pink-400",
  },
};

export type TaskConfig = {
  key: AppKey;
  name: string;
  shortName: string;
  icon: LucideIcon;
  color: ColorKey;
  /** Base duration in ms (jitter applied at runtime). */
  duration: number;
  phases: string[];
  notifyTitle: string;
};

export const TASKS: Record<AppKey, TaskConfig> = {
  update: {
    key: "update",
    name: "Windoors Update",
    shortName: "Update",
    icon: Download,
    color: "blue",
    duration: 52000,
    phases: ["Checking", "Downloading", "Installing", "Finalizing"],
    notifyTitle: "Update ready",
  },
  scan: {
    key: "scan",
    name: "Windoors Security",
    shortName: "Scan",
    icon: ShieldHalf,
    color: "green",
    duration: 34000,
    phases: ["Memory", "Files", "Registry", "Threats"],
    notifyTitle: "Threats detected",
  },
  defrag: {
    key: "defrag",
    name: "Optimize Drives",
    shortName: "Defrag",
    icon: HardDrive,
    color: "amber",
    duration: 68000,
    phases: ["Analyzing", "Defragmenting", "Optimizing", "Done"],
    notifyTitle: "Drive fragmented",
  },
  cleanup: {
    key: "cleanup",
    name: "Disk Cleanup",
    shortName: "Cleanup",
    icon: SprayCan,
    color: "purple",
    duration: 17000,
    phases: ["Calculating", "Cleaning", "Removing"],
    notifyTitle: "Temp files",
  },
  chkdsk: {
    key: "chkdsk",
    name: "Check Disk",
    shortName: "Check Disk",
    icon: CircleCheck,
    color: "teal",
    duration: 29000,
    phases: ["Index", "Files", "Security", "Recovery", "Complete"],
    notifyTitle: "Disk errors",
  },
  sfc: {
    key: "sfc",
    name: "System File Checker",
    shortName: "SFC",
    icon: FileCheck,
    color: "indigo",
    duration: 43000,
    phases: ["Scanning", "Verifying", "Repairing"],
    notifyTitle: "Corrupt files",
  },
  drivers: {
    key: "drivers",
    name: "Driver Updater",
    shortName: "Drivers",
    icon: Microchip,
    color: "sky",
    duration: 31000,
    phases: ["Scanning", "Downloading", "Installing"],
    notifyTitle: "Drivers outdated",
  },
  startup: {
    key: "startup",
    name: "Startup Optimizer",
    shortName: "Startup",
    icon: Bolt,
    color: "rose",
    duration: 15000,
    phases: ["Analyzing", "Disabling", "Optimizing"],
    notifyTitle: "Slow boot",
  },
};

export const APP_KEYS = Object.keys(TASKS) as AppKey[];

/** 11.3 — funny nod to Windows 3.11 */
export const VERSION = "11.3";
export const PRODUCT_NAME = "Windoors";
export const FULL_TITLE = `Windoors ${VERSION} Caretaker`;
