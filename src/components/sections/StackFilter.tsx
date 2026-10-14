import { useState } from "react";

import type { StackOption } from "../../lib/workFilters";
import styles from "./StackFilter.module.css";

/** How many technologies show before "Show all": keeps phones from scrolling past a wall of chips. */
export const COLLAPSED_COUNT = 8;

interface StackFilterProps {
  options: StackOption[];
  selected: readonly string[];
  onToggle: (tech: string) => void;
  onClear: () => void;
}

/** Toggle buttons for filtering projects by technology (aria-pressed, 44px targets). */
export function StackFilter({ options, selected, onToggle, onClear }: StackFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = options.length > COLLAPSED_COUNT;
  // The most-used technologies, plus anything already selected so an active filter never hides.
  const shown =
    expanded || !collapsible
      ? options
      : options.filter((option, index) => index < COLLAPSED_COUNT || selected.includes(option.name));

  return (
    <div className={styles.filter} role="group" aria-labelledby="stack-filter-label">
      <div className={styles.head}>
        <p id="stack-filter-label" className={`mono ${styles.label}`}>
          filter --stack <span className="visually-hidden">(show projects using any of)</span>
        </p>
        {selected.length > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
      <ul className={styles.options} id="stack-filter-options">
        {shown.map((option) => {
          const pressed = selected.includes(option.name);
          return (
            <li key={option.name}>
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={pressed}
                onClick={() => onToggle(option.name)}
              >
                <span className={styles.tick} aria-hidden="true">
                  ✓
                </span>
                {option.name}
                <span className={`mono ${styles.count}`}>
                  <span className="visually-hidden">, </span>
                  {option.count}
                  <span className="visually-hidden"> {option.count === 1 ? "project" : "projects"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {collapsible && (
        <button
          type="button"
          className={styles.clear}
          aria-expanded={expanded}
          aria-controls="stack-filter-options"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show fewer technologies" : `Show all ${options.length} technologies`}
        </button>
      )}
    </div>
  );
}
