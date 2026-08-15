import { memo } from "react";

function WindoorsLogoInner({ className, uid = "wd" }: { className?: string; uid?: string }) {
  const gap = 1.15;
  const paneW = 9.4;
  const paneH = 6.55;
  const left = 2.05;
  const top = 1.7;
  const rx = 1.15;
  const panes: { x: number; y: number; fill: string }[] = [];
  const opacities = [
    [0.98, 0.88],
    [0.9, 0.78],
    [0.8, 0.68],
  ];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 3; row++) {
      panes.push({
        x: left + col * (paneW + gap),
        y: top + row * (paneH + gap),
        fill: `url(#${uid}-pane-${col}-${row})`,
      });
    }
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.55" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {([0, 1] as const).flatMap((col) =>
          ([0, 1, 2] as const).map((row) => {
            const o = opacities[row][col];
            const o2 = Math.max(0.45, o - 0.18);
            return (
              <linearGradient
                key={`${col}-${row}`}
                id={`${uid}-pane-${col}-${row}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={o} />
                <stop offset="55%" stopColor="#f2f6ff" stopOpacity={(o + o2) / 2} />
                <stop offset="100%" stopColor="#d8e4f8" stopOpacity={o2} />
              </linearGradient>
            );
          }),
        )}
      </defs>
      <g filter={`url(#${uid}-glow)`}>
        {panes.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={paneW} height={paneH} rx={rx} ry={rx} fill={p.fill} />
        ))}
      </g>
    </svg>
  );

}

export const WindoorsLogo = memo(WindoorsLogoInner);
