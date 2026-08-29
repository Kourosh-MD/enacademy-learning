'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { type ApiError, useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { type AuthFieldName, validateAuthFields } from '@/lib/auth-validation';

type FieldErrors = Partial<Record<AuthFieldName, string>>;

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const { t } = usePreferences();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!loading && user) router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [loading, user, router]);

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setError('');
    setNotice('');
    setFieldErrors({});
  }

  function messageForField(field: AuthFieldName) {
    if (field === 'fullName') return t('auth.nameInvalid');
    if (field === 'email') return t('auth.emailInvalid');
    return mode === 'register' ? t('auth.passwordInvalid') : t('auth.passwordRequired');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const fullName = String(data.get('fullName') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const validationErrors = validateAuthFields(mode, { fullName, email, password });
    const nextFieldErrors: FieldErrors = {};
    for (const field of Object.keys(validationErrors) as AuthFieldName[]) {
      nextFieldErrors[field] = messageForField(field);
    }

    setError('');
    setNotice('');
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      setError(t('auth.validationFailed'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        const message = await register(fullName, email, password);
        setNotice(message + ' ' + t('auth.localMail'));
        form.reset();
      } else {
        await login(email, password);
      }
    } catch (caught) {
      const problem = caught as ApiError;
      const serverFieldErrors: FieldErrors = {};
      for (const field of Object.keys(problem.errors ?? {})) {
        if (field === 'fullName' || field === 'email' || field === 'password') {
          serverFieldErrors[field] = messageForField(field);
        }
      }
      setFieldErrors(serverFieldErrors);
      setError(Object.keys(serverFieldErrors).length
        ? t('auth.validationFailed')
        : caught instanceof Error ? caught.message : t('auth.failed'));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page"><PublicHeader/>
    <section className="auth-intro"><p className="page-eyebrow">{t('auth.welcome')}</p><h1>{t('auth.title')}</h1><p>{t('auth.lede')}</p></section>
    <section className="auth-workspace">
      <article className="auth-form-card">
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>{t('auth.signIn')}</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>{t('auth.create')}</button>
        </div>
        <p className="page-eyebrow">{mode === 'login' ? t('auth.back') : t('auth.application')}</p>
        <h2>{mode === 'login' ? t('auth.continue') : t('auth.profile')}</h2>
        <form onSubmit={submit} noValidate>
          {mode === 'register' && <label>
            {t('auth.name')}
            <input name="fullName" minLength={2} maxLength={120} autoComplete="name" placeholder={t('auth.namePlaceholder')} required aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}/>
            {fieldErrors.fullName && <span className="field-error" id="fullName-error">{fieldErrors.fullName}</span>}
          </label>}
          <label>
            {t('auth.email')}
            <input name="email" type="email" maxLength={320} autoComplete="email" placeholder="you@example.com" required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined}/>
            {fieldErrors.email && <span className="field-error" id="email-error">{fieldErrors.email}</span>}
          </label>
          {mode === 'login' && <div className="auth-help-links"><Link href="/forgot-password">{t('recovery.forgot')}</Link><Link href="/resend-verification">{t('recovery.resend')}</Link></div>}
          <label>
            {t('auth.password')}
            <input name="password" type="password" minLength={mode === 'register' ? 10 : undefined} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={t('auth.passwordPlaceholder')} required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : mode === 'register' ? 'password-help' : undefined}/>
            {fieldErrors.password && <span className="field-error" id="password-error">{fieldErrors.password}</span>}
          </label>
          {mode === 'register' && <small id="password-help">{t('auth.passwordHelp')}</small>}
          {error && <p className="form-message error" role="alert">{error}</p>}
          {notice && <p className="form-message success" role="status">{notice}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? t('auth.wait') : mode === 'login' ? t('auth.secure') + ' →' : t('auth.createStudent') + ' →'}</button>
        </form>
      </article>
      <article className="auth-process-card"><div className="role-orb"><span>✓</span><i/></div><p className="page-eyebrow">{t('auth.trusted')}</p><h2>{t('auth.workflow')}</h2><p>{t('auth.workflowBody')}</p><ol><li><span>01</span><div><b>{t('auth.step1')}</b><small>{t('auth.step1body')}</small></div></li><li><span>02</span><div><b>{t('auth.step2')}</b><small>{t('auth.step2body')}</small></div></li><li><span>03</span><div><b>{t('auth.step3')}</b><small>{t('auth.step3body')}</small></div></li></ol><div className="admin-note"><b>{t('auth.admin')}</b><span>{t('auth.adminBody')}</span></div></article>
    </section>
  </main>;
}
