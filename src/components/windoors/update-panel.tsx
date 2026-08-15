import type { CSSProperties } from "react";
import { Check, RefreshCw } from "lucide-react";
import { COLOR_STYLES } from "@/lib/windoors/config";
import { kindLabel } from "@/lib/windoors/updates";
import type { WindowState } from "@/lib/windoors/types";

export function UpdatePanel({
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
            This device has the latest 08-2026 packages. A restart may still be pending to seal the servicing stack.
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
