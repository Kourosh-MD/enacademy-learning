'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/PublicHeader';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const {user,loading,login,register}=useAuth(); const router=useRouter();
  const [mode,setMode]=useState<'login'|'register'>('login'); const [busy,setBusy]=useState(false);
  const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  useEffect(()=>{if(!loading&&user)router.replace(user.role==='ADMIN'?'/admin':'/dashboard');},[loading,user,router]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    const data=new FormData(event.currentTarget);
    try{
      if(mode==='register'){
        const message=await register(String(data.get('fullName')),String(data.get('email')),String(data.get('password')));
        setNotice(message+' In local Docker, open Mailpit at localhost:8025.');
      }else await login(String(data.get('email')),String(data.get('password')));
    }catch(caught){setError(caught instanceof Error?caught.message:'Unable to continue.');}
    finally{setBusy(false);}
  }
  return <main className="auth-page"><PublicHeader/>
    <section className="auth-intro"><p className="page-eyebrow">WELCOME TO ENACADEMY</p><h1>Your English starts here.</h1><p>Create a secure student profile or continue your learning path. Administrator permissions are assigned by the platform, never selected in the browser.</p></section>
    <section className="auth-workspace">
      <article className="auth-form-card"><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Sign in</button><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button></div>
        <p className="page-eyebrow">{mode==='login'?'WELCOME BACK':'STUDENT APPLICATION'}</p><h2>{mode==='login'?'Continue your progress.':'Build your learner profile.'}</h2>
        <form onSubmit={submit}>{mode==='register'&&<label>Full name<input name="fullName" minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name" required/></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></label><label>Password<input name="password" type="password" minLength={10} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 10 characters" required/></label>{mode==='register'&&<small>Use uppercase, lowercase, and at least one number.</small>}{error&&<p className="form-message error">{error}</p>}{notice&&<p className="form-message success">{notice}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in securely →':'Create student account →'}</button></form>
      </article>
      <article className="auth-process-card"><div className="role-orb"><span>✓</span><i/></div><p className="page-eyebrow">TRUSTED ACCESS</p><h2>A real approval workflow.</h2><p>Every learner passes three clear checkpoints before course access opens.</p><ol><li><span>01</span><div><b>Create your account</b><small>Your password is securely hashed.</small></div></li><li><span>02</span><div><b>Verify your email</b><small>Use the one-time link sent to your inbox.</small></div></li><li><span>03</span><div><b>Administrator review</b><small>An admin approves your student profile.</small></div></li></ol><div className="admin-note"><b>Administrator?</b><span>Use the same secure sign-in. Your server-assigned role opens the admin panel automatically.</span></div></article>
    </section>
  </main>;
}
