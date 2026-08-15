import { useState } from "react";
import {
  COLOR_STYLES,
  PRODUCT_KEY,
  PRODUCT_KEY_SUFFIX,
  PRODUCT_NAME,
  VERSION,
} from "@/lib/windoors/config";

export function SettingsPanel({
  styles,
  activated,
  trueOg,
  onActivate,
  onClose,
}: {
  styles: (typeof COLOR_STYLES)[keyof typeof COLOR_STYLES];
  activated: boolean;
  trueOg: boolean;
  onActivate: (key: string) => { ok: boolean; trueOg?: boolean; reason?: string };
  onClose: () => void;
}) {
  const [segment, setSegment] = useState("");
  const [fullPaste, setFullPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const tryActivate = () => {
    setErr(null);
    setMsg(null);
    const full = fullPaste.trim();
    const seg = segment.trim();
    // Prefer full paste when provided; else build from 5-char segment + suffix
    const primary = full.length > 0 ? full : seg.length > 0 ? `${seg}-${PRODUCT_KEY_SUFFIX}` : "";
    const result = onActivate(primary);
    if (!result.ok && seg.length >= 5) {
      // retry segment alone (for easter-egg partial pastes)
      const retry = onActivate(seg);
      if (retry.ok) {
        if (retry.trueOg) {
          setMsg("You are True OG. Your XP just +++ · health degradation disabled.");
        } else {
          setMsg(`${PRODUCT_NAME} has been activated. Thank you for your support (purely coincidental).`);
        }
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
    if (result.trueOg) {
      setMsg("You are True OG. Your XP just +++ · health degradation disabled.");
    } else {
      setMsg(`${PRODUCT_NAME} has been activated. Thank you for your support (purely coincidental).`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-sm font-semibold ${styles.icon}`}>System → Activation</p>
        <p className="mt-1 text-xs text-white/50">
          Version {VERSION} · Product Key hint on desktop:{" "}
          <span className="font-mono text-white/70">{PRODUCT_KEY}</span>
        </p>
      </div>

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
        <>
          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              Product key
            </p>
            <p className="mt-1 text-xs text-white/55">
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
                className="w-28 rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 font-mono text-sm tracking-widest text-white outline-none ring-sky-400/40 focus:ring-2"
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
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 font-mono text-xs text-white outline-none ring-sky-400/40 focus:ring-2 sm:text-sm"
              aria-label="Full product key"
            />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            type="button"
            onClick={tryActivate}
            className={`w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg ${styles.button}`}
          >
            Activate {PRODUCT_NAME}
          </button>
        </>
      )}

      {msg && !trueOg && <p className="text-center text-xs text-emerald-300/90">{msg}</p>}
      {msg && trueOg && <p className="text-center text-xs text-amber-300/90">{msg}</p>}

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-white/45">
        Optional diagnostic data, night light, and other myths live elsewhere. This panel only
        handles activation. Any resemblance to real license keys is purely coincidental and
        nostalgic.
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl border border-white/15 py-2.5 text-sm text-white/70 hover:bg-white/5"
      >
        Close
      </button>
    </div>
  );
}
