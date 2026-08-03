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
  Bluetooth,
  Check,
  ChevronUp,
  Disc3,
  Download,
  ExternalLink,
  HardDrive,
  Lock,
  Plane,
  RefreshCw,
  RotateCw,
  Search,
  Settings2,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import {
  APP_KEYS,
  BIOS_BSOD_CHANCE,
  BROWSER_HOME,
  DOCK_KEYS,
  COLOR_STYLES,
  CREATOR_X_HANDLE,
  CREATOR_X_URL,
  DRAIN_BY_LEVEL,
  FULL_TITLE,
  PRODUCT_NAME,
  SUPPORT_DRAIN_BUMP,
  TASKS,
  VERSION,
  type AppKey,
} from "@/lib/windoors/config";
import { DefragMap } from "@/components/windoors/defrag-map";
import qrXProfile from "@/assets/qr-thimothybsirius.svg?url";
import {
  kindLabel,
  pickUpdateScenario,
  type UpdatePackage,
  type UpdateScenario,
} from "@/lib/windoors/updates";

type UpdateUiPhase = "needs-check" | "checking" | "ready" | "installing" | "up-to-date";

type WindowState = {
  id: string;
  appKey: AppKey;
  x: number;
  y: number;
  w: number;
  h: number;
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
  chkdskDrive: "A:" | "C:" | "D:";
  chkdskTest: "standard" | "thorough";
  chkdskAutoFix: boolean;
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
  kind: "task" | "welcome" | "info" | "success";
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

/** Desktop window placement: center, keep left tool icons visible. */
function defaultWindowSize(appKey: AppKey): { w: number; h: number } {
  const wide =
    appKey === "update" ||
    appKey === "defrag" ||
    appKey === "support" ||
    appKey === "bios" ||
    appKey === "chkdsk" ||
    appKey === "browser";
  const tall =
    appKey === "chkdsk" ||
    appKey === "update" ||
    appKey === "bios" ||
    appKey === "support" ||
    appKey === "defrag" ||
    appKey === "browser";
  return {
    w: appKey === "browser" ? 720 : wide ? 560 : 480,
    h: appKey === "browser" ? 640 : tall ? 560 : 460,
  };
}

function computeWindowPos(
  appKey: AppKey,
  stackIndex: number,
): { x: number; y: number; w: number; h: number } {
  const size = defaultWindowSize(appKey);
  if (typeof window === "undefined") {
    return { x: 220 + stackIndex * 28, y: 72 + stackIndex * 24, ...size };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) {
    return { x: 16, y: 64, ...size };
  }
  const taskbar = 64;
  const leftIcons = Math.min(220, Math.max(168, Math.round(vw * 0.13)));
  const winW = Math.min(size.w, vw - leftIcons - 24);
  const winH = Math.min(size.h, vh - taskbar - 48);
  const freeLeft = leftIcons;
  const freeWidth = vw - freeLeft - 16;
  let x = freeLeft + Math.round((freeWidth - winW) / 2);
  x = Math.max(freeLeft, Math.min(x, vw - winW - 12));
  let y = Math.round((vh - taskbar - winH) / 2);
  y = Math.max(36, Math.min(y, vh - taskbar - 180));
  x += stackIndex * 28;
  y += stackIndex * 22;
  x = Math.min(x, Math.max(freeLeft, vw - winW - 12));
  y = Math.min(y, Math.max(36, vh - taskbar - 160));
  return { x, y, w: winW, h: winH };
}


function healthTone(health: number) {
  if (health > 75) return { label: "OPTIMAL", color: "text-emerald-400", bar: "from-emerald-400 to-cyan-400" };
  if (health > 40) return { label: "NEEDS ATTENTION", color: "text-amber-400", bar: "from-amber-400 to-orange-400" };
  return { label: "CRITICAL", color: "text-red-400", bar: "from-red-500 to-rose-400" };
}

/** Desktop icon / taskbar urgency: red = toast, amber = open needs action, green = idle OK. */
function toolVisualStatus(
  key: AppKey,
  toasts: Toast[],
  windows: WindowState[],
): "ok" | "attention" | "urgent" {
  const toastPending = toasts.some(
    (t) => t.kind === "task" && t.appKey === key && !t.leaving,
  );
  if (toastPending) return "urgent";
  const win = windows.find((w) => w.appKey === key && !w.closing);
  if (win) {
    if (win.running) return "attention";
    if (win.needsUpdateFirst) return "attention";
    if (win.appKey === "update" && (win.updateUi === "needs-check" || win.updateUi === "ready")) {
      return "attention";
    }
    if (win.appKey === "update" && win.updateUi === "up-to-date") return "ok";
  }
  return "ok";
}

function statusRingClass(status: "ok" | "attention" | "urgent") {
  if (status === "urgent") return "icon-status-urgent";
  if (status === "attention") return "icon-status-attention";
  return "icon-status-ok";
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
      setWindows((list) => list.map((w) => (w.id === winId ? { ...w, closing: true, running: false } : w)));
      if (penalize) applyHealth(-14);
      window.setTimeout(() => {
        setWindows((list) => list.filter((w) => w.id !== winId));
      }, 300);
    },
    [applyHealth, cancelRaf, endSupportSession],
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
      // Remote Support uses Call/Finish, not the normal progress task
      if (appKey === "support" || appKey === "browser") return;

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
      const currentWin = windowsRef.current.find((w) => w.id === winId);
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
            window.setTimeout(() => {
              setWindows((list) => list.filter((w) => w.id !== winId));
            }, 300);
          }
          applyHealth(24);
          if (appKey === "update") markDefinitionsFreshFromUpdate();
          if (appKey === "scan") {
            lastScanGenerationRef.current = updateGenerationRef.current;
            window.setTimeout(() => {
              if (Math.random() < 0.7) markDefinitionsStale();
            }, 8000 + Math.random() * 12000);
          }
          const doneId = nextId("done");
          setToasts((t) => [
            ...t.slice(-4),
            {
              id: doneId,
              kind: "success" as const,
              appKey,
              title: `${cfg.name} complete`,
              body: "+24 system health restored",
            },
          ]);
          window.setTimeout(() => {
            setToasts((list) =>
              list.map((x) => (x.id === doneId ? { ...x, leaving: true } : x)),
            );
            window.setTimeout(() => {
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
    const id = window.setInterval(() => {
      if (healthRef.current <= 0) return;
      if (supportActiveRef.current) return; // Remote Support session freezes decay
      const rate = DRAIN_BY_LEVEL[drainLevelRef.current] + drainBoostRef.current;
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
      // Remote Support = full AFK pause (no new nags until session ends)
      if (supportActiveRef.current) {
        timer = window.setTimeout(spawn, 2500);
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
            // No ignore penalty while Remote Support pause is active
            if (had && !supportActiveRef.current) applyHealth(-11);
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
    setBatteryOpen(false);
    setActionCenterOpen(false);
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
    window.setTimeout(() => {
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
      if (e.key === "Escape") {
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
        if (!top.running && top.appKey !== "support" && top.appKey !== "browser") {
          startTask(top.id, top.appKey);
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
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

  return (
    <div
      className={`desktop-wallpaper mobile-safe relative h-[100dvh] max-h-[100dvh] w-full touch-manipulation overflow-hidden text-white select-none sm:h-[calc(100dvh-var(--grok-banner-h,0px))] ${nightLight ? "night-light-on" : ""}`}
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
            const Icon = cfg.icon;
            const styles = COLOR_STYLES[cfg.color];
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
                  className={`flex items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ${styles.badgeBg} ${statusRingClass(status)} ${
                    isMobile ? "h-12 w-12" : "h-12 w-12 sm:h-14 sm:w-14"
                  }`}
                >
                  <Icon className={`text-white ${isMobile ? "h-6 w-6" : "h-6 w-6 sm:h-7 sm:w-7"}`} strokeWidth={2.2} />
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
          />
        ))}
      </div>

      {/* Windows-style activation watermark (bottom-right, above taskbar) */}
      {!bootScreen && !bsod && (
        <div
          className="pointer-events-none fixed bottom-[4.25rem] right-2 z-20 max-w-[min(70vw,240px)] select-none text-right sm:bottom-16 sm:right-5"
          aria-label="Creator credit"
        >
          <div className="font-[Segoe_UI,system-ui,sans-serif] leading-snug">
            <div className="text-[11px] font-normal text-white/40 sm:text-[15px] sm:text-white/45">
              Created with GROK AI by
            </div>
            <a
              href="https://x.com/thimothybsirius"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto mt-0.5 inline-block break-all text-[10px] text-white/30 underline-offset-2 transition hover:text-white/70 hover:underline sm:text-[13px] sm:text-white/35"
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
            const Icon = cfg.icon;
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
                <Icon className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
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
        <div className="fixed bottom-[4.25rem] left-2 right-2 z-[70] max-h-[min(70dvh,520px)] overflow-hidden overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/98 shadow-2xl backdrop-blur-3xl sm:bottom-16 sm:left-4 sm:right-auto sm:w-[min(100vw-1rem,460px)]" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed bottom-16 left-2 z-50 w-[min(100vw-1rem,360px)] rounded-xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-3xl sm:left-16" onClick={(e) => e.stopPropagation()}>
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

      {bsod && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-center overflow-y-auto bg-[var(--color-bsod)] px-6 py-10 text-white sm:px-16 md:px-24">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-6 text-6xl font-light sm:mb-8 sm:text-8xl" aria-hidden>
              :(
            </div>
            <h1 className="mb-4 text-xl font-normal leading-snug sm:text-3xl">
              Your PC ran into a problem and needs to restart.
            </h1>
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


function ToastCard({
  toast,
  onDismiss,
  onFix,
}: {
  toast: Toast;
  onDismiss: () => void;
  onFix: () => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const finishSwipe = () => {
    setSwiping(false);
    const delta = dxRef.current;
    if (Math.abs(delta) > 96) {
      onDismiss();
    }
    dxRef.current = 0;
    setDx(0);
  };

  return (
    <div
      className={`toast-enter toast-card pointer-events-auto flex w-full gap-3 rounded-xl border border-white/10 bg-[#161618]/96 p-3.5 shadow-2xl backdrop-blur-xl transition-all sm:p-4 ${
        toast.leaving ? "translate-x-8 opacity-0 sm:translate-x-16" : ""
      } ${toast.kind === "welcome" || toast.kind === "success" ? "border-emerald-400/45 bg-emerald-950/95" : ""} ${
        swiping ? "swiping" : ""
      }`}
      style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.35, 1 - Math.abs(dx) / 180) : undefined }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        touch.current = { x: t.clientX, y: t.clientY };
        setSwiping(true);
      }}
      onTouchMove={(e) => {
        if (!touch.current) return;
        const t = e.touches[0];
        if (!t) return;
        const adx = t.clientX - touch.current.x;
        const ady = t.clientY - touch.current.y;
        if (Math.abs(adx) > Math.abs(ady)) {
          dxRef.current = adx;
          setDx(adx);
        }
      }}
      onTouchEnd={() => finishSwipe()}
      onTouchCancel={() => finishSwipe()}
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
          <button
            type="button"
            onClick={onFix}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black active:scale-95 sm:py-2"
          >
            FIX NOW
          </button>
        </>
      ) : toast.kind === "success" && toast.appKey ? (
        <>
          <div className="min-w-0 flex-1">
            {(() => {
              const cfg = TASKS[toast.appKey!];
              const Icon = cfg.icon;
              return (
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${COLOR_STYLES[cfg.color].icon}`} />
                  <span className="truncate font-semibold text-emerald-300">{toast.title}</span>
                </div>
              );
            })()}
            <p className="mt-1 text-xs text-white/55">{toast.body || "Task finished successfully"}</p>
          </div>
          <button
            type="button"
            onClick={onFix}
            className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-black active:scale-95 sm:py-2"
          >
            OPEN
          </button>
        </>
      ) : (
        <div className="w-full text-center">
          <div className="text-lg font-bold text-emerald-300">{toast.title}</div>
          {toast.body && <div className="mt-2 text-sm text-white/80">{toast.body}</div>}
          <button type="button" onClick={onDismiss} className="mt-3 rounded-xl bg-white/20 px-6 py-2 text-xs">
            Let's go!
          </button>
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
  supportActive,
  supportCalls,
  onCallSupport,
  onFinishSupport,
  onPatchWin,
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
  supportActive: boolean;
  supportCalls: number;
  onCallSupport: () => void;
  onFinishSupport: () => void;
  onPatchWin: (patch: Partial<WindowState>) => void;
}) {
  const cfg = TASKS[win.appKey];
  const styles = COLOR_STYLES[cfg.color];
  const Icon = cfg.icon;
  const drag = useRef<{ ox: number; oy: number } | null>(null);
  const resize = useRef<
    | {
        edge: "e" | "s" | "se" | "w" | "n" | "ne" | "sw" | "nw";
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        origW: number;
        origH: number;
      }
    | null
  >(null);

  const onTitleDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onFocus();
    drag.current = { ox: e.clientX - win.x, oy: e.clientY - win.y };
    const move = (ev: MouseEvent) => {
      if (!drag.current) return;
      onMove(
        clamp(ev.clientX - drag.current.ox, 0, window.innerWidth - 120),
        clamp(ev.clientY - drag.current.oy, 0, window.innerHeight - 100),
      );
    };
    const stop = () => {
      drag.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const onResizeDown = (
    e: ReactMouseEvent,
    edge: "e" | "s" | "se" | "w" | "n" | "ne" | "sw" | "nw",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    resize.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.w,
      origH: win.h,
    };
    const minW = 360;
    const minH = 280;
    const move = (ev: MouseEvent) => {
      const r = resize.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;
      let nextX = r.origX;
      let nextY = r.origY;
      let nextW = r.origW;
      let nextH = r.origH;
      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 72;

      if (r.edge.includes("e")) {
        nextW = clamp(r.origW + dx, minW, maxW - r.origX);
      }
      if (r.edge.includes("s")) {
        nextH = clamp(r.origH + dy, minH, maxH - r.origY);
      }
      if (r.edge.includes("w")) {
        const maxDx = r.origW - minW;
        const applied = clamp(dx, -r.origX, maxDx);
        nextX = r.origX + applied;
        nextW = r.origW - applied;
      }
      if (r.edge.includes("n")) {
        const maxDy = r.origH - minH;
        const applied = clamp(dy, -r.origY, maxDy);
        nextY = r.origY + applied;
        nextH = r.origH - applied;
      }

      onMove(nextX, nextY);
      onPatchWin({ w: nextW, h: nextH });
    };
    const stop = () => {
      resize.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  let body: ReactNode;
  if (win.appKey === "scan" && win.needsUpdateFirst && !win.running) {
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
        <button type="button" onClick={onOpenUpdate} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg">
          <Download className="h-5 w-5" />
          Open {PRODUCT_NAME} Update
        </button>
        <button type="button" onClick={onStart} className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10">
          Start
        </button>
      </>
    );
  } else if (win.appKey === "update") {
    body = <UpdatePanel win={win} styles={styles} onCheck={onCheckUpdates} onStart={onStart} />;
  } else if (win.appKey === "support") {
    body = (
      <>
        <div className={`mb-3 text-center text-sm font-medium ${styles.icon}`}>
          {supportActive ? "Remote session active" : win.phase || "Ready to connect"}
        </div>
        <div className={`mb-4 rounded-2xl border p-4 text-xs sm:p-5 ${styles.border}`}>
          <p className="font-semibold text-cyan-200">Quick Assist · Remote Support</p>
          <p className="mt-2 leading-relaxed text-white/70">
            Open a temporary support channel to pause the machine: health decay and new
            maintenance notifications freeze so you can step away or push System Health back
            toward 100%. Other tools keep working during the session.
          </p>
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-medium ${
              supportActive
                ? "bg-cyan-500/15 text-cyan-200"
                : "bg-white/5 text-white/55"
            }`}
          >
            {supportActive
              ? "● Channel open — decay + notifications paused (AFK safe)"
              : "○ Channel idle — decay and nags continue"}
          </div>
          {supportCalls > 0 && (
            <p className="mt-2 text-[10px] text-white/45">
              Lifetime sessions: {supportCalls} · each call recalibrates decay profiles
            </p>
          )}
        </div>

        <a
          href={CREATOR_X_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mb-4 block rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-950/80 to-zinc-900/90 p-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-950/50"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
            About this diagnostic channel
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            Forged by the mighty <span className="font-semibold text-cyan-200">Grok AI</span>.
            Live support rituals conducted by{" "}
            <span className="font-semibold text-white underline decoration-cyan-400/50 underline-offset-2">
              {CREATOR_X_HANDLE}
            </span>
            .
          </p>
          <p className="mt-2 text-[11px] text-white/50">
            Tip: if the universe starts decaying faster after each call… that is a feature, not a bug.
          </p>
        </a>

        {win.logLines.length > 0 && (
          <div className="terminal-scan mb-4 max-h-28 overflow-auto rounded-2xl bg-black/60 p-3 font-mono text-[11px] text-cyan-200/90">
            {win.logLines.map((line, i) => (
              <div key={`${i}-${line}`}>{line}</div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCallSupport}
            disabled={supportActive}
            className={`flex-1 rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:text-base ${styles.button}`}
          >
            {supportActive ? "On call…" : "Call support"}
          </button>
          <button
            type="button"
            onClick={onFinishSupport}
            disabled={!supportActive}
            className="flex-1 rounded-xl border border-white/20 bg-white/10 py-4 text-sm font-semibold text-white transition hover:bg-white/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            Finish support
          </button>
        </div>
      </>
    );
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
            className={`w-full rounded-xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}
          >
            Start
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
  } else if (win.appKey === "browser") {
    body = <BrowserPanel styles={styles} />;
  } else if (win.appKey === "chkdsk") {
    body = (
      <ChkdskPanel
        win={win}
        styles={styles}
        onStart={onStart}
        onClose={onCloseIdle}
        onPatch={onPatchWin}
      />
    );
  } else {
    body = (
      <>
        <div className={`mb-4 text-center font-medium ${styles.icon}`}>{win.phase || "Ready"}</div>
        {win.appKey === "defrag" && <DefragMap progress={win.progress} running={win.running} seed={win.defragSeed} />}
        {(win.appKey === "scan" || win.appKey === "sfc") && (
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
          <button type="button" onClick={onStart} className={`w-full rounded-xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}>
            Start
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
      className={`window-shell pointer-events-auto absolute flex flex-col overflow-hidden border border-white/10 ${win.closing ? "closing" : ""} ${
        isMobileLayout
          ? "inset-x-0 top-[4.5rem] bottom-14 !w-auto rounded-t-xl border-x-0 border-b-0 sm:inset-x-2 sm:top-14 sm:bottom-16 sm:rounded-xl sm:border"
          : "rounded-xl"
      }`}
      style={
        isMobileLayout
          ? { zIndex: win.z }
          : {
              left: win.x,
              top: win.y,
              width: win.w,
              height: win.h,
              zIndex: win.z,
            }
      }
      onMouseDown={onFocus}
    >
      <div
        className="titlebar-grad flex h-11 shrink-0 items-center border-b border-white/5 px-3 sm:h-10 sm:cursor-move sm:px-3"
        onMouseDown={isMobileLayout ? undefined : onTitleDown}
      >
        <Icon className={`mr-2 h-4 w-4 shrink-0 sm:mr-3 ${styles.icon}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{cfg.name}</span>
        {win.running && win.appKey !== "support" ? (
          <button type="button" onClick={onCancel} className="min-h-9 rounded-lg px-3 py-1.5 text-xs hover:bg-red-500 sm:min-h-0 sm:px-3">
            Cancel
          </button>
        ) : (
          <button type="button" aria-label="Close" onClick={onCloseIdle} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 sm:h-auto sm:w-auto sm:p-1">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
      <div
        className={`min-h-0 flex-1 overscroll-contain bg-zinc-950 ${
          win.appKey === "browser"
            ? "flex flex-col overflow-hidden p-0"
            : "overflow-y-auto p-4 sm:p-6"
        }`}
      >
        {body}
      </div>

      {/* Resize handles (desktop only) */}
      {!isMobileLayout && !win.closing && (
        <>
          <div
            role="presentation"
            aria-hidden
            className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-se-resize"
            onMouseDown={(e) => onResizeDown(e, "se")}
          >
            <div className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-white/35" />
          </div>
          <div
            role="presentation"
            aria-hidden
            className="absolute bottom-0 left-3 right-4 z-10 h-2 cursor-s-resize"
            onMouseDown={(e) => onResizeDown(e, "s")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute bottom-4 right-0 top-11 z-10 w-2 cursor-e-resize"
            onMouseDown={(e) => onResizeDown(e, "e")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute bottom-4 left-0 top-11 z-10 w-2 cursor-w-resize"
            onMouseDown={(e) => onResizeDown(e, "w")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute left-3 right-4 top-0 z-10 h-1.5 cursor-n-resize"
            onMouseDown={(e) => onResizeDown(e, "n")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute right-0 top-0 z-20 h-3 w-3 cursor-ne-resize"
            onMouseDown={(e) => onResizeDown(e, "ne")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute left-0 top-0 z-20 h-3 w-3 cursor-nw-resize"
            onMouseDown={(e) => onResizeDown(e, "nw")}
          />
          <div
            role="presentation"
            aria-hidden
            className="absolute bottom-0 left-0 z-20 h-3 w-3 cursor-sw-resize"
            onMouseDown={(e) => onResizeDown(e, "sw")}
          />
        </>
      )}
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
  const upToDate = win.updateUi === "up-to-date";

  if (upToDate) {
    return (
      <>
        <div className={`mb-3 text-center text-sm font-medium ${styles.icon}`}>
          {win.phase || "You're up to date"}
        </div>
        <div className="mb-5 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-5 text-center sm:p-6">
          <Check className="mx-auto h-12 w-12 text-emerald-400 sm:h-14 sm:w-14" strokeWidth={2.5} />
          <h3 className="mt-3 text-lg font-semibold text-emerald-300">All updates are installed</h3>
          <p className="mt-2 text-sm text-white/60">
            This device has the latest 08-2026 packages. You're protected — until the next catalog wave.
          </p>
          {win.updateHeadline && (
            <p className="mt-3 text-[11px] text-white/40">Last installed: {win.updateHeadline}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCheck}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
          Check for updates
        </button>
      </>
    );
  }

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

      {!installing && (
        <div className="flex flex-col gap-2">
          {(needsCheck || ready || checking) && (
            <button
              type="button"
              onClick={onCheck}
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking…" : "Check for updates"}
            </button>
          )}
          {ready && (
            <button type="button" onClick={onStart} className={`w-full rounded-xl py-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:py-5 sm:text-lg ${styles.button}`}>
              Start
            </button>
          )}
          {needsCheck && (
            <button type="button" onClick={onStart} className="w-full rounded-xl border border-white/10 py-2.5 text-xs text-white/40">
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

const CHKDSK_DRIVES: {
  id: WindowState["chkdskDrive"];
  label: string;
  hint: string;
  Icon: typeof HardDrive;
}[] = [
  { id: "A:", label: "3½ Floppy (A:)", hint: "Legacy removable", Icon: Disc3 },
  { id: "C:", label: "Local Disk (C:)", hint: "System volume", Icon: HardDrive },
  { id: "D:", label: "New volume (D:)", hint: "Data partition", Icon: HardDrive },
];



function BrowserPanel({
  styles,
}: {
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
}) {
  const [key, setKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const url = BROWSER_HOME;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Chrome bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-900 px-2 py-2 sm:px-3">
        <button
          type="button"
          title="Home"
          aria-label="Home"
          onClick={() => {
            setFailed(false);
            setKey((k) => k + 1);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
          <span className="truncate font-mono text-[11px] text-white/80 sm:text-xs">{url}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in system browser"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <p className="shrink-0 border-b border-white/5 bg-zinc-950 px-3 py-1 text-[10px] text-white/40">
        Internet Discovery · restricted catalog · only approved intranet destination allowed
      </p>

      <div className="relative min-h-0 flex-1 bg-white">
        {failed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
            <p className="text-sm text-white/70">
              This site refused to embed (or the network is offline). Open it in a full browser window.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white ${styles.button}`}
            >
              <ExternalLink className="h-4 w-4" />
              Open macrohard.space
            </a>
          </div>
        )}
        <iframe
          key={key}
          title="Internet Discovery Browser"
          src={url}
          className="h-full min-h-[280px] w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // blank/error documents sometimes still fire load — leave failed false if loaded
            try {
              const doc = (e.target as HTMLIFrameElement).contentDocument;
              if (doc && doc.location.href === "about:blank") setFailed(true);
            } catch {
              // cross-origin: assume ok
            }
          }}
        />
      </div>
    </div>
  );
}

function ChkdskPanel({
  win,
  styles,
  onStart,
  onClose,
  onPatch,
}: {
  win: WindowState;
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  onStart: () => void;
  onClose: () => void;
  onPatch: (patch: Partial<WindowState>) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const busy = win.running;
  const locked = busy || win.complete;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${styles.badgeBg}`}>
          <HardDrive className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">ScanDisk-style Check Disk</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            Same classic choices — modern shell. Pick a drive, choose how deep to go.
          </p>
        </div>
      </div>

      {/* Drive list */}
      <fieldset disabled={locked} className="disabled:opacity-60">
        <legend className="mb-2 text-xs font-medium text-white/70">
          Select the drive(s) you want to check for errors
        </legend>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          {CHKDSK_DRIVES.map((d) => {
            const Icon = d.Icon;
            const selected = win.chkdskDrive === d.id;
            return (
              <button
                key={d.id}
                type="button"
                disabled={locked}
                onClick={() => onPatch({ chkdskDrive: d.id })}
                className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left last:border-b-0 transition ${
                  selected ? "bg-teal-500/20 ring-1 ring-inset ring-teal-400/40" : "hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-teal-300" : "text-white/50"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white">{d.label}</span>
                  <span className="block text-[10px] text-white/40">{d.hint}</span>
                </span>
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                    selected ? "border-teal-300 bg-teal-400" : "border-white/30"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Type of test */}
      <fieldset disabled={locked} className="rounded-2xl border border-white/10 bg-black/25 p-3 disabled:opacity-60">
        <legend className="px-1 text-xs font-medium text-white/70">Type of test</legend>
        <label className="mt-1 flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-white/5">
          <input
            type="radio"
            name={`chkdsk-test-${win.id}`}
            className="mt-1 accent-teal-400"
            checked={win.chkdskTest === "standard"}
            disabled={locked}
            onChange={() => onPatch({ chkdskTest: "standard" })}
          />
          <span>
            <span className="block text-sm text-white">Standard</span>
            <span className="block text-[11px] text-white/45">
              Checks files and folders for errors
            </span>
          </span>
        </label>
        <label className="mt-1 flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-white/5">
          <input
            type="radio"
            name={`chkdsk-test-${win.id}`}
            className="mt-1 accent-teal-400"
            checked={win.chkdskTest === "thorough"}
            disabled={locked}
            onChange={() => onPatch({ chkdskTest: "thorough" })}
          />
          <span>
            <span className="block text-sm text-white">Thorough</span>
            <span className="block text-[11px] text-white/45">
              Performs Standard test and scans disk surface for errors
            </span>
          </span>
        </label>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={locked}
            onClick={() => setShowOptions((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Options…
          </button>
        </div>
        {showOptions && (
          <div className="mt-2 rounded-xl border border-white/10 bg-zinc-900/80 p-3 text-[11px] text-white/60">
            <p className="font-medium text-white/80">Advanced options</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>System / hidden files are always checked</li>
              <li>Write-testing free space is simulated only</li>
              <li>Thorough mode enables surface-sector pass</li>
            </ul>
          </div>
        )}
      </fieldset>

      {/* Auto fix */}
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 ${
          locked ? "opacity-60" : "hover:bg-white/5"
        }`}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-teal-400"
          checked={win.chkdskAutoFix}
          disabled={locked}
          onChange={(e) => onPatch({ chkdskAutoFix: e.target.checked })}
        />
        <span className="text-sm text-white">Automatically fix errors</span>
      </label>

      {/* Status / log */}
      {(busy || win.logLines.length > 0) && (
        <div className="terminal-scan max-h-32 overflow-auto rounded-2xl bg-black/60 p-3 font-mono text-[11px] text-teal-200/90">
          {win.logLines.length === 0 ? (
            <span className="text-white/30">Starting ScanDisk…</span>
          ) : (
            win.logLines.map((line, i) => <div key={`${i}-${line}`}>{line}</div>)
          )}
        </div>
      )}

      {/* Progress */}
      {(busy || win.progress > 0) && !win.complete && (
        <div>
          <div className="progress-container h-3 bg-zinc-800">
            <div
              className="progress-bar h-3"
              style={{ width: `${win.progress}%`, "--bar-color": styles.bar } as CSSProperties}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-white/50">
            <span>{win.phase || "Working…"}</span>
            <span className="tabular-nums">{Math.floor(win.progress)}%</span>
          </div>
        </div>
      )}

      {/* Actions — Start / Close / Advanced layout like classic */}
      {!busy && !win.complete && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onStart}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98] sm:order-1 ${styles.button}`}
          >
            Start
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10 sm:order-2"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => setShowOptions(true)}
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 hover:bg-white/10 sm:order-3"
          >
            Advanced…
          </button>
        </div>
      )}

      {busy && (
        <p className="text-center text-[11px] text-white/45">
          Checking {win.chkdskDrive} — do not eject the volume
        </p>
      )}
    </div>
  );
}
