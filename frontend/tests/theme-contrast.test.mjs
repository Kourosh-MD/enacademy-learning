import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const product = await readFile(new URL("../app/product.css", import.meta.url), "utf8");

const palettes = {
  emerald: { light: ["#087453", "#c9f36a"], dark: ["#5ee6b5", "#b7e965"] },
  ocean: { light: ["#0369a1", "#a5f3fc"], dark: ["#7dd3fc", "#a5f3fc"] },
  violet: { light: ["#6d28d9", "#ddd6fe"], dark: ["#c4b5fd", "#ddd6fe"] },
  sunset: { light: ["#c2410c", "#fed7aa"], dark: ["#fdba74", "#fed7aa"] },
  rose: { light: ["#be123c", "#fecdd3"], dark: ["#fda4af", "#fecdd3"] },
};

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function expectReadable(label, foreground, background) {
  assert.ok(contrast(foreground, background) >= 4.5, label + " contrast is below 4.5:1");
}

test("semantic control tokens replace theme-dependent text colors", () => {
  assert.match(globals, /\.button-small \{[^}]*color:var\(--solid-fg\);[^}]*background:var\(--solid-bg\)/);
  assert.match(globals, /\.play-dot \{[^}]*color:var\(--on-accent\);[^}]*background:var\(--accent-solid\)/);
  assert.doesNotMatch(globals + product, /color:#fff;\s*background:var\(--(?:ink|mint|mint-dark)\)/);
});

test("filled controls meet WCAG AA in every theme and palette", () => {
  expectReadable("light solid control", "#ffffff", "#10261f");
  expectReadable("light navigation", "#66756f", "#f6f8f3");
  expectReadable("dark navigation", "#9dafaa", "#08110e");

  for (const [name, values] of Object.entries(palettes)) {
    const [lightAccent, lightHighlight] = values.light;
    const [darkAccent, darkHighlight] = values.dark;
    expectReadable("light " + name + " accent", "#ffffff", lightAccent);
    expectReadable("light " + name + " highlight", "#0a4b37", lightHighlight);
    expectReadable("dark " + name + " solid control", "#07110d", darkAccent);
    expectReadable("dark " + name + " accent", "#07110d", darkAccent);
    expectReadable("dark " + name + " highlight", "#07110d", darkHighlight);
  }
});

test("dark mode retints light accent surfaces", () => {
  assert.match(product, /html\[data-theme="dark"\] :is\([^}]*\.method-icon[^}]*\.auth-process-card \.role-orb[^}]*\.dash-sidebar nav a\.active[^}]*\)\{background:color-mix/);
});
