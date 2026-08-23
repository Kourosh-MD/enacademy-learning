'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SessionUser, useAuth } from '@/components/AuthProvider';

type Metrics={pending:number;approved:number;rejected:number;suspended:number;completions:number};
type Overview={metrics:Metrics;students:SessionUser[]};

export default function AdminPage(){
  const {user,loading,logout,apiFetch}=useAuth();const router=useRouter();const [overview,setOverview]=useState<Overview|null>(null);const [error,setError]=useState('');
  const load=useCallback(()=>apiFetch<Overview>('/api/v1/admin/students').then(setOverview).catch(error=>setError(error.message)),[apiFetch]);
  useEffect(()=>{if(!loading&&(!user||user.role!=='ADMIN'))router.replace(user?'/dashboard':'/login');else if(user?.role==='ADMIN')load();},[loading,user,router,load]);
  async function update(id:string,status:'APPROVED'|'REJECTED'|'SUSPENDED') {await apiFetch(`/api/v1/admin/students/${id}/status`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});await load();}
  async function signOut(){await logout();router.push('/');}
  if(loading||!user||!overview)return <main className="status-page"><section><div className="status-orb">⌘</div><p className="page-eyebrow">ADMIN CONTROL</p><h1>{error||'Loading the approval queue…'}</h1></section></main>;
  const pending=overview.students.filter(student=>student.status==='PENDING');
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><span className="admin-badge">ADMIN</span><nav><Link className="active" href="/admin">⌂ Overview</Link><a href="#applications">◎ Applications <b>{overview.metrics.pending}</b></a><a href="#students">◉ Students</a><Link href="/dashboard">↗ Student view</Link></nav><button className="admin-signout" onClick={signOut}>Sign out ↗</button></aside><section className="admin-main"><header><div><p className="page-eyebrow">CONTROL CENTER</p><h1>Keep the learning space healthy.</h1><p>Review verified learners and manage access with a durable audit trail.</p></div><span className="admin-avatar">{user.fullName.slice(0,2).toUpperCase()}</span></header><div className="admin-stats"><article><span>◎</span><div><strong>{overview.metrics.pending}</strong><small>Pending review</small></div></article><article><span>✓</span><div><strong>{overview.metrics.approved}</strong><small>Active students</small></div></article><article><span>◉</span><div><strong>{overview.students.length}</strong><small>Total accounts</small></div></article><article><span>↗</span><div><strong>{overview.metrics.completions}</strong><small>Lessons completed</small></div></article></div>
    <section className="admin-table-section" id="applications"><div><p className="page-eyebrow">APPLICATION QUEUE</p><h2>Students waiting for approval</h2></div>{pending.length?<div className="admin-table">{pending.map(student=><StudentRow key={student.id} student={student} update={update}/>)}</div>:<div className="admin-empty"><span>✓</span><h3>Queue clear</h3><p>Every verified student application has been reviewed.</p></div>}</section>
    <section className="admin-table-section" id="students"><div><p className="page-eyebrow">ALL STUDENTS</p><h2>Account directory</h2></div><div className="admin-table compact">{overview.students.map(student=><StudentRow key={student.id} student={student} update={update}/>)}</div></section></section></main>;
}
function StudentRow({student,update}:{student:SessionUser;update:(id:string,status:'APPROVED'|'REJECTED'|'SUSPENDED')=>Promise<void>}){
  const [busy,setBusy]=useState(false);async function change(status:'APPROVED'|'REJECTED'|'SUSPENDED'){setBusy(true);try{await update(student.id,status);}finally{setBusy(false);}}
  return <article><span className="student-avatar">{student.fullName.slice(0,2).toUpperCase()}</span><div><strong>{student.fullName}</strong><small>{student.email}{!student.emailVerified?' · email unverified':''}</small></div><span className={`status-pill ${student.status.toLowerCase()}`}>{student.status.toLowerCase()}</span><div className="admin-row-actions">{student.status!=='APPROVED'&&<button disabled={busy||!student.emailVerified} className="admin-approve" onClick={()=>change('APPROVED')}>Approve</button>}{student.status!=='SUSPENDED'&&<button disabled={busy} onClick={()=>change('SUSPENDED')}>Suspend</button>}{student.status==='PENDING'&&<button disabled={busy} className="admin-reject" onClick={()=>change('REJECTED')}>Reject</button>}</div></article>;
}
