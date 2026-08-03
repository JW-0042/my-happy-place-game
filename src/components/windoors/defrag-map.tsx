import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Classic Windows 98–style cluster map:
 * free (white), used (blue), optimized (dark blue), system (green),
 * unmovable (red), reading (yellow), writing (cyan).
 */

export type ClusterKind =
  | "free"
  | "used"
  | "optimized"
  | "system"
  | "unmovable"
  | "reading"
  | "writing";

const COLS = 28;
const ROWS = 12;
const TOTAL = COLS * ROWS;

const COLORS: Record<ClusterKind, string> = {
  free: "#f0f0f0",
  used: "#0000aa",
  optimized: "#000066",
  system: "#008000",
  unmovable: "#aa0000",
  reading: "#ffff00",
  writing: "#00ffff",
};

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a fragmented drive layout (stable per seed). */
function buildInitialMap(seed: number): ClusterKind[] {
  const rand = mulberry32(seed);
  const cells: ClusterKind[] = Array.from({ length: TOTAL }, () => "free");

  // System / unmovable blocks near the start (like Win98)
  for (let i = 0; i < 18; i++) cells[i] = rand() < 0.35 ? "unmovable" : "system";

  // Sprinkle fragmented used clusters across the disk
  let placed = 0;
  const targetUsed = Math.floor(TOTAL * 0.52);
  while (placed < targetUsed) {
    const i = Math.floor(rand() * TOTAL);
    if (cells[i] !== "free") continue;
    // small runs of 1–5 clusters (fragmented files)
    const run = 1 + Math.floor(rand() * 5);
    for (let k = 0; k < run && i + k < TOTAL && placed < targetUsed; k++) {
      if (cells[i + k] === "free") {
        cells[i + k] = "used";
        placed++;
      }
    }
  }

  return cells;
}

function consolidateTowardOptimized(
  initial: ClusterKind[],
  progress: number,
): { cells: ClusterKind[]; readIdx: number; writeIdx: number } {
  const p = Math.max(0, Math.min(1, progress / 100));
  const cells = initial.slice() as ClusterKind[];

  // Collect indices of movable used data (in scan order)
  const usedIdx: number[] = [];
  for (let i = 0; i < TOTAL; i++) {
    if (initial[i] === "used") usedIdx.push(i);
  }

  // Destination region starts after system/unmovable block
  let destStart = 0;
  while (destStart < TOTAL && (initial[destStart] === "system" || initial[destStart] === "unmovable")) {
    destStart++;
  }

  const toMove = Math.floor(usedIdx.length * p);
  const moved = usedIdx.slice(0, toMove);

  // Clear moved sources back to free (except if already destination)
  const destSet = new Set<number>();
  for (let m = 0; m < moved.length; m++) {
    destSet.add(destStart + m);
  }

  for (const src of moved) {
    if (!destSet.has(src)) cells[src] = "free";
  }

  // Write optimized contiguous block
  for (let m = 0; m < moved.length; m++) {
    const d = destStart + m;
    if (d >= TOTAL) break;
    if (cells[d] === "system" || cells[d] === "unmovable") continue;
    cells[d] = "optimized";
  }

  // Active read/write heads for the classic "watching paint dry" effect
  let readIdx = -1;
  let writeIdx = -1;
  if (p > 0.02 && p < 0.98 && usedIdx.length > 0) {
    const next = Math.min(usedIdx.length - 1, toMove);
    readIdx = usedIdx[next] ?? usedIdx[usedIdx.length - 1] ?? -1;
    writeIdx = destStart + toMove;
    if (writeIdx >= TOTAL) writeIdx = TOTAL - 1;
    if (readIdx >= 0 && cells[readIdx] !== "system" && cells[readIdx] !== "unmovable") {
      cells[readIdx] = "reading";
    }
    if (
      writeIdx >= 0 &&
      writeIdx < TOTAL &&
      cells[writeIdx] !== "system" &&
      cells[writeIdx] !== "unmovable"
    ) {
      cells[writeIdx] = "writing";
    }
  }

  // When done, everything movable is optimized; leftover used → optimized if contiguous
  if (p >= 0.99) {
    for (let i = 0; i < TOTAL; i++) {
      if (cells[i] === "used" || cells[i] === "reading" || cells[i] === "writing") {
        cells[i] = "optimized";
      }
    }
  }

  return { cells, readIdx, writeIdx };
}

const LEGEND: { kind: ClusterKind; label: string }[] = [
  { kind: "free", label: "Free" },
  { kind: "used", label: "Data" },
  { kind: "optimized", label: "Optimized" },
  { kind: "system", label: "System" },
  { kind: "unmovable", label: "Unmovable" },
  { kind: "reading", label: "Reading" },
  { kind: "writing", label: "Writing" },
];

export function DefragMap({
  progress,
  running,
  seed = 311,
}: {
  progress: number;
  running: boolean;
  seed?: number;
}) {
  const initial = useMemo(() => buildInitialMap(seed), [seed]);
  const [pulse, setPulse] = useState(0);
  const blinkRef = useRef(0);

  // Blink read/write heads like the real Win98 UI
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      blinkRef.current += 1;
      setPulse(blinkRef.current);
    }, 180);
    return () => window.clearInterval(id);
  }, [running]);

  const { cells, readIdx, writeIdx } = useMemo(
    () => consolidateTowardOptimized(initial, running || progress > 0 ? progress : 0),
    [initial, progress, running],
  );

  const showHeads = running && progress > 0 && progress < 100;
  const blinkOn = pulse % 2 === 0;

  return (
    <div className="mb-5 select-none sm:mb-6">
      {/* Win98-ish sunken panel */}
      <div
        className="rounded-sm border-2 p-2"
        style={{
          background: "#c0c0c0",
          borderColor: "#ffffff #808080 #808080 #ffffff",
          boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040",
        }}
      >
        <div
          className="grid gap-px p-1"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            background: "#808080",
          }}
          aria-label="Disk cluster map"
        >
          {cells.map((kind, i) => {
            let color = COLORS[kind];
            // Classic blink on active clusters
            if (showHeads && blinkOn) {
              if (i === readIdx) color = COLORS.reading;
              if (i === writeIdx) color = COLORS.writing;
            } else if (showHeads && !blinkOn) {
              if (i === readIdx) color = COLORS.used;
              if (i === writeIdx) color = COLORS.optimized;
            }
            return (
              <div
                key={i}
                className="aspect-square w-full min-h-[6px] sm:min-h-[8px]"
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-400 sm:text-[11px]">
        {LEGEND.map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 border border-black/40"
              style={{ backgroundColor: COLORS[item.kind] }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <p className="mt-1.5 font-mono text-[10px] text-amber-200/80 sm:text-xs">
        {running
          ? progress < 12
            ? "Analyzing drive C: … please wait"
            : progress < 92
              ? `Moving clusters…  read #${readIdx >= 0 ? readIdx : "—"}  →  write #${writeIdx >= 0 ? writeIdx : "—"}`
              : "Writing optimized layout…"
          : progress >= 100
            ? "Drive optimized. Fragmentation: 0%"
            : "Drive C:  ·  Fragmented  ·  Click Start to defragment"}
      </p>
    </div>
  );
}
