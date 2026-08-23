import Link from 'next/link';
import { chatGPTSignInPath } from '@/app/chatgpt-auth';
import { PublicHeader } from '@/components/PublicHeader';

export default function LoginPage() {
  return (
    <main className="auth-page"><PublicHeader />
      <section className="auth-intro"><p className="page-eyebrow">WELCOME TO ENACADEMY</p><h1>Choose your doorway.</h1><p>One learning space, two focused experiences. Secure identity is handled through ChatGPT; ENAcademy manages your role and progress.</p></section>
      <section className="role-grid">
        <article className="role-card student-role"><div className="role-orb"><span>Aa</span><i /></div><p className="page-eyebrow">FOR LEARNERS</p><h2>Student account</h2><p>Create your profile, request access, and continue from exactly where you stopped.</p><ul><li><span>✓</span> Complete A1–A2 path</li><li><span>✓</span> Speaking and listening lab</li><li><span>✓</span> Durable progress and XP</li></ul><Link className="button button-primary" href={chatGPTSignInPath('/dashboard')}>Continue as student <span>→</span></Link><small>New accounts are reviewed by an administrator.</small></article>
        <article className="role-card admin-role"><div className="role-orb"><span>⌘</span><i /></div><p className="page-eyebrow">FOR ADMINISTRATORS</p><h2>Admin panel</h2><p>Review applications, approve learners, monitor course activity, and protect the learning space.</p><ul><li><span>✓</span> Account approval queue</li><li><span>✓</span> Student status controls</li><li><span>✓</span> Cohort-level overview</li></ul><Link className="button admin-login-button" href={chatGPTSignInPath('/admin')}>Open admin panel <span>→</span></Link><small>Only configured administrator identities receive access.</small></article>
      </section>
    </main>
  );
}
