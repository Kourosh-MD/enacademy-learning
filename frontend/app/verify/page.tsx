'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { usePreferences } from '@/components/PreferencesProvider';

function VerificationResult(){
  const { t } = usePreferences();
  const token=useSearchParams().get('token'); const [state,setState]=useState<'working'|'done'|'error'>(token?'working':'error'); const [message,setMessage]=useState(token?t('verify.workingMessage'):t('verify.missing'));
  useEffect(()=>{if(!token)return;fetch('/api/v1/auth/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}).then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||t('verify.invalid'));setMessage(body.message);setState('done');}).catch(error=>{setMessage(error.message);setState('error');});},[token,t]);
  return <main className="status-page"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><section><div className={`status-orb ${state==='error'?'rejected':''}`}>{state==='working'?'◷':state==='done'?'✓':'!'}</div><p className="page-eyebrow">{t('verify.eyebrow')}</p><h1>{state==='working'?t('verify.working'):state==='done'?t('verify.done'):t('verify.error')}</h1><p>{message}</p>{state!=='working'&&<Link className="button button-primary" href="/login">{t('verify.continue')} →</Link>}</section></main>;
}
export default function VerifyPage(){return <Suspense><VerificationResult/></Suspense>;}
