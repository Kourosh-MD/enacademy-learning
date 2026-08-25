import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAuthFields } from '../lib/auth-validation.ts';

test('registration identifies every invalid field', () => {
  assert.deepEqual(validateAuthFields('register', {
    fullName: 'A',
    email: 'not-an-email',
    password: 'weakpassword',
  }), {
    fullName: 'invalid',
    email: 'invalid',
    password: 'invalid',
  });
});

test('registration accepts a valid learner profile', () => {
  assert.deepEqual(validateAuthFields('register', {
    fullName: 'Test Student',
    email: 'student@example.test',
    password: 'StrongPass2026',
  }), {});
});

test('registration enforces the BCrypt input boundary', () => {
  assert.equal(validateAuthFields('register', {
    fullName: 'Test Student',
    email: 'student@example.test',
    password: 'Aa1' + 'x'.repeat(70),
  }).password, 'invalid');
});

test('sign in requires credentials without registration complexity rules', () => {
  assert.deepEqual(validateAuthFields('login', {
    fullName: '',
    email: 'student@example.test',
    password: 'existing password',
  }), {});
  assert.equal(validateAuthFields('login', {
    fullName: '',
    email: 'student@example.test',
    password: '',
  }).password, 'required');
});
