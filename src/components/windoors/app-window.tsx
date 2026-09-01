import {
  useRef,
  useState,
  memo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import {
  COLOR_STYLES,
  CREATOR_X_HANDLE,
  CREATOR_X_URL,
  PRODUCT_NAME,
  TASKS,
  type WallpaperId,
} from "@/lib/windoors/config";
import { clamp } from "@/lib/windoors/layout";
import type { WindowState } from "@/lib/windoors/types";
import { DefragMap } from "@/components/windoors/defrag-map";
import { SettingsPanel } from "@/components/windoors/settings-panel";
import { UpdatePanel } from "@/components/windoors/update-panel";
import { BrowserPanel, ChkdskPanel } from "@/components/windoors/tool-panels";
import { ToolIcon } from "@/components/windoors/tool-icons";
import {
  DialogButtons,
  GroupBox,
  HelpDialog,
  HourglassOverlay,
  StatusBar,
  SystemMenu,
  WindowMenuBar,
} from "@/components/windoors/retro-chrome";

function AppWindowInner({
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
  windoorsActivated,
  trueOg,
  onActivateKey,
  onAbout,
  wallpaper,
  nightLight,
  volumeLevel,
  onWallpaper,
  onNightLight,
  onVolume,
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
  windoorsActivated: boolean;
  trueOg: boolean;
  onActivateKey: (key: string) => { ok: boolean; trueOg?: boolean; reason?: string };
  onAbout: () => void;
  wallpaper: WallpaperId;
  nightLight: boolean;
  volumeLevel: number;
  onWallpaper: (id: WallpaperId) => void;
  onNightLight: (v: boolean) => void;
  onVolume: (v: number) => void;
}) {
  const cfg = TASKS[win.appKey];
  const styles = COLOR_STYLES[cfg.color];
  const [helpOpen, setHelpOpen] = useState(false);
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

  const onTitleDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onFocus();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { ox: e.clientX - win.x, oy: e.clientY - win.y };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      onMove(
        clamp(ev.clientX - drag.current.ox, 0, window.innerWidth - 120),
        clamp(ev.clientY - drag.current.oy, 0, window.innerHeight - 100),
      );
    };
    const stop = () => {
      drag.current = null;
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  const onResizeDown = (
    e: ReactPointerEvent,
    edge: "e" | "s" | "se" | "w" | "n" | "ne" | "sw" | "nw",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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
    const move = (ev: PointerEvent) => {
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

      if (r.edge.includes("e")) nextW = clamp(r.origW + dx, minW, maxW - r.origX);
      if (r.edge.includes("s")) nextH = clamp(r.origH + dy, minH, maxH - r.origY);
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
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
  };

  let body: ReactNode;
  if (win.appKey === "scan" && win.needsUpdateFirst && !win.running) {
    body = (
      <>
        <GroupBox legend="Virus & threat protection">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-sm leading-relaxed text-amber-50/90">
              <p className="font-semibold text-amber-200">Definitions outdated</p>
              <p className="mt-1.5 text-xs text-white/70 sm:text-sm">
                Security definitions are out of date. {PRODUCT_NAME} Security cannot run a scan until you install the latest definitions via <strong>{PRODUCT_NAME} Update</strong>.
              </p>
            </div>
          </div>
        </GroupBox>
        <DialogButtons
          primaryLabel={`Open ${PRODUCT_NAME} Update`}
          onPrimary={onOpenUpdate}
          onCancel={onCloseIdle}
          onHelp={() => setHelpOpen(true)}
        />
      </>
    );
  } else if (win.appKey === "update") {
    body = (
      <UpdatePanel
        win={win}
        styles={styles}
        onCheck={onCheckUpdates}
        onStart={onStart}
        onCancel={onCloseIdle}
        onHelp={() => setHelpOpen(true)}
      />
    );
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
              supportActive ? "bg-cyan-500/15 text-cyan-200" : "bg-white/5 text-white/55"
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
            className="btn-default flex-1 rounded-lg py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:text-base"
          >
            {supportActive ? "On call…" : "Call support"}
          </button>
          <button
            type="button"
            onClick={onFinishSupport}
            disabled={!supportActive}
            className="flex-1 rounded-lg border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            Finish support
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="rounded-lg border border-white/12 px-4 py-3 text-sm text-white/70 hover:bg-white/8"
          >
            Help
          </button>
        </div>
      </>
    );
  } else if (win.appKey === "bios") {
    body = (
      <>
        <GroupBox legend="Platform firmware · UEFI capsule">
          <p className="text-xs leading-relaxed text-white/70">
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
        </GroupBox>
        {(win.running || win.progress > 0) && (
          <div className="terminal-scan mt-3 h-28 overflow-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] text-orange-200/90">
            {win.progress < 25 && <div>→ Authenticating capsule signature…</div>}
            {win.progress >= 25 && <div>✓ Region map locked · starting SPI erase</div>}
            {win.progress >= 45 && <div>→ Programming blocks 0x000000–0x7FFFFF…</div>}
            {win.progress >= 70 && <div>→ Verifying hash chain…</div>}
            {win.progress >= 90 && <div>→ Staging POST hand-off · reboot pending</div>}
          </div>
        )}
        {!win.running && !win.preparing && (
          <DialogButtons
            primaryLabel="Start"
            onPrimary={onStart}
            onCancel={onCloseIdle}
            onHelp={() => setHelpOpen(true)}
          />
        )}
        {(win.running || win.progress > 0) && !win.complete && (
          <div className="mt-3">
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
  } else if (win.appKey === "settings") {
    body = (
      <SettingsPanel
        styles={styles}
        activated={windoorsActivated}
        trueOg={trueOg}
        wallpaper={wallpaper}
        nightLight={nightLight}
        volumeLevel={volumeLevel}
        onActivate={onActivateKey}
        onClose={onCloseIdle}
        onHelp={() => setHelpOpen(true)}
        onWallpaper={onWallpaper}
        onNightLight={onNightLight}
        onVolume={onVolume}
        onOpenUpdate={onOpenUpdate}
      />
    );
  } else if (win.appKey === "browser") {
    body = <BrowserPanel styles={styles} active={!win.closing} />;
  } else if (win.appKey === "chkdsk") {
    body = (
      <ChkdskPanel
        win={win}
        styles={styles}
        onStart={onStart}
        onClose={onCloseIdle}
        onPatch={onPatchWin}
        onHelp={() => setHelpOpen(true)}
      />
    );
  } else {
    body = (
      <>
        {win.appKey === "defrag" && (
          <GroupBox legend="Cluster map">
            <DefragMap progress={win.progress} running={win.running} seed={win.defragSeed} />
          </GroupBox>
        )}
        {(win.appKey === "scan" || win.appKey === "sfc") && (
          <GroupBox legend={win.appKey === "scan" ? "Scan log" : "SFC log"}>
            <div className="terminal-scan h-32 overflow-auto font-mono text-xs text-emerald-300 sm:h-40">
              {win.running && win.appKey === "scan" && <div className="scan-line" />}
              {win.logLines.length === 0 ? (
                <span className="text-white/30">{win.running ? "Working…" : "Click Start to begin."}</span>
              ) : (
                win.logLines.map((line, i) => <div key={`${i}-${line}`}>{line}</div>)
              )}
            </div>
          </GroupBox>
        )}
        {win.appKey === "drivers" && (
          <GroupBox legend="Devices">
            <div className="space-y-2">
              {win.drivers.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 text-xs">
                  <span>{d.name}</span>
                  <span className={d.status === "Up to date" ? "text-emerald-400" : "text-amber-400"}>{d.status}</span>
                </div>
              ))}
            </div>
          </GroupBox>
        )}
        {win.appKey === "cleanup" || win.appKey === "startup" ? (
          <GroupBox legend={win.appKey === "cleanup" ? "Files to remove" : "Startup impact"}>
            <p className="text-xs text-white/60">
              {win.phase || "Ready"} —{" "}
              {win.appKey === "cleanup"
                ? "Temporary files, thumbnails, and a little hope."
                : "Programs that launch at boot, except the ones that sneak back."}
            </p>
          </GroupBox>
        ) : null}
        {!win.running && !win.preparing && (
          <DialogButtons
            primaryLabel="Start"
            onPrimary={onStart}
            onCancel={onCloseIdle}
            onHelp={() => setHelpOpen(true)}
          />
        )}
        {(win.running || win.progress > 0) && !win.complete && (
          <div className="mt-3">
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
        win.preparing ? "cursor-wait-retro" : ""
      } ${
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
      onPointerDown={onFocus}
    >
      <div
        className="titlebar-grad flex h-11 shrink-0 items-center border-b border-white/5 px-2 sm:h-10 sm:cursor-move sm:px-2"
        onPointerDown={isMobileLayout ? undefined : onTitleDown}
      >
        <SystemMenu onClose={onCloseIdle} onAbout={onAbout} uid={`sys-${win.id}`} />
        <ToolIcon app={win.appKey} uid={`win-${win.id}`} className="mr-1.5 h-4 w-4 shrink-0" />
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
      {win.appKey !== "browser" && (
        <WindowMenuBar onClose={onCloseIdle} onAbout={onAbout} onHelp={() => setHelpOpen(true)} />
      )}
      <div
        className={`relative min-h-0 flex-1 overscroll-contain bg-zinc-950 ${
          win.appKey === "browser"
            ? "flex flex-col overflow-hidden p-0"
            : "overflow-y-auto p-4 sm:p-5"
        }`}
      >
        {body}
        {win.preparing && (
          <HourglassOverlay
            label={
              win.appKey === "scan"
                ? "Preparing to scan…"
                : win.appKey === "bios"
                  ? "Entering flash utility…"
                  : win.appKey === "defrag"
                    ? "Analyzing drive layout…"
                    : win.appKey === "update"
                      ? "Preparing install…"
                      : "Please wait…"
            }
          />
        )}
      </div>
      {win.appKey !== "browser" && (
        <StatusBar
          left={
            win.preparing
              ? "Busy"
              : win.running
                ? `${win.phase || "Working…"} · ${Math.floor(win.progress)}%`
                : win.complete
                  ? "Finished"
                  : "Ready"
          }
        />
      )}

      {helpOpen &&
        createPortal(
          <HelpDialog appKey={win.appKey} onClose={() => setHelpOpen(false)} onAbout={onAbout} />,
          document.body,
        )}

      {!isMobileLayout && !win.closing && (
        <>
          <div role="presentation" aria-hidden className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-se-resize" onPointerDown={(e) => onResizeDown(e, "se")}>
            <div className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-white/35" />
          </div>
          <div role="presentation" aria-hidden className="absolute bottom-0 left-3 right-4 z-10 h-2 cursor-s-resize" onPointerDown={(e) => onResizeDown(e, "s")} />
          <div role="presentation" aria-hidden className="absolute bottom-4 right-0 top-11 z-10 w-2 cursor-e-resize" onPointerDown={(e) => onResizeDown(e, "e")} />
          <div role="presentation" aria-hidden className="absolute bottom-4 left-0 top-11 z-10 w-2 cursor-w-resize" onPointerDown={(e) => onResizeDown(e, "w")} />
          <div role="presentation" aria-hidden className="absolute left-3 right-4 top-0 z-10 h-1.5 cursor-n-resize" onPointerDown={(e) => onResizeDown(e, "n")} />
          <div role="presentation" aria-hidden className="absolute right-0 top-0 z-20 h-3 w-3 cursor-ne-resize" onPointerDown={(e) => onResizeDown(e, "ne")} />
          <div role="presentation" aria-hidden className="absolute left-0 top-0 z-20 h-3 w-3 cursor-nw-resize" onPointerDown={(e) => onResizeDown(e, "nw")} />
          <div role="presentation" aria-hidden className="absolute bottom-0 left-0 z-20 h-3 w-3 cursor-sw-resize" onPointerDown={(e) => onResizeDown(e, "sw")} />
        </>
      )}
    </div>
  );
}

export const AppWindow = memo(AppWindowInner);
