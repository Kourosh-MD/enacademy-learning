import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './product.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
