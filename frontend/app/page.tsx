'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { usePreferences } from '@/components/PreferencesProvider';

export default function Home() {
  const { t } = usePreferences();
  const skillSignals = [
    { label: t('home.hero.speaking'), value: t('home.hero.confident'), tone: 'mint' },
    { label: t('home.hero.listening'), value: t('home.hero.voices'), tone: 'violet' },
    { label: t('home.hero.progress'), value: '42% A2', tone: 'amber' },
  ];
  return (
    <main className="landing-shell">
      <PublicHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow-pill"><span className="live-dot" /> {t('home.hero.badge')}</div>
          <h1 id="hero-title">{t('home.hero.title1')}<br /><em>{t('home.hero.title2')}</em></h1>
          <p className="hero-lede">{t('home.hero.lede')}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">{t('home.hero.start')} <span>→</span></Link>
            <a className="button button-ghost" href="#method"><span className="play-dot">▶</span> {t('home.hero.see')}</a>
          </div>
          <div className="hero-proof" aria-label="Course highlights">
            <div><strong>A1–A2</strong><span>{t('home.hero.complete')}</span></div><i />
            <div><strong>10 min</strong><span>{t('home.hero.rhythm')}</span></div><i />
            <div><strong>{t('home.hero.skills')}</strong><span>{t('home.hero.experience')}</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label={t('home.hero.preview')}>
          <div className="stage-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="language-core">
            <span className="core-kicker">{t('home.hero.today')}</span><strong>I&apos;ve got this.</strong><small>/ aɪv ɡɒt ðɪs /</small>
            <div className="sound-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="floating-word word-one"><span>bonjour</span><b>Hello</b></div>
          <div className="floating-word word-two"><span>سلام</span><b>Hi there</b></div>
          <div className="floating-word word-three"><span>hola</span><b>Let&apos;s talk</b></div>
          {skillSignals.map((signal, index) => (
            <article className={`signal-card signal-${index + 1} ${signal.tone}`} key={signal.label}>
              <span>{signal.label}</span><strong>{signal.value}</strong><i aria-hidden="true" />
            </article>
          ))}
          <div className="streak-chip"><span>◆</span><div><b>{t('home.hero.streak')}</b><small>{t('home.hero.keep')}</small></div></div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Learning outcomes">
        <p>{t('home.signals.label')}</p>
        <div><span>✦</span> {t('home.signals.everyday')}</div><div><span>◉</span> {t('home.signals.pronunciation')}</div>
        <div><span>↗</span> {t('home.signals.progress')}</div><div><span>⌁</span> {t('home.signals.vocabulary')}</div>
      </section>

      <section className="method-section" id="method">
        <div className="section-intro"><p className="page-eyebrow">{t('home.method.eyebrow')}</p><h2>{t('home.method.title')}</h2><p>{t('home.method.lede')}</p></div>
        <div className="method-steps">
          <article><span>01</span><div className="method-icon listen-icon"><i/><i/><i/><i/></div><h3>{t('home.method.one.title')}</h3><p>{t('home.method.one.body')}</p></article>
          <article><span>02</span><div className="method-icon pattern-icon">Aa</div><h3>{t('home.method.two.title')}</h3><p>{t('home.method.two.body')}</p></article>
          <article><span>03</span><div className="method-icon speak-icon">◉</div><h3>{t('home.method.three.title')}</h3><p>{t('home.method.three.body')}</p></article>
        </div>
      </section>

      <section className="product-showcase">
        <div className="showcase-copy"><p className="page-eyebrow">{t('home.showcase.eyebrow')}</p><h2>{t('home.showcase.title1')}<br/>{t('home.showcase.title2')}</h2><p>{t('home.showcase.body')}</p><ul><li><span>✓</span> {t('home.showcase.point1')}</li><li><span>✓</span> {t('home.showcase.point2')}</li><li><span>✓</span> {t('home.showcase.point3')}</li></ul><Link className="button button-primary" href="/login">{t('home.showcase.cta')} →</Link></div>
        <div className="dashboard-preview" aria-label="Student dashboard preview">
          <aside><b>EN</b><i/><i/><i/><i/></aside><div className="preview-main"><header><span/><div><i/><i/></div></header><p>{t('home.showcase.space')}</p><h3>{t('home.showcase.greeting')}</h3><article><small>{t('home.showcase.next')}</small><strong>{t('home.showcase.lesson')}</strong><span>{t('home.showcase.objective')}</span><button>{t('home.showcase.continue')} →</button><div className="preview-orb">42%</div></article><div className="preview-cards"><i/><i/><i/></div></div>
        </div>
      </section>

      <section className="home-curriculum" id="curriculum">
        <div className="section-intro"><p className="page-eyebrow">{t('home.course.eyebrow')}</p><h2>{t('home.course.title')}</h2><p>{t('home.course.body')}</p></div>
        <div className="level-cards"><article><span>A1</span><div><p className="page-eyebrow">{t('home.course.a1')}</p><h3>{t('home.course.a1title')}</h3><p>{t('home.course.a1body')}</p><strong>{t('home.course.lessons')}</strong></div><i>→</i></article><article><span>A2</span><div><p className="page-eyebrow">{t('home.course.a2')}</p><h3>{t('home.course.a2title')}</h3><p>{t('home.course.a2body')}</p><strong>{t('home.course.lessons')}</strong></div><i>→</i></article></div>
        <Link className="curriculum-link" href="/curriculum">{t('home.course.cta')} <span>↗</span></Link>
      </section>

      <section className="roles-section">
        <div className="roles-visual"><div className="approval-card"><div><span>KM</span><p><b>Kourosh M.</b><small>{t('home.roles.application')}</small></p><i>{t('home.roles.new')}</i></div><div className="approval-actions"><button>{t('home.roles.approve')}</button><button>{t('home.roles.review')}</button></div></div><div className="approved-chip">✓ {t('home.roles.approved')}</div><div className="role-ring"><span>ADMIN</span></div></div>
        <div><p className="page-eyebrow">{t('home.roles.eyebrow')}</p><h2>{t('home.roles.title')}</h2><p>{t('home.roles.body')}</p><div className="role-points"><div><span>01</span><p><b>{t('home.roles.student')}</b><small>{t('home.roles.studentBody')}</small></p></div><div><span>02</span><p><b>{t('home.roles.admin')}</b><small>{t('home.roles.adminBody')}</small></p></div><div><span>03</span><p><b>{t('home.roles.durable')}</b><small>{t('home.roles.durableBody')}</small></p></div></div></div>
      </section>

      <section className="home-about" id="about"><p className="page-eyebrow">{t('home.about.eyebrow')}</p><blockquote>{t('home.about.quote')}</blockquote><p>{t('home.about.body')}</p><Link href="/about">{t('home.about.cta')} →</Link></section>
      <section className="final-cta"><div className="cta-orbit"><i/><i/><span>EN</span></div><p className="page-eyebrow">{t('home.final.eyebrow')}</p><h2>{t('home.final.title1')}<br/><em>{t('home.final.title2')}</em></h2><p>{t('home.final.body')}</p><Link className="button button-primary" href="/login">{t('home.final.cta')} →</Link></section>
      <PublicFooter />
    </main>
  );
}
