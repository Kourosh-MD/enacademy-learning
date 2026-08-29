'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { AttemptState, ExamAttempt, explanation, examTitle, formatClock, optionText, questionPrompt } from '@/lib/exams';

type SaveState='saved'|'dirty'|'saving'|'error';

export default function ExamAttemptPage(){
  const {attemptId}=useParams<{attemptId:string}>();
  const {user,loading,apiFetch}=useAuth();
  const {locale,t}=usePreferences();
  const router=useRouter();
  const [attempt,setAttempt]=useState<ExamAttempt|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [index,setIndex]=useState(0);
  const [remaining,setRemaining]=useState(0);
  const [saveState,setSaveState]=useState<SaveState>('saved');
  const [error,setError]=useState('');
  const [confirming,setConfirming]=useState(false);
  const dirtyRef=useRef(new Set<string>());
  const answersRef=useRef<Record<string,string>>({});
  const savingRef=useRef(false);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const submittingRef=useRef(false);

  const load=useCallback(async()=>{
    try{
      const result=await apiFetch<ExamAttempt>(`/api/v1/exams/attempts/${attemptId}`);
      setAttempt(result);setAnswers(result.answers);answersRef.current=result.answers;setRemaining(result.remainingSeconds);
    }catch(problem){setError(problem instanceof Error?problem.message:t('exam.failed'));}
  },[apiFetch,attemptId,t]);

  useEffect(()=>{
    if(!loading&&!user)router.replace('/login');
    else if(user?.role==='ADMIN')router.replace('/admin/exams');
    else if(user)queueMicrotask(()=>void load());
  },[loading,user,router,load]);

  const flush=useCallback(async()=>{
    if(!attempt||attempt.status!=='IN_PROGRESS')return true;
    while(savingRef.current)await new Promise(resolve=>setTimeout(resolve,40));
    let successful=true;
    while(dirtyRef.current.size){
      const ids=[...dirtyRef.current];dirtyRef.current.clear();savingRef.current=true;setSaveState('saving');
      try{
        const state=await apiFetch<AttemptState>(`/api/v1/exams/attempts/${attempt.attemptId}/answers`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({answers:ids.map(questionId=>({questionId,selectedOption:answersRef.current[questionId]}))})});
        setSaveState('saved');setError('');setRemaining(state.remainingSeconds);
        if(state.status!=='IN_PROGRESS'){await load();break;}
      }catch(problem){ids.forEach(id=>dirtyRef.current.add(id));setSaveState('error');setError(problem instanceof Error?problem.message:t('exam.saveFailed'));successful=false;break;}
      finally{savingRef.current=false;}
    }
    return successful;
  },[apiFetch,attempt,load,t]);

  function choose(questionId:string,selectedOption:string){
    const next={...answersRef.current,[questionId]:selectedOption};answersRef.current=next;setAnswers(next);
    dirtyRef.current.add(questionId);setSaveState('dirty');setError('');
    if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(flush,700);
  }

  const submit=useCallback(async()=>{
    if(!attempt||submittingRef.current)return;
    submittingRef.current=true;setConfirming(false);setError('');
    try{if(!await flush())return;const result=await apiFetch<ExamAttempt>(`/api/v1/exams/attempts/${attempt.attemptId}/submit`,{method:'POST'});setAttempt(result);setAnswers(result.answers);answersRef.current=result.answers;setRemaining(0);setSaveState('saved');}
    catch(problem){setError(problem instanceof Error?problem.message:t('exam.submitFailed'));}
    finally{submittingRef.current=false;}
  },[apiFetch,attempt,flush,t]);

  useEffect(()=>{
    if(!attempt||attempt.status!=='IN_PROGRESS')return;
    const end=Date.now()+attempt.remainingSeconds*1000;
    const interval=setInterval(()=>{const value=Math.max(0,Math.ceil((end-Date.now())/1000));setRemaining(value);if(value===0){clearInterval(interval);void submit();}},1000);
    return()=>clearInterval(interval);
  },[attempt?.attemptId,attempt?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirtyRef.current.size||savingRef.current){event.preventDefault();}};window.addEventListener('beforeunload',warn);return()=>{window.removeEventListener('beforeunload',warn);if(timerRef.current)clearTimeout(timerRef.current);};},[]);

  const answered=Object.keys(answers).length;
  const question=attempt?.questions[index];
  const finished=attempt&&attempt.status!=='IN_PROGRESS';
  const saveLabel=saveState==='saving'?t('exam.saving'):saveState==='dirty'?t('exam.unsaved'):saveState==='error'?t('exam.saveFailed'):t('exam.saved');

  if(loading||!user||!attempt)return <main className="status-page"><section><div className="status-orb">◷</div><p className="page-eyebrow">ENACADEMY EXAM</p><h1>{error||t('exam.loadingAttempt')}</h1>{error&&<Link className="button button-primary" href="/exams">{t('exam.back')}</Link>}</section></main>;
  if(finished)return <main className="exam-player-shell result-page"><header><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><Link href="/exams">← {t('exam.back')}</Link></header><section className="exam-result-hero"><span className={`result-orb ${attempt.passed?'passed':'failed'}`}>{attempt.passed?'✓':'↻'}</span><p className="page-eyebrow">{attempt.status==='AUTO_SUBMITTED'?t('exam.autoSubmitted'):t('exam.submitted')}</p><h1>{attempt.passed?t('exam.resultPassed'):t('exam.resultReview')}</h1><p>{examTitle(attempt.exam,locale)}</p><div><strong>{attempt.percentage}%</strong><span>{attempt.scorePoints}/{attempt.maxPoints} {t('exam.points')}</span><span>{attempt.exam.passingScore}% {t('exam.toPass')}</span></div></section><section className="exam-review-list"><div className="exam-review-heading"><p className="page-eyebrow">{t('exam.review')}</p><h2>{t('exam.reviewTitle')}</h2></div>{attempt.questions.map((item,position)=>{const selected=answers[item.id];const correct=selected===item.correctOption;return <article className={correct?'correct':'incorrect'} key={item.id}><span>{String(position+1).padStart(2,'0')}</span><div><h3>{questionPrompt(item,locale)}</h3><p><b>{t('exam.yourAnswer')}:</b> {optionText(item.options.find(option=>option.id===selected)??{id:'',textEn:t('exam.notAnswered'),textFa:t('exam.notAnswered')},locale)}</p>{!correct&&<p><b>{t('exam.correctAnswer')}:</b> {optionText(item.options.find(option=>option.id===item.correctOption)!,locale)}</p>}<small>{explanation(item,locale)}</small></div><strong>{correct?'✓':'×'}</strong></article>;})}</section></main>;
  if(!question)return <main className="status-page"><section><div className="status-orb">!</div><h1>{t('exam.failed')}</h1><Link className="button button-primary" href="/exams">{t('exam.back')}</Link></section></main>;

  return <main className="exam-player-shell"><header className="exam-player-header"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><div><span className={`save-indicator ${saveState}`}>● {saveLabel}</span><strong className={remaining<300?'urgent':''}>◷ {formatClock(remaining,locale)}</strong><button onClick={()=>setConfirming(true)}>{t('exam.finish')}</button></div></header>
    <div className="exam-player-layout"><aside className="exam-palette"><p className="page-eyebrow">{attempt.exam.level} · {t('exam.onlineExam')}</p><h2>{examTitle(attempt.exam,locale)}</h2><div className="exam-progress"><span style={{width:`${answered/attempt.questions.length*100}%`}}/></div><small>{t('exam.answered',{answered,total:attempt.questions.length})}</small><nav aria-label={t('exam.questionNavigation')}>{attempt.questions.map((item,position)=><button className={`${position===index?'active':''} ${answers[item.id]?'answered':''}`} onClick={()=>setIndex(position)} key={item.id}>{position+1}</button>)}</nav><Link href="/exams">← {t('exam.leave')}</Link></aside>
      <section className="exam-question-stage">{error&&<div className="commerce-error" role="alert">{error}</div>}<div className="exam-question-number"><span>{t('exam.question')} {index+1}</span><small>{question.points} {t('exam.points')}</small></div><h1>{questionPrompt(question,locale)}</h1><div className="exam-options">{question.options.map(option=><button className={answers[question.id]===option.id?'selected':''} onClick={()=>choose(question.id,option.id)} key={option.id}><span>{option.id.toUpperCase()}</span><strong>{optionText(option,locale)}</strong><i>{answers[question.id]===option.id?'✓':''}</i></button>)}</div><footer><button disabled={index===0} onClick={()=>setIndex(value=>value-1)}>← {t('exam.previous')}</button><span>{index+1} / {attempt.questions.length}</span>{index<attempt.questions.length-1?<button onClick={()=>setIndex(value=>value+1)}>{t('exam.next')} →</button>:<button className="finish" onClick={()=>setConfirming(true)}>{t('exam.finish')}</button>}</footer></section></div>
    {confirming&&<div className="commerce-modal-backdrop"><section className="commerce-modal exam-confirm" role="dialog" aria-modal="true"><span className="modal-product-icon">✓</span><p className="page-eyebrow">{t('exam.finalCheck')}</p><h2>{t('exam.submitTitle')}</h2><p>{t('exam.submitBody',{answered,total:attempt.questions.length})}</p><div><button className="commerce-preview" onClick={()=>setConfirming(false)}>{t('exam.keepWorking')}</button><button className="commerce-buy" onClick={()=>void submit()}>{t('exam.submitNow')}</button></div></section></div>}
  </main>;
}
