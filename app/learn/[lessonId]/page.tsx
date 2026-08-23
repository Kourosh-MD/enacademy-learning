import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { ensureProfile, getSavedWords } from '@/db/academy';
import { lessonById } from '@/lib/curriculum';
import { LessonPlayer } from '@/components/LessonPlayer';

export const dynamic = 'force-dynamic';

export default async function LessonPage({ params }: { params: Promise<{ lessonId:string }> }) {
  const { lessonId } = await params; const lesson=lessonById(lessonId); if(!lesson) notFound();
  const user=await requireChatGPTUser(`/learn/${lessonId}`); const profile=await ensureProfile(user);
  if(profile.status!=='approved') return <main className="status-page"><section><div className="status-orb pending">◷</div><p className="page-eyebrow">APPROVAL REQUIRED</p><h1>Your course opens after admin approval.</h1><p>Your profile is saved. Return to the dashboard to see your current account status.</p></section></main>;
  return <LessonPlayer lesson={lesson} savedWords={await getSavedWords(user.userId)}/>;
}
