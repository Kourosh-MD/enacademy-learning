import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('student exam center exposes start, resume, batch save, and submit workflows',()=>{
  const list=read('app/exams/page.tsx');
  const player=read('app/exams/[attemptId]/page.tsx');
  assert.match(list,/POST|method:'POST'/);
  assert.match(list,/\/api\/v1\/exams\/\$\{exam\.slug\}\/attempts/);
  assert.match(player,/method:'PATCH'/);
  assert.match(player,/answers:ids\.map/);
  assert.match(player,/\/submit/);
  assert.match(player,/beforeunload/);
  assert.match(player,/AUTO_SUBMITTED/);
});

test('exam controls are bilingual and available in both student and admin navigation',()=>{
  const copy=read('lib/i18n.ts');
  const navigation=read('components/WorkspaceNavigation.tsx');
  const admin=read('app/admin/exams/page.tsx');
  assert.match(copy,/'exam\.serverTimed':/);
  assert.match(copy,/'exam\.serverTimed': 'زمان‌سنج/);
  assert.match(navigation,/active:'dashboard'\|'exams'/);
  assert.match(navigation,/href="\/exams"/);
  assert.match(admin,/\/api\/v1\/admin\/exams/);
  assert.match(admin,/type="datetime-local"/);
});

test('exam experience has responsive, theme-safe presentation styles',()=>{
  const css=read('app/product.css');
  assert.match(css,/\/\* Online exams \*\//);
  assert.match(css,/html\[data-theme="dark"\].*exam-card/);
  assert.match(css,/@media\(max-width:760px\).*exam-player-layout/s);
});
