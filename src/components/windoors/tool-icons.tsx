import { memo, type ReactNode } from "react";
import type { AppKey } from "@/lib/windoors/config";

/** Fluent-style squircle tiles — one asset for desktop, Start, and taskbar. */
const PALETTE: Record<AppKey, { a: string; b: string }> = {
  update: { a: "#1d4ed8", b: "#38bdf8" },
  scan: { a: "#047857", b: "#34d399" },
  defrag: { a: "#b45309", b: "#fbbf24" },
  cleanup: { a: "#6d28d9", b: "#c084fc" },
  chkdsk: { a: "#0f766e", b: "#2dd4bf" },
  sfc: { a: "#4338ca", b: "#a5b4fc" },
  drivers: { a: "#0369a1", b: "#7dd3fc" },
  startup: { a: "#be123c", b: "#fb7185" },
  bios: { a: "#c2410c", b: "#fdba74" },
  support: { a: "#0e7490", b: "#67e8f9" },
  browser: { a: "#334155", b: "#94a3b8" },
  settings: { a: "#3f3f46", b: "#a1a1aa" },
};

function Tile({ uid, a, b }: { uid: string; a: string; b: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="6%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="42%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.7" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.25" fill={`url(#${uid}-bg)`} />
      <rect x="1" y="1" width="30" height="30" rx="8.25" fill={`url(#${uid}-sheen)`} />
      <rect
        x="1.4"
        y="1.4"
        width="29.2"
        height="29.2"
        rx="7.6"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.22"
        strokeWidth="0.9"
      />
    </>
  );
}

function G({ children }: { children: ReactNode }) {
  return (
    <g fill="#fff" fillOpacity="0.96" stroke="none">
      {children}
    </g>
  );
}

