'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/PublicHeader';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';

export default function LoginPage() {
  const {user,loading,login,register}=useAuth(); const router=useRouter();
  const { t } = usePreferences();
  const [mode,setMode]=useState<'login'|'register'>('login'); const [busy,setBusy]=useState(false);
  const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  useEffect(()=>{if(!loading&&user)router.replace(user.role==='ADMIN'?'/admin':'/dashboard');},[loading,user,router]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    const data=new FormData(event.currentTarget);
    try{
      if(mode==='register'){
        const message=await register(String(data.get('fullName')),String(data.get('email')),String(data.get('password')));
        setNotice(message+' '+t('auth.localMail'));
      }else await login(String(data.get('email')),String(data.get('password')));
    }catch(caught){setError(caught instanceof Error?caught.message:t('auth.failed'));}
    finally{setBusy(false);}
  }
  return <main className="auth-page"><PublicHeader/>
    <section className="auth-intro"><p className="page-eyebrow">{t('auth.welcome')}</p><h1>{t('auth.title')}</h1><p>{t('auth.lede')}</p></section>
    <section className="auth-workspace">
      <article className="auth-form-card"><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>{t('auth.signIn')}</button><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>{t('auth.create')}</button></div>
        <p className="page-eyebrow">{mode==='login'?t('auth.back'):t('auth.application')}</p><h2>{mode==='login'?t('auth.continue'):t('auth.profile')}</h2>
        <form onSubmit={submit}>{mode==='register'&&<label>{t('auth.name')}<input name="fullName" minLength={2} maxLength={120} autoComplete="name" placeholder={t('auth.namePlaceholder')} required/></label>}<label>{t('auth.email')}<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label><label>{t('auth.password')}<input name="password" type="password" minLength={10} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={t('auth.passwordPlaceholder')} required/></label>{mode==='register'&&<small>{t('auth.passwordHelp')}</small>}{error&&<p className="form-message error">{error}</p>}{notice&&<p className="form-message success">{notice}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy?t('auth.wait'):mode==='login'?`${t('auth.secure')} →`:`${t('auth.createStudent')} →`}</button></form>
      </article>
      <article className="auth-process-card"><div className="role-orb"><span>✓</span><i/></div><p className="page-eyebrow">{t('auth.trusted')}</p><h2>{t('auth.workflow')}</h2><p>{t('auth.workflowBody')}</p><ol><li><span>01</span><div><b>{t('auth.step1')}</b><small>{t('auth.step1body')}</small></div></li><li><span>02</span><div><b>{t('auth.step2')}</b><small>{t('auth.step2body')}</small></div></li><li><span>03</span><div><b>{t('auth.step3')}</b><small>{t('auth.step3body')}</small></div></li></ol><div className="admin-note"><b>{t('auth.admin')}</b><span>{t('auth.adminBody')}</span></div></article>
    </section>
  </main>;
}
