import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../backend/src/main/resources/db/migration/V2__beta_commerce.sql", import.meta.url), "utf8");
const learning = await readFile(new URL("../../backend/src/main/java/com/enacademy/learning/LearningRepository.java", import.meta.url), "utf8");
const service = await readFile(new URL("../../backend/src/main/java/com/enacademy/commerce/CommerceService.java", import.meta.url), "utf8");
const invoice = await readFile(new URL("../../backend/src/main/java/com/enacademy/commerce/InvoicePdfService.java", import.meta.url), "utf8");
const store = await readFile(new URL("../app/store/page.tsx", import.meta.url), "utf8");
const purchases = await readFile(new URL("../app/purchases/page.tsx", import.meta.url), "utf8");

test("beta checkout stores orders, invoices, and durable entitlements", () => {
  for (const table of ["products", "purchase_orders", "purchase_order_items", "invoices", "product_entitlements"]) {
    assert.match(migration, new RegExp("CREATE TABLE " + table));
  }
  assert.match(service, /BETA_PURCHASE_APPROVED/);
  assert.doesNotMatch(service + migration, /zarinpal|payment_card|card_number|bank_token/i);
});

test("purchased courses gate lesson access by level", () => {
  assert.match(learning, /product_entitlements/);
  assert.match(learning, /product.target_key=current.level/);
  assert.match(learning, /earlier.level=current.level/);
});

test("books and Persian invoices are protected downloads", () => {
  assert.match(service, /entitledBook/);
  assert.match(invoice, /NotoSansArabic-Regular.ttf/);
  assert.match(invoice, /gregorianToJalali/);
  assert.match(invoice, /toPersianDigits/);
  assert.match(invoice, /پرداخت واقعی انجام نشده است/);
});

test("student commerce includes previews, purchases, invoices, and downloads", () => {
  assert.match(store, /commerce-modal/);
  assert.match(store, /\/api\/v1\/store\/purchases/);
  assert.match(purchases, /'PURCHASES'|'INVOICES'/);
  assert.match(purchases, /\/api\/v1\/store\/invoices\//);
  assert.match(purchases, /\/api\/v1\/store\/books\//);
});
