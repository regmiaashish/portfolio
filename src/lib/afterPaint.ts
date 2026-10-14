/**
 * Runs `callback` once the browser has painted the current frame (two animation frames), so
 * non-critical requests don't compete with the first render. Returns a cancel function.
 * Falls back to a macrotask where requestAnimationFrame isn't available (tests, old browsers).
 */
export function afterPaint(callback: () => void): () => void {
  if (typeof window.requestAnimationFrame !== "function") {
    const timer = window.setTimeout(callback, 0);
    return () => window.clearTimeout(timer);
  }
  let inner = 0;
  const outer = window.requestAnimationFrame(() => {
    inner = window.requestAnimationFrame(callback);
  });
  return () => {
    window.cancelAnimationFrame(outer);
    if (inner) window.cancelAnimationFrame(inner);
  };
}
