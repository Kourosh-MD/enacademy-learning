import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('account recovery exposes reset and verification resend without revealing account existence',()=>{
  const provider=read('components/AuthProvider.tsx');
  const login=read('app/login/page.tsx');
  const forgot=read('app/forgot-password/page.tsx');
  const resend=read('app/resend-verification/page.tsx');
  const reset=read('app/reset-password/page.tsx');

  assert.match(provider,/\/api\/v1\/auth\/password\/forgot/);
  assert.match(provider,/\/api\/v1\/auth\/password\/reset/);
  assert.match(provider,/\/api\/v1\/auth\/verification\/resend/);
  assert.match(login,/href="\/forgot-password"/);
  assert.match(login,/href="\/resend-verification"/);
  assert.match(forgot,/type="email"/);
  assert.match(resend,/type="email"/);
  assert.match(reset,/useSearchParams\(\)\.get\('token'\)/);
  assert.match(reset,/password!==confirmation/);
});

test('async recovery forms keep a stable form reference across API requests',()=>{
  for(const path of [
    'app/forgot-password/page.tsx',
    'app/resend-verification/page.tsx',
    'app/reset-password/page.tsx',
  ]){
    const source=read(path);
    assert.match(source,/const form=event\.currentTarget/);
    assert.doesNotMatch(source,/await [^;]+;[^}]*event\.currentTarget\.reset\(\)/);
    assert.match(source,/await [^;]+;[^}]*form\.reset\(\)/);
  }
});

test('frontend responses use nonce-based CSP and defensive browser headers',()=>{
  const proxy=read('proxy.ts');
  const layout=read('app/layout.tsx');

  assert.match(proxy,/script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(proxy,/object-src 'none'/);
  assert.match(proxy,/frame-ancestors 'none'/);
  assert.match(proxy,/X-Content-Type-Options','nosniff'/);
  assert.match(proxy,/X-Frame-Options','DENY'/);
  assert.match(proxy,/Referrer-Policy','strict-origin-when-cross-origin'/);
  assert.match(layout,/nonce=\{nonce\}/);
});
