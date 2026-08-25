import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("../components/PreferencesProvider.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("preference controls become lesson-aware", () => {
  assert.match(component, /usePathname/);
  assert.match(component, /pathname\.startsWith\('\/learn\/'\)/);
  assert.match(component, /preference-dock-lesson/);
});

test("lesson controls do not share the sticky footer position", () => {
  assert.match(styles, /\.preference-dock-lesson\{[^}]*inset-inline-start:18px[^}]*bottom:86px/);
  assert.match(styles, /\.preference-dock-lesson \.preference-button small\{display:none\}/);
});

test("mobile lesson controls move below the header and the palette opens downward", () => {
  assert.match(styles, /@media\(max-width:900px\)\{\.preference-dock-lesson\{[^}]*top:84px[^}]*bottom:auto/);
  assert.match(styles, /\.preference-dock-lesson \.palette-menu\{[^}]*top:calc\(100% \+ 10px\)[^}]*bottom:auto/);
});
