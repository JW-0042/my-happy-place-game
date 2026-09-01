import { create } from "zustand";
import {
  clearAllSaves,
  clearSleep,
  consumeSleep,
  defaultBasicSave,
  loadBasic,
  saveBasic,
  saveSleep,
  type BasicSave,
  type SleepSave,
} from "@/lib/windoors/persist";
import type { WindowState } from "@/lib/windoors/types";

export type BootRestore = "new" | "sleep" | "crash";

type PersistSlice = Omit<BasicSave, "version">;

type WindoorsStore = PersistSlice & {
  restoreKind: BootRestore;
  remoteSession: boolean;
  sleepMode: boolean;
  unexpectedOpen: boolean;
  markRemoteSession: (active: boolean) => void;
  setSleepMode: (v: boolean) => void;
  setUnexpectedOpen: (v: boolean) => void;
  clearSleepSnapshot: () => void;
  hydrate: () => { kind: BootRestore; sleep: SleepSave | null; basic: BasicSave | null };
  writeBasic: (patch: Partial<PersistSlice>) => void;
  persistBasicNow: (snapshot: PersistSlice) => void;
  persistSleepNow: (snapshot: PersistSlice, windows: WindowState[]) => void;
  resetSaves: () => void;
};

export const useWindoorsStore = create<WindoorsStore>((set, get) => ({
  ...defaultBasicSave(),
  restoreKind: "new",
  remoteSession: false,
  sleepMode: false,
  unexpectedOpen: false,

  markRemoteSession: (active) => set({ remoteSession: active }),
  setSleepMode: (v) => set({ sleepMode: v }),
  setUnexpectedOpen: (v) => set({ unexpectedOpen: v }),
  clearSleepSnapshot: () => {
    clearSleep();
    set({ sleepMode: false });
  },

  hydrate: () => {
    const sleep = consumeSleep();
    if (sleep) {
      set({
        health: sleep.health,
        drainLevel: sleep.drainLevel,
        drainBoost: sleep.drainBoost,
        supportCalls: sleep.supportCalls,
        definitionsReady: sleep.definitionsReady,
        updateGeneration: sleep.updateGeneration,
        lastScanGeneration: sleep.lastScanGeneration,
        windoorsActivated: sleep.windoorsActivated,
        trueOg: sleep.trueOg,
        volumeLevel: sleep.volumeLevel,
        wifiOn: sleep.wifiOn,
        nightLight: sleep.nightLight,
        wallpaper: sleep.wallpaper ?? "bloom",
        rngSeed: sleep.rngSeed,
        restoreKind: "sleep",
        unexpectedOpen: false,
        sleepMode: false,
        remoteSession: false,
      });
      return { kind: "sleep" as const, sleep, basic: sleep };
    }
    const basic = loadBasic();
    if (basic) {
      set({
        health: basic.health,
        drainLevel: basic.drainLevel,
        drainBoost: basic.drainBoost,
        supportCalls: basic.supportCalls,
        definitionsReady: basic.definitionsReady,
        updateGeneration: basic.updateGeneration,
        lastScanGeneration: basic.lastScanGeneration,
        windoorsActivated: basic.windoorsActivated,
        trueOg: basic.trueOg,
        volumeLevel: basic.volumeLevel,
        wifiOn: basic.wifiOn,
        nightLight: basic.nightLight,
        wallpaper: basic.wallpaper ?? "bloom",
        rngSeed: basic.rngSeed,
        restoreKind: "crash",
        unexpectedOpen: true,
        sleepMode: false,
        remoteSession: false,
      });
      return { kind: "crash" as const, sleep: null, basic };
    }
    set({ ...defaultBasicSave(), restoreKind: "new", unexpectedOpen: false });
    return { kind: "new" as const, sleep: null, basic: null };
  },

  writeBasic: (patch) => set(patch),

  persistBasicNow: (snapshot) => {
    saveBasic(snapshot);
    set(snapshot);
  },

  persistSleepNow: (snapshot, windows) => {
    saveSleep({ ...snapshot, windows });
    set({ ...snapshot, sleepMode: true, remoteSession: false });
  },

  resetSaves: () => {
    clearAllSaves();
    set({
      ...defaultBasicSave(),
      restoreKind: "new",
      remoteSession: false,
      sleepMode: false,
      unexpectedOpen: false,
    });
  },
}));

export function snapshotFromStore(): PersistSlice {
  const s = useWindoorsStore.getState();
  return {
    health: s.health,
    drainLevel: s.drainLevel,
    drainBoost: s.drainBoost,
    supportCalls: s.supportCalls,
    definitionsReady: s.definitionsReady,
    updateGeneration: s.updateGeneration,
    lastScanGeneration: s.lastScanGeneration,
    windoorsActivated: s.windoorsActivated,
    trueOg: s.trueOg,
    volumeLevel: s.volumeLevel,
    wifiOn: s.wifiOn,
    nightLight: s.nightLight,
    wallpaper: s.wallpaper ?? "bloom",
    rngSeed: s.rngSeed,
  };
}
