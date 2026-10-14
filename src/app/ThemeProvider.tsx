import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import {
  THEME_STORAGE_KEY,
  type Theme,
  ThemeContext,
  type ThemePreference,
} from "../hooks/useTheme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function storedPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system"; // storage blocked (private mode, disabled cookies)
  }
}

function persist(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not being able to remember the choice is fine; the toggle still works this visit.
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>(storedPreference);
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const onChange = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // CSS reads data-theme; without it, tokens follow prefers-color-scheme.
  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", preference);
  }, [preference]);

  const theme: Theme = preference === "system" ? system : preference;

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Choosing what the system already prefers means "follow the system" again.
    const nextPreference: ThemePreference = next === system ? "system" : next;
    setPreference(nextPreference);
    persist(nextPreference);
  }, [theme, system]);

  const value = useMemo(
    () => ({ theme, preference, toggleTheme }),
    [theme, preference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
