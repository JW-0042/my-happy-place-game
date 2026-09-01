import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  BatteryFull,
  Bluetooth,
  Check,
  ChevronUp,
  Moon,
  Plane,
  Power,
  Search,
  Settings2,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import {
  APP_KEYS,
  BASIC_SAVE_MS,
  BIOS_BSOD_CHANCE,
  CREATOR_X_URL,
  DOCK_KEYS,
  DRAIN_BY_LEVEL,
  FULL_TITLE,
  HEAL_ON_COMPLETE,
  PENALTY_CANCEL,
  PENALTY_IGNORE_TOAST,
  HOURGLASS_MS,
  PRODUCT_KEY,
  PRODUCT_NAME,
  PROGRESS_EMIT_MS,
  SUPPORT_DRAIN_BUMP,
  TASKS,
  TASK_TOAST_LIFE_MS,
  TOAST_LEAVE_MS,
  TOAST_LIFE_MS,
  VERSION,
  type AppKey,
  type WallpaperId,
} from "@/lib/windoors/config";
import { createTimerRegistry } from "@/lib/windoors/timers";
import { useWindoorsStore } from "@/lib/windoors/store";
import type { DrainLevel, Toast, WindowState } from "@/lib/windoors/types";
import {
  clamp,
  computeWindowPos,
  healthTone,
  shouldSpawnToast,
  statusRingClass,
  toolVisualStatus,
} from "@/lib/windoors/layout";
import { isXpLegendaryKey, nextDrainAfterUpdateRestart } from "@/lib/windoors/sim";
import { formatSeed, makeSeed, mulberry32 } from "@/lib/windoors/rng";
import { useClock, useFocusTrap, useIsNarrow } from "@/lib/windoors/hooks";
import { applyScenario, emptyUpdateFields } from "@/lib/windoors/window-fields";
import { pickUpdateScenario } from "@/lib/windoors/updates";
import { WindoorsLogo } from "@/components/windoors/windoors-logo";
import { ToolIcon } from "@/components/windoors/tool-icons";
import { ToastCard } from "@/components/windoors/toast-card";
import { AppWindow } from "@/components/windoors/app-window";
import { AboutDialog } from "@/components/windoors/retro-chrome";
import { playBsod, playDing, playStartup, unlockAudio } from "@/lib/windoors/sounds";
import qrXProfile from "@/assets/qr-thimothybsirius.svg?url";

const SCAN_FILES = ["ntdll.dll", "temp.tmp", "registry.key", "explorer.exe", "kernel32.dll", "bootmgr"];
const DRIVER_NAMES = ["GPU adapter", "Audio HD", "Chipset ACPI", "Network WLAN", "USB xHCI"];

