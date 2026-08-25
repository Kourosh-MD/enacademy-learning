'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Lesson } from '@/lib/curriculum';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';
import { courseText } from '@/lib/i18n';

export function LessonPlayer({ lesson, savedWords }: { lesson: Lesson; savedWords: string[] }) {
  const { apiFetch } = useAuth();
  const { locale, t } = usePreferences();
  const steps = ['lesson.listen', 'lesson.words', 'lesson.grammar', 'lesson.check', 'lesson.speak', 'lesson.complete'];
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(new Set(savedWords));
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [completeState, setCompleteState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const quizCorrect = choice === lesson.quiz.answer;
  const similarity = useMemo(() => {
    if (!transcript) return 0;
    const target = new Set(lesson.speaking.toLowerCase().replace(/[^a-z ]/g,'').split(/\s+/));
    const heard = transcript.toLowerCase().replace(/[^a-z ]/g,'').split(/\s+/);
    return Math.min(100, Math.round((heard.filter((word) => target.has(word)).length / target.size) * 100));
  }, [transcript, lesson.speaking]);

  function say(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text); voice.lang = 'en-US'; voice.rate = .86; window.speechSynthesis.speak(voice);
  }

  async function toggleWord(word: string) {
    const shouldSave = !saved.has(word);
    const next = new Set(saved); if (shouldSave) next.add(word); else next.delete(word); setSaved(next);
    await apiFetch('/api/v1/learning/words', { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({word,save:shouldSave}) });
  }

  function startSpeaking() {
    type Recognition = { lang:string; interimResults:boolean; start:()=>void; onresult:(event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void; onend:()=>void; onerror:()=>void };
    const SpeechRecognition = (window as unknown as { SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?:new()=>Recognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setTranscript(t('lesson.recognitionUnavailable')); return; }
    const recognition = new SpeechRecognition(); recognition.lang='en-US'; recognition.interimResults=false; setRecording(true);
    recognition.onresult = (event) => setTranscript(event.results[0][0].transcript);
    recognition.onend = () => setRecording(false); recognition.onerror = () => setRecording(false); recognition.start();
  }

  async function finishLesson() {
    setCompleteState('saving');
    const score = quizCorrect ? Math.max(88, similarity || 88) : Math.max(65, similarity || 65);
    try { await apiFetch(`/api/v1/learning/lessons/${lesson.id}/complete`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({score}) }); setCompleteState('saved'); }
    catch { setCompleteState('idle'); }
  }

  function next() {
    const nextStep = Math.min(steps.length - 1, step + 1); setStep(nextStep);
    if (nextStep === steps.length - 1 && completeState === 'idle') void finishLesson();
  }

  return (
    <main className="lesson-shell">
      <header className="lesson-header"><Link href="/dashboard" className="lesson-exit">×</Link><div><span>{lesson.level} · {t('dashboard.unit',{unit:lesson.unit})}</span><strong>{courseText(locale,'lesson',lesson.id,'title',lesson.title)}</strong></div><div className="lesson-progress"><i style={{width:`${((step+1)/steps.length)*100}%`}} /></div><b>{step+1}/{steps.length}</b></header>
      <div className="lesson-layout">
        <aside className="lesson-steps">{steps.map((label,index)=><button key={label} className={index===step?'active':index<step?'done':''} onClick={()=>index<=step&&setStep(index)}><span>{index<step?'✓':index+1}</span>{t(label)}</button>)}</aside>
        <section className="lesson-canvas">
          {step===0 && <div className="lesson-panel"><p className="panel-kicker">{t('lesson.context')}</p><h1>{courseText(locale,'lesson',lesson.id,'objective',lesson.objective)}</h1><div className="dialogue-stack">{lesson.dialogue.map((line,index)=><article key={line.text} className={index%2?'reply':''}><span>{line.speaker.slice(0,1)}</span><div><small>{line.speaker}</small><p>{line.text}</p><button onClick={()=>say(line.text)} aria-label={t('lesson.listenTo',{name:line.speaker})}>◖))</button></div></article>)}</div><div className="learning-tip"><b>{t('lesson.notice')}</b><span>{t('lesson.noticeBody')}</span></div></div>}
          {step===1 && <div className="lesson-panel"><p className="panel-kicker">{t('lesson.wordBank')}</p><h1>{t('lesson.fourWords')}</h1><div className="lesson-word-grid">{lesson.vocabulary.map((item)=><article key={item.word}><div><span>{lesson.level}</span><button onClick={()=>toggleWord(item.word)}>{saved.has(item.word)?'♥':'♡'}</button></div><h2>{item.word}</h2><p>{item.meaning}</p><small>“{item.example}”</small><button className="word-audio" onClick={()=>say(item.word)}>◖)) {t('lesson.hear')}</button></article>)}</div></div>}
          {step===2 && <div className="lesson-panel"><p className="panel-kicker">{t('lesson.pattern')}</p><h1>{lesson.grammar.title}</h1><div className="grammar-focus"><span>{lesson.grammar.formula}</span><p>{lesson.grammar.rule}</p></div><div className="example-list">{lesson.grammar.examples.map((example,index)=><div key={example}><b>0{index+1}</b><p>{example}</p><button onClick={()=>say(example)}>◖))</button></div>)}</div></div>}
          {step===3 && <div className="lesson-panel quiz-panel"><p className="panel-kicker">{t('lesson.quick')}</p><h1>{lesson.quiz.question}</h1><div className="quiz-options">{lesson.quiz.options.map((option,index)=><button disabled={checked} onClick={()=>setChoice(index)} className={`${choice===index?'selected':''} ${checked&&index===lesson.quiz.answer?'correct':''} ${checked&&choice===index&&index!==lesson.quiz.answer?'wrong':''}`} key={option}><b>{String.fromCharCode(65+index)}</b><span>{option}</span></button>)}</div>{checked&&<div className={`quiz-feedback ${quizCorrect?'success':'retry'}`}><b>{quizCorrect?t('lesson.correct'):t('lesson.retry')}</b><span>{lesson.quiz.explanation}</span></div>}<button className="lesson-main-button" disabled={choice===null||checked} onClick={()=>setChecked(true)}>{t('lesson.checkAnswer')}</button></div>}
          {step===4 && <div className="lesson-panel speaking-practice"><p className="panel-kicker">{t('lesson.speakYourself')}</p><h1>{t('lesson.voice')}</h1><button className="prompt-listen" onClick={()=>say(lesson.speaking)}>◖))</button><blockquote>{lesson.speaking}</blockquote><div className={`speech-orb ${recording?'recording':''}`}><i/><i/><i/><i/><i/></div><button className="lesson-main-button" onClick={startSpeaking} disabled={recording}>{recording?t('lesson.listening'):t('lesson.startSpeaking')}</button>{transcript&&<div className="speech-result"><small>{t('lesson.weHeard')}</small><p>{transcript}</p>{similarity>0&&<strong>{t('lesson.match',{count:similarity})}</strong>}</div>}</div>}
          {step===5 && <div className="lesson-panel completion-panel"><div className="completion-mark">✓</div><p className="panel-kicker">{t('lesson.completed')}</p><h1>{t('lesson.action')}</h1><p>{completeState==='saved'?t('lesson.saved'):t('lesson.saving')}</p><div className="reward-cards"><div><strong>+{lesson.xp}</strong><span>{t('lesson.xp')}</span></div><div><strong>{quizCorrect?'100%':t('lesson.review')}</strong><span>{t('lesson.knowledge')}</span></div><div><strong>{lesson.duration}m</strong><span>{t('lesson.practice')}</span></div></div><Link className="lesson-main-button" href="/dashboard">{t('lesson.continuePath')} →</Link></div>}
        </section>
      </div>
      {step<steps.length-1&&<footer className="lesson-footer"><button disabled={step===0} onClick={()=>setStep(step-1)}>← {t('lesson.back')}</button><button className="lesson-main-button" disabled={step===3&&!checked} onClick={next}>{t('lesson.continue')} →</button></footer>}
    </main>
  );
}
