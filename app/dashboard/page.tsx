import Link from 'next/link';
import { requireChatGPTUser, chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { ensureProfile, getProgress } from '@/db/academy';
import { lessonById, lessons, modules } from '@/lib/curriculum';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireChatGPTUser('/dashboard');
  const profile = await ensureProfile(user);
  if (profile.status !== 'approved') return <AccountStatus status={profile.status} name={profile.full_name} />;
  const progress = await getProgress(user.userId);
  const completed = new Set(progress.filter((item)=>item.completed).map((item)=>item.lesson_id));
  const totalXp = progress.reduce((sum,item)=>sum+item.xp_earned,0);
  const nextLesson = lessons.find((lesson)=>!completed.has(lesson.id)) || lessons[0];
  const percent = Math.round((completed.size / lessons.length) * 100);
  return (
    <main className="dashboard-shell"><aside className="dash-sidebar"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><nav><Link className="active" href="/dashboard"><span>⌂</span>Overview</Link><Link href="/curriculum"><span>↗</span>Learning path</Link><a href="#skills"><span>Aa</span>My skills</a><a href="#words"><span>♡</span>Saved words</a>{profile.role==='admin'&&<Link href="/admin"><span>⌘</span>Admin panel</Link>}</nav><div className="sidebar-profile"><span>{profile.full_name.slice(0,2).toUpperCase()}</span><div><strong>{profile.full_name}</strong><small>{profile.role}</small></div><Link href={chatGPTSignOutPath('/')}>↗</Link></div></aside>
      <section className="dash-main"><header className="dash-top"><div><p className="page-eyebrow">YOUR LEARNING SPACE</p><h1>Good to see you, {profile.full_name.split(' ')[0]}.</h1><p>Keep the rhythm small and the progress real.</p></div><div className="dash-top-stats"><span>◆ <b>{totalXp} XP</b></span><span>♦ <b>{completed.size ? 'Learning' : 'Day one'}</b></span></div></header>
      <article className="continue-card"><div><span className="lesson-badge">NEXT UP · {nextLesson.level}</span><h2>{nextLesson.title}</h2><p>{nextLesson.objective}</p><div className="continue-meta"><span>◷ {nextLesson.duration} min</span><span>◆ +{nextLesson.xp} XP</span><span>5 activities</span></div><Link className="button button-primary" href={`/learn/${nextLesson.id}`}>{completed.size?'Continue learning':'Start first lesson'} →</Link></div><div className="continue-visual"><div className="mini-core"><small>YOUR PATH</small><strong>{percent}%</strong><span>{completed.size} of {lessons.length} complete</span></div></div></article>
      <section className="dash-section"><div className="dash-section-title"><div><p className="page-eyebrow">LEARNING PATH</p><h2>Eight real-life milestones</h2></div><Link href="/curriculum">View full curriculum →</Link></div><div className="dashboard-modules">{modules.map((module)=>{const count=module.lessonIds.filter((id)=>completed.has(id)).length; const unlocked=module.unit===1||modules.slice(0,module.unit-1).every((previous)=>previous.lessonIds.every((id)=>completed.has(id))); return <article key={module.id} className={!unlocked?'locked':''}><span>{count===module.lessonIds.length?'✓':String(module.unit).padStart(2,'0')}</span><div><small>{module.level} · UNIT {module.unit}</small><h3>{module.title}</h3><p>{module.description}</p><div className="module-progress"><i style={{width:`${(count/module.lessonIds.length)*100}%`}} /></div></div><b>{count}/{module.lessonIds.length}</b></article>})}</div></section>
      <section className="skill-overview" id="skills"><article><span>Aa</span><div><small>VOCABULARY</small><strong>{completed.size*4} words practised</strong></div></article><article><span>◉</span><div><small>SPEAKING</small><strong>{completed.size} guided moments</strong></div></article><article><span>✓</span><div><small>KNOWLEDGE</small><strong>{progress.length?Math.round(progress.reduce((sum,item)=>sum+item.score,0)/progress.length):0}% average</strong></div></article></section>
      </section>
    </main>
  );
}

function AccountStatus({ status, name }: { status:string; name:string }) {
  const pending=status==='pending';
  return <main className="status-page"><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><section><div className={`status-orb ${status}`}>{pending?'◷':'!'}</div><p className="page-eyebrow">ACCOUNT {status.toUpperCase()}</p><h1>{pending?`Welcome, ${name.split(' ')[0]}. Your application is in.`:'Your learning access needs attention.'}</h1><p>{pending?'An ENAcademy administrator will review your student profile. Your course progress begins as soon as you are approved.':'Your account is not currently approved. Contact an administrator if you believe this is a mistake.'}</p><div className="status-steps"><div className="done"><span>✓</span><b>Account created</b></div><i/><div className={pending?'current':''}><span>2</span><b>Admin review</b></div><i/><div><span>3</span><b>Start learning</b></div></div><Link className="button button-ghost" href={chatGPTSignOutPath('/')}>Sign out</Link></section></main>;
}
