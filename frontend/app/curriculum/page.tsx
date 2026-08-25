'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { lessonById, modules } from '@/lib/curriculum';
import { usePreferences } from '@/components/PreferencesProvider';
import { courseText } from '@/lib/i18n';

export default function CurriculumPage() {
  const { locale, t } = usePreferences();
  return (
    <main className="inner-page"><PublicHeader />
      <section className="curriculum-hero"><p className="page-eyebrow">{t('curriculum.eyebrow')}</p><h1>{t('curriculum.title')}</h1><p>{t('curriculum.lede')}</p><div className="course-metrics"><div><strong>16</strong><span>{t('curriculum.lessons')}</span></div><div><strong>64</strong><span>{t('curriculum.words')}</span></div><div><strong>80</strong><span>{t('curriculum.steps')}</span></div><div><strong>2</strong><span>{t('curriculum.levels')}</span></div></div></section>
      <section className="curriculum-levels">{(['A1','A2'] as const).map((level)=><div className={`level-block level-${level.toLowerCase()}`} key={level}><header><span>{level}</span><div><p className="page-eyebrow">{level==='A1'?t('curriculum.foundations'):t('curriculum.fluency')}</p><h2>{level==='A1'?t('curriculum.a1Title'):t('curriculum.a2Title')}</h2></div></header><div className="module-list">{modules.filter((module)=>module.level===level).map((module)=><article key={module.id}><div className="module-index">0{module.unit}</div><div className="module-copy"><h3>{courseText(locale,'module',module.id,'title',module.title)}</h3><p>{courseText(locale,'module',module.id,'description',module.description)}</p><small>{t('curriculum.outcome')} · {courseText(locale,'module',module.id,'outcome',module.outcome)}</small><div>{module.lessonIds.map((id)=>{const lesson=lessonById(id);return <span key={id}>✓ {lesson?courseText(locale,'lesson',id,'title',lesson.title):id}</span>})}</div></div><b>{t('curriculum.lessonCount',{count:module.lessonIds.length})}</b></article>)}</div></div>)}</section>
      <section className="curriculum-cta"><div><p className="page-eyebrow">{t('curriculum.ready')}</p><h2>{t('curriculum.readyTitle')}</h2></div><Link className="button button-primary" href="/login">{t('curriculum.create')} →</Link></section>
      <PublicFooter />
    </main>
  );
}
