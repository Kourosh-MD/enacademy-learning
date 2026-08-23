import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureProfile, reviewStudent } from '@/db/academy';

export async function PATCH(request:Request) { const user=await getChatGPTUser(); if(!user) return Response.json({error:'Unauthorized'},{status:401}); const admin=await ensureProfile(user); if(admin.role!=='admin'||admin.status!=='approved') return Response.json({error:'Forbidden'},{status:403}); const body=await request.json() as {userId?:string;status?:'approved'|'rejected'|'suspended'}; if(!body.userId||!body.status||!['approved','rejected','suspended'].includes(body.status)) return Response.json({error:'Invalid request'},{status:400}); await reviewStudent(admin.user_id,body.userId,body.status); return Response.json({ok:true}); }
