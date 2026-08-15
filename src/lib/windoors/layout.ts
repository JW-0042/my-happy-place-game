import type { AppKey } from "@/lib/windoors/config";
import type { Toast, WindowState } from "@/lib/windoors/types";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function defaultWindowSize(appKey: AppKey): { w: number; h: number } {
  const wide =
    appKey === "update" ||
    appKey === "defrag" ||
    appKey === "support" ||
    appKey === "bios" ||
    appKey === "chkdsk" ||
    appKey === "browser" ||
    appKey === "settings";
  const tall =
    appKey === "chkdsk" ||
    appKey === "update" ||
    appKey === "bios" ||
    appKey === "support" ||
    appKey === "defrag" ||
    appKey === "browser" ||
    appKey === "settings";
  return {
    w: appKey === "browser" ? 720 : wide ? 560 : 480,
    h: appKey === "browser" ? 640 : tall ? 560 : 460,
  };
}

export function computeWindowPos(
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

export function healthTone(health: number) {
  if (health > 75) return { label: "OPTIMAL", color: "text-emerald-400", bar: "from-emerald-400 to-cyan-400" };
  if (health > 40) return { label: "NEEDS ATTENTION", color: "text-amber-400", bar: "from-amber-400 to-orange-400" };
  return { label: "CRITICAL", color: "text-red-400", bar: "from-red-500 to-rose-400" };
}

export function toolVisualStatus(
  key: AppKey,
  toasts: Toast[],
  windows: WindowState[],
): "ok" | "attention" | "urgent" {
  const toastPending = toasts.some((t) => t.kind === "task" && t.appKey === key && !t.leaving);
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

export function statusRingClass(status: "ok" | "attention" | "urgent") {
  if (status === "urgent") return "icon-status-urgent";
  if (status === "attention") return "icon-status-attention";
  return "icon-status-ok";
}

export function shouldSpawnToast(
  key: AppKey,
  windows: WindowState[],
  existing: Toast[],
  supportActive: boolean,
  remoteSession: boolean,
  sleepMode: boolean,
) {
  if (supportActive || remoteSession || sleepMode) return false;
  if (key === "support" || key === "browser" || key === "settings") return false;
  if (existing.some((t) => t.kind === "task" && t.appKey === key && !t.leaving)) return false;
  const win = windows.find((w) => w.appKey === key && !w.closing);
  if (win?.running) return false;
  return true;
}
