import { useState } from "react";
import {
  COLOR_STYLES,
  PRODUCT_KEY,
  PRODUCT_KEY_SUFFIX,
  PRODUCT_NAME,
  VERSION,
  WALLPAPERS,
  type WallpaperId,
} from "@/lib/windoors/config";
import { DialogButtons, GroupBox } from "@/components/windoors/retro-chrome";

type Tab = "activation" | "personalization" | "update";

export function SettingsPanel({
  styles,
  activated,
  trueOg,
  wallpaper,
  nightLight,
  volumeLevel,
  onActivate,
  onClose,
  onHelp,
  onWallpaper,
  onNightLight,
  onVolume,
  onOpenUpdate,
}: {
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  activated: boolean;
  trueOg: boolean;
  wallpaper: WallpaperId;
  nightLight: boolean;
  volumeLevel: number;
  onActivate: (key: string) => { ok: boolean; trueOg?: boolean; reason?: string };
  onClose: () => void;
  onHelp: () => void;
  onWallpaper: (id: WallpaperId) => void;
  onNightLight: (v: boolean) => void;
  onVolume: (v: number) => void;
  onOpenUpdate: () => void;
}) {
  const [tab, setTab] = useState<Tab>("activation");
  const [segment, setSegment] = useState("");
  const [fullPaste, setFullPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  const tryActivate = () => {
    setErr(null);
    setMsg(null);
    const full = fullPaste.trim();
    const seg = segment.trim();
    const primary = full.length > 0 ? full : seg.length > 0 ? `${seg}-${PRODUCT_KEY_SUFFIX}` : "";
    const result = onActivate(primary);
    if (!result.ok && seg.length >= 5) {
      const retry = onActivate(seg);
      if (retry.ok) {
        setMsg(
          retry.trueOg
            ? "You are True OG. Your XP just +++ · health degradation disabled."
            : `${PRODUCT_NAME} has been activated. Thank you for your support (purely coincidental).`,
        );
        return;
      }
    }
    if (!result.ok) {
      setErr(
        result.reason === "short"
          ? "Enter the 5 characters shown as XXXXX on the desktop (anything works)."
          : "Enter a product key to continue.",
      );
      return;
    }
    setMsg(
      result.trueOg
        ? "You are True OG. Your XP just +++ · health degradation disabled."
        : `${PRODUCT_NAME} has been activated. Thank you for your support (purely coincidental).`,
    );
  };

  return (
    <div className="space-y-3">
      <div className="property-tabs" role="tablist" aria-label="Settings">
        {([
          ["activation", "Activation"],
          ["personalization", "Personalization"],
          ["update", "Windoors Update"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "activation" && (
        <div className="space-y-3">
          <p className={`text-sm font-semibold ${styles.icon}`}>System → Activation</p>
          <p className="text-xs text-white/50">
            Version {VERSION} · Product Key hint:{" "}
            <span className="font-mono text-white/70">{PRODUCT_KEY}</span>
          </p>

          {trueOg ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-950/40 p-4 text-center">
              <p className="text-lg font-bold text-amber-300">You are True OG</p>
              <p className="mt-1 text-sm text-white/70">Your XP just +++</p>
              <p className="mt-2 text-xs text-white/50">Health locked at 100%. Degradation is a myth now.</p>
            </div>
          ) : activated ? (
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-950/35 p-4 text-center">
              <p className="font-semibold text-emerald-300">{PRODUCT_NAME} is activated</p>
              <p className="mt-1 text-xs text-white/55">Activation watermark cleared. Creator credit remains.</p>
            </div>
          ) : (
            <GroupBox legend="Product key">
              <p className="text-xs text-white/55">
                Type the <span className="font-semibold text-white/80">5 characters</span> shown as{" "}
                <span className="font-mono">XXXXX</span> on the desktop. Anything is accepted.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={segment}
                  onChange={(e) =>
                    setSegment(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))
                  }
                  placeholder="XXXXX"
                  className="w-28 rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 font-mono text-sm tracking-widest text-white"
                  aria-label="First five characters of product key"
                />
                <span className="font-mono text-sm text-white/50">-{PRODUCT_KEY_SUFFIX}</span>
              </div>
              <p className="mt-3 text-[11px] text-white/40">Or paste a full key:</p>
              <input
                type="text"
                value={fullPaste}
                onChange={(e) => setFullPaste(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 font-mono text-xs text-white sm:text-sm"
                aria-label="Full product key"
              />
            </GroupBox>
          )}

          {err && <p className="text-xs text-red-400">{err}</p>}
          {msg && <p className={`text-center text-xs ${trueOg ? "text-amber-300/90" : "text-emerald-300/90"}`}>{msg}</p>}

          <DialogButtons
            primaryLabel={activated || trueOg ? "OK" : `Activate ${PRODUCT_NAME}`}
            onPrimary={activated || trueOg ? onClose : tryActivate}
            onCancel={onClose}
            onHelp={onHelp}
            cancelLabel="Cancel"
          />
        </div>
      )}

      {tab === "personalization" && (
        <div className="space-y-3">
          <GroupBox legend="Background">
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onWallpaper(w.id)}
                  className={`overflow-hidden rounded-lg border text-left ${
                    wallpaper === w.id ? "border-sky-400 ring-1 ring-sky-400" : "border-white/15"
                  }`}
                >
                  <div
                    className={`h-14 ${
                      w.id === "bliss" ? "wallpaper-bliss" : w.id === "teal" ? "wallpaper-teal" : "desktop-wallpaper"
                    }`}
                  />
                  <div className="px-2 py-1.5">
                    <div className="text-[11px] font-medium">{w.label}</div>
                    <div className="text-[9px] text-white/40">{w.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </GroupBox>
          <GroupBox legend="Color & sounds">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>Night light</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={nightLight}
                onChange={(e) => onNightLight(e.target.checked)}
              />
            </label>
            <label className="mt-3 block text-sm">
              System sounds
              <input
                type="range"
                min={0}
                max={100}
                value={volumeLevel}
                onChange={(e) => onVolume(Number(e.target.value))}
                className="mt-1 w-full accent-sky-400"
              />
              <span className="text-[11px] text-white/45">{volumeLevel}%</span>
            </label>
          </GroupBox>
          <DialogButtons primaryLabel="OK" onPrimary={onClose} onCancel={onClose} onHelp={onHelp} />
        </div>
      )}

      {tab === "update" && (
        <div className="space-y-3">
          <GroupBox legend="Windoors Update">
            <p className="text-sm text-white/75">Updates are delivered as 08-2026 catalog packages.</p>
            <p className="mt-1 text-[11px] text-white/45">
              Checking is required before install. A restart after servicing may raise or lower decay.
            </p>
            <button
              type="button"
              onClick={onOpenUpdate}
              className="btn-default mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            >
              Open Windoors Update
            </button>
          </GroupBox>
          <GroupBox legend="Pause updates">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-sky-400"
                checked={pauseUpdates}
                onChange={(e) => {
                  setPauseUpdates(e.target.checked);
                  if (e.target.checked) {
                    window.setTimeout(() => setPauseUpdates(false), 2200);
                  }
                }}
              />
              <span>
                Pause updates for 7 days
                <span className="mt-0.5 block text-[11px] text-white/40">
                  Policy applied… then politely declined by the servicing stack.
                </span>
              </span>
            </label>
          </GroupBox>
          <DialogButtons primaryLabel="OK" onPrimary={onClose} onCancel={onClose} onHelp={onHelp} />
        </div>
      )}
    </div>
  );
}
