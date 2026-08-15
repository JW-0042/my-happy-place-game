import { useEffect, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      setNow(new Date());
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, "0");
  return {
    time: `${hours}:${mins}`,
    date: `${MONTHS[now.getMonth()]} ${now.getDate()}`,
  };
}

export function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return narrow;
}

/** Trap Tab inside a dialog; restore focus on unmount. */
export function useFocusTrap(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.querySelector<HTMLElement>("[data-focus-trap='true']");
    if (!root) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    const first = focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          list[list.length - 1]?.focus();
          e.preventDefault();
        }
      } else if (i === list.length - 1) {
        list[0]?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [active]);
}
