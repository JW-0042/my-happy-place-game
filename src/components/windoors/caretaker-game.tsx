import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BatteryFull,
  Check,
  Download,
  RefreshCw,
  Search,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import {
  APP_KEYS,
  BIOS_BSOD_CHANCE,
  COLOR_STYLES,
  DRAIN_BY_LEVEL,
  FULL_TITLE,
  PRODUCT_NAME,
  TASKS,
  VERSION,
  type AppKey,
} from "@/lib/windoors/config";
import { DefragMap } from "@/components/windoors/defrag-map";
import {
  kindLabel,
  pickUpdateScenario,
  type UpdatePackage,
  type UpdateScenario,
} from "@/lib/windoors/updates";

type UpdateUiPhase = "needs-check" | "checking" | "ready" | "installing" | "complete";

type WindowState = {
  id: string;
  appKey: AppKey;
  x: number;
  y: number;
  z: number;
  closing: boolean;
  running: boolean;
  complete: boolean;
  progress: number;
  phase: string;
  etaMin: number;
  logLines: string[];
  drivers: { name: string; status: string }[];
  defragSeed: number;
  needsUpdateFirst: boolean;
  updateUi: UpdateUiPhase;
  updateScenarioId: string | null;
  updateHeadline: string;
  updateTotalSize: string;
  updatePackages: UpdatePackage[];
  updateActivePkg: number;
};

type Toast = {
  id: string;
  kind: "task" | "welcome" | "info";
  appKey?: AppKey;
  title: string;
  body?: string;
  leaving?: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SCAN_FILES = ["ntdll.dll", "temp.tmp", "registry.key", "explorer.exe", "kernel32.dll", "bootmgr"];
const DRIVER_NAMES = ["GPU adapter", "Audio HD", "Chipset ACPI", "Network WLAN", "USB xHCI"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function healthTone(health: number) {
  if (health > 75) return { label: "OPTIMAL", color: "text-emerald-400", bar: "from-emerald-400 to-cyan-400" };
  if (health > 40) return { label: "NEEDS ATTENTION", color: "text-amber-400", bar: "from-amber-400 to-orange-400" };
  return { label: "CRITICAL", color: "text-red-400", bar: "from-red-500 to-rose-400" };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, "0");
  return {
    time: `${hours}:${mins}`,
    date: `${MONTHS[now.getMonth()]} ${now.getDate()}`,
  };
}

function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return narrow;
}

function emptyUpdateFields(forceCheck: boolean): Pick<
  WindowState,
  | "updateUi"
  | "updateScenarioId"
  | "updateHeadline"
  | "updateTotalSize"
  | "updatePackages"
  | "updateActivePkg"
> {
  if (forceCheck) {
    return {
      updateUi: "needs-check",
      updateScenarioId: null,
      updateHeadline: "",
      updateTotalSize: "—",
      updatePackages: [],
      updateActivePkg: -1,
    };
  }
  const scenario = pickUpdateScenario();
  return {
    updateUi: "ready",
    updateScenarioId: scenario.id,
    updateHeadline: scenario.headline,
    updateTotalSize: scenario.totalSize,
    updatePackages: scenario.packages,
    updateActivePkg: -1,
  };
}

function applyScenario(
  scenario: UpdateScenario,
): Pick<
  WindowState,
  | "updateUi"
  | "updateScenarioId"
  | "updateHeadline"
  | "updateTotalSize"
  | "updatePackages"
  | "updateActivePkg"
  | "phase"
> {
  return {
    updateUi: "ready",
    updateScenarioId: scenario.id,
    updateHeadline: scenario.headline,
    updateTotalSize: scenario.totalSize,
    updatePackages: scenario.packages,
    updateActivePkg: -1,
    phase: "Updates available",
  };
}

