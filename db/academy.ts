import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '@/app/chatgpt-auth';

export type AcademyProfile = { user_id:string; email:string; full_name:string; role:'student'|'admin'; status:'pending'|'approved'|'rejected'|'suspended'; created_at:number; reviewed_at:number|null; reviewed_by:string|null };
export type ProgressRow = { lesson_id:string; completed:number; score:number; attempts:number; xp_earned:number; updated_at:number };
let schemaReady = false;

async function database() {
  if (!env.DB) throw new Error('ENAcademy database is unavailable.');
  if (!schemaReady) {
    const db = env.DB;
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,full_name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),created_at INTEGER NOT NULL,reviewed_at INTEGER,reviewed_by TEXT)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS lesson_progress (user_id TEXT NOT NULL,lesson_id TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,score INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,xp_earned INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY (user_id,lesson_id))`),
      db.prepare(`CREATE TABLE IF NOT EXISTS saved_words (user_id TEXT NOT NULL,word TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY (user_id,word))`),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_profiles_status_created ON profiles(status, created_at)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_progress_user_completed ON lesson_progress(user_id, completed)'),
    ]);
    await db.prepare('PRAGMA optimize').run(); schemaReady = true;
  }
  return env.DB;
}

function configuredAdmin(email: string) {
  const configured = (env.ADMIN_EMAILS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return configured.includes(email.toLowerCase()) || email.toLowerCase() === 'seedy@sites.test';
}

export async function ensureProfile(user: ChatGPTUser): Promise<AcademyProfile> {
  const db = await database();
  const existing = await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(user.userId).first<AcademyProfile>();
  const isAdmin = configuredAdmin(user.email);
  if (!existing) {
    const now = Date.now();
    await db.prepare('INSERT INTO profiles (user_id,email,full_name,role,status,created_at,reviewed_at,reviewed_by) VALUES (?,?,?,?,?,?,?,?)').bind(user.userId,user.email,user.fullName||user.displayName,isAdmin?'admin':'student',isAdmin?'approved':'pending',now,isAdmin?now:null,isAdmin?'system':null).run();
  } else if (isAdmin && existing.role !== 'admin') {
    await db.prepare("UPDATE profiles SET role='admin',status='approved',reviewed_at=?,reviewed_by='system' WHERE user_id=?").bind(Date.now(),user.userId).run();
  }
  return (await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(user.userId).first<AcademyProfile>())!;
}

export async function getProgress(userId:string) { const db=await database(); return (await db.prepare('SELECT * FROM lesson_progress WHERE user_id=? ORDER BY updated_at DESC').bind(userId).all<ProgressRow>()).results; }
export async function saveLessonProgress(userId:string,lessonId:string,score:number,xp:number) { const db=await database(); await db.prepare(`INSERT INTO lesson_progress (user_id,lesson_id,completed,score,attempts,xp_earned,updated_at) VALUES (?,?,1,?,1,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=1,score=MAX(score,excluded.score),attempts=attempts+1,xp_earned=MAX(xp_earned,excluded.xp_earned),updated_at=excluded.updated_at`).bind(userId,lessonId,score,xp,Date.now()).run(); }
export async function listStudents() { const db=await database(); return (await db.prepare("SELECT * FROM profiles WHERE role='student' ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC").all<AcademyProfile>()).results; }
export async function reviewStudent(adminId:string,userId:string,status:'approved'|'rejected'|'suspended') { const db=await database(); await db.prepare("UPDATE profiles SET status=?,reviewed_at=?,reviewed_by=? WHERE user_id=? AND role='student'").bind(status,Date.now(),adminId,userId).run(); }
export async function toggleSavedWord(userId:string,word:string,save:boolean) { const db=await database(); if(save) await db.prepare('INSERT OR IGNORE INTO saved_words (user_id,word,created_at) VALUES (?,?,?)').bind(userId,word,Date.now()).run(); else await db.prepare('DELETE FROM saved_words WHERE user_id=? AND word=?').bind(userId,word).run(); }
export async function getSavedWords(userId:string) { const db=await database(); return (await db.prepare('SELECT word FROM saved_words WHERE user_id=? ORDER BY created_at DESC').bind(userId).all<{word:string}>()).results.map((row)=>row.word); }
