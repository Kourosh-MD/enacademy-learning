'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { StudentSidebar } from '@/components/WorkspaceNavigation';
import { ExamAttempt, ExamSummary, examDescription, examTitle } from '@/lib/exams';

export default function ExamsPage(){
  const {user,loading,apiFetch}=useAuth();
  const {locale,t}=usePreferences();
  const router=useRouter();
  const [exams,setExams]=useState<ExamSummary[]>([]);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const load=useCallback(()=>apiFetch<ExamSummary[]>('/api/v1/exams').then(setExams).catch(problem=>setError(problem.message)),[apiFetch]);

  useEffect(()=>{
    if(!loading&&!user)router.replace('/login');
    else if(user?.role==='ADMIN')router.replace('/admin/exams');
    else if(user)load();
  },[loading,user,router,load]);

  async function open(exam:ExamSummary){
    if(exam.attemptId){router.push(`/exams/${exam.attemptId}`);return;}
    setBusy(exam.id);setError('');
    try{
      const attempt=await apiFetch<ExamAttempt>(`/api/v1/exams/${exam.slug}/attempts`,{method:'POST'});
      router.push(`/exams/${attempt.attemptId}`);
    }catch(problem){setError(problem instanceof Error?problem.message:t('exam.failed'));}
    finally{setBusy('');}
  }

  if(loading||!user)return <main className="status-page"><section><div className="status-orb">✓</div><p className="page-eyebrow">ENACADEMY EXAMS</p><h1>{t('exam.loading')}</h1></section></main>;
  return <main className="dashboard-shell exam-shell"><StudentSidebar active="exams"/>
    <section className="exam-list-main">
      <header className="exam-hero"><div><p className="page-eyebrow">{t('exam.center')}</p><h1>{t('exam.title')}</h1><p>{t('exam.lede')}</p></div><div className="exam-trust"><span>✓</span><div><strong>{t('exam.serverTimed')}</strong><small>{t('exam.serverTimedBody')}</small></div></div></header>
      {error&&<div className="commerce-error" role="alert">{error}</div>}
      <section className="exam-grid">{exams.map(exam=>{
        const completed=exam.attemptStatus&&exam.attemptStatus!=='IN_PROGRESS';
        const locked=exam.availability!=='OPEN'&&!exam.attemptId;
        return <article className={`exam-card ${locked?'locked':''}`} key={exam.id}>
          <div className="exam-card-top"><span className="exam-level">{exam.level}</span><span className={`exam-availability ${exam.availability.toLowerCase()}`}>{t(`exam.availability.${exam.availability.toLowerCase()}`)}</span></div>
          <h2>{examTitle(exam,locale)}</h2><p>{examDescription(exam,locale)}</p>
          <div className="exam-facts"><span>◷ <b>{exam.durationMinutes}</b> {t('exam.minutes')}</span><span>◎ <b>{exam.questionCount}</b> {t('exam.questions')}</span><span>✓ <b>{exam.passingScore}%</b> {t('exam.toPass')}</span></div>
          {completed&&<div className={`exam-result-strip ${exam.passed?'passed':'failed'}`}><span>{exam.passed?'✓':'↻'}</span><strong>{exam.percentage}%</strong><small>{exam.passed?t('exam.passed'):t('exam.reviewResult')}</small></div>}
          <div className="exam-card-actions">
            {(exam.availability==='OPEN'||exam.attemptId)&&<button disabled={busy===exam.id} onClick={()=>open(exam)}>{busy===exam.id?t('exam.opening'):completed?t('exam.viewResult'):exam.attemptId?t('exam.resume'):t('exam.start')}</button>}
            {exam.availability==='LOCKED'&&<Link href="/store">{t('exam.unlockCourse')} →</Link>}
            {exam.availability==='UPCOMING'&&<span>{new Intl.DateTimeFormat(locale==='fa'?'fa-IR':'en-GB',{dateStyle:'medium'}).format(new Date(exam.startsAt))}</span>}
          </div>
        </article>;
      })}</section>
      <section className="exam-rules"><p className="page-eyebrow">{t('exam.before')}</p><h2>{t('exam.beforeTitle')}</h2><div><article><span>01</span><strong>{t('exam.ruleTimer')}</strong><p>{t('exam.ruleTimerBody')}</p></article><article><span>02</span><strong>{t('exam.ruleSave')}</strong><p>{t('exam.ruleSaveBody')}</p></article><article><span>03</span><strong>{t('exam.ruleSubmit')}</strong><p>{t('exam.ruleSubmitBody')}</p></article></div></section>
    </section>
  </main>;
}