export function CaretakerGame() {
  const reactId = useId();
  const idSeq = useRef(0);
  const zSeq = useRef(10);
  const healthRef = useRef(100);
  const taskRaf = useRef<Map<string, number>>(new Map());
  const taskStart = useRef<Map<string, { t0: number; duration: number }>>(new Map());
  const timers = useRef(createTimerRegistry());
  const lastHealAt = useRef(0);
  const lastProgressEmit = useRef<Map<string, number>>(new Map());
  const hourglassTimers = useRef<Map<string, number>>(new Map());
  const rngSeedRef = useRef(makeSeed());
  const rngRef = useRef(mulberry32(rngSeedRef.current));
  const persistBag = useRef({
    health: 100,
    drainLevel: 3 as DrainLevel,
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
    wallpaper: "bloom" as WallpaperId,
    rngSeed: 0,
  });
  const logoUid = reactId.replace(/:/g, "");
  const definitionsReadyRef = useRef(false);
  const [definitionsReady, setDefinitionsReady] = useState(false);
  const updateGenerationRef = useRef(0);
  const lastScanGenerationRef = useRef(-1);
  const [health, setHealth] = useState(100);
  /** 3 = fastest decay, 1 = slowest (after successful BIOS flash). */
  const [drainLevel, setDrainLevel] = useState<1 | 2 | 3>(3);
  const drainLevelRef = useRef<1 | 2 | 3>(3);
  /** Stacked penalty from Remote Support calls (never decreases). */
  const [drainBoost, setDrainBoost] = useState(0);
  const drainBoostRef = useRef(0);
  /** While true, passive health drain is frozen. */
  const [supportActive, setSupportActive] = useState(false);
  const supportActiveRef = useRef(false);
  const [supportCalls, setSupportCalls] = useState(0);
  const [windows, setWindows] = useState<WindowState[]>([]);
  /** Always-current windows for sync reads (install gate, etc.) */
  const windowsRef = useRef<WindowState[]>([]);
  windowsRef.current = windows;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  toastsRef.current = toasts;
  const [startOpen, setStartOpen] = useState(false);
  const [bsod, setBsod] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [batteryOpen, setBatteryOpen] = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(72);
  const [wifiOn, setWifiOn] = useState(true);
  const [nightLight, setNightLight] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperId>("bloom");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [telemetryOptOut, setTelemetryOptOut] = useState(false);
  const telemetryTimer = useRef<number | null>(null);
  /** Post–Windoors Update restart dialog (BIOS uses its own cold boot path). */
  const [updateRestartPrompt, setUpdateRestartPrompt] = useState(false);
  const [windoorsActivated, setWindoorsActivated] = useState(false);
  const [trueOg, setTrueOg] = useState(false);
  const trueOgRef = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ogBanner, setOgBanner] = useState(false);
  const [booted, setBooted] = useState(false);
  const [bootScreen, setBootScreen] = useState(true);
  const isMobile = useIsNarrow(640);
  const clock = useClock();
  const remoteSession = useWindoorsStore((s) => s.remoteSession);
  const sleepMode = useWindoorsStore((s) => s.sleepMode);
  const unexpectedOpen = useWindoorsStore((s) => s.unexpectedOpen);
  const markRemoteSession = useWindoorsStore((s) => s.markRemoteSession);
  const setSleepMode = useWindoorsStore((s) => s.setSleepMode);
  const setUnexpectedOpen = useWindoorsStore((s) => s.setUnexpectedOpen);
  useFocusTrap(unexpectedOpen || updateRestartPrompt || startOpen || actionCenterOpen || aboutOpen);

  const nextId = useCallback(
    (prefix: string) => {
      idSeq.current += 1;
      return `${prefix}-${reactId.replace(/:/g, "")}-${idSeq.current}`;
    },
    [reactId],
  );

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const prevBootScreen = useRef(true);
  useEffect(() => {
    if (prevBootScreen.current && !bootScreen && booted) {
      playStartup(persistBag.current.volumeLevel);
    }
    prevBootScreen.current = bootScreen;
  }, [bootScreen, booted]);

  const heardToasts = useRef(new Set<string>());
  useEffect(() => {
    for (const t of toasts) {
      if (!heardToasts.current.has(t.id) && (t.kind === "task" || t.kind === "welcome")) {
        playDing(persistBag.current.volumeLevel);
      }
      heardToasts.current.add(t.id);
    }
  }, [toasts]);

  const wasBsod = useRef(false);
  useEffect(() => {
    if (bsod && !wasBsod.current) playBsod(persistBag.current.volumeLevel);
    wasBsod.current = bsod;
  }, [bsod]);

  // Telemetry "opt-out" that re-enables itself (purely coincidental UX)
  useEffect(() => {
    if (!telemetryOptOut) {
      if (telemetryTimer.current != null) {
        timers.current.clearTimeout(telemetryTimer.current);
        telemetryTimer.current = null;
      }
      return;
    }
    telemetryTimer.current = timers.current.timeout(() => {
      setTelemetryOptOut(false);
      telemetryTimer.current = null;
      const id = nextId("telem");
      setToasts((t) => [
        ...t.slice(-4),
        {
          id,
          kind: "info" as const,
          title: "Diagnostic data sharing restored",
          body: "Your preference was noted, then gently ignored for quality of service.",
        },
      ]);
      timers.current.timeout(() => {
        setToasts((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
        timers.current.timeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 350);
      }, 6000);
    }, 5000);
    return () => {
      if (telemetryTimer.current != null) {
        timers.current.clearTimeout(telemetryTimer.current);
        telemetryTimer.current = null;
      }
    };
  }, [telemetryOptOut, nextId]);

  const applyHealth = useCallback((delta: number) => {
    if (trueOgRef.current) {
      healthRef.current = 100;
      setHealth(100);
      return;
    }
    if (delta > 0) lastHealAt.current = performance.now();
    setHealth((h) => {
      const next = clamp(h + delta, 0, 100);
      healthRef.current = next;
      if (next <= 0) setBsod(true);
      return next;
    });
  }, []);

  const setHealthAbs = useCallback((value: number) => {
    const next = clamp(value, 0, 100);
    healthRef.current = next;
    setHealth(next);
    if (next <= 0) setBsod(true);
  }, []);

  const collectPersist = useCallback(
    () => ({
      health: healthRef.current,
      drainLevel: drainLevelRef.current,
      drainBoost: drainBoostRef.current,
      supportCalls: persistBag.current.supportCalls,
      definitionsReady: definitionsReadyRef.current,
      updateGeneration: updateGenerationRef.current,
      lastScanGeneration: lastScanGenerationRef.current,
      windoorsActivated: persistBag.current.windoorsActivated,
      trueOg: trueOgRef.current,
      volumeLevel: persistBag.current.volumeLevel,
      wifiOn: persistBag.current.wifiOn,
      nightLight: persistBag.current.nightLight,
      wallpaper: persistBag.current.wallpaper,
      rngSeed: persistBag.current.rngSeed,
    }),
    [],
  );

  const applyBasicSnapshot = useCallback(
    (s: ReturnType<typeof collectPersist>) => {
      setHealthAbs(s.health);
      drainLevelRef.current = s.drainLevel;
      setDrainLevel(s.drainLevel);
      drainBoostRef.current = s.drainBoost;
      setDrainBoost(s.drainBoost);
      setSupportCalls(s.supportCalls);
      definitionsReadyRef.current = s.definitionsReady;
      setDefinitionsReady(s.definitionsReady);
      updateGenerationRef.current = s.updateGeneration;
      lastScanGenerationRef.current = s.lastScanGeneration;
      setWindoorsActivated(s.windoorsActivated);
      setTrueOg(s.trueOg);
      trueOgRef.current = s.trueOg;
      setVolumeLevel(s.volumeLevel);
      setWifiOn(s.wifiOn);
      setNightLight(s.nightLight);
      setWallpaper(s.wallpaper ?? "bloom");
      rngSeedRef.current = s.rngSeed || makeSeed();
      rngRef.current = mulberry32(rngSeedRef.current);
      if (s.trueOg) setHealthAbs(100);
    },
    [setHealthAbs],
  );


  const cancelRaf = useCallback((winId: string) => {
    const handle = taskRaf.current.get(winId);
    if (handle != null) {
      cancelAnimationFrame(handle);
      taskRaf.current.delete(winId);
    }
    taskStart.current.delete(winId);
  }, []);

  const markDefinitionsStale = useCallback(() => {
    definitionsReadyRef.current = false;
    setDefinitionsReady(false);
    setWindows((list) =>
      list.map((w) =>
        w.appKey === "scan" && !w.running && !w.complete
          ? { ...w, needsUpdateFirst: true, phase: "Definitions outdated", progress: 0 }
          : w,
      ),
    );
  }, []);

  const markDefinitionsFreshFromUpdate = useCallback(() => {
    updateGenerationRef.current += 1;
    definitionsReadyRef.current = true;
    setDefinitionsReady(true);
    setWindows((list) =>
      list.map((w) =>
        w.appKey === "scan" && w.needsUpdateFirst && !w.running
          ? {
              ...w,
              needsUpdateFirst: false,
              phase: "Ready — definitions updated",
              complete: false,
              progress: 0,
              logLines: ["✓ Definitions installed from Windoors Update.", "Click Start to scan."],
            }
          : w,
      ),
    );
  }, []);

  const endSupportSession = useCallback(() => {
    supportActiveRef.current = false;
    setSupportActive(false);
    setWindows((list) =>
      list.map((w) =>
        w.appKey === "support"
          ? { ...w, running: false, phase: "Disconnected", logLines: w.logLines }
          : w,
      ),
    );
  }, []);

  const callSupport = useCallback(() => {
    // Every call permanently nudges decay upward (the "surprise")
    const nextBoost = Math.min(0.55, drainBoostRef.current + SUPPORT_DRAIN_BUMP);
    drainBoostRef.current = nextBoost;
    setDrainBoost(nextBoost);
    setSupportCalls((c) => c + 1);
    supportActiveRef.current = true;
    setSupportActive(true);
    // True pause: clear pending task nags (no ignore penalty) so you can step away
    setToasts((list) => list.filter((t) => t.kind !== "task"));
    setWindows((list) =>
      list.map((w) =>
        w.appKey === "support" && !w.closing
          ? {
              ...w,
              running: true,
              phase: "Remote session active",
              logLines: [
                ...w.logLines.slice(-6),
                `✓ Support channel opened (ticket #${3110 + supportCalls + 1})`,
                "○ Passive degradation timers suspended for this session",
                "○ New maintenance notifications paused until Finish support",
                "○ Other maintenance tools remain available",
              ],
            }
          : w,
      ),
    );
  }, [supportCalls]);

  const closeWindow = useCallback(
    (winId: string, penalize: boolean) => {
      const win = windowsRef.current.find((w) => w.id === winId);
      if (win?.appKey === "support" && supportActiveRef.current) {
        endSupportSession();
      }
      cancelRaf(winId);
      const hg = hourglassTimers.current.get(winId);
      if (hg != null) {
        timers.current.clearTimeout(hg);
        hourglassTimers.current.delete(winId);
      }
      setWindows((list) => list.map((w) => (w.id === winId ? { ...w, closing: true, running: false, preparing: false } : w)));
      if (penalize) applyHealth(-PENALTY_CANCEL);
      timers.current.timeout(() => {
        setWindows((list) => list.filter((w) => w.id !== winId));
      }, 300);
    },
    [applyHealth, cancelRaf, endSupportSession],
  );


  const activateWindoors = useCallback(
    (segmentOrKey: string) => {
      const raw = segmentOrKey.trim();
      if (!raw) return { ok: false as const, reason: "empty" };

      if (isXpLegendaryKey(raw)) {
        trueOgRef.current = true;
        setTrueOg(true);
        setWindoorsActivated(true);
        setHealthAbs(100);
        setShowConfetti(true);
        setOgBanner(true);
        timers.current.timeout(() => setShowConfetti(false), 6500);
        return { ok: true as const, trueOg: true as const };
      }

      // Anything else with at least 5 chars fills the XXXXX slot
      if (raw.replace(/[^A-Za-z0-9]/g, "").length < 5) {
        return { ok: false as const, reason: "short" };
      }
      setWindoorsActivated(true);
      return { ok: true as const, trueOg: false as const };
    },
    [setHealthAbs],
  );

  const openApp = useCallback(
    (appKey: AppKey) => {
      setWindows((list) => {
        const existing = list.find((w) => w.appKey === appKey && !w.closing);
        if (existing) {
          // Bring to foreground (even if idle / not running a task)
          zSeq.current += 1;
          const z = zSeq.current;
          return list.map((w) => {
            if (w.id !== existing.id) return w;
            let next = { ...w, z };
            if (appKey === "scan" && !definitionsReadyRef.current && !w.running && !w.complete) {
              next = {
                ...next,
                needsUpdateFirst: true,
                phase: "Definitions outdated",
              };
            }
            return next;
          });
        }
        const offset = list.length;
        zSeq.current += 1;

        let needsUpdateFirst = false;
        if (appKey === "scan") {
          const neverUpdated = updateGenerationRef.current === 0;
          const usedThisUpdate =
            updateGenerationRef.current > 0 &&
            lastScanGenerationRef.current >= updateGenerationRef.current;
          const defsStale = !definitionsReadyRef.current;
          const randomExpire =
            !neverUpdated &&
            !usedThisUpdate &&
            definitionsReadyRef.current &&
            lastScanGenerationRef.current >= 0 &&
            Math.random() < 0.5;
          needsUpdateFirst = neverUpdated || defsStale || usedThisUpdate || randomExpire;
          if (needsUpdateFirst) definitionsReadyRef.current = false;
        }

        const forceUpdateCheck = appKey === "update" && Math.random() < 0.55;
        const updateFields =
          appKey === "update" ? emptyUpdateFields(forceUpdateCheck) : emptyUpdateFields(false);

        const pos = computeWindowPos(appKey, offset);
        const win: WindowState = {
          id: nextId(appKey),
          appKey,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          z: zSeq.current,
          closing: false,
          running: false,
          preparing: false,
          complete: false,
          progress: 0,
          phase: needsUpdateFirst
            ? "Definitions outdated"
            : appKey === "update"
              ? forceUpdateCheck
                ? "Check required"
                : "Updates available"
              : "",
          etaMin: 4,
          logLines: [],
          drivers:
            appKey === "drivers"
              ? DRIVER_NAMES.slice(0, 3).map((name) => ({ name, status: "Outdated" }))
              : [],
          defragSeed: 311 + idSeq.current * 17,
          chkdskDrive: "C:",
          chkdskTest: "thorough",
          chkdskAutoFix: true,
          needsUpdateFirst,
          ...updateFields,
        };
        return [...list, win];
      });
      if (appKey === "scan" && !definitionsReadyRef.current) setDefinitionsReady(false);
      setStartOpen(false);
      setSearchOpen(false);
    },
    [nextId],
  );

  const focusWindow = useCallback((winId: string) => {
    zSeq.current += 1;
    const z = zSeq.current;
    setWindows((list) => list.map((w) => (w.id === winId ? { ...w, z } : w)));
  }, []);

  const runUpdateCheck = useCallback((winId: string) => {
    setWindows((list) =>
      list.map((w) =>
        w.id === winId
          ? {
              ...w,
              updateUi: "checking",
              phase: "Checking for updates…",
              progress: 0,
              complete: false,
              running: false,
            }
          : w,
      ),
    );
    const delay = 1400 + Math.random() * 1600;
    timers.current.timeout(() => {
      setWindows((list) =>
        list.map((w) => {
          if (w.id !== winId) return w;
          const scenario = pickUpdateScenario(w.updateScenarioId);
          return {
            ...w,
            ...applyScenario(scenario),
            logLines: [
              `✓ Catalog sync complete · ${scenario.packages.length} updates found`,
              `→ ${scenario.headline}`,
            ],
          };
        }),
      );
    }, delay);
  }, []);

  const startTask = useCallback(
    (winId: string, appKey: AppKey) => {
      // Remote Support uses Call/Finish, not the normal progress task
      if (appKey === "support" || appKey === "browser" || appKey === "settings") return;

      if (appKey === "scan") {
        const canScan =
          definitionsReadyRef.current &&
          updateGenerationRef.current > 0 &&
          lastScanGenerationRef.current < updateGenerationRef.current;
        if (!canScan) {
          definitionsReadyRef.current = false;
          setDefinitionsReady(false);
          setWindows((list) =>
            list.map((w) =>
              w.id === winId
                ? {
                    ...w,
                    needsUpdateFirst: true,
                    running: false,
                    complete: false,
                    progress: 0,
                    phase: "Definitions outdated",
                    logLines: [
                      "✗ Virus & threat definitions are out of date.",
                      "✗ Security scan cannot start.",
                      `→ Run ${PRODUCT_NAME} Update first, then scan again.`,
                    ],
                  }
                : w,
            ),
          );
          return;
        }
      }

      if (appKey === "update") {
        const current = windowsRef.current.find((w) => w.id === winId);
        const canInstall =
          !!current &&
          current.updateUi === "ready" &&
          current.updatePackages.length > 0 &&
          !current.running &&
          !current.complete;
        if (!canInstall) {
          setWindows((list) =>
            list.map((w) =>
              w.id === winId
                ? {
                    ...w,
                    updateUi: w.updateUi === "checking" ? "checking" : "needs-check",
                    phase: "Check required",
                    logLines: [
                      "✗ Update catalog is stale or empty.",
                      "→ Check for updates before installing.",
                    ],
                  }
                : w,
            ),
          );
          return;
        }
      }

      const currentWin = windowsRef.current.find((w) => w.id === winId);
      if (!currentWin || currentWin.running || currentWin.closing) return;

      if (!currentWin.preparing) {
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        setWindows((list) =>
          list.map((w) =>
            w.id === winId
              ? {
                  ...w,
                  preparing: true,
                  phase:
                    appKey === "scan"
                      ? "Preparing to scan…"
                      : appKey === "bios"
                        ? "Entering flash utility…"
                        : appKey === "defrag"
                          ? "Analyzing drive layout…"
                          : appKey === "update"
                            ? "Preparing install…"
                            : "Please wait…",
                }
              : w,
          ),
        );
        const tid = timers.current.timeout(() => startTask(winId, appKey), reduced ? 40 : HOURGLASS_MS);
        hourglassTimers.current.set(winId, tid);
        return;
      }
      hourglassTimers.current.delete(winId);

      const cfg = TASKS[appKey];
      let duration = cfg.duration + (Math.random() * 8000 - 4000);
      if (appKey === "chkdsk") {
        duration *= currentWin?.chkdskTest === "thorough" ? 1.45 : 0.72;
        if (currentWin?.chkdskDrive === "A:") duration *= 1.25;
      }
      const t0 = performance.now();
      taskStart.current.set(winId, { t0, duration });

      setWindows((list) =>
        list.map((w) =>
          w.id === winId
            ? {
                ...w,
                running: true,
                preparing: false,
                complete: false,
                needsUpdateFirst: false,
                progress: 0,
                phase: cfg.phases[0] ?? "",
                etaMin: Math.max(1, Math.ceil(duration / 60000)),
                updateUi: appKey === "update" ? "installing" : w.updateUi,
                updateActivePkg: appKey === "update" ? 0 : w.updateActivePkg,
                logLines:
                  appKey === "scan"
                    ? ["✓ Definitions current — starting scan…"]
                    : appKey === "update"
                      ? w.updatePackages.map((p) => `○ Queued ${p.title}`)
                      : appKey === "chkdsk"
                        ? [
                            `ScanDisk — ${w.chkdskDrive} · ${w.chkdskTest === "thorough" ? "Thorough" : "Standard"} test`,
                            w.chkdskAutoFix
                              ? "○ Automatically fix errors: ON"
                              : "○ Automatically fix errors: OFF",
                            w.chkdskTest === "thorough"
                              ? "○ Includes disk surface scan (classic thorough mode)"
                              : "○ Checking files and folders only",
                          ]
                        : [],
              }
            : w,
        ),
      );
      // Task is running — clear any notification nagging this tool (no penalty)
      setToasts((list) => list.filter((t) => !(t.kind === "task" && t.appKey === appKey)));

      const tick = (now: number) => {
        const meta = taskStart.current.get(winId);
        if (!meta) return;
        const elapsed = now - meta.t0;
        const progress = Math.min(100, (elapsed / meta.duration) * 100);
        const lastEm = lastProgressEmit.current.get(winId) ?? 0;
        if (progress < 100 && now - lastEm < PROGRESS_EMIT_MS) {
          const handle = requestAnimationFrame(tick);
          taskRaf.current.set(winId, handle);
          return;
        }
        lastProgressEmit.current.set(winId, now);
        const phaseCount = Math.max(1, cfg.phases.length);
        const phaseIndex = Math.min(phaseCount - 1, Math.floor((progress / 100) * phaseCount));

        setWindows((list) =>
          list.map((w) => {
            if (w.id !== winId) return w;
            let logLines = w.logLines;
            let drivers = w.drivers;
            let updateActivePkg = w.updateActivePkg;

            if (appKey === "scan" && logLines.length < 10 && Math.random() < 0.08) {
              const file = SCAN_FILES[Math.floor(Math.random() * SCAN_FILES.length)];
              logLines = [...logLines, `✓ Scanned ${file}`];
            }
            if ((appKey === "chkdsk" || appKey === "sfc") && logLines.length < 10 && Math.random() < 0.07) {
              let line: string;
              if (appKey === "chkdsk") {
                const drive = w.chkdskDrive;
                const stages =
                  w.chkdskTest === "thorough"
                    ? [
                        `Checking file allocation table on ${drive}…`,
                        `Verifying folders on ${drive}…`,
                        `Cross-linking check on ${drive}…`,
                        `Surface scan sector ${Math.floor(progress * 41)}…`,
                        w.chkdskAutoFix
                          ? `Auto-fix: recovered lost allocation unit on ${drive}`
                          : `Found lost cluster chain on ${drive} (not fixed)`,
                      ]
                    : [
                        `Checking files on ${drive}…`,
                        `Verifying folders on ${drive}…`,
                        `Directory structure OK on ${drive}`,
                      ];
                line = stages[Math.min(stages.length - 1, logLines.length % stages.length)]!;
              } else {
                line = `Verifying system files… (${Math.floor(progress)}%)`;
              }
              logLines = [...logLines, line];
            }
            if (appKey === "drivers" && drivers.length > 0 && progress > 40) {
              drivers = drivers.map((d, i) =>
                progress > 40 + i * 20
                  ? { ...d, status: progress > 85 ? "Up to date" : "Installing…" }
                  : d,
              );
            }
            if (appKey === "update" && w.updatePackages.length > 0) {
              updateActivePkg = Math.min(
                w.updatePackages.length - 1,
                Math.floor((progress / 100) * w.updatePackages.length),
              );
            }

            return {
              ...w,
              progress,
              phase: cfg.phases[phaseIndex] ?? w.phase,
              etaMin: Math.max(0, Math.ceil((meta.duration - elapsed) / 60000)),
              logLines,
              drivers,
              updateActivePkg,
            };
          }),
        );

        if (progress >= 100) {
          cancelRaf(winId);

          if (appKey === "bios") {
            // Risky SPI flash: chance of fatal stop code
            if (rngRef.current() < BIOS_BSOD_CHANCE) {
              setWindows((list) =>
                list.map((w) =>
                  w.id === winId
                    ? {
                        ...w,
                        running: false,
                        complete: false,
                        progress: 100,
                        phase: "Capsule verification failed",
                      }
                    : w,
                ),
              );
              timers.current.timeout(() => setBsod(true), 700);
              return;
            }
            // Success: firmware applied → cold reboot + lower degradation rate
            const nextLevel = Math.max(1, drainLevelRef.current - 1) as 1 | 2 | 3;
            drainLevelRef.current = nextLevel;
            setDrainLevel(nextLevel);
            for (const id of [...taskRaf.current.keys()]) cancelRaf(id);
            setWindows([]);
            setToasts([]);
            setStartOpen(false);
            setSearchOpen(false);
            setCalendarOpen(false);
            definitionsReadyRef.current = false;
            setDefinitionsReady(false);
            updateGenerationRef.current = 0;
            lastScanGenerationRef.current = -1;
            setHealthAbs(100);
            setBootScreen(true);
            setBooted(false);
            timers.current.timeout(() => {
              setBootScreen(false);
              setBooted(true);
              setToasts((t) => [
                ...t,
                {
                  id: nextId("bios-ok"),
                  kind: "welcome",
                  title: "UEFI capsule applied",
                  body: "Platform firmware F.26 · ACPI _CST / HPET recalibrated · interrupt coalescing tightened. Cold boot complete — thermal trip margins improved under sustained load.",
                },
              ]);
              openApp("scan");
            }, 2600);
            return;
          }

          // Update stays open on "up to date"; every other tool closes after success toast
          if (appKey === "update") {
            setWindows((list) =>
              list.map((w) =>
                w.id === winId
                  ? {
                      ...w,
                      running: false,
                      complete: false,
                      progress: 0,
                      phase: "You're up to date",
                      updateUi: "up-to-date" as const,
                      updateActivePkg: -1,
                      logLines: [],
                    }
                  : w,
              ),
            );
          } else {
            // Close without cancel penalty
            setWindows((list) =>
              list.map((w) =>
                w.id === winId ? { ...w, closing: true, running: false, complete: false } : w,
              ),
            );
            timers.current.timeout(() => {
              setWindows((list) => list.filter((w) => w.id !== winId));
            }, 300);
          }
          applyHealth(HEAL_ON_COMPLETE);
          if (appKey === "update") {
            markDefinitionsFreshFromUpdate();
            // Restart required (separate from BIOS cold boot)
            setUpdateRestartPrompt(true);
          }
          if (appKey === "scan") {
            lastScanGenerationRef.current = updateGenerationRef.current;
            timers.current.timeout(() => {
              if (Math.random() < 0.7) markDefinitionsStale();
            }, 8000 + Math.random() * 12000);
          }
          let successBody = "+24 system health restored";
          if (appKey === "cleanup") {
            const gb = (1.4 + Math.random() * 9.2).toFixed(1);
            const items = Math.floor(400 + Math.random() * 4800);
            successBody = `Freed ${gb} GB of temporary regret (${items} temp objects) · +24 health`;
          } else if (appKey === "update") {
            successBody = "Updates installed · restart required to finish servicing stack";
          }
          const doneId = nextId("done");
          setToasts((t) => [
            ...t.slice(-4),
            {
              id: doneId,
              kind: "success" as const,
              appKey,
              title: `${cfg.name} complete`,
              body: successBody,
            },
          ]);
          timers.current.timeout(() => {
            setToasts((list) =>
              list.map((x) => (x.id === doneId ? { ...x, leaving: true } : x)),
            );
            timers.current.timeout(() => {
              setToasts((list) => list.filter((x) => x.id !== doneId));
            }, 350);
          }, 9000);
          return;
        }

        const handle = requestAnimationFrame(tick);
        taskRaf.current.set(winId, handle);
      };

      const handle = requestAnimationFrame(tick);
      taskRaf.current.set(winId, handle);
    },
    [
      applyHealth,
      cancelRaf,
      markDefinitionsFreshFromUpdate,
      markDefinitionsStale,
      nextId,
      openApp,
      setHealthAbs,
    ],
  );

  useEffect(() => {
    if (bsod || !booted) return;
    const id = timers.current.interval(() => {
      if (healthRef.current <= 0) return;
      // True OG: XP key — health never degrades, always 100%
      if (trueOgRef.current) {
        if (healthRef.current < 100) setHealthAbs(100);
        return;
      }
      if (supportActiveRef.current) return;
      if (useWindoorsStore.getState().remoteSession) return;
      if (useWindoorsStore.getState().sleepMode) return;
      if (document.hidden) return;
      if (performance.now() - lastHealAt.current < 900) return;
      const rate = DRAIN_BY_LEVEL[drainLevelRef.current] + drainBoostRef.current;
      applyHealth(-rate);
    }, 980);
    return () => timers.current.clearInterval(id);
  }, [applyHealth, bsod, booted]);

  useEffect(() => {
    if (bsod || !booted) return;
    let cancelled = false;
    let timer: number;
    const spawn = () => {
      if (cancelled) return;
      // Remote Support = full AFK pause (no new nags until session ends)
      if (supportActiveRef.current || useWindoorsStore.getState().remoteSession || useWindoorsStore.getState().sleepMode || document.hidden) {
        timer = timers.current.timeout(spawn, 2500);
        return;
      }
      // Only tools that are NOT actively running a task (open-but-idle still ok)
      const runningKeys = new Set(
        windowsRef.current.filter((w) => !w.closing && w.running).map((w) => w.appKey),
      );
      // Avoid stacking another toast for the same tool already on screen
      const pendingKeys = new Set(
        toastsRef.current
          .filter((x) => x.kind === "task" && x.appKey && !x.leaving)
          .map((x) => x.appKey!),
      );
      const candidates = APP_KEYS.filter(
        (k) =>
          k !== "support" &&
          k !== "browser" &&
          !runningKeys.has(k) &&
          !pendingKeys.has(k),
      );
      if (candidates.length === 0) {
        timer = timers.current.timeout(spawn, Math.random() * 8000 + 5000);
        return;
      }
      const appKey = candidates[Math.floor(Math.random() * candidates.length)]!;
      const cfg = TASKS[appKey];
      const toastId = nextId("toast");
      setToasts((t) => [...t.slice(-4), { id: toastId, kind: "task", appKey, title: cfg.notifyTitle }]);
      timers.current.timeout(() => {
        setToasts((list) => {
          const still = list.find((x) => x.id === toastId && !x.leaving);
          if (!still) return list;
          return list.map((x) => (x.id === toastId ? { ...x, leaving: true } : x));
        });
        timers.current.timeout(() => {
          setToasts((list) => {
            const had = list.some((x) => x.id === toastId);
            // No ignore penalty while Remote Support pause is active
            if (had && !supportActiveRef.current) applyHealth(-PENALTY_IGNORE_TOAST);
            return list.filter((x) => x.id !== toastId);
          });
        }, 350);
      }, 10500);
      timer = timers.current.timeout(spawn, Math.random() * 15000 + 7000);
    };
    timer = timers.current.timeout(spawn, 4000);
    return () => {
      cancelled = true;
      timers.current.clearTimeout(timer);
    };
  }, [applyHealth, bsod, booted, nextId]);

  useEffect(() => {
    let cancelled = false;
    const { kind, sleep } = useWindoorsStore.getState().hydrate();
    const later = (ms: number, fn: () => void) =>
      timers.current.timeout(() => {
        if (!cancelled) fn();
      }, ms);
    if (kind === "sleep" && sleep) {
      applyBasicSnapshot(sleep);
      setWindows(sleep.windows ?? []);
      zSeq.current = (sleep.windows ?? []).reduce((m, w) => Math.max(m, w.z || 0), 10) + 1;
      later(700, () => {
        setBootScreen(false);
        setBooted(true);
      });
    } else if (kind === "crash") {
      applyBasicSnapshot(useWindoorsStore.getState());
      setWindows([]);
      later(1400, () => {
        setBootScreen(false);
        setBooted(true);
        setUnexpectedOpen(true);
      });
    } else {
      later(2800, () => {
        setBootScreen(false);
        setBooted(true);
      });
      later(4000, () => openApp("scan"));
      later(4800, () => {
        setToasts((t) => [
          ...t,
          {
            id: nextId("welcome"),
            kind: "welcome",
            title: FULL_TITLE,
            body: "Keep System Health above 0. Fix pop-up maintenance tasks before they expire — ignore them and health drops. Cancel a running tool and you lose health too. Survive.",
          },
        ]);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [applyBasicSnapshot, nextId, openApp, setUnexpectedOpen]);

  useEffect(() => {
    const flush = () => {
      if (!booted || useWindoorsStore.getState().sleepMode) return;
      useWindoorsStore.getState().persistBasicNow(collectPersist());
    };
    const id = timers.current.interval(flush, BASIC_SAVE_MS);
    const onVis = () => {
      if (document.hidden) {
        markRemoteSession(true);
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      timers.current.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [booted, collectPersist, markRemoteSession]);

  useEffect(() => {
    return () => {
      for (const handle of taskRaf.current.values()) cancelAnimationFrame(handle);
      taskRaf.current.clear();
      timers.current.clearAll();
    };
  }, []);

  const dismissToast = (id: string, openAppKey?: AppKey) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (openAppKey) openApp(openAppKey);
  };

  const sleepComputer = useCallback(() => {
    const wins = windowsRef.current.filter((w) => !w.closing).map((w) => ({ ...w, running: false, closing: false }));
    for (const id of [...taskRaf.current.keys()]) cancelRaf(id);
    setWindows(wins);
    setToasts([]);
    setStartOpen(false);
    useWindoorsStore.getState().persistSleepNow(collectPersist(), wins);
    setSleepMode(true);
  }, [cancelRaf, collectPersist, setSleepMode]);

  const wakeComputer = useCallback(() => {
    useWindoorsStore.getState().clearSleepSnapshot();
    setSleepMode(false);
    markRemoteSession(false);
    useWindoorsStore.getState().persistBasicNow(collectPersist());
  }, [collectPersist, markRemoteSession, setSleepMode]);



  const performUpdateRestart = useCallback(() => {
    setUpdateRestartPrompt(false);
    for (const id of [...taskRaf.current.keys()]) cancelRaf(id);
    setWindows([]);
    setToasts([]);
    setStartOpen(false);
    setSearchOpen(false);
    setCalendarOpen(false);
    setBatteryOpen(false);
    setActionCenterOpen(false);
    // Random post-update calibration of degradation (improve OR worsen)
    const roll = rngRef.current();
    const calibrated = nextDrainAfterUpdateRestart(drainLevelRef.current, drainBoostRef.current, roll);
    drainLevelRef.current = calibrated.level;
    setDrainLevel(calibrated.level);
    drainBoostRef.current = calibrated.boost;
    setDrainBoost(calibrated.boost);
    const outcome = calibrated.outcome;
    const body =
      outcome === "better"
        ? "Servicing stack rebased power plans (Balanced++). Timer resolution and idle residency improved — background heat-soak drift is lower."
        : "Feature payload re-enabled diagnostic sampling. Additional wake sources registered — passive degradation accelerated under sustained load.";
    const keepHealth = Math.min(100, Math.max(35, healthRef.current));
    setHealthAbs(keepHealth);
    setBootScreen(true);
    setBooted(false);
    timers.current.timeout(() => {
      setBootScreen(false);
      setBooted(true);
      setToasts((t) => [
        ...t,
        {
          id: nextId("upd-rst"),
          kind: "welcome",
          title:
            outcome === "better"
              ? "Update restart complete · stability improved"
              : "Update restart complete · new overhead detected",
          body,
        },
      ]);
    }, 2400);
  }, [cancelRaf, nextId, setHealthAbs]);

  const scheduleUpdateRestartJoke = useCallback(
    (when: "tonight" | "never") => {
      setUpdateRestartPrompt(false);
      const id = nextId("upd-later");
      setToasts((t) => [
        ...t.slice(-4),
        {
          id,
          kind: "info" as const,
          title: when === "tonight" ? "Restart scheduled for tonight" : "Restart deferred",
          body:
            when === "tonight"
              ? "We'll try again at 03:00 (local time may vary across dimensions)."
              : "Noted for three days from never. Servicing stack remains in a Schrödinger state.",
        },
      ]);
      timers.current.timeout(() => {
        setToasts((list) => list.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
        timers.current.timeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 350);
      }, 7000);
    },
    [nextId],
  );

  const restartGame = () => {
    timers.current.clearAll();
    useWindoorsStore.getState().resetSaves();
    rngSeedRef.current = makeSeed();
    rngRef.current = mulberry32(rngSeedRef.current);
    for (const id of [...taskRaf.current.keys()]) cancelRaf(id);
    setWindows([]);
    setToasts([]);
    setStartOpen(false);
    setSearchOpen(false);
    setCalendarOpen(false);
    setBatteryOpen(false);
    setActionCenterOpen(false);
    setUpdateRestartPrompt(false);
    setTelemetryOptOut(false);
    setWindoorsActivated(false);
    setTrueOg(false);
    trueOgRef.current = false;
    setShowConfetti(false);
    setOgBanner(false);
    setBsod(false);
    setHealthAbs(100);
    drainLevelRef.current = 3;
    setDrainLevel(3);
    drainBoostRef.current = 0;
    setDrainBoost(0);
    supportActiveRef.current = false;
    setSupportActive(false);
    setSupportCalls(0);
    definitionsReadyRef.current = false;
    setDefinitionsReady(false);
    updateGenerationRef.current = 0;
    lastScanGenerationRef.current = -1;
    setBootScreen(true);
    setBooted(false);
    timers.current.timeout(() => {
      setBootScreen(false);
      setBooted(true);
      openApp("scan");
    }, 2200);
  };


  // Desktop keyboard: Esc closes menus/window, Enter starts focused tool
  useEffect(() => {
    if (bsod || bootScreen || !booted) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }
      if (e.key === "F1") {
        setAboutOpen(true);
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        if (aboutOpen) {
          setAboutOpen(false);
          e.preventDefault();
          return;
        }
        if (startOpen || searchOpen || calendarOpen || batteryOpen || actionCenterOpen) {
          setStartOpen(false);
          setSearchOpen(false);
          setCalendarOpen(false);
          setBatteryOpen(false);
          setActionCenterOpen(false);
          e.preventDefault();
          return;
        }
        const open = windowsRef.current.filter((w) => !w.closing);
        if (open.length === 0) return;
        const top = open.reduce((a, b) => (a.z >= b.z ? a : b));
        // Esc = Close (no cancel penalty)
        closeWindow(top.id, false);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const open = windowsRef.current.filter((w) => !w.closing);
        if (open.length === 0) return;
        const top = open.reduce((a, b) => (a.z >= b.z ? a : b));
        if (!top.running && !top.preparing && top.appKey !== "support" && top.appKey !== "browser" && top.appKey !== "settings") {
          startTask(top.id, top.appKey);
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    aboutOpen,
    actionCenterOpen,
    batteryOpen,
    bootScreen,
    booted,
    bsod,
    calendarOpen,
    closeWindow,
    searchOpen,
    startOpen,
    startTask,
  ]);

  const tone = healthTone(health);
  const effectiveDrain = DRAIN_BY_LEVEL[drainLevel] + drainBoost;
  const drainChevrons = effectiveDrain >= 0.32 ? 3 : effectiveDrain >= 0.16 ? 2 : 1;
  const drainColor =
    effectiveDrain >= 0.32 ? "text-red-400" : effectiveDrain >= 0.16 ? "text-amber-400" : "text-emerald-400";
  const taskbarKeys: AppKey[] = isMobile ? DOCK_KEYS : APP_KEYS;
  const desktopIconKeys: AppKey[] = isMobile
    ? APP_KEYS.filter((k) => !DOCK_KEYS.includes(k))
    : APP_KEYS;

  persistBag.current = {
    health,
    drainLevel,
    drainBoost,
    supportCalls,
    definitionsReady,
    updateGeneration: updateGenerationRef.current,
    lastScanGeneration: lastScanGenerationRef.current,
    windoorsActivated,
    trueOg,
    volumeLevel,
    wifiOn,
    nightLight,
    wallpaper,
    rngSeed: rngSeedRef.current,
  };

  return (
    <div
      className={`desktop-wallpaper mobile-safe relative h-[100dvh] max-h-[100dvh] w-full touch-manipulation overflow-hidden text-white select-none sm:h-[calc(100dvh-var(--grok-banner-h,0px))] ${nightLight ? "night-light-on" : ""} ${wallpaper === "bliss" ? "wallpaper-bliss" : wallpaper === "teal" ? "wallpaper-teal" : ""}`}
      style={{
        height: "calc(100dvh - var(--grok-banner-h, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onClick={() => {
        setStartOpen(false);
        setSearchOpen(false);
        setCalendarOpen(false);
        setBatteryOpen(false);
        setActionCenterOpen(false);
        setHealthExpanded(false);
      }}
    >
      {bootScreen && (
        <div className="fixed inset-0 z-[8000] flex flex-col items-center justify-center bg-[#0a1628]">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute h-36 w-36 rounded-full opacity-40 blur-3xl sm:h-44 sm:w-44"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(140,180,255,0.12) 45%, transparent 70%)",
              }}
            />
            <WindoorsLogo className="relative h-20 w-20 sm:h-24 sm:w-24" uid={`${logoUid}-boot`} />
          </div>
          <p className="mt-8 text-sm font-medium tracking-wide text-white/90 sm:text-base">{PRODUCT_NAME}</p>
          <div className="mt-10 flex items-center gap-2" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="boot-dot h-2 w-2 rounded-full bg-white/90" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
          </div>
        </div>
      )}

      {sleepMode && !bootScreen && !bsod && (
        <div className="fixed inset-0 z-[8500] flex flex-col items-center justify-center bg-black">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400/80" aria-hidden />
          <p className="mt-8 text-sm font-medium tracking-wide text-white/70">Sleeping</p>
          <p className="mt-2 max-w-xs px-6 text-center text-[11px] text-white/40">
            Session saved. Close the browser or come back anytime — layout will resume.
          </p>
          <button type="button" onClick={(e) => { e.stopPropagation(); wakeComputer(); }} className="mt-8 rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
            Wake
          </button>
        </div>
      )}

      {unexpectedOpen && !bootScreen && !bsod && !sleepMode && (
        <div className="fixed inset-0 z-[88] flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={(e) => e.stopPropagation()} data-focus-trap="true">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1e]" role="dialog" aria-modal="true">
            <div className="border-b border-white/10 bg-amber-600/90 px-5 py-3">
              <p className="text-sm font-semibold">Your PC ran into a problem</p>
            </div>
            <div className="space-y-2 px-5 py-4 text-sm text-white/80">
              <p>The computer was unexpectedly shut down.</p>
              <p className="text-[12px] text-white/50">
                Windoors recovered health, drain, activation and definitions. Open windows were not saved — use Start → Sleep to hibernate the full desktop.
              </p>
            </div>
            <div className="flex justify-end border-t border-white/10 px-4 py-3">
              <button type="button" onClick={() => setUnexpectedOpen(false)} className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold">Continue</button>
            </div>
          </div>
        </div>
      )}

      {remoteSession && !sleepMode && !bootScreen && !bsod && (
        <div className="absolute left-1/2 top-16 z-[46] w-[min(92vw,360px)] -translate-x-1/2 rounded-xl border border-cyan-400/35 bg-[#0b1c24]/95 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-8 sm:top-36 sm:translate-x-0" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-cyan-100">Remote session in progress</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/55">
            Console was backgrounded. Health drain and nags are paused until you take the session back.
          </p>
          <button type="button" onClick={() => markRemoteSession(false)} className="mt-2 rounded-lg bg-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-black">
            Take control
          </button>
        </div>
      )}

      {/* Mobile: always-visible health — tap to expand details */}
      <button
        type="button"
        className={`absolute left-2 right-2 top-2 z-[45] rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-left shadow-xl backdrop-blur-xl sm:hidden ${health <= 40 ? "health-critical" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setHealthExpanded((v) => !v);
        }}
        aria-expanded={healthExpanded}
        aria-label="System health details"
      >
        <div className="flex items-center gap-2">
          <span className="text-base text-red-400" aria-hidden>♥</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold tracking-wider text-white/80">HEALTH</span>
              <div className="flex items-center gap-2">
                {supportActive && (
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300">
                    PAUSED
                  </span>
                )}
                <span className={`font-mono text-lg font-bold leading-none ${tone.color}`}>{Math.floor(health)}</span>
              </div>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${health}%` }} />
            </div>
          </div>
        </div>
        {healthExpanded && (
          <div className="health-expand mt-2 border-t border-white/10 pt-2" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between font-mono text-[11px] ${drainColor}`}>
              <span className="text-white/50">Drain speed</span>
              <span className="flex items-center gap-1">
                <span className="tracking-tighter">{"<".repeat(drainChevrons)}</span>
                {effectiveDrain.toFixed(2)}/s
              </span>
            </div>
            <p className={`mt-1 text-[10px] font-medium ${tone.color}`}>{tone.label}</p>
            <p className={`mt-0.5 text-[10px] ${definitionsReady ? "text-emerald-400/80" : "text-amber-400/80"}`}>
              {definitionsReady ? "Security defs: current" : "Security defs: outdated"}
            </p>
            {supportActive && (
              <p className="mt-1 text-[10px] font-semibold text-cyan-300">Remote support · decay paused</p>
            )}
          </div>
        )}
      </button>

      {/* Desktop icons — mobile: 3-col scroll under health; desktop: classic grid */}
      <div
        className={
          isMobile
            ? "desktop-icon-scroll absolute inset-x-0 top-[4.25rem] bottom-16 z-10 overflow-y-auto px-3 pb-2"
            : "absolute left-3 top-3 sm:left-8 sm:top-8"
        }
      >
        <div
          className={
            isMobile
              ? "grid grid-cols-3 gap-x-2 gap-y-3"
              : "grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-14 sm:gap-y-10"
          }
        >
          {desktopIconKeys.map((key) => {
            const cfg = TASKS[key];
            const status = toolVisualStatus(key, toasts, windows);
            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openApp(key);
                }}
                className={`group flex flex-col items-center text-center transition-transform active:scale-95 focus-visible:outline-none ${
                  isMobile ? "min-h-16 w-full px-1 py-1" : "w-16 hover:scale-110 sm:w-20"
                }`}
              >
                <div
                  className={`${statusRingClass(status)} ${
                    isMobile ? "h-12 w-12" : "h-12 w-12 sm:h-14 sm:w-14"
                  }`}
                >
                  <ToolIcon
                    app={key}
                    uid={`desk-${key}`}
                    className={isMobile ? "h-12 w-12" : "h-12 w-12 sm:h-14 sm:w-14"}
                  />
                </div>
                <p className={`mt-1 font-medium leading-tight drop-shadow-md ${isMobile ? "text-[10px]" : "mt-1.5 text-[10px] sm:mt-2 sm:text-xs"}`}>
                  {isMobile ? cfg.shortName : cfg.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop health card (sm+) — click expands details */}
      <button
        type="button"
        className={`absolute right-3 top-3 z-[45] hidden w-56 rounded-xl border border-white/10 bg-black/55 p-4 text-left shadow-2xl backdrop-blur-2xl sm:right-8 sm:top-8 sm:block sm:w-72 sm:p-5 ${health <= 40 ? "health-critical" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setHealthExpanded((v) => !v);
        }}
        aria-expanded={healthExpanded}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-lg text-red-400 sm:text-xl" aria-hidden>♥</span>
            <span className="text-[10px] font-semibold tracking-widest sm:text-sm">SYSTEM HEALTH</span>
          </div>
          <div className="text-right">
            <div className={`font-mono text-2xl font-bold leading-none sm:text-3xl ${tone.color}`}>
              {Math.floor(health)}
            </div>
            <div
              className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] sm:text-[11px] ${drainColor}`}
              title="Passive degradation rate"
            >
              <span className="tracking-tighter" aria-hidden>
                {"<".repeat(drainChevrons)}
              </span>
              <span className="tabular-nums opacity-90">
                {effectiveDrain.toFixed(2)}
              </span>
              <span className="text-[9px] opacity-50">/s</span>
            </div>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 sm:h-3">
          <div className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-300 ${tone.bar}`} style={{ width: `${health}%` }} />
        </div>
        {healthExpanded ? (
          <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
            <p className={`text-center text-[10px] font-medium sm:text-xs ${tone.color}`}>{tone.label}</p>
            <p className={`text-center text-[9px] sm:text-[10px] ${definitionsReady ? "text-emerald-400/80" : "text-amber-400/80"}`}>
              {definitionsReady ? "Security defs: current" : "Security defs: outdated"}
            </p>
            {supportActive && (
              <p className="text-center text-[10px] font-semibold text-cyan-300">
                Remote support · decay paused
              </p>
            )}
            <p className="text-center text-[9px] text-white/35">Click to collapse</p>
          </div>
        ) : (
          <p className="mt-2 text-center text-[9px] text-white/35">Click for details</p>
        )}
      </button>

      <div className="pointer-events-none absolute inset-0 z-30 pb-14 pt-1">
        {(isMobile
          ? (() => {
              const open = windows.filter((w) => !w.closing);
              if (open.length === 0) return [] as typeof windows;
              const top = open.reduce((a, b) => (a.z >= b.z ? a : b));
              return [top];
            })()
          : windows
        ).map((win) => (
          <AppWindow
            key={win.id}
            win={win}
            isMobileLayout={isMobile}
            onFocus={() => focusWindow(win.id)}
            onMove={(x, y) => setWindows((list) => list.map((w) => (w.id === win.id ? { ...w, x, y } : w)))}
            onCancel={() => closeWindow(win.id, true)}
            onCloseIdle={() => closeWindow(win.id, false)}
            onStart={() => startTask(win.id, win.appKey)}
            onOpenUpdate={() => openApp("update")}
            onCheckUpdates={() => runUpdateCheck(win.id)}
            supportActive={supportActive}
            supportCalls={supportCalls}
            onCallSupport={callSupport}
            onFinishSupport={endSupportSession}
            onPatchWin={(patch) =>
              setWindows((list) => list.map((w) => (w.id === win.id ? { ...w, ...patch } : w)))
            }
            windoorsActivated={windoorsActivated}
            trueOg={trueOg}
            onActivateKey={activateWindoors}
            onAbout={() => setAboutOpen(true)}
            wallpaper={wallpaper}
            nightLight={nightLight}
            volumeLevel={volumeLevel}
            onWallpaper={setWallpaper}
            onNightLight={setNightLight}
            onVolume={setVolumeLevel}
          />
        ))}
      </div>

      {/* Activation watermark — purely coincidental resemblance */}
      {!bootScreen && !bsod && (
        <div
          className="pointer-events-none fixed bottom-[4.25rem] right-2 z-20 max-w-[min(78vw,280px)] select-none text-right sm:bottom-16 sm:right-5"
          aria-label={windoorsActivated ? "Creator credit" : "Activation watermark"}
        >
          <div className="font-[Segoe_UI,system-ui,sans-serif] leading-snug">
            {!windoorsActivated && (
              <>
                <div className="text-[12px] font-normal text-white/45 sm:text-[16px] sm:text-white/50">
                  Activate {PRODUCT_NAME}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openApp("settings");
                  }}
                  className="pointer-events-auto mt-0.5 text-[10px] text-white/35 underline-offset-2 hover:text-white/70 hover:underline sm:text-[13px] sm:text-white/40"
                >
                  Go to Settings to activate {PRODUCT_NAME}.
                </button>
                <div className="mt-1 font-mono text-[9px] tracking-wide text-white/30 sm:text-[11px]">
                  Product Key: {PRODUCT_KEY}
                </div>
              </>
            )}
            {trueOg && (
              <div className="mb-1 text-[11px] font-semibold text-amber-300/90 sm:text-sm">
                True OG · XP forever
              </div>
            )}
            <div className={`text-[10px] font-normal text-white/30 sm:text-[12px] sm:text-white/35 ${windoorsActivated ? "" : "mt-2"}`}>
              Created with GROK AI by
            </div>
            <a
              href="https://x.com/thimothybsirius"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto mt-0.5 inline-block break-all text-[9px] text-white/25 underline-offset-2 transition hover:text-white/70 hover:underline sm:text-[12px] sm:text-white/30"
            >
              <span className="sm:hidden">@thimothybsirius</span>
              <span className="hidden sm:inline">https://x.com/thimothybsirius</span>
            </a>
          </div>
        </div>
      )}

      <div
        className="taskbar-blur fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center border-t border-white/10 px-1 sm:px-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Start (+ search on desktop) */}
        <div className="flex h-full w-11 shrink-0 items-center sm:w-auto sm:gap-0.5">
          <button
            type="button"
            aria-label="Start menu"
            aria-expanded={startOpen}
            aria-controls="windoors-start-menu"
            onClick={() => {
              setStartOpen((v) => !v);
              setSearchOpen(false);
              setCalendarOpen(false);
              setBatteryOpen(false);
              setActionCenterOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all hover:bg-white/10 active:scale-95 sm:h-10 sm:w-10"
          >
            <WindoorsLogo className="h-6 w-6" uid={`${logoUid}-task`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setStartOpen(false);
              setCalendarOpen(false);
              setBatteryOpen(false);
              setActionCenterOpen(false);
            }}
            className="hidden h-9 w-48 items-center rounded-xl bg-white/10 px-4 text-sm transition-all hover:bg-white/20 sm:flex sm:w-72 lg:w-80"
          >
            <Search className="mr-3 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate text-white/70">Search maintenance tools…</span>
          </button>
        </div>

        {/* Center: dock / all apps — never crushed by side trays */}
        <div className="taskbar-apps mx-0.5 flex min-w-0 flex-1 items-center justify-center gap-0 overflow-x-auto sm:mx-1 sm:gap-1">
          {taskbarKeys.map((key) => {
            const cfg = TASKS[key];
            const open = windows.some((w) => w.appKey === key && !w.closing);
            const running = windows.some((w) => w.appKey === key && w.running && !w.closing);
            const needsFix = toasts.some(
              (t) => t.kind === "task" && t.appKey === key && !t.leaving,
            );
            const status = toolVisualStatus(key, toasts, windows);
            return (
              <button
                key={key}
                type="button"
                title={cfg.name}
                aria-label={cfg.name}
                onClick={() => openApp(key)}
                className={`group/tb relative flex h-10 w-9 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-white/10 active:scale-95 sm:h-9 sm:w-9 ${open ? "bg-white/15 ring-1 ring-white/20" : ""}`}
              >
                <span className="taskbar-tip hidden sm:block">{cfg.name}</span>
                <ToolIcon app={key} uid={`tb-${key}`} className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
                {running && (
                  <span className="absolute bottom-0.5 left-1/2 h-0.5 w-3.5 -translate-x-1/2 rounded-full bg-sky-400" />
                )}
                {(needsFix || status === "attention") && !running && (
                  <span
                    className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full sm:right-0.5 sm:top-0.5 sm:h-2 sm:w-2 ${
                      needsFix ? "bg-red-400" : "bg-amber-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right tray */}
        <div className="flex h-full shrink-0 items-center gap-0.5 sm:gap-1 sm:pr-1">
          {/* Desktop system tray */}
          <div className="hidden items-center gap-0.5 text-sm sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80">
              <Wifi className="h-4 w-4" />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80">
              <Volume2 className="h-4 w-4" />
            </span>
            <button
              type="button"
              aria-label="Battery status"
              aria-expanded={batteryOpen}
              onClick={() => {
                setBatteryOpen((v) => !v);
                setStartOpen(false);
                setSearchOpen(false);
                setCalendarOpen(false);
                setActionCenterOpen(false);
              }}
              className={`flex h-9 items-center gap-1 rounded-lg px-2 text-white/90 transition hover:bg-white/10 ${
                batteryOpen ? "bg-white/15" : ""
              }`}
            >
              <BatteryFull className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] font-medium tabular-nums">100%</span>
            </button>
          </div>

          {/* Mobile Action Center trigger */}
          <button
            type="button"
            aria-label="Action Center"
            aria-expanded={actionCenterOpen}
            onClick={() => {
              setActionCenterOpen((v) => !v);
              setStartOpen(false);
              setSearchOpen(false);
              setCalendarOpen(false);
              setBatteryOpen(false);
            }}
            className={`relative flex h-10 items-center gap-1 rounded-lg px-1.5 text-white/90 transition hover:bg-white/10 sm:hidden ${
              actionCenterOpen ? "bg-white/15" : ""
            }`}
          >
            <Wifi className={`h-3.5 w-3.5 ${wifiOn ? "text-sky-300" : "text-white/35"}`} />
            <Volume2 className="h-3.5 w-3.5 text-white/70" />
            <BatteryFull className="h-3.5 w-3.5 text-emerald-400" />
            <ChevronUp className={`h-3.5 w-3.5 transition ${actionCenterOpen ? "rotate-180" : ""}`} />
            {toasts.some((t) => t.kind === "success" && !t.leaving) && (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setActionCenterOpen((v) => !v);
                setStartOpen(false);
                setBatteryOpen(false);
              } else {
                setCalendarOpen((v) => !v);
                setStartOpen(false);
                setSearchOpen(false);
                setBatteryOpen(false);
                setActionCenterOpen(false);
              }
            }}
            className="hidden min-h-0 text-right leading-none sm:block sm:min-w-[2.75rem]"
          >
            <div className="text-[11px] font-medium sm:text-sm">{clock.time}</div>
            <div className="text-[9px] text-white/60 sm:text-[10px]">{clock.date}</div>
          </button>
          <div className="hidden h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/20 sm:flex">
            <div className={`text-[10px] font-bold ${tone.color}`}>{Math.floor(health)}</div>
          </div>
        </div>
      </div>


      {/* Mobile Action Center — quick settings + battery + notifications */}
      {actionCenterOpen && isMobile && (
        <div
          className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-[76] max-h-[min(72dvh,560px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1c]/96 p-3 shadow-2xl backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-semibold">{clock.time}</p>
              <p className="text-[11px] text-white/50">{clock.date}, 2026</p>
            </div>
            <button
              type="button"
              aria-label="Close Action Center"
              onClick={() => setActionCenterOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick tiles — Win11 style */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setWifiOn((v) => !v)}
              className={`flex flex-col items-start rounded-xl p-3 text-left transition ${
                wifiOn ? "bg-sky-500 text-white" : "bg-white/10 text-white/70"
              }`}
            >
              <Wifi className="h-5 w-5" />
              <span className="mt-2 text-[11px] font-medium">CyberNet</span>
              <span className="text-[10px] opacity-80">{wifiOn ? "Connected" : "Off"}</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-start rounded-xl bg-white/10 p-3 text-left text-white/70"
            >
              <Bluetooth className="h-5 w-5" />
              <span className="mt-2 text-[11px] font-medium">Bluetooth</span>
              <span className="text-[10px] opacity-80">Not connected</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-start rounded-xl bg-white/10 p-3 text-left text-white/50"
            >
              <Plane className="h-5 w-5" />
              <span className="mt-2 text-[11px] font-medium">Airplane</span>
              <span className="text-[10px] opacity-80">Off</span>
            </button>
            <button
              type="button"
              onClick={() => setNightLight((v) => !v)}
              className={`flex flex-col items-start rounded-xl p-3 text-left transition ${
                nightLight ? "bg-sky-500 text-white" : "bg-white/10 text-white/70"
              }`}
            >
              <span className="text-base leading-none" aria-hidden>☾</span>
              <span className="mt-2 text-[11px] font-medium">Night light</span>
              <span className="text-[10px] opacity-80">{nightLight ? "On" : "Off"}</span>
            </button>
            <button
              type="button"
              className="col-span-2 flex flex-col items-start rounded-xl bg-emerald-500/20 p-3 text-left text-emerald-200"
            >
              <BatteryFull className="h-5 w-5 text-emerald-400" />
              <span className="mt-2 text-[11px] font-medium">Battery 100%</span>
              <span className="text-[10px] text-emerald-200/70">Plugged in · health 42%</span>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <Volume2 className="h-4 w-4 shrink-0 text-white/70" />
            <input
              type="range"
              min={0}
              max={100}
              value={volumeLevel}
              onChange={(e) => setVolumeLevel(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-sky-400"
              aria-label="Volume"
            />
            <span className="w-8 text-right font-mono text-[10px] text-white/50">{volumeLevel}</span>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[11px] leading-relaxed text-white/70">
              Charged to 100% for over <span className="font-semibold text-white">3369 days</span>.
              Battery health is <span className="font-semibold text-amber-300">42%</span>.
            </p>
            <p className="mt-1 text-[10px] text-white/40">Estimated remaining: forever* (AC adapter)</p>
          </div>

          <div className="mt-3">
            <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Completions
            </p>
            {toasts.filter((t) => t.kind === "success" && !t.leaving).length === 0 ? (
              <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-white/40">
                No completed tasks yet
              </p>
            ) : (
              <div className="space-y-2">
                {toasts
                  .filter((t) => t.kind === "success" && !t.leaving)
                  .map((toast) => (
                    <div
                      key={toast.id}
                      className="flex gap-2 rounded-xl border border-emerald-400/25 bg-emerald-950/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-emerald-200">{toast.title}</p>
                        <p className="mt-0.5 text-[11px] text-white/55">
                          {toast.body || "Task finished successfully"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          dismissToast(toast.id, toast.appKey);
                          setActionCenterOpen(false);
                        }}
                        className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1.5 text-[10px] font-semibold text-black"
                      >
                        OPEN
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {batteryOpen && !isMobile && (
        <div
          className="fixed bottom-[4.25rem] right-2 z-[75] w-[min(100vw-1rem,300px)] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 shadow-2xl backdrop-blur-xl sm:bottom-16 sm:right-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-white/10 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
                <BatteryFull className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight">100%</span>
                  <span className="text-xs font-medium text-emerald-400">Plugged in</span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/50">System battery · Windoors Power</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <div>
              <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-emerald-400" />
              </div>
              <p className="text-[12px] leading-relaxed text-white/75">
                Charged to 100% for over <span className="font-semibold text-white">3369 days</span>.
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
                Battery health is <span className="font-semibold text-amber-300">42%</span>.
                <span className="text-white/45"> Chemistry still reports full charge — please do not ask how.</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] text-white/50">
              Estimated time remaining: forever* (AC adapter detected)
            </div>
          </div>
        </div>
      )}

      {startOpen && (
        <div id="windoors-start-menu" data-focus-trap="true" className="fixed bottom-[4.25rem] left-2 right-2 z-[70] max-h-[min(70dvh,520px)] overflow-hidden overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/98 shadow-2xl backdrop-blur-3xl sm:bottom-16 sm:left-4 sm:right-auto sm:w-[min(100vw-1rem,460px)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4 border-b border-white/10 bg-zinc-950/60 px-5 py-4 sm:px-6 sm:py-5">
            <WindoorsLogo className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" uid={`${logoUid}-start`} />
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight sm:text-lg">{PRODUCT_NAME}</div>
              <div className="text-xs text-white/55 sm:text-sm">Version {VERSION} · Caretaker</div>
            </div>
            <button
              type="button"
              onClick={() => { setStartOpen(false); setAboutOpen(true); }}
              className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
            >
              About
            </button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="mb-3 pl-1 text-xs uppercase tracking-widest text-white/50">Pinned</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
              {APP_KEYS.map((key) => {
                const cfg = TASKS[key];
                return (
                  <button key={key} type="button" onClick={() => openApp(key)} className="flex flex-col items-center rounded-2xl bg-zinc-800/80 p-3 transition-all hover:bg-zinc-700 active:scale-95 sm:p-4">
                    <ToolIcon app={key} uid={`start-${key}`} className="mb-2 h-10 w-10 sm:h-11 sm:w-11" />
                    <span className="text-[10px] sm:text-xs">{cfg.shortName}</span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 accent-sky-400"
                checked={telemetryOptOut}
                onChange={(e) => setTelemetryOptOut(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-white/85">
                  Optional diagnostic data
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-white/45">
                  Uncheck to opt out of sending typing cadence, window focus entropy, and
                  ambient regret metrics to Megahard*. (*Purely coincidental name.)
                </span>
                {telemetryOptOut && (
                  <span className="mt-1 block text-[10px] text-amber-300/90">
                    Preference saved… applying policy…
                  </span>
                )}
              </span>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setStartOpen(false); sleepComputer(); }} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10">
                <Moon className="h-3.5 w-3.5" />
                Sleep
              </button>
              <button type="button" onClick={() => { if (window.confirm("Reset this PC? Starts a new game and erases Sleep snapshots.")) { setStartOpen(false); restartGame(); } }} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-950/40 px-3 py-2.5 text-xs font-medium text-red-200 hover:bg-red-900/50">
                <Power className="h-3.5 w-3.5" />
                Reset PC
              </button>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed bottom-16 left-2 z-50 w-[min(100vw-1rem,360px)] rounded-xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-3xl sm:left-16" onClick={(e) => e.stopPropagation()}>
          <p className="mb-3 text-sm text-white/70">Only maintenance tools work here.</p>
          <div className="space-y-1">
            {APP_KEYS.map((key) => {
              const cfg = TASKS[key];
              return (
                <button key={key} type="button" onClick={() => openApp(key)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">
                  <ToolIcon app={key} uid={`search-${key}`} className="h-6 w-6" />
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {aboutOpen && !bootScreen && !bsod && (
        <AboutDialog onClose={() => setAboutOpen(false)} />
      )}

      {calendarOpen && (
        <div className="fixed bottom-16 right-2 z-50 w-64 rounded-xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-3xl sm:right-6" onClick={(e) => e.stopPropagation()}>
          <p className="text-lg font-semibold">{clock.date}, 2026</p>
          <p className="mt-2 text-sm text-white/70">{PRODUCT_NAME} {VERSION} — August updates use the 08-2026 catalog prefix.</p>
        </div>
      )}

      <div
        className="toast-stack pointer-events-none fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-[80] flex flex-col-reverse gap-2 sm:bottom-16 sm:left-auto sm:right-6 sm:w-80 sm:max-w-[calc(100vw-1.5rem)] sm:gap-2.5"
      >
        {toasts
          .filter((toast) => {
            // Mobile: only urgent task / welcome popups; success stays in Action Center
            if (isMobile && toast.kind === "success") return false;
            return true;
          })
          .map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
              onFix={() => dismissToast(toast.id, toast.appKey)}
            />
          ))}
      </div>


      {/* XP confetti + True OG banner */}
      {showConfetti && (
        <div className="confetti-layer pointer-events-none fixed inset-0 z-[95]" aria-hidden>
          {Array.from({ length: 48 }, (_, i) => (
            <span key={i} className="confetti-piece" style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
      )}
      {ogBanner && (
        <div className="pointer-events-none fixed inset-x-0 top-[18%] z-[96] flex justify-center px-4">
          <div className="og-banner rounded-xl border border-amber-300/40 bg-black/75 px-6 py-4 text-center shadow-2xl backdrop-blur-md sm:px-10 sm:py-5">
            <p className="text-2xl font-bold tracking-tight text-amber-300 sm:text-4xl">You are True OG</p>
            <p className="mt-2 text-sm text-white/80 sm:text-base">Your XP just +++</p>
            <p className="mt-1 text-[11px] text-white/50">Health locked at 100% · degradation disabled</p>
          </div>
        </div>
      )}

      {/* Windoors Update — Restart required (BIOS uses separate cold-boot path) */}
      {updateRestartPrompt && !bsod && !bootScreen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1e]/98 shadow-2xl"
            role="dialog"
            aria-labelledby="restart-required-title"
          >
            <div className="border-b border-white/10 bg-sky-600/90 px-5 py-3">
              <p id="restart-required-title" className="text-sm font-semibold text-white">
                Restart required
              </p>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-white/80">
              <p>
                One or more updates need a restart to finish installing. Until then, some
                features may feel slightly theoretical.
              </p>
              <p className="text-[11px] text-white/45">
                Post-restart calibration may raise or lower background degradation — results
                vary by servicing stack mood.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => scheduleUpdateRestartJoke("never")}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-medium text-white/60 hover:bg-white/5"
              >
                Three days from never
              </button>
              <button
                type="button"
                onClick={() => scheduleUpdateRestartJoke("tonight")}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10"
              >
                Tonight
              </button>
              <button
                type="button"
                onClick={performUpdateRestart}
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-400"
              >
                Restart now
              </button>
            </div>
          </div>
        </div>
      )}

      {bsod && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-center overflow-y-auto bg-[var(--color-bsod)] px-6 py-10 text-white sm:px-16 md:px-24">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-6 text-6xl font-light sm:mb-8 sm:text-8xl" aria-hidden>
              :(
            </div>
            <h1 className="mb-4 text-xl font-normal leading-snug sm:text-3xl">
              Your PC ran into a problem and needs to restart.
            </h1>
            <p className="mb-2 font-mono text-[11px] text-white/45">
              Debug seed {formatSeed(rngSeedRef.current)}
            </p>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              You ignored too many maintenance tasks. Health reached 0% on {PRODUCT_NAME}{" "}
              {VERSION}. We're just collecting some error info, and then you can restart.
            </p>

            <button
              type="button"
              onClick={restartGame}
              className="mb-10 rounded-md bg-white px-8 py-3 text-base font-semibold text-[var(--color-bsod)] transition active:scale-[0.98] sm:px-10 sm:py-3.5 sm:text-lg"
            >
              RESTART PC
            </button>

            {/* Windows-style stop-code / credit row */}
            <a
              href={CREATOR_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex max-w-xl items-start gap-4 rounded-sm text-left outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60 sm:gap-5"
            >
              <div className="shrink-0 bg-white p-1.5 shadow-sm sm:p-2">
                <img
                  src={qrXProfile}
                  alt="QR code linking to creator X profile"
                  width={104}
                  height={104}
                  className="h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]"
                  draggable={false}
                />
              </div>
              <div className="min-w-0 pt-0.5 text-[12px] leading-relaxed text-white/95 sm:text-[15px] sm:leading-7">
                <p>
                  Created with GROK AI by{" "}
                  <span className="underline decoration-white/40 underline-offset-2 group-hover:decoration-white">
                    x.com/thimothybsirius
                  </span>
                </p>
                <p className="mt-2 text-white/85">
                  For more games and possible fixes, visit the creator profile.
                </p>
                <p className="mt-3 text-white/80">If you call a support person, give them this info:</p>
                <p className="mt-1 font-medium tracking-wide">
                  Stop code: CRITICAL_PROCESS_DIED
                </p>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}



