import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "../../lib/motion";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger siblings, e.g. 80 ms apart. */
  delayMs?: number;
}

function shouldAnimate(): boolean {
  return typeof IntersectionObserver === "function" && !prefersReducedMotion();
}

/**
 * Fades and lifts its content in the first time it scrolls into view. Content is visible
 * immediately when motion is reduced or IntersectionObserver is unavailable, and it stays in
 * the accessibility tree either way (only opacity/transform change).
 */
export function Reveal({ children, as: Tag = "div", className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"pending" | "shown">(() =>
    shouldAnimate() ? "pending" : "shown",
  );

  useEffect(() => {
    const element = ref.current;
    if (state === "shown" || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [state]);

  const style = delayMs ? ({ "--reveal-delay": `${delayMs}ms` } as CSSProperties) : undefined;
  return (
    <Tag ref={ref} className={className} data-reveal={state} style={style}>
      {children}
    </Tag>
  );
}