function WindoorsLogo({ className, uid = "wd" }: { className?: string; uid?: string }) {
  const gap = 1.15;
  const paneW = 9.4;
  const paneH = 6.55;
  const left = 2.05;
  const top = 1.7;
  const rx = 1.15;
  const panes: { x: number; y: number; fill: string }[] = [];
  const opacities = [
    [0.98, 0.88],
    [0.9, 0.78],
    [0.8, 0.68],
  ];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 3; row++) {
      panes.push({
        x: left + col * (paneW + gap),
        y: top + row * (paneH + gap),
        fill: `url(#${uid}-pane-${col}-${row})`,
      });
    }
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.55" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {([0, 1] as const).flatMap((col) =>
          ([0, 1, 2] as const).map((row) => {
            const o = opacities[row][col];
            const o2 = Math.max(0.45, o - 0.18);
            return (
              <linearGradient
                key={`${col}-${row}`}
                id={`${uid}-pane-${col}-${row}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={o} />
                <stop offset="55%" stopColor="#f2f6ff" stopOpacity={(o + o2) / 2} />
                <stop offset="100%" stopColor="#d8e4f8" stopOpacity={o2} />
              </linearGradient>
            );
          }),
        )}
      </defs>
      <g filter={`url(#${uid}-glow)`}>
        {panes.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={paneW} height={paneH} rx={rx} ry={rx} fill={p.fill} />
        ))}
      </g>
    </svg>
  );
}

export function CaretakerGame() {
  const reactId = useId();
  const idSeq = useRef(0);
  const zSeq = useRef(10);
  const healthRef = useRef(100);
  const taskRaf = useRef<Map<string, number>>(new Map());
  const taskStart = useRef<Map<string, { t0: number; duration: number }>>(new Map());
  const logoUid = reactId.replace(/:/g, "");
  const definitionsReadyRef = useRef(false);
  const [definitionsReady, setDefinitionsReady] = useState(false);
  const updateGenerationRef = useRef(0);
  const lastScanGenerationRef = useRef(-1);
  const [health, setHealth] = useState(100);
  /** 3 = fastest decay, 1 = slowest (after successful BIOS flash). */
  const [drainLevel, setDrainLevel] = useState<1 | 2 | 3>(3);
  const drainLevelRef = useRef<1 | 2 | 3>(3);
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
  const [booted, setBooted] = useState(false);
  const [bootScreen, setBootScreen] = useState(true);
  const isMobile = useIsNarrow(640);
  const clock = useClock();

  const nextId = useCallback(
    (prefix: string) => {
      idSeq.current += 1;
      return `${prefix}-${reactId.replace(/:/g, "")}-${idSeq.current}`;
    },
    [reactId],
  );

  const applyHealth = useCallback((delta: number) => {
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

  const closeWindow = useCallback(
    (winId: string, penalize: boolean) => {
      cancelRaf(winId);
      setWindows((list) => list.map((w) => (w.id === winId ? { ...w, closing: true, running: false } : w)));
      if (penalize) applyHealth(-14);
      window.setTimeout(() => {
        setWindows((list) => list.filter((w) => w.id !== winId));
      }, 300);
    },
    [applyHealth, cancelRaf],
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

        const win: WindowState = {
          id: nextId(appKey),
          appKey,
          x: 80 + offset * 36,
          y: 56 + offset * 32,
          z: zSeq.current,
          closing: false,
          running: false,
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
    window.setTimeout(() => {
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

      const cfg = TASKS[appKey];
      const duration = cfg.duration + (Math.random() * 8000 - 4000);
      const t0 = performance.now();
      taskStart.current.set(winId, { t0, duration });

      setWindows((list) =>
        list.map((w) =>
          w.id === winId
            ? {
                ...w,
                running: true,
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
            if ((appKey === "chkdsk" || appKey === "sfc") && logLines.length < 8 && Math.random() < 0.06) {
              const line =
                appKey === "chkdsk"
                  ? `Stage ${logLines.length + 1}: verifying allocation units…`
                  : `Verifying system files… (${Math.floor(progress)}%)`;
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
            if (Math.random() < BIOS_BSOD_CHANCE) {
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
              window.setTimeout(() => setBsod(true), 700);
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
            window.setTimeout(() => {
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

          setWindows((list) =>
            list.map((w) =>
              w.id === winId
                ? {
                    ...w,
                    running: false,
                    complete: true,
                    progress: 100,
                    phase: "Complete",
                    updateUi: appKey === "update" ? "complete" : w.updateUi,
                    updateActivePkg:
                      appKey === "update" ? Math.max(0, w.updatePackages.length - 1) : w.updateActivePkg,
                  }
                : w,
            ),
          );
          applyHealth(24);
          if (appKey === "update") markDefinitionsFreshFromUpdate();
          if (appKey === "scan") {
            lastScanGenerationRef.current = updateGenerationRef.current;
            window.setTimeout(() => {
              if (Math.random() < 0.7) markDefinitionsStale();
            }, 8000 + Math.random() * 12000);
          }
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
    const id = window.setInterval(() => {
      if (healthRef.current <= 0) return;
      const rate = DRAIN_BY_LEVEL[drainLevelRef.current];
      applyHealth(-rate);
    }, 980);
    return () => window.clearInterval(id);
  }, [applyHealth, bsod, booted]);

  useEffect(() => {
    if (bsod || !booted) return;
    let cancelled = false;
    let timer: number;
    const spawn = () => {
      if (cancelled) return;
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
      const candidates = APP_KEYS.filter((k) => !runningKeys.has(k) && !pendingKeys.has(k));
      if (candidates.length === 0) {
        timer = window.setTimeout(spawn, Math.random() * 8000 + 5000);
        return;
      }
      const appKey = candidates[Math.floor(Math.random() * candidates.length)]!;
      const cfg = TASKS[appKey];
      const toastId = nextId("toast");
      setToasts((t) => [...t.slice(-4), { id: toastId, kind: "task", appKey, title: cfg.notifyTitle }]);
      window.setTimeout(() => {
        setToasts((list) => {
          const still = list.find((x) => x.id === toastId && !x.leaving);
          if (!still) return list;
          return list.map((x) => (x.id === toastId ? { ...x, leaving: true } : x));
        });
        window.setTimeout(() => {
          setToasts((list) => {
            const had = list.some((x) => x.id === toastId);
            if (had) applyHealth(-11);
            return list.filter((x) => x.id !== toastId);
          });
        }, 350);
      }, 10500);
      timer = window.setTimeout(spawn, Math.random() * 15000 + 7000);
    };
    timer = window.setTimeout(spawn, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [applyHealth, bsod, booted, nextId]);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      setBootScreen(false);
      setBooted(true);
    }, 2800);
    const t1 = window.setTimeout(() => openApp("scan"), 4000);
    const t2 = window.setTimeout(() => {
      setToasts((t) => [
        ...t,
        {
          id: nextId("welcome"),
          kind: "welcome",
          title: FULL_TITLE,
          body: "Keep System Health above 0. Fix pop-up maintenance tasks before they expire — ignore them and health drops. Cancel a running tool and you lose health too. Survive.",
        },
      ]);
    }, 4800);
    return () => {
      window.clearTimeout(bootTimer);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      for (const handle of taskRaf.current.values()) cancelAnimationFrame(handle);
      taskRaf.current.clear();
    };
  }, []);

  const dismissToast = (id: string, openAppKey?: AppKey) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (openAppKey) openApp(openAppKey);
  };

  const restartGame = () => {
    for (const id of [...taskRaf.current.keys()]) cancelRaf(id);
    setWindows([]);
    setToasts([]);
    setStartOpen(false);
    setSearchOpen(false);
    setCalendarOpen(false);
    setBsod(false);
    setHealthAbs(100);
    drainLevelRef.current = 3;
    setDrainLevel(3);
    definitionsReadyRef.current = false;
    setDefinitionsReady(false);
    updateGenerationRef.current = 0;
    lastScanGenerationRef.current = -1;
    setBootScreen(true);
    setBooted(false);
    window.setTimeout(() => {
      setBootScreen(false);
      setBooted(true);
      openApp("scan");
    }, 2200);
  };

  const tone = healthTone(health);

  return (
    <div
      className="desktop-wallpaper relative h-[calc(100dvh-var(--grok-banner-h,0px))] w-full overflow-hidden text-white select-none"
      onClick={() => {
        setStartOpen(false);
        setSearchOpen(false);
        setCalendarOpen(false);
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

      <div className="absolute left-3 top-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:left-8 sm:top-8 sm:gap-x-14 sm:gap-y-10">
        {APP_KEYS.map((key) => {
          const cfg = TASKS[key];
          const Icon = cfg.icon;
          const styles = COLOR_STYLES[cfg.color];
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openApp(key);
              }}
              className="group flex w-16 flex-col items-center text-center transition-transform hover:scale-110 active:scale-95 sm:w-20"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner sm:h-14 sm:w-14 ${styles.badgeBg}`}>
                <Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={2.2} />
              </div>
              <p className="mt-1.5 text-[10px] font-medium leading-tight drop-shadow-md sm:mt-2 sm:text-xs">{cfg.name}</p>
            </button>
          );
        })}
      </div>

      <div
        className={`absolute right-3 top-3 w-56 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-2xl sm:right-8 sm:top-8 sm:w-72 sm:p-5 ${health <= 40 ? "health-critical" : ""}`}
        onClick={(e) => e.stopPropagation()}
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
              className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] sm:text-[11px] ${
                drainLevel === 3
                  ? "text-red-400"
                  : drainLevel === 2
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
              title="Passive degradation rate"
            >
              <span className="tracking-tighter" aria-hidden>
                {"<".repeat(drainLevel)}
              </span>
              <span className="tabular-nums opacity-90">
                {DRAIN_BY_LEVEL[drainLevel].toFixed(2)}
              </span>
              <span className="text-[9px] opacity-50">/s</span>
            </div>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-3xl bg-white/10 sm:h-3">
          <div className={`h-full rounded-3xl bg-gradient-to-r transition-[width] duration-300 ${tone.bar}`} style={{ width: `${health}%` }} />
        </div>
        <p className={`mt-2 text-center text-[10px] font-medium sm:text-xs ${tone.color}`}>{tone.label}</p>
        <p className={`mt-1 text-center text-[9px] sm:text-[10px] ${definitionsReady ? "text-emerald-400/80" : "text-amber-400/80"}`}>
          {definitionsReady ? "Security defs: current" : "Security defs: outdated"}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0 pb-14 pt-1">
        {windows.map((win) => (
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
          />
        ))}
      </div>

      {/* Windows-style activation watermark (bottom-right, above taskbar) */}
      {!bootScreen && !bsod && (
        <div
          className="pointer-events-none fixed bottom-[3.75rem] right-3 z-30 max-w-[min(90vw,280px)] select-none text-right sm:bottom-16 sm:right-5"
          aria-label="Creator credit"
        >
          <div className="font-[Segoe_UI,system-ui,sans-serif] leading-snug">
            <div className="text-[13px] font-normal text-white/45 sm:text-[15px]">
              Created with GROK AI by
            </div>
            <a
              href="https://x.com/thimothybsirius"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto mt-0.5 inline-block text-[12px] text-white/35 underline-offset-2 transition hover:text-white/70 hover:underline sm:text-[13px]"
            >
              https://x.com/thimothybsirius
            </a>
          </div>
        </div>
      )}

      <div className="taskbar-blur fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center border-t border-white/10 px-2 sm:px-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-full items-center gap-1">
          <button
            type="button"
            aria-label="Start menu"
            onClick={() => {
              setStartOpen((v) => !v);
              setSearchOpen(false);
              setCalendarOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white transition-all hover:bg-white/10 active:scale-95"
          >
            <WindoorsLogo className="h-6 w-6" uid={`${logoUid}-task`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setStartOpen(false);
              setCalendarOpen(false);
            }}
            className="hidden h-9 w-48 items-center rounded-3xl bg-white/10 px-4 text-sm transition-all hover:bg-white/20 sm:flex sm:w-72 lg:w-80"
          >
            <Search className="mr-3 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate text-white/70">Search maintenance tools…</span>
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 sm:gap-1">
          {APP_KEYS.map((key) => {
            const cfg = TASKS[key];
            const Icon = cfg.icon;
            const open = windows.some((w) => w.appKey === key && !w.closing);
            return (
              <button
                key={key}
                type="button"
                title={cfg.name}
                aria-label={cfg.name}
                onClick={() => openApp(key)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-all hover:bg-white/10 active:scale-95 ${open ? "bg-white/15 ring-1 ring-white/20" : ""}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pr-1 sm:gap-4 sm:pr-4">
          <div className="hidden items-center gap-3 text-sm sm:flex">
            <Wifi className="h-4 w-4" />
            <Volume2 className="h-4 w-4" />
            <BatteryFull className="h-4 w-4" />
          </div>
          <button
            type="button"
            onClick={() => {
              setCalendarOpen((v) => !v);
              setStartOpen(false);
              setSearchOpen(false);
            }}
            className="text-right leading-none"
          >
            <div className="text-xs font-medium sm:text-sm">{clock.time}</div>
            <div className="text-[10px] text-white/60">{clock.date}</div>
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-2xl bg-emerald-400/20">
            <div className={`text-[10px] font-bold ${tone.color}`}>{Math.floor(health)}</div>
          </div>
        </div>
      </div>

      {startOpen && (
        <div className="fixed bottom-16 left-2 z-50 w-[min(100vw-1rem,460px)] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-3xl sm:left-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4 border-b border-white/10 bg-zinc-950/60 px-5 py-4 sm:px-6 sm:py-5">
            <WindoorsLogo className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" uid={`${logoUid}-start`} />
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight sm:text-lg">{PRODUCT_NAME}</div>
              <div className="text-xs text-white/55 sm:text-sm">Version {VERSION} · Caretaker</div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="mb-3 pl-1 text-xs uppercase tracking-widest text-white/50">Pinned</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
              {APP_KEYS.map((key) => {
                const cfg = TASKS[key];
                const Icon = cfg.icon;
                const styles = COLOR_STYLES[cfg.color];
                return (
                  <button key={key} type="button" onClick={() => openApp(key)} className="flex flex-col items-center rounded-2xl bg-zinc-800 p-3 transition-all hover:bg-zinc-700 active:scale-95 sm:p-4">
                    <Icon className={`mb-2 h-8 w-8 sm:h-9 sm:w-9 ${styles.icon}`} />
                    <span className="text-[10px] sm:text-xs">{cfg.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed bottom-16 left-2 z-50 w-[min(100vw-1rem,360px)] rounded-3xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-3xl sm:left-16" onClick={(e) => e.stopPropagation()}>
          <p className="mb-3 text-sm text-white/70">Only maintenance tools work here.</p>
          <div className="space-y-1">
            {APP_KEYS.map((key) => {
              const cfg = TASKS[key];
              const Icon = cfg.icon;
              return (
                <button key={key} type="button" onClick={() => openApp(key)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">
                  <Icon className={`h-4 w-4 ${COLOR_STYLES[cfg.color].icon}`} />
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {calendarOpen && (
        <div className="fixed bottom-16 right-2 z-50 w-64 rounded-3xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-3xl sm:right-6" onClick={(e) => e.stopPropagation()}>
          <p className="text-lg font-semibold">{clock.date}, 2026</p>
          <p className="mt-2 text-sm text-white/70">{PRODUCT_NAME} {VERSION} — August updates use the 08-2026 catalog prefix.</p>
        </div>
      )}

      <div className="fixed bottom-20 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col gap-3 sm:right-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter flex w-80 max-w-full gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-4 shadow-2xl transition-all sm:p-5 ${toast.leaving ? "translate-x-20 opacity-0" : ""} ${toast.kind === "welcome" ? "border-emerald-400/50 bg-emerald-950/90" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {toast.kind === "task" && toast.appKey ? (
              <>
                <div className="min-w-0 flex-1">
                  {(() => {
                    const cfg = TASKS[toast.appKey!];
                    const Icon = cfg.icon;
                    return (
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 shrink-0 ${COLOR_STYLES[cfg.color].icon}`} />
                        <span className="truncate font-semibold">{toast.title}</span>
                      </div>
                    );
                  })()}
                  <p className="mt-1 text-xs text-white/50">{PRODUCT_NAME} needs attention</p>
                </div>
                <button type="button" onClick={() => dismissToast(toast.id, toast.appKey)} className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-black">
                  FIX NOW
                </button>
              </>
            ) : (
              <div className="w-full text-center">
                <div className="text-lg font-bold text-emerald-300">{toast.title}</div>
                {toast.body && <div className="mt-2 text-sm text-white/80">{toast.body}</div>}
                <button type="button" onClick={() => dismissToast(toast.id)} className="mt-3 rounded-2xl bg-white/20 px-6 py-2 text-xs">
                  Let's go!
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {bsod && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-bsod)] p-8 text-center">
          <div className="max-w-md">
            <div className="mb-8 text-7xl sm:text-8xl" aria-hidden>💀</div>
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl">Your PC ran into a problem</h1>
            <p className="mb-8 text-lg sm:text-xl">
              You ignored too many maintenance tasks.
              <br />
              Health reached 0% on {PRODUCT_NAME} {VERSION}.
            </p>
            <button type="button" onClick={restartGame} className="rounded-3xl bg-white px-10 py-4 text-lg font-semibold text-[var(--color-bsod)] transition-all active:scale-95 sm:px-12">
              RESTART PC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppWindow({
  win,
  isMobileLayout,
  onFocus,
  onMove,
  onCancel,
  onCloseIdle,
  onStart,
  onOpenUpdate,
  onCheckUpdates,
}: {
  win: WindowState;
  isMobileLayout: boolean;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onCancel: () => void;
  onCloseIdle: () => void;
  onStart: () => void;
  onOpenUpdate: () => void;
  onCheckUpdates: () => void;
}) {
  const cfg = TASKS[win.appKey];
  const styles = COLOR_STYLES[cfg.color];
  const Icon = cfg.icon;
  const drag = useRef<{ ox: number; oy: number } | null>(null);

  const onTitleDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onFocus();
    drag.current = { ox: e.clientX - win.x, oy: e.clientY - win.y };
    const move = (ev: MouseEvent) => {
      if (!drag.current) return;
      onMove(clamp(ev.clientX - drag.current.ox, 0, window.innerWidth - 120), clamp(ev.clientY - drag.current.oy, 0, window.innerHeight - 100));
    };
    const stop = () => {
      drag.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const wide = win.appKey === "defrag" || win.appKey === "update";

  let body: ReactNode;
  if (win.complete) {
    body = (
      <div className="py-8 text-center sm:py-10">
        <div className="completion-check mb-5 text-emerald-400 sm:mb-6" aria-hidden>
          <Check className="mx-auto h-16 w-16 stroke-[3] text-emerald-400 sm:h-20 sm:w-20" />
        </div>
        <h2 className="text-xl font-semibold text-emerald-400 sm:text-2xl">{cfg.name} Complete</h2>
        <p className="mt-2 text-sm text-white/50">
          {win.appKey === "defrag"
            ? "Fragmentation: 0%  ·  +24 health"
            : win.appKey === "update"
              ? `${win.updateHeadline || "Updates"} installed  ·  +24 health`
              : "System health restored (+24)"}
        </p>
        {win.appKey === "update" && win.updatePackages.length > 0 && (
          <ul className="mx-auto mt-4 max-w-md space-y-1 px-2 text-left text-[11px] text-white/55">
            {win.updatePackages.map((p) => (
              <li key={p.id} className="truncate">✓ {p.title}</li>
            ))}
          </ul>
        )}
        {win.appKey === "defrag" && (
          <div className="mx-auto mt-5 max-w-md px-2">
            <DefragMap progress={100} running={false} seed={win.defragSeed} />
          </div>
        )}
        <button type="button" onClick={onCloseIdle} className="mt-6 rounded-3xl bg-emerald-500 px-8 py-3 text-sm font-medium hover:bg-emerald-600 sm:mt-8 sm:px-10">
          Close
        </button>
      </div>
    );
  } else if (win.appKey === "scan" && win.needsUpdateFirst && !win.running) {
    body = (
      <>
        <div className="mb-4 text-center font-medium text-amber-400">Definitions outdated</div>
        <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-950/50 p-4 sm:mb-6 sm:p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-sm leading-relaxed text-amber-50/90">
              <p className="font-semibold text-amber-200">Virus & threat protection</p>
              <p className="mt-1.5 text-xs text-white/70 sm:text-sm">
                Security definitions are out of date. {PRODUCT_NAME} Security cannot run a scan until you install the latest definitions via <strong>{PRODUCT_NAME} Update</strong>.
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={onOpenUpdate} className="mb-3 flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg">
          <Download className="h-5 w-5" />
          OPEN {PRODUCT_NAME.toUpperCase()} UPDATE
        </button>
        <button type="button" onClick={onStart} className="w-full rounded-3xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10">
          Try scan again (after Update)
        </button>
      </>
    );
  } else if (win.appKey === "update") {
    body = <UpdatePanel win={win} styles={styles} onCheck={onCheckUpdates} onStart={onStart} />;
  } else if (win.appKey === "bios") {
    body = (
      <>
        <div className={`mb-3 text-center text-sm font-medium ${styles.icon}`}>{win.phase || "Ready"}</div>
        <div className={`mb-4 rounded-2xl border p-4 text-xs sm:p-5 ${styles.border}`}>
          <p className="font-semibold text-orange-200">Platform firmware · UEFI capsule</p>
          <p className="mt-2 leading-relaxed text-white/70">
            Flashing system firmware rewrites power-management tables (ACPI _CST / _PSS),
            recalibrates the high-precision event timer, and tightens interrupt coalescing.
            Under sustained load this usually lowers idle wake frequency and heat-soak drift.
          </p>
          <p className="mt-2 text-[11px] text-orange-200/80">
            Warning: SPI write is non-atomic. Unexpected reset during erase/program may leave
            the board unbootable (stop code: CRITICAL_PROCESS_DIED / firmware assert).
          </p>
          <ul className="mt-3 space-y-1 font-mono text-[10px] text-white/50">
            <li>· Target: AMI Aptio V · socketed SoC mezzanine</li>
            <li>· Payload: F.26 signed capsule (RSA-2048)</li>
            <li>· Do not remove AC / interrupt flash cycle</li>
          </ul>
        </div>
        {(win.running || win.progress > 0) && (
          <div className="terminal-scan mb-4 h-28 overflow-auto rounded-2xl bg-black/60 p-3 font-mono text-[11px] text-orange-200/90">
            {win.progress < 25 && <div>→ Authenticating capsule signature…</div>}
            {win.progress >= 25 && <div>✓ Region map locked · starting SPI erase</div>}
            {win.progress >= 45 && <div>→ Programming blocks 0x000000–0x7FFFFF…</div>}
            {win.progress >= 70 && <div>→ Verifying hash chain…</div>}
            {win.progress >= 90 && <div>→ Staging POST hand-off · reboot pending</div>}
          </div>
        )}
        {!win.running && (
          <button
            type="button"
            onClick={onStart}
            className={`w-full rounded-3xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}
          >
            FLASH FIRMWARE
          </button>
        )}
        {(win.running || win.progress > 0) && !win.complete && (
          <div>
            <div className="progress-container h-3 bg-zinc-800">
              <div
                className="progress-bar h-3"
                style={{ width: `${win.progress}%`, "--bar-color": styles.bar } as CSSProperties}
              />
            </div>
            <div className="mt-3 text-center text-xs tabular-nums">{Math.floor(win.progress)}%</div>
          </div>
        )}
      </>
    );
  } else {
    body = (
      <>
        <div className={`mb-4 text-center font-medium ${styles.icon}`}>{win.phase || "Ready"}</div>
        {win.appKey === "defrag" && <DefragMap progress={win.progress} running={win.running} seed={win.defragSeed} />}
        {(win.appKey === "scan" || win.appKey === "chkdsk" || win.appKey === "sfc") && (
          <div className="terminal-scan mb-5 h-36 overflow-auto rounded-2xl bg-black/60 p-3 font-mono text-xs text-emerald-300 sm:mb-6 sm:h-44 sm:p-4">
            {win.running && win.appKey === "scan" && <div className="scan-line" />}
            {win.logLines.length === 0 ? (
              <span className="text-white/30">{win.running ? "Working…" : "Click Start to begin."}</span>
            ) : (
              win.logLines.map((line, i) => <div key={`${i}-${line}`}>{line}</div>)
            )}
          </div>
        )}
        {win.appKey === "drivers" && (
          <div className="mb-5 space-y-2 sm:mb-6 sm:space-y-3">
            {win.drivers.map((d) => (
              <div key={d.name} className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-xs">
                <span>{d.name}</span>
                <span className={d.status === "Up to date" ? "text-emerald-400" : "text-amber-400"}>{d.status}</span>
              </div>
            ))}
          </div>
        )}
        {!win.running && (
          <button type="button" onClick={onStart} className={`w-full rounded-3xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}>
            START {cfg.name.toUpperCase()}
          </button>
        )}
        {(win.running || win.progress > 0) && !win.complete && (
          <div>
            <div className="progress-container h-3 bg-zinc-800">
              <div className="progress-bar h-3" style={{ width: `${win.progress}%`, "--bar-color": styles.bar } as CSSProperties} />
            </div>
            <div className="mt-3 text-center text-xs tabular-nums">{Math.floor(win.progress)}%</div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`window-shell pointer-events-auto absolute overflow-hidden border border-zinc-700 bg-zinc-900 ${win.closing ? "closing" : ""} ${
        isMobileLayout
          ? "inset-x-2 top-14 bottom-16 !w-auto rounded-2xl"
          : wide
            ? "w-[min(560px,calc(100vw-1.5rem))] rounded-3xl"
            : "w-[min(480px,calc(100vw-1.5rem))] rounded-3xl"
      }`}
      style={isMobileLayout ? { zIndex: win.z } : { left: win.x, top: win.y, zIndex: win.z }}
      onMouseDown={onFocus}
    >
      <div className="titlebar-grad flex h-11 cursor-move items-center px-3 sm:px-4" onMouseDown={isMobileLayout ? undefined : onTitleDown}>
        <Icon className={`mr-2 h-4 w-4 shrink-0 sm:mr-3 ${styles.icon}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{cfg.name}</span>
        {win.running ? (
          <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-xs hover:bg-red-500 sm:px-3">Cancel</button>
        ) : (
          <button type="button" aria-label="Close" onClick={onCloseIdle} className="rounded p-1 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="max-h-[min(70dvh,560px)] overflow-y-auto bg-zinc-950 p-4 sm:p-6">{body}</div>
    </div>
  );
}

function UpdatePanel({
  win,
  styles,
  onCheck,
  onStart,
}: {
  win: WindowState;
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  onCheck: () => void;
  onStart: () => void;
}) {
  const checking = win.updateUi === "checking";
  const needsCheck = win.updateUi === "needs-check";
  const ready = win.updateUi === "ready";
  const installing = win.updateUi === "installing" || win.running;

  return (
    <>
      <div className={`mb-3 text-center text-sm font-medium ${styles.icon}`}>{win.phase || "Windoors Update"}</div>
      <div className={`mb-4 rounded-2xl border p-4 text-xs sm:p-5 ${styles.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-blue-300/70">Catalog</div>
            <div className="mt-0.5 font-semibold text-blue-100">{win.updateHeadline || "08-2026 · pending check"}</div>
          </div>
          <div className="text-right">
            <div className="text-white/50">Total size</div>
            <div className="font-mono text-sm">{win.updateTotalSize}</div>
          </div>
        </div>
        {installing && (
          <div className="mt-2 text-white/55">
            ETA {win.etaMin} min · installing package {Math.max(1, win.updateActivePkg + 1)}/{Math.max(1, win.updatePackages.length)}
          </div>
        )}
      </div>

      {needsCheck && (
        <div className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-950/40 p-4">
          <div className="flex gap-3">
            <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
            <div className="text-sm">
              <p className="font-semibold text-sky-200">Check for updates required</p>
              <p className="mt-1 text-xs text-white/65 sm:text-sm">
                Your update catalog may be out of date. Recheck for the latest <strong>08-2026</strong> packages before installing.
              </p>
            </div>
          </div>
        </div>
      )}

      {checking && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-black/40 px-4 py-5 text-sm text-sky-200">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Contacting Windoors Update servers… scanning 08-2026 catalog
        </div>
      )}

      {win.updatePackages.length > 0 && (
        <div className="mb-4 max-h-48 space-y-2 overflow-y-auto sm:max-h-56">
          {win.updatePackages.map((pkg, i) => {
            const active = installing && i === win.updateActivePkg;
            const done = installing && i < win.updateActivePkg;
            return (
              <div
                key={pkg.id}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active ? "border-blue-400/50 bg-blue-950/50" : done ? "border-emerald-500/20 bg-emerald-950/20" : "border-white/10 bg-black/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                      {kindLabel(pkg.kind)}
                      {active ? " · installing" : done ? " · done" : ""}
                    </div>
                    <div className="mt-0.5 text-xs leading-snug text-white/90 sm:text-[13px]">{pkg.title}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-white/45">{pkg.size}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!installing && !win.complete && (
        <div className="flex flex-col gap-2">
          {(needsCheck || ready || checking) && (
            <button
              type="button"
              onClick={onCheck}
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-3xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking…" : needsCheck ? "Check for updates" : "Check again"}
            </button>
          )}
          {ready && (
            <button type="button" onClick={onStart} className={`w-full rounded-3xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}>
              Download & install ({win.updatePackages.length})
            </button>
          )}
          {needsCheck && (
            <button type="button" onClick={onStart} className="w-full rounded-3xl border border-white/10 py-2.5 text-xs text-white/40">
              Install without check (blocked)
            </button>
          )}
        </div>
      )}

      {installing && (
        <div>
          <div className="progress-container h-3 bg-zinc-800">
            <div className="progress-bar h-3" style={{ width: `${win.progress}%`, "--bar-color": styles.bar } as CSSProperties} />
          </div>
          <div className="mt-3 text-center text-xs tabular-nums">{Math.floor(win.progress)}%</div>
        </div>
      )}
    </>
  );
}
