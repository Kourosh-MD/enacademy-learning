import type { Metadata } from 'next';
import { Manrope, Vazirmatn } from 'next/font/google';
import './globals.css';
import './product.css';
import { AuthProvider } from '@/components/AuthProvider';
import { PreferenceControls, PreferencesProvider } from '@/components/PreferencesProvider';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
const vazirmatn = Vazirmatn({ subsets: ['arabic'], variable: '--font-persian', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'ENAcademy — English for real life',
  description:
    'A complete A1–A2 English journey built around real conversations, clear progress, and confident speaking.',
  openGraph: {
    title: 'ENAcademy — English for real life',
    description:
      'Learn it. Live it. Speak without translating with a complete, practical A1–A2 path.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ENAcademy — English for real life' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ENAcademy — English for real life',
    description: 'A complete A1–A2 journey for confident real-world English.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" data-theme="light" data-accent="emerald" className={`${manrope.variable} ${vazirmatn.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:`try{const p=JSON.parse(localStorage.getItem('enacademy.preferences')||'{}');const r=document.documentElement;if(p.locale==='fa'){r.lang='fa';r.dir='rtl'}if(p.mode==='dark')r.dataset.theme='dark';if(['emerald','ocean','violet','sunset','rose'].includes(p.accent))r.dataset.accent=p.accent}catch{}`}} /></head>
      <body>
        <PreferencesProvider><AuthProvider>{children}</AuthProvider><PreferenceControls /></PreferencesProvider>
      </body>
    </html>
  );
}
