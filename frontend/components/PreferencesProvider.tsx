'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Locale, translate } from '@/lib/i18n';

export type ColorMode = 'light' | 'dark';
export type Accent = 'emerald' | 'ocean' | 'violet' | 'sunset' | 'rose';
type PreferencesContextValue = {
  locale: Locale; mode: ColorMode; accent: Accent;
  setLocale(locale: Locale): void; setMode(mode: ColorMode): void; setAccent(accent: Accent): void;
  t(key: string, values?: Record<string, string | number>): string;
};

const STORAGE_KEY = 'enacademy.preferences';
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const accents: Accent[] = ['emerald', 'ocean', 'violet', 'sunset', 'rose'];

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [mode, setMode] = useState<ColorMode>('light');
  const [accent, setAccent] = useState<Accent>('emerald');
  const restored = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<{ locale: Locale; mode: ColorMode; accent: Accent }>;
        if (saved.locale === 'en' || saved.locale === 'fa') setLocale(saved.locale);
        if (saved.mode === 'light' || saved.mode === 'dark') setMode(saved.mode);
        if (saved.accent && accents.includes(saved.accent)) setAccent(saved.accent);
      } catch { /* Ignore malformed local preferences. */ }
      restored.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    const root = document.documentElement;
    root.lang = locale; root.dir = locale === 'fa' ? 'rtl' : 'ltr';
    root.dataset.theme = mode; root.dataset.accent = accent;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ locale, mode, accent }));
  }, [locale, mode, accent]);

  const value = useMemo<PreferencesContextValue>(() => ({
    locale, mode, accent, setLocale, setMode, setAccent,
    t: (key, values) => translate(locale, key, values),
  }), [locale, mode, accent]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be inside PreferencesProvider');
  return value;
}

export function PreferenceControls() {
  const { locale, mode, accent, setLocale, setMode, setAccent, t } = usePreferences();
  const [paletteOpen, setPaletteOpen] = useState(false);
  return <div className="preference-dock" dir="ltr" aria-label="Display preferences">
    <button className="preference-button language-button" onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')} title={t('prefs.language')} aria-label={t('prefs.language')}>
      <span>{locale === 'en' ? 'فا' : 'EN'}</span>
    </button>
    <button className="preference-button" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')} title={t('prefs.theme')} aria-label={t('prefs.theme')}>
      <span aria-hidden="true">{mode === 'light' ? '☾' : '☀'}</span><small>{mode === 'light' ? t('prefs.dark') : t('prefs.light')}</small>
    </button>
    <div className="palette-control">
      <button className="preference-button palette-button" onClick={() => setPaletteOpen(!paletteOpen)} aria-expanded={paletteOpen} title={t('prefs.colors')} aria-label={t('prefs.colors')}>
        <i className={`palette-dot palette-${accent}`} /><small>{t(`prefs.${accent}`)}</small>
      </button>
      {paletteOpen && <div className="palette-menu" role="menu" aria-label={t('prefs.palette')}>
        <strong>{t('prefs.palette')}</strong>
        {accents.map(option => <button role="menuitemradio" aria-checked={accent === option} key={option} onClick={() => { setAccent(option); setPaletteOpen(false); }} className={accent === option ? 'active' : ''}><i className={`palette-dot palette-${option}`} /><span>{t(`prefs.${option}`)}</span>{accent === option && <b>✓</b>}</button>)}
      </div>}
    </div>
  </div>;
}
