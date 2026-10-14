import { createContext, useContext } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export interface ThemeContextValue {
  /** The theme actually shown. */
  theme: Theme;
  /** What the visitor chose; "system" follows prefers-color-scheme. */
  preference: ThemePreference;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
