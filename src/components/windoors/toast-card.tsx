import { useRef, useState } from "react";
import { PRODUCT_NAME } from "@/lib/windoors/config";
import type { Toast } from "@/lib/windoors/types";
import { ToolIcon } from "@/components/windoors/tool-icons";

export function ToastCard({
  toast,
  onDismiss,
  onFix,
}: {
  toast: Toast;
  onDismiss: () => void;
  onFix: () => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const finishSwipe = () => {
    setSwiping(false);
    const delta = dxRef.current;
    if (Math.abs(delta) > 96) {
      onDismiss();
    }
    dxRef.current = 0;
    setDx(0);
  };

  return (
    <div
      className={`toast-enter toast-card pointer-events-auto flex w-full gap-3 rounded-xl border border-white/10 bg-[#161618]/96 p-3.5 shadow-2xl backdrop-blur-xl transition-all sm:p-4 ${
        toast.leaving ? "translate-x-8 opacity-0 sm:translate-x-16" : ""
      } ${toast.kind === "welcome" || toast.kind === "success" ? "border-emerald-400/45 bg-emerald-950/95" : ""} ${
        swiping ? "swiping" : ""
      }`}
      style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.35, 1 - Math.abs(dx) / 180) : undefined }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        touch.current = { x: t.clientX, y: t.clientY };
        setSwiping(true);
      }}
      onTouchMove={(e) => {
        if (!touch.current) return;
        const t = e.touches[0];
        if (!t) return;
        const adx = t.clientX - touch.current.x;
        const ady = t.clientY - touch.current.y;
        if (Math.abs(adx) > Math.abs(ady)) {
          dxRef.current = adx;
          setDx(adx);
        }
      }}
      onTouchEnd={() => finishSwipe()}
      onTouchCancel={() => finishSwipe()}
    >
      {toast.kind === "task" && toast.appKey ? (
        <>
          <div className="min-w-0 flex-1">
            {(() => {
              return (
                <div className="flex items-center gap-2">
                  <ToolIcon app={toast.appKey!} uid={`toast-${toast.id}`} className="h-5 w-5 shrink-0" />
                  <span className="truncate font-semibold">{toast.title}</span>
                </div>
              );
            })()}
            <p className="mt-1 text-xs text-white/50">{PRODUCT_NAME} needs attention</p>
          </div>
          <button
            type="button"
            onClick={onFix}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black active:scale-95 sm:py-2"
          >
            FIX NOW
          </button>
        </>
      ) : toast.kind === "success" && toast.appKey ? (
        <>
          <div className="min-w-0 flex-1">
            {(() => {
              return (
                <div className="flex items-center gap-2">
                  <ToolIcon app={toast.appKey!} uid={`ok-${toast.id}`} className="h-5 w-5 shrink-0" />
                  <span className="truncate font-semibold text-emerald-300">{toast.title}</span>
                </div>
              );
            })()}
            <p className="mt-1 text-xs text-white/55">{toast.body || "Task finished successfully"}</p>
          </div>
          <button
            type="button"
            onClick={onFix}
            className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-black active:scale-95 sm:py-2"
          >
            OPEN
          </button>
        </>
      ) : toast.kind === "info" ? (
        <>
          <div className="min-w-0 flex-1">
            <span className="truncate font-semibold text-sky-200">{toast.title}</span>
            {toast.body && <p className="mt-1 text-xs text-white/55">{toast.body}</p>}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-[11px] font-medium"
          >
            OK
          </button>
        </>
      ) : (
        <div className="w-full text-center">
          <div className="text-lg font-bold text-emerald-300">{toast.title}</div>
          {toast.body && <div className="mt-2 text-sm text-white/80">{toast.body}</div>}
          <button type="button" onClick={onDismiss} className="mt-3 rounded-xl bg-white/20 px-6 py-2 text-xs">
            Let's go!
          </button>
        </div>
      )}
    </div>
  );

}
