import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureProfile, saveLessonProgress } from '@/db/academy';
import { lessonById } from '@/lib/curriculum';

export async function POST(request: Request) {
  const user=await getChatGPTUser(); if(!user) return Response.json({error:'Unauthorized'},{status:401});
  const profile=await ensureProfile(user); if(profile.status!=='approved') return Response.json({error:'Approval required'},{status:403});
  const body=await request.json() as {lessonId?:string;score?:number}; const lesson=body.lessonId?lessonById(body.lessonId):null;
  if(!lesson||typeof body.score!=='number'||body.score<0||body.score>100) return Response.json({error:'Invalid progress data'},{status:400});
  await saveLessonProgress(user.userId,lesson.id,Math.round(body.score),lesson.xp); return Response.json({ok:true});
}
