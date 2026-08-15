/** Central timeout/interval registry — clearAll on restart / unmount / sleep. */
export function createTimerRegistry() {
  const timeouts = new Set<number>();
  const intervals = new Set<number>();

  return {
    timeout(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
      return id;
    },
    interval(fn: () => void, ms: number) {
      const id = window.setInterval(fn, ms);
      intervals.add(id);
      return id;
    },
    clearTimeout(id: number) {
      window.clearTimeout(id);
      timeouts.delete(id);
    },
    clearInterval(id: number) {
      window.clearInterval(id);
      intervals.delete(id);
    },
    clearAll() {
      for (const id of timeouts) window.clearTimeout(id);
      for (const id of intervals) window.clearInterval(id);
      timeouts.clear();
      intervals.clear();
    },
  };
}

export type TimerRegistry = ReturnType<typeof createTimerRegistry>;
