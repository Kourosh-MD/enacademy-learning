'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VerificationResult(){
  const token=useSearchParams().get('token'); const [state,setState]=useState<'working'|'done'|'error'>(token?'working':'error'); const [message,setMessage]=useState(token?'Verifying your secure link…':'The verification token is missing.');
  useEffect(()=>{if(!token)return;fetch('/api/v1/auth/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}).then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||'This link is invalid or expired.');setMessage(body.message);setState('done');}).catch(error=>{setMessage(error.message);setState('error');});},[token]);
  return <main className="status-page"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><section><div className={`status-orb ${state==='error'?'rejected':''}`}>{state==='working'?'◷':state==='done'?'✓':'!'}</div><p className="page-eyebrow">EMAIL VERIFICATION</p><h1>{state==='working'?'One moment.':state==='done'?'Email verified.':'We could not verify this link.'}</h1><p>{message}</p>{state!=='working'&&<Link className="button button-primary" href="/login">Continue to sign in →</Link>}</section></main>;
}
export default function VerifyPage(){return <Suspense><VerificationResult/></Suspense>;}
