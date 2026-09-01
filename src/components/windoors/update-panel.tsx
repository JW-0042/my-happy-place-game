import type { CSSProperties } from "react";
import { Check, RefreshCw } from "lucide-react";
import { COLOR_STYLES } from "@/lib/windoors/config";
import { kindLabel } from "@/lib/windoors/updates";
import type { WindowState } from "@/lib/windoors/types";
import { DialogButtons, GroupBox, MarqueeBar } from "@/components/windoors/retro-chrome";

export function UpdatePanel({
  win,
  styles,
  onCheck,
  onStart,
  onCancel,
  onHelp,
}: {
  win: WindowState;
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  onCheck: () => void;
  onStart: () => void;
  onCancel: () => void;
  onHelp: () => void;
}) {
  const checking = win.updateUi === "checking";
  const needsCheck = win.updateUi === "needs-check";
  const ready = win.updateUi === "ready";
  const installing = win.updateUi === "installing" || win.running;
  const upToDate = win.updateUi === "up-to-date";

  if (upToDate) {
    return (
      <>
        <GroupBox legend="Status">
          <div className="py-2 text-center">
            <Check className="mx-auto h-10 w-10 text-emerald-400" strokeWidth={2.5} />
            <h3 className="mt-2 text-base font-semibold text-emerald-300">All updates are installed</h3>
            <p className="mt-1 text-xs text-white/60">
              This device has the latest 08-2026 packages. A restart may still be pending to seal the servicing stack.
            </p>
            {win.updateHeadline && (
              <p className="mt-2 text-[11px] text-white/40">Last installed: {win.updateHeadline}</p>
            )}
          </div>
        </GroupBox>
        <DialogButtons
          primaryLabel="Check for updates"
          onPrimary={onCheck}
          onCancel={onCancel}
          onHelp={onHelp}
        />
      </>
    );
  }

  return (
    <>
      <GroupBox legend="Catalog">
        <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-blue-300/70">08-2026</div>
            <div className="mt-0.5 font-semibold text-blue-100">{win.updateHeadline || "pending check"}</div>
          </div>
          <div className="text-right">
            <div className="text-white/50">Total size</div>
            <div className="font-mono text-sm">{win.updateTotalSize}</div>
          </div>
        </div>
        {installing && (
          <div className="mt-2 text-white/55">
            ETA {win.etaMin} min · installing package {Math.max(1, win.updateActivePkg + 1)}/
            {Math.max(1, win.updatePackages.length)}
          </div>
        )}
      </GroupBox>

      {needsCheck && (
        <GroupBox legend="Action required" className="mt-3">
          <p className="text-sm font-semibold text-sky-200">Check for updates required</p>
          <p className="mt-1 text-xs text-white/65">
            Your update catalog may be out of date. Recheck for the latest <strong>08-2026</strong> packages before installing.
          </p>
        </GroupBox>
      )}

      {checking && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-sky-200">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Contacting Windoors Update servers…
          </div>
          <MarqueeBar color={styles.bar} />
        </div>
      )}

      {win.updatePackages.length > 0 && (
        <GroupBox legend="Packages" className="mt-3">
          <div className="max-h-40 space-y-2 overflow-y-auto sm:max-h-48">
            {win.updatePackages.map((pkg, i) => {
              const active = installing && i === win.updateActivePkg;
              const done = installing && i < win.updateActivePkg;
              return (
                <div
                  key={pkg.id}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    active
                      ? "border-blue-400/50 bg-blue-950/50"
                      : done
                        ? "border-emerald-500/20 bg-emerald-950/20"
                        : "border-white/10 bg-black/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-white/40">
                        {kindLabel(pkg.kind)}
                        {active ? " · installing" : done ? " · done" : ""}
                      </div>
                      <div className="mt-0.5 text-xs leading-snug text-white/90">{pkg.title}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-white/45">{pkg.size}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GroupBox>
      )}

      {!installing && (
        <DialogButtons
          primaryLabel={checking ? "Checking…" : ready ? "Download & install" : "Check for updates"}
          onPrimary={ready ? onStart : onCheck}
          primaryDisabled={checking}
          onCancel={onCancel}
          onHelp={onHelp}
        />
      )}

      {installing && (
        <div className="mt-3">
          <div className="progress-container h-3 bg-zinc-800">
            <div
              className="progress-bar h-3"
              style={{ width: `${win.progress}%`, "--bar-color": styles.bar } as CSSProperties}
            />
          </div>
          <div className="mt-2 text-center text-xs tabular-nums">{Math.floor(win.progress)}%</div>
        </div>
      )}
    </>
  );
}