function glyph(app: AppKey): ReactNode {
  switch (app) {
    case "update":
      return (
        <G>
          <path d="M15.1 7.2h1.8c.5 0 .9.4.9.9v8.2h2.4c.7 0 1 .9.5 1.4l-4.2 4.3c-.3.3-.8.3-1.1 0l-4.2-4.3c-.5-.5-.2-1.4.5-1.4h2.4V8.1c0-.5.4-.9.9-.9Z" />
          <path d="M8.6 24.2h14.8c.5 0 .9.4.9.9v.6c0 .5-.4.9-.9.9H8.6c-.5 0-.9-.4-.9-.9v-.6c0-.5.4-.9.9-.9Z" />
        </G>
      );
    case "scan":
      return (
        <G>
          <path d="M16 6.4 24.2 9.2v6.4c0 5.1-3.4 8.6-8.2 10-4.8-1.4-8.2-4.9-8.2-10V9.2L16 6.4Z" />
          <path
            d="M12.3 16.1 14.8 18.6 20.1 13.2"
            fill="none"
            stroke="#047857"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
    case "defrag": {
      const cells: [number, number, string][] = [
        [0, 0, "#f8fafc"],
        [1, 0, "#93c5fd"],
        [2, 0, "#f8fafc"],
        [3, 0, "#fca5a5"],
        [0, 1, "#60a5fa"],
        [1, 1, "#fde047"],
        [2, 1, "#f8fafc"],
        [3, 1, "#60a5fa"],
        [0, 2, "#86efac"],
        [1, 2, "#60a5fa"],
        [2, 2, "#f8fafc"],
        [3, 2, "#1d4ed8"],
      ];
      const x0 = 8.2;
      const y0 = 9.4;
      const s = 3.45;
      const gap = 0.7;
      return (
        <g filter="none">
          {cells.map(([c, r, fill], i) => (
            <rect
              key={i}
              x={x0 + c * (s + gap)}
              y={y0 + r * (s + gap)}
              width={s}
              height={s}
              rx={0.55}
              fill={fill}
            />
          ))}
        </g>
      );
    }
    case "cleanup":
      return (
        <G>
          <path d="M12.2 11.2h7.6l.8 13.1c.05.8-.6 1.5-1.4 1.5h-6.4c-.8 0-1.45-.7-1.4-1.5l.8-13.1Z" />
          <rect x="10.4" y="8.8" width="11.2" height="2.4" rx="0.8" />
          <rect x="14.6" y="6.6" width="2.8" height="2.4" rx="0.7" />
          <path d="M8.4 9.2 7.2 7.4M24 9.2 25.2 7.4M16 5.4 16 3.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </G>
      );
    case "chkdsk":
      return (
        <G>
          <ellipse cx="16" cy="11.2" rx="8.2" ry="3.1" />
          <path d="M7.8 11.2v7.4c0 1.8 3.7 3.2 8.2 3.2s8.2-1.4 8.2-3.2v-7.4c-1.6 1.6-4.7 2.6-8.2 2.6s-6.6-1-8.2-2.6Z" />
          <path
            d="M12.4 16.6 14.8 19 20 13.6"
            fill="none"
            stroke="#0f766e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
    case "sfc":
      return (
        <G>
          <path d="M10.2 7.4h7.2l4.4 4.4v12.2c0 .7-.6 1.3-1.3 1.3H10.2c-.7 0-1.3-.6-1.3-1.3V8.7c0-.7.6-1.3 1.3-1.3Z" />
          <path d="M17.4 7.6v3.8h3.8" fill="#c7d2fe" />
          <path
            d="M12.6 17.4 14.8 19.6 19.4 14.8"
            fill="none"
            stroke="#312e81"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      );
    case "drivers":
      return (
        <G>
          <rect x="10.2" y="10.2" width="11.6" height="11.6" rx="1.4" />
          <rect x="13.2" y="13.2" width="5.6" height="5.6" rx="0.7" fill="#0369a1" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={12.2 + i * 3.2} y="7.4" width="1.5" height="2.8" rx="0.3" />
              <rect x={12.2 + i * 3.2} y="21.8" width="1.5" height="2.8" rx="0.3" />
              <rect x="7.4" y={12.2 + i * 3.2} width="2.8" height="1.5" rx="0.3" />
              <rect x="21.8" y={12.2 + i * 3.2} width="2.8" height="1.5" rx="0.3" />
            </g>
          ))}
        </G>
      );
    case "startup":
      return (
        <G>
          <path d="M17.6 6.8 9.8 17.4h5.2l-1.4 7.8 8.4-11.4h-5.2L17.6 6.8Z" />
        </G>
      );
    case "bios":
      return (
        <G>
          <rect x="8.4" y="8.4" width="15.2" height="15.2" rx="2" />
          <rect x="12.2" y="12.2" width="7.6" height="7.6" rx="1" fill="#9a3412" />
          <rect x="14.6" y="6.2" width="2.8" height="2.4" rx="0.4" />
          <path d="M23.8 7.2 22.4 9.2 25 9.8 23.2 11.6" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </G>
      );
    case "support":
      return (
        <G>
          <path d="M8.4 15.2c0-4.2 3.4-7.6 7.6-7.6s7.6 3.4 7.6 7.6v4.2c0 1.1-.9 2-2 2h-1.1v-6.4c0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5V21.4H10.4c-1.1 0-2-.9-2-2v-4.2Z" />
          <rect x="6.8" y="14.6" width="3.2" height="6.4" rx="1.4" />
          <rect x="22" y="14.6" width="3.2" height="6.4" rx="1.4" />
          <path d="M16 22.4c2.2 0 3.8 1 3.8 1v.8H12.2v-.8s1.6-1 3.8-1Z" />
        </G>
      );
    case "browser":
      return (
        <G>
          <circle cx="16" cy="16" r="8.4" fill="none" stroke="#fff" strokeWidth="1.85" />
          <ellipse cx="16" cy="16" rx="4" ry="8.4" fill="none" stroke="#fff" strokeWidth="1.5" />
          <path d="M8 16h16M8.8 12.2h14.4M8.8 19.8h14.4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </G>
      );
    case "settings":
      return (
        <G>
          <path d="M16 8.1 17.6 6.8l1.7 1.5 2.2-.3.5 2.2 2.1 1.1-.8 2.1 1.4 1.8-1.6 1.6 1.6 1.6-1.4 1.8.8 2.1-2.1 1.1-.5 2.2-2.2-.3-1.7 1.5-1.6-1.3-1.6 1.3-1.7-1.5-2.2.3-.5-2.2-2.1-1.1.8-2.1-1.4-1.8 1.6-1.6-1.6-1.6 1.4-1.8-.8-2.1 2.1-1.1.5-2.2 2.2.3 1.7-1.5L16 8.1Z" />
          <circle cx="16" cy="16" r="3.15" fill="#3f3f46" />
        </G>
      );
    default:
      return null;
  }
}

function ToolIconInner({
  app,
  className,
  uid,
}: {
  app: AppKey;
  className?: string;
  uid?: string;
}) {
  const id = (uid ?? app).replace(/[^a-zA-Z0-9_-]/g, "");
  const pal = PALETTE[app];
  return (
    <svg
      viewBox="0 0 32 32"
      className={`tool-icon ${className ?? ""}`}
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      <Tile uid={id} a={pal.a} b={pal.b} />
      <g filter={`url(#${id}-d)`}>{glyph(app)}</g>
    </svg>
  );
}

export const ToolIcon = memo(ToolIconInner);
