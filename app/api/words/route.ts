import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureProfile, toggleSavedWord } from '@/db/academy';
import { lessons } from '@/lib/curriculum';

const vocabulary=new Set(lessons.flatMap((lesson)=>lesson.vocabulary.map((item)=>item.word)));
export async function POST(request:Request) { const user=await getChatGPTUser(); if(!user) return Response.json({error:'Unauthorized'},{status:401}); const profile=await ensureProfile(user); if(profile.status!=='approved') return Response.json({error:'Approval required'},{status:403}); const body=await request.json() as {word?:string;save?:boolean}; if(!body.word||!vocabulary.has(body.word)||typeof body.save!=='boolean') return Response.json({error:'Invalid word'},{status:400}); await toggleSavedWord(user.userId,body.word,body.save); return Response.json({ok:true}); }
