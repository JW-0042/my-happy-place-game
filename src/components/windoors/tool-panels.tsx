import { useState, type CSSProperties } from "react";
import { Disc3, ExternalLink, HardDrive, Lock, RotateCw, Settings2 } from "lucide-react";

import { BROWSER_HOME, COLOR_STYLES } from "@/lib/windoors/config";
import type { WindowState } from "@/lib/windoors/types";

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



export function BrowserPanel({
  styles,
  active = true,
}: {
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  active?: boolean;
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
          src={active ? url : "about:blank"}
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

export function ChkdskPanel({
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
