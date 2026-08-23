import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { lessonById, modules } from '@/lib/curriculum';

export default function CurriculumPage() {
  return (
    <main className="inner-page"><PublicHeader />
      <section className="curriculum-hero"><p className="page-eyebrow">THE COMPLETE FIRST RELEASE</p><h1>From first hello to independent voice.</h1><p>Sixteen practical lessons, eight real-life units, and one connected A1–A2 journey. Every lesson moves through listening, vocabulary, grammar, a knowledge check, and guided speaking.</p><div className="course-metrics"><div><strong>16</strong><span>interactive lessons</span></div><div><strong>64</strong><span>high-utility words</span></div><div><strong>80</strong><span>learning steps</span></div><div><strong>2</strong><span>CEFR levels</span></div></div></section>
      <section className="curriculum-levels">{(['A1','A2'] as const).map((level)=><div className={`level-block level-${level.toLowerCase()}`} key={level}><header><span>{level}</span><div><p className="page-eyebrow">{level==='A1'?'FOUNDATIONS':'EVERYDAY FLUENCY'}</p><h2>{level==='A1'?'Build your first reliable English':'Turn knowledge into independent conversation'}</h2></div></header><div className="module-list">{modules.filter((module)=>module.level===level).map((module)=><article key={module.id}><div className="module-index">0{module.unit}</div><div className="module-copy"><h3>{module.title}</h3><p>{module.description}</p><small>OUTCOME · {module.outcome}</small><div>{module.lessonIds.map((id)=><span key={id}>✓ {lessonById(id)?.title}</span>)}</div></div><b>{module.lessonIds.length} lessons</b></article>)}</div></div>)}</section>
      <section className="curriculum-cta"><div><p className="page-eyebrow">YOUR PATH IS READY</p><h2>Start with twelve focused minutes.</h2></div><Link className="button button-primary" href="/login">Create your account →</Link></section>
      <PublicFooter />
    </main>
  );
}
