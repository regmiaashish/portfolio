/**
 * Every colour pair the UI relies on must meet WCAG AA, in both themes.
 * Text: 4.5:1. Non-text UI (borders of controls, focus ring, status dots): 3:1.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");

function tokensIn(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--(color-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[name] = value.toLowerCase();
  }
  return tokens;
}

const light = tokensIn(css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)")));
const dark = tokensIn(css.slice(css.indexOf(':root[data-theme="dark"]')));
const systemDark = tokensIn(
  css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf(':root[data-theme="dark"]')),
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["color-text", "color-bg"],
  ["color-text", "color-surface"],
  ["color-text", "color-surface-sunken"],
  ["color-text-muted", "color-bg"],
  ["color-text-muted", "color-surface"],
  ["color-text-muted", "color-surface-sunken"],
  ["color-link", "color-bg"],
  ["color-link", "color-surface"],
  ["color-ok-text", "color-bg"],
  ["color-ok-text", "color-surface"],
  ["color-err-text", "color-bg"],
  ["color-err-text", "color-surface"],
  ["color-accent-contrast", "color-accent"],
  ["color-accent-contrast", "color-accent-hover"],
];

const UI_PAIRS: [string, string][] = [
  ["color-border-strong", "color-bg"],
  ["color-border-strong", "color-surface"],
  ["color-focus", "color-bg"],
  ["color-focus", "color-surface"],
  ["color-live", "color-bg"],
  ["color-signal", "color-surface-sunken"],
  ["color-ok", "color-surface-sunken"],
  ["color-err", "color-surface-sunken"],
];

describe.each([
  ["light", light],
  ["dark (explicit)", dark],
])("%s theme", (_name, tokens) => {
  it.each(TEXT_PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("%s on %s is at least 3:1", (fg, bg) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});

it("system dark and explicit dark use identical tokens", () => {
  expect(systemDark).toEqual(dark);
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
});
