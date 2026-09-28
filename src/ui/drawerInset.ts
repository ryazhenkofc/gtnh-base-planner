/** Canvas pixels a drawer covers on the right (side drawer) or at the bottom (bottom sheet on phones). */
export interface Inset {
  right: number;
  bottom: number;
}

/**
 * Measures the open drawer (`aside.drawer`) on the next frame and whenever it resizes, reporting the
 * part of the canvas it covers (none when no drawer is open). Returns a function that stops watching.
 */
export function watchDrawerInset(report: (inset: Inset) => void): () => void {
  let observer: ResizeObserver | undefined;
  const raf = requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('aside.drawer');
    const measure = () => {
      if (!el?.isConnected) {
        report({ right: 0, bottom: 0 });
        return;
      }
      const r = el.getBoundingClientRect();
      report(
        r.left > 0
          ? { right: Math.max(0, window.innerWidth - r.left), bottom: 0 }
          : { right: 0, bottom: Math.max(0, window.innerHeight - r.top) },
      );
    };
    measure();
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
  });
  return () => {
    cancelAnimationFrame(raf);
    observer?.disconnect();
  };
}
