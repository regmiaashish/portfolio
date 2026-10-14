/** Motion helpers shared by page transitions and scroll reveals. */

export function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/** True when the browser can animate between pages and the visitor hasn't asked for less motion. */
export function canUseViewTransitions(): boolean {
  const doc = document as ViewTransitionDocument;
  return typeof doc.startViewTransition === "function" && !prefersReducedMotion();
}

/** Runs `update` inside a view transition when possible, otherwise immediately. */
export function withViewTransition(update: () => void): void {
  const doc = document as ViewTransitionDocument;
  if (canUseViewTransitions() && doc.startViewTransition) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
