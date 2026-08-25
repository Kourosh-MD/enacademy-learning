'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePreferences } from '@/components/PreferencesProvider';

export function StudentSidebar({active}:{active:'dashboard'|'store'|'purchases'}) {
  const {user,logout}=useAuth();
  const {t}=usePreferences();
  const router=useRouter();
  async function signOut(){await logout();router.push('/');}
  if(!user)return null;
  return <aside className="dash-sidebar">
    <Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link>
    <nav>
      <Link className={active==='dashboard'?'active':''} href="/dashboard"><span>⌂</span>{t('dashboard.overview')}</Link>
      <Link className={active==='store'?'active':''} href="/store"><span>◫</span>{t('commerce.store')}</Link>
      <Link className={active==='purchases'?'active':''} href="/purchases"><span>▤</span>{t('commerce.purchases')}</Link>
      <Link href="/curriculum"><span>↗</span>{t('dashboard.path')}</Link>
      {user.role==='ADMIN'&&<Link href="/admin"><span>⌘</span>{t('dashboard.admin')}</Link>}
    </nav>
    <div className="sidebar-profile"><span>{user.fullName.slice(0,2).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{user.role.toLowerCase()}</small></div><button onClick={signOut} aria-label={t('admin.signOut')}>↗</button></div>
  </aside>;
}
