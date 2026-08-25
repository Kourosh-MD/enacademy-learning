'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { lessons,modules } from '@/lib/curriculum';
import { usePreferences } from '@/components/PreferencesProvider';
import { courseText } from '@/lib/i18n';

type Progress={lessonId:string;completed:boolean;score:number;xpEarned:number;completedAt:string|null};
type Dashboard={progress:Progress[];savedWords:string[];totalXp:number;completedLessons:number;totalLessons:number};

export default function DashboardPage(){
  const {user,loading,logout,apiFetch}=useAuth();const router=useRouter();const [data,setData]=useState<Dashboard|null>(null);const [error,setError]=useState('');
  const { locale, t } = usePreferences();
  useEffect(()=>{if(!loading&&!user)router.replace('/login');else if(user)apiFetch<Dashboard>('/api/v1/learning/dashboard').then(setData).catch(error=>setError(error.message));},[loading,user,router,apiFetch]);
  const completed=useMemo(()=>new Set((data?.progress||[]).filter(item=>item.completed).map(item=>item.lessonId)),[data]);
  if(loading||!user||!data)return <Loading message={error||t('dashboard.preparing')}/>;
  const nextLesson=lessons.find(lesson=>!completed.has(lesson.id))||lessons[lessons.length-1];const percent=Math.round((data.completedLessons/data.totalLessons)*100);
  async function signOut(){await logout();router.push('/');}
  return <main className="dashboard-shell"><aside className="dash-sidebar"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><nav><Link className="active" href="/dashboard"><span>⌂</span>{t('dashboard.overview')}</Link><Link href="/curriculum"><span>↗</span>{t('dashboard.path')}</Link><a href="#skills"><span>Aa</span>{t('dashboard.skills')}</a><a href="#words"><span>♡</span>{t('dashboard.words')}</a>{user.role==='ADMIN'&&<Link href="/admin"><span>⌘</span>{t('dashboard.admin')}</Link>}</nav><div className="sidebar-profile"><span>{user.fullName.slice(0,2).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{user.role.toLowerCase()}</small></div><button onClick={signOut}>↗</button></div></aside>
    <section className="dash-main"><header className="dash-top"><div><p className="page-eyebrow">{t('dashboard.space')}</p><h1>{t('dashboard.greeting',{name:user.fullName.split(' ')[0]})}</h1><p>{t('dashboard.rhythm')}</p></div><div className="dash-top-stats"><span>◆ <b>{data.totalXp} XP</b></span><span>♦ <b>{completed.size?t('dashboard.learning'):t('dashboard.dayOne')}</b></span></div></header>
    <article className="continue-card"><div><span className="lesson-badge">{t('dashboard.next')} · {nextLesson.level}</span><h2>{courseText(locale,'lesson',nextLesson.id,'title',nextLesson.title)}</h2><p>{courseText(locale,'lesson',nextLesson.id,'objective',nextLesson.objective)}</p><div className="continue-meta"><span>◷ {t('dashboard.minutes',{count:nextLesson.duration})}</span><span>◆ +{nextLesson.xp} XP</span><span>{t('dashboard.activities')}</span></div><Link className="button button-primary" href={`/learn/${nextLesson.id}`}>{completed.size?t('dashboard.continue'):t('dashboard.start')} →</Link></div><div className="continue-visual"><div className="mini-core"><small>{t('dashboard.yourPath')}</small><strong>{percent}%</strong><span>{t('dashboard.complete',{done:completed.size,total:lessons.length})}</span></div></div></article>
    <section className="dash-section"><div className="dash-section-title"><div><p className="page-eyebrow">{t('dashboard.pathEyebrow')}</p><h2>{t('dashboard.milestones')}</h2></div><Link href="/curriculum">{t('dashboard.full')} →</Link></div><div className="dashboard-modules">{modules.map(module=>{const count=module.lessonIds.filter(id=>completed.has(id)).length;const unlocked=module.unit===1||modules.slice(0,module.unit-1).every(previous=>previous.lessonIds.every(id=>completed.has(id)));return <article key={module.id} className={!unlocked?'locked':''}><span>{count===module.lessonIds.length?'✓':String(module.unit).padStart(2,'0')}</span><div><small>{module.level} · {t('dashboard.unit',{unit:module.unit})}</small><h3>{courseText(locale,'module',module.id,'title',module.title)}</h3><p>{courseText(locale,'module',module.id,'description',module.description)}</p><div className="module-progress"><i style={{width:`${(count/module.lessonIds.length)*100}%`}}/></div></div><b>{count}/{module.lessonIds.length}</b></article>;})}</div></section>
    <section className="skill-overview" id="skills"><article><span>Aa</span><div><small>{t('dashboard.vocabulary')}</small><strong>{t('dashboard.wordsSaved',{count:data.savedWords.length})}</strong></div></article><article><span>◉</span><div><small>{t('dashboard.speaking')}</small><strong>{t('dashboard.moments',{count:completed.size})}</strong></div></article><article><span>✓</span><div><small>{t('dashboard.knowledge')}</small><strong>{t('dashboard.average',{count:data.progress.length?Math.round(data.progress.reduce((sum,item)=>sum+item.score,0)/data.progress.length):0})}</strong></div></article></section>
    </section></main>;
}
function Loading({message}:{message:string}){return <main className="status-page"><section><div className="status-orb">◷</div><p className="page-eyebrow">ENACADEMY</p><h1>{message}</h1></section></main>;}
