'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { LessonPlayer } from '@/components/LessonPlayer';
import type { Lesson } from '@/lib/curriculum';
import { usePreferences } from '@/components/PreferencesProvider';

type LessonResponse={lesson:{id:string};content:Lesson;unlocked:boolean};
export default function LessonPage(){
  const {lessonId}=useParams<{lessonId:string}>();const {user,loading,apiFetch}=useAuth();const router=useRouter();const [lesson,setLesson]=useState<Lesson|null>(null);const [words,setWords]=useState<string[]>([]);const [error,setError]=useState('');
  const { t } = usePreferences();
  useEffect(()=>{if(!loading&&!user)router.replace('/login');else if(user)Promise.all([apiFetch<LessonResponse>(`/api/v1/learning/lessons/${lessonId}`),apiFetch<string[]>('/api/v1/learning/words')]).then(([result,saved])=>{if(!result.unlocked)throw new Error(t('lesson.locked'));setLesson(result.content);setWords(saved);}).catch(error=>setError(error.message));},[loading,user,lessonId,router,apiFetch,t]);
  if(error)return <main className="status-page"><section><div className="status-orb rejected">!</div><p className="page-eyebrow">{t('lesson.unavailable')}</p><h1>{error}</h1><Link className="button button-primary" href="/dashboard">{t('lesson.return')}</Link></section></main>;
  if(!lesson)return <main className="status-page"><section><div className="status-orb">◷</div><p className="page-eyebrow">{t('lesson.lab')}</p><h1>{t('lesson.preparing')}</h1></section></main>;
  return <LessonPlayer lesson={lesson} savedWords={words}/>;
}
