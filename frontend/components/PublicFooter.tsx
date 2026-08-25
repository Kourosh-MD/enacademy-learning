'use client';

import Link from 'next/link';
import { usePreferences } from '@/components/PreferencesProvider';

export function PublicFooter() {
  const { t } = usePreferences();
  return (
    <footer className="public-footer">
      <div><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><p>{t('footer.tagline')}</p></div>
      <div><strong>{t('footer.explore')}</strong><Link href="/curriculum">{t('header.curriculum')}</Link><Link href="/about">{t('header.about')}</Link><Link href="/login">{t('footer.studentLogin')}</Link></div>
      <div><strong>{t('footer.project')}</strong><span>{t('footer.release')}</span><span>{t('footer.portfolio')}</span><span>{t('footer.openSource')}</span></div>
      <p className="footer-note">{t('footer.note')}</p>
    </footer>
  );
}
