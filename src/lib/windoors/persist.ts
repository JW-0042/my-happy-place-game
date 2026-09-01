import type { DrainLevel, WindowState } from "@/lib/windoors/types";
import type { WallpaperId } from "@/lib/windoors/config";
import { makeSeed } from "@/lib/windoors/rng";

export const SAVE_VERSION = 1;
const BASIC_KEY = "windoors.basic.v1";
const SLEEP_KEY = "windoors.sleep.v1";

export type BasicSave = {
  version: number;
  health: number;
  drainLevel: DrainLevel;
  drainBoost: number;
  supportCalls: number;
  definitionsReady: boolean;
  updateGeneration: number;
  lastScanGeneration: number;
  windoorsActivated: boolean;
  trueOg: boolean;
  volumeLevel: number;
  wifiOn: boolean;
  nightLight: boolean;
  wallpaper: WallpaperId;
  rngSeed: number;
};

export type SleepSave = BasicSave & {
  windows: WindowState[];
};

export function defaultBasicSave(): BasicSave {
  return {
    version: SAVE_VERSION,
    health: 100,
    drainLevel: 3,
    drainBoost: 0,
    supportCalls: 0,
    definitionsReady: false,
    updateGeneration: 0,
    lastScanGeneration: -1,
    windoorsActivated: false,
    trueOg: false,
    volumeLevel: 72,
    wifiOn: true,
    nightLight: false,
    wallpaper: "bloom",
    rngSeed: makeSeed(),
  };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function migrateBasic(raw: Partial<BasicSave> | null): BasicSave | null {
  if (!raw || typeof raw !== "object") return null;
  return { ...defaultBasicSave(), ...raw, version: SAVE_VERSION };
}

function sanitizeWindows(windows: unknown): WindowState[] {
  if (!Array.isArray(windows)) return [];
  return windows
    .filter((w) => w && typeof w === "object" && typeof (w as WindowState).appKey === "string")
    .map((w) => {
      const win = w as WindowState;
      return {
        ...win,
        running: false,
        preparing: false,
        closing: false,
        complete: false,
      };
    });
}

export function loadBasic(): BasicSave | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return migrateBasic(safeParse<Partial<BasicSave>>(localStorage.getItem(BASIC_KEY)));
  } catch {
    return null;
  }
}

export function loadSleep(): SleepSave | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = safeParse<Partial<SleepSave>>(localStorage.getItem(SLEEP_KEY));
    const basic = migrateBasic(raw);
    if (!basic || !raw) return null;
    return { ...basic, windows: sanitizeWindows(raw.windows) };
  } catch {
    return null;
  }
}

export function saveBasic(data: Omit<BasicSave, "version">) {
  if (typeof localStorage === "undefined") return;
  try {
    const blob: BasicSave = { ...data, version: SAVE_VERSION };
    localStorage.setItem(BASIC_KEY, JSON.stringify(blob));
  } catch {
    /* quota / private mode */
  }
}

export function saveSleep(data: Omit<SleepSave, "version">) {
  if (typeof localStorage === "undefined") return;
  try {
    const blob: SleepSave = { ...data, version: SAVE_VERSION };
    localStorage.setItem(SLEEP_KEY, JSON.stringify(blob));
    localStorage.setItem(BASIC_KEY, JSON.stringify({ ...data, windows: undefined, version: SAVE_VERSION }));
  } catch {
    /* quota / private mode */
  }
}

export function clearSleep() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SLEEP_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAllSaves() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(BASIC_KEY);
    localStorage.removeItem(SLEEP_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeSleep(): SleepSave | null {
  const sleep = loadSleep();
  if (sleep) clearSleep();
  return sleep;
}
