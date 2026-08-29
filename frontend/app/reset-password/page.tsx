'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicHeader } from '@/components/PublicHeader';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';

export default function ResetPasswordPage(){return <Suspense fallback={null}><ResetPasswordForm/></Suspense>;}

function ResetPasswordForm(){
  const token=useSearchParams().get('token')??'';const {resetPassword}=useAuth();const {t}=usePreferences();const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const password=String(data.get('password')??'');const confirmation=String(data.get('confirmation')??'');setError('');if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,72}$/.test(password)){setError(t('auth.passwordInvalid'));return;}if(password!==confirmation){setError(t('recovery.passwordMismatch'));return;}setBusy(true);try{await resetPassword(token,password);setDone(true);event.currentTarget.reset();}catch(problem){setError(problem instanceof Error?problem.message:t('auth.failed'));}finally{setBusy(false);}}
  return <main className="auth-page recovery-page"><PublicHeader/><section className="recovery-card"><span className="recovery-orb">✓</span><p className="page-eyebrow">{t('recovery.secure')}</p><h1>{done?t('recovery.resetDone'):t('recovery.resetTitle')}</h1><p>{done?t('recovery.resetDoneBody'):t('recovery.resetBody')}</p>{!token&&!done&&<p className="form-message error" role="alert">{t('recovery.missingToken')}</p>}{!done&&token&&<form onSubmit={submit}><label>{t('recovery.newPassword')}<input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label><small>{t('auth.passwordHelp')}</small><label>{t('recovery.confirmPassword')}<input name="confirmation" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label>{error&&<p className="form-message error" role="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?t('auth.wait'):t('recovery.changePassword')}</button></form>}<Link href="/login">← {t('recovery.backLogin')}</Link></section></main>;
}
