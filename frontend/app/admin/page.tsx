'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SessionUser, useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';

type Metrics={pending:number;approved:number;rejected:number;suspended:number;completions:number};
type Overview={metrics:Metrics;students:SessionUser[]};

export default function AdminPage(){
  const {user,loading,logout,apiFetch}=useAuth();const router=useRouter();const [overview,setOverview]=useState<Overview|null>(null);const [error,setError]=useState('');
  const { t } = usePreferences();
  const load=useCallback(()=>apiFetch<Overview>('/api/v1/admin/students').then(setOverview).catch(error=>setError(error.message)),[apiFetch]);
  useEffect(()=>{if(!loading&&(!user||user.role!=='ADMIN'))router.replace(user?'/dashboard':'/login');else if(user?.role==='ADMIN')load();},[loading,user,router,load]);
  async function update(id:string,status:'APPROVED'|'REJECTED'|'SUSPENDED') {await apiFetch(`/api/v1/admin/students/${id}/status`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});await load();}
  async function signOut(){await logout();router.push('/');}
  if(loading||!user||!overview)return <main className="status-page"><section><div className="status-orb">⌘</div><p className="page-eyebrow">{t('admin.control')}</p><h1>{error||t('admin.loading')}</h1></section></main>;
  const pending=overview.students.filter(student=>student.status==='PENDING');
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><span className="admin-badge">ADMIN</span><nav><Link className="active" href="/admin">⌂ {t('admin.overview')}</Link><a href="#applications">◎ {t('admin.applications')} <b>{overview.metrics.pending}</b></a><a href="#students">◉ {t('admin.students')}</a><Link href="/dashboard">↗ {t('admin.studentView')}</Link></nav><button className="admin-signout" onClick={signOut}>{t('admin.signOut')} ↗</button></aside><section className="admin-main"><header><div><p className="page-eyebrow">{t('admin.center')}</p><h1>{t('admin.title')}</h1><p>{t('admin.lede')}</p></div><span className="admin-avatar">{user.fullName.slice(0,2).toUpperCase()}</span></header><div className="admin-stats"><article><span>◎</span><div><strong>{overview.metrics.pending}</strong><small>{t('admin.pending')}</small></div></article><article><span>✓</span><div><strong>{overview.metrics.approved}</strong><small>{t('admin.active')}</small></div></article><article><span>◉</span><div><strong>{overview.students.length}</strong><small>{t('admin.total')}</small></div></article><article><span>↗</span><div><strong>{overview.metrics.completions}</strong><small>{t('admin.completed')}</small></div></article></div>
    <section className="admin-table-section" id="applications"><div><p className="page-eyebrow">{t('admin.queue')}</p><h2>{t('admin.waiting')}</h2></div>{pending.length?<div className="admin-table">{pending.map(student=><StudentRow key={student.id} student={student} update={update}/>)}</div>:<div className="admin-empty"><span>✓</span><h3>{t('admin.clear')}</h3><p>{t('admin.clearBody')}</p></div>}</section>
    <section className="admin-table-section" id="students"><div><p className="page-eyebrow">{t('admin.all')}</p><h2>{t('admin.directory')}</h2></div><div className="admin-table compact">{overview.students.map(student=><StudentRow key={student.id} student={student} update={update}/>)}</div></section></section></main>;
}
function StudentRow({student,update}:{student:SessionUser;update:(id:string,status:'APPROVED'|'REJECTED'|'SUSPENDED')=>Promise<void>}){
  const { t } = usePreferences();
  const [busy,setBusy]=useState(false);async function change(status:'APPROVED'|'REJECTED'|'SUSPENDED'){setBusy(true);try{await update(student.id,status);}finally{setBusy(false);}}
  return <article><span className="student-avatar">{student.fullName.slice(0,2).toUpperCase()}</span><div><strong>{student.fullName}</strong><small>{student.email}{!student.emailVerified?` · ${t('admin.unverified')}`:''}</small></div><span className={`status-pill ${student.status.toLowerCase()}`}>{t(`admin.status.${student.status.toLowerCase()}`)}</span><div className="admin-row-actions">{student.status!=='APPROVED'&&<button disabled={busy||!student.emailVerified} className="admin-approve" onClick={()=>change('APPROVED')}>{t('admin.approve')}</button>}{student.status!=='SUSPENDED'&&<button disabled={busy} onClick={()=>change('SUSPENDED')}>{t('admin.suspend')}</button>}{student.status==='PENDING'&&<button disabled={busy} className="admin-reject" onClick={()=>change('REJECTED')}>{t('admin.reject')}</button>}</div></article>;
}
