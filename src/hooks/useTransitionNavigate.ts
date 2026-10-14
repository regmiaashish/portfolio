import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { type To, useNavigate } from "react-router";

import { canUseViewTransitions, withViewTransition } from "../lib/motion";

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!event.currentTarget.target || event.currentTarget.target === "_self")
  );
}

/**
 * Click handler for in-app links: animates the page change with the View Transitions API
 * when the browser supports it and motion is allowed; otherwise lets the router navigate as
 * usual. Modified clicks (new tab, etc.) are never intercepted.
 */
export function useTransitionClick(to: To) {
  const navigate = useNavigate();
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(event) || !canUseViewTransitions()) return;
    event.preventDefault();
    withViewTransition(() => {
      // The DOM must update synchronously inside the transition callback.
      flushSync(() => navigate(to));
    });
  };
}
