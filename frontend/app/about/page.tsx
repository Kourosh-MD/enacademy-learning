'use client';

import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { usePreferences } from '@/components/PreferencesProvider';

export default function AboutPage() {
  const { t } = usePreferences();
  return (
    <main className="inner-page"><PublicHeader />
      <section className="about-hero"><div><p className="page-eyebrow">{t('about.eyebrow')}</p><h1>{t('about.title')}</h1></div><p>{t('about.lede')}</p></section>
      <section className="about-manifesto"><div className="manifesto-number">01</div><div><p className="page-eyebrow">{t('about.why')}</p><h2>{t('about.manifesto')}</h2></div><div><p>{t('about.p1')}</p><p>{t('about.p2')}</p></div></section>
      <section className="principle-grid"><article><span>01</span><h3>{t('about.principle1')}</h3><p>{t('about.principle1body')}</p></article><article><span>02</span><h3>{t('about.principle2')}</h3><p>{t('about.principle2body')}</p></article><article><span>03</span><h3>{t('about.principle3')}</h3><p>{t('about.principle3body')}</p></article></section>
      <section className="open-source-story"><div className="code-window" aria-hidden="true"><div><i/><i/><i/></div><pre><code>{`const mission = {\n  product: "useful",\n  learning: "human",\n  source: "open—soon"\n};`}</code></pre></div><div><p className="page-eyebrow">{t('about.open')}</p><h2>{t('about.openTitle')}</h2><p>{t('about.openBody')}</p><Link className="button button-primary" href="/curriculum">{t('about.explore')} →</Link></div></section>
      <section className="about-cta"><p className="page-eyebrow">{t('about.ready')}</p><h2>{t('about.readyTitle')}</h2><Link className="button button-primary" href="/login">{t('about.create')} →</Link></section>
      <PublicFooter />
    </main>
  );
}
