import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { PRODUCT_NAME, VERSION, type AppKey } from "@/lib/windoors/config";
import { WindoorsLogo } from "@/components/windoors/windoors-logo";

export const HELP_BLURBS: Record<AppKey, { title: string; body: string }> = {
  update: {
    title: "Windoors Update",
    body: "Downloads packages named after the current month, then asks you to restart. Catalog may be stale until you Check for updates. A restart may raise or lower decay. This is working as designed.",
  },
  scan: {
    title: "Windoors Security",
    body: "Cannot scan until definitions are current. Definitions come from Windoors Update. After a successful scan, definitions may randomly expire again. Do not disable real-time protection; it is already decorative.",
  },
  defrag: {
    title: "Disk Defragmenter",
    body: "Rearranges files so they occupy contiguous clusters. Watch the colored map like it is 1998. Unmovable clusters (red) stay put. Estimated time remaining: several childhoods.",
  },
  cleanup: {
    title: "Disk Cleanup",
    body: "Removes temporary files, thumbnails, and a little hope. Freed space is immediately reclaimed by telemetry. Optional: keep downloaded files you will never install.",
  },
  chkdsk: {
    title: "ScanDisk / Check Disk",
    body: "Standard checks files and folders. Thorough also scans the disk surface, slowly. Automatically fix errors is on by default because you would have checked it anyway.",
  },
  sfc: {
    title: "System File Checker",
    body: "Verifies protected system files against a catalog that is itself slightly wrong. Found issues are repaired from the component store, probably.",
  },
  drivers: {
    title: "Driver Updater",
    body: "Scans for outdated GPU, audio, and mystery devices. Installing a driver from 08-2026 may require a reboot that nobody scheduled.",
  },
  startup: {
    title: "Startup Optimizer",
    body: "Disables programs that launch at boot, except the ones that put themselves back. Boot time improvement: placebo ± 12%.",
  },
  bios: {
    title: "BIOS (UEFI) Update",
    body: "Writes a signed capsule to SPI flash. Success lowers idle wake frequency (health decays slower). Failure is a stop code. Do not remove AC power. Do not blink.",
  },
  support: {
    title: "Remote Support",
    body: "Pauses health decay and new notifications so you can AFK. Each call slightly raises future decay. Support is provided by x.com/thimothybsirius and the mighty Grok AI.",
  },
  browser: {
    title: "Internet Discovery Browser",
    body: "Opens the only site this SKU is licensed to display. Other URLs are a myth. Status bar always reads Done.",
  },
  settings: {
    title: "Settings",
    body: "Activate Windoors with any five characters, or the legendary XP key if you are a True OG. Personalization changes wallpaper. Update tab opens the real updater.",
  },
};

