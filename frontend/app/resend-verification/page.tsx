'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { PublicHeader } from '@/components/PublicHeader';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';

export default function ResendVerificationPage(){
  const {resendVerification}=useAuth();const {t}=usePreferences();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const email=String(new FormData(form).get('email')??'').trim();setBusy(true);setError('');try{await resendVerification(email);setMessage(t('recovery.resendSuccess'));form.reset();}catch(problem){setError(problem instanceof Error?problem.message:t('auth.failed'));}finally{setBusy(false);}}
  return <main className="auth-page recovery-page"><PublicHeader/><section className="recovery-card"><span className="recovery-orb">✉</span><p className="page-eyebrow">{t('recovery.verification')}</p><h1>{t('recovery.resendTitle')}</h1><p>{t('recovery.resendBody')}</p><form onSubmit={submit}><label>{t('auth.email')}<input name="email" type="email" maxLength={320} autoComplete="email" required placeholder="you@example.com"/></label>{error&&<p className="form-message error" role="alert">{error}</p>}{message&&<p className="form-message success" role="status">{message} {t('auth.localMail')}</p>}<button className="button button-primary" disabled={busy}>{busy?t('auth.wait'):t('recovery.sendVerification')}</button></form><Link href="/login">← {t('recovery.backLogin')}</Link></section></main>;
}
