'use client';

import Link from 'next/link';
import { usePreferences } from '@/components/PreferencesProvider';

export function PublicHeader({ dark = false }: { dark?: boolean }) {
  const { t } = usePreferences();
  return (
    <header className={`site-header ${dark ? 'header-dark' : ''}`}>
      <Link className="wordmark" href="/" aria-label={t('header.home')}><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link>
      <nav className="desktop-nav" aria-label={t('header.nav')}>
        <Link href="/#method">{t('header.how')}</Link><Link href="/curriculum">{t('header.curriculum')}</Link><Link href="/store">{t('commerce.store')}</Link><Link href="/about">{t('header.about')}</Link>
      </nav>
      <div className="header-actions"><Link className="text-link" href="/login">{t('header.signIn')}</Link><Link className="button button-small" href="/login">{t('header.start')} <span>↗</span></Link></div>
    </header>
  );
}
