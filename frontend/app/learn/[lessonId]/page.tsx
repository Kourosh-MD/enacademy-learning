'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { LessonPlayer } from '@/components/LessonPlayer';
import type { Lesson } from '@/lib/curriculum';

type LessonResponse={lesson:{id:string};content:Lesson;unlocked:boolean};
export default function LessonPage(){
  const {lessonId}=useParams<{lessonId:string}>();const {user,loading,apiFetch}=useAuth();const router=useRouter();const [lesson,setLesson]=useState<Lesson|null>(null);const [words,setWords]=useState<string[]>([]);const [error,setError]=useState('');
  useEffect(()=>{if(!loading&&!user)router.replace('/login');else if(user)Promise.all([apiFetch<LessonResponse>(`/api/v1/learning/lessons/${lessonId}`),apiFetch<string[]>('/api/v1/learning/words')]).then(([result,saved])=>{if(!result.unlocked)throw new Error('Complete the earlier lessons to unlock this one.');setLesson(result.content);setWords(saved);}).catch(error=>setError(error.message));},[loading,user,lessonId,router,apiFetch]);
  if(error)return <main className="status-page"><section><div className="status-orb rejected">!</div><p className="page-eyebrow">LESSON UNAVAILABLE</p><h1>{error}</h1><Link className="button button-primary" href="/dashboard">Return to your path</Link></section></main>;
  if(!lesson)return <main className="status-page"><section><div className="status-orb">◷</div><p className="page-eyebrow">LESSON LAB</p><h1>Preparing your lesson…</h1></section></main>;
  return <LessonPlayer lesson={lesson} savedWords={words}/>;
}