export function GroupBox({
  legend,
  children,
  className = "",
}: {
  legend: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`group-box ${className}`}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function DialogButtons({
  primaryLabel = "Start",
  cancelLabel = "Cancel",
  helpLabel = "Help",
  onPrimary,
  onCancel,
  onHelp,
  primaryDisabled,
  extra,
}: {
  primaryLabel?: string;
  cancelLabel?: string;
  helpLabel?: string;
  onPrimary?: () => void;
  onCancel?: () => void;
  onHelp?: () => void;
  primaryDisabled?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="dialog-buttons">
      {extra}
      {onPrimary && (
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="btn-default rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
        >
          {primaryLabel}
        </button>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/18 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
        >
          {cancelLabel}
        </button>
      )}
      {onHelp && (
        <button
          type="button"
          onClick={onHelp}
          className="rounded-lg border border-white/12 bg-transparent px-5 py-2.5 text-sm text-white/70 hover:bg-white/8"
        >
          {helpLabel}
        </button>
      )}
    </div>
  );
}

export function WindowMenuBar({
  onClose,
  onAbout,
  onHelp,
}: {
  onClose: () => void;
  onAbout: () => void;
  onHelp: () => void;
}) {
  const [open, setOpen] = useState<null | "file" | "view" | "help">(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="window-menubar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="relative">
        <button type="button" className={open === "file" ? "on" : ""} onClick={() => setOpen(open === "file" ? null : "file")}>
          File
        </button>
        {open === "file" && (
          <div className="menu-flyout">
            <button type="button" onClick={() => { setOpen(null); onClose(); }}>
              Close<span>Alt+F4</span>
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <button type="button" className={open === "view" ? "on" : ""} onClick={() => setOpen(open === "view" ? null : "view")}>
          View
        </button>
        {open === "view" && (
          <div className="menu-flyout">
            <p className="px-3 py-1.5 text-[11px] text-white/45">✓ Status bar</p>
            <p className="px-3 py-1.5 text-[11px] text-white/30">Toolbar (always on)</p>
          </div>
        )}
      </div>
      <div className="relative">
        <button type="button" className={open === "help" ? "on" : ""} onClick={() => setOpen(open === "help" ? null : "help")}>
          Help
        </button>
        {open === "help" && (
          <div className="menu-flyout">
            <button type="button" onClick={() => { setOpen(null); onHelp(); }}>
              Help Topics<span>F1</span>
            </button>
            <button type="button" onClick={() => { setOpen(null); onAbout(); }}>
              About {PRODUCT_NAME}…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBar({ left, right }: { left: string; right?: string }) {
  return (
    <div className="status-bar">
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0 text-white/40">{right ?? "For Help, press F1"}</span>
    </div>
  );
}

export function SystemMenu({
  onClose,
  onAbout,
  uid = "sysmenu",
}: {
  onClose: () => void;
  onAbout: () => void;
  uid?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative mr-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="System menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onDoubleClick={() => onClose()}
        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10"
      >
        <WindoorsLogo className="h-4 w-4" uid={uid} />
      </button>
      {open && (
        <div className="menu-flyout left-0 top-full z-30 mt-0.5">
          <p className="px-3 py-1.5 text-[11px] text-white/30">Restore</p>
          <p className="px-3 py-1.5 text-[11px] text-white/30">Move</p>
          <p className="px-3 py-1.5 text-[11px] text-white/30">Size</p>
          <hr className="border-white/10" />
          <button type="button" onClick={() => { setOpen(false); onClose(); }}>
            Close<span>Alt+F4</span>
          </button>
          <button type="button" onClick={() => { setOpen(false); onAbout(); }}>
            About {PRODUCT_NAME}…
          </button>
        </div>
      )}
    </div>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={onClose}
      data-focus-trap="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-windoors-title"
        className="window-shell w-full max-w-md overflow-hidden rounded-xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="titlebar-grad flex h-10 items-center px-3">
          <WindoorsLogo className="mr-2 h-4 w-4" uid="about" />
          <span id="about-windoors-title" className="flex-1 text-sm font-medium">
            About {PRODUCT_NAME}
          </span>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 bg-zinc-950 p-5">
          <div className="flex items-start gap-4">
            <WindoorsLogo className="h-14 w-14 shrink-0" uid="about-lg" />
            <div>
              <p className="text-base font-semibold">{PRODUCT_NAME} Caretaker</p>
              <p className="mt-0.5 font-mono text-xs text-white/55">Version {VERSION}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                © Megahard Corporation. This product is licensed to: Desktop Caretaker
                (evaluation). Physical memory: enough. System resources: 12% free.
              </p>
            </div>
          </div>
          <GroupBox legend="Legal">
            <p className="text-[11px] leading-relaxed text-white/55">
              Any resemblance to another operating system is purely coincidental. Created with GROK AI.
              Support rituals: x.com/thimothybsirius.
            </p>
          </GroupBox>
          <DialogButtons primaryLabel="OK" onPrimary={onClose} />
        </div>
      </div>
    </div>
  );
}

export function HelpDialog({
  appKey,
  onClose,
  onAbout,
}: {
  appKey: AppKey;
  onClose: () => void;
  onAbout: () => void;
}) {
  const blurb = HELP_BLURBS[appKey];
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="window-shell w-full max-w-sm overflow-hidden rounded-xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="titlebar-grad flex h-10 items-center px-3">
          <span className="flex-1 text-sm font-medium">{blurb.title} Help</span>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 bg-zinc-950 p-5">
          <p className="text-sm leading-relaxed text-white/80">{blurb.body}</p>
          <DialogButtons
            primaryLabel="OK"
            onPrimary={onClose}
            onHelp={() => {
              onClose();
              onAbout();
            }}
            helpLabel={`About ${PRODUCT_NAME}…`}
          />
        </div>
      </div>
    </div>
  );
}

export function HourglassOverlay({ label }: { label: string }) {
  return (
    <div className="hourglass-overlay" aria-live="polite">
      <div className="hourglass" aria-hidden />
      <p className="mt-3 text-sm text-white/80">{label}</p>
    </div>
  );
}

export function MarqueeBar({ color = "#3b82f6" }: { color?: string }) {
  return (
    <div className="progress-marquee" role="progressbar" aria-valuetext="Checking">
      <i style={{ background: color }} />
    </div>
  );
}
