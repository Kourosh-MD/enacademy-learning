import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("English and Persian fonts are bundled by Next.js", () => {
  assert.match(layout, /import \{ Manrope, Vazirmatn \} from 'next\/font\/google'/);
  assert.match(layout, /Manrope\(\{ subsets: \['latin'\], variable: '--font-latin', display: 'swap' \}\)/);
  assert.match(layout, /Vazirmatn\(\{ subsets: \['arabic'\], variable: '--font-persian', display: 'swap' \}\)/);
  assert.match(layout, /className=\{\`\$\{manrope\.variable\} \$\{vazirmatn\.variable\}\`\}/);
});

test("the active locale selects the correct font family", () => {
  assert.match(styles, /body \{[^}]*font-family:var\(--font-latin\),Arial,Helvetica,sans-serif/);
  assert.match(styles, /html\[dir="rtl"\] body\{font-family:var\(--font-persian\),Tahoma,Arial,sans-serif\}/);
  assert.match(styles, /html\[dir="rtl"\] :is\(\.hero h1 em,\.language-core strong\)\{font-family:var\(--font-persian\)/);
});

test("form controls inherit the bilingual typography", () => {
  assert.match(styles, /button,input,select,textarea \{ font-family:inherit; \}/);
});
