import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

const skillSignals = [
  { label: 'Speaking', value: 'Confident', tone: 'mint' },
  { label: 'Listening', value: 'Real voices', tone: 'violet' },
  { label: 'Progress', value: '42% A2', tone: 'amber' },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <PublicHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow-pill"><span className="live-dot" /> Built for real conversations</div>
          <h1 id="hero-title">Learn it. Live it.<br /><em>Speak without translating.</em></h1>
          <p className="hero-lede">A guided English journey that turns short daily practice into calm, natural conversation—from your first A1 phrase to confident A2 moments.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">Start your path <span>→</span></Link>
            <a className="button button-ghost" href="#method"><span className="play-dot">▶</span> See how it works</a>
          </div>
          <div className="hero-proof" aria-label="Course highlights">
            <div><strong>A1–A2</strong><span>Complete path</span></div><i />
            <div><strong>10 min</strong><span>Daily rhythm</span></div><i />
            <div><strong>4 skills</strong><span>One experience</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Interactive learning preview">
          <div className="stage-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="language-core">
            <span className="core-kicker">TODAY&apos;S MOMENT</span><strong>I&apos;ve got this.</strong><small>/ aɪv ɡɒt ðɪs /</small>
            <div className="sound-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="floating-word word-one"><span>bonjour</span><b>Hello</b></div>
          <div className="floating-word word-two"><span>سلام</span><b>Hi there</b></div>
          <div className="floating-word word-three"><span>hola</span><b>Let&apos;s talk</b></div>
          {skillSignals.map((signal, index) => (
            <article className={`signal-card signal-${index + 1} ${signal.tone}`} key={signal.label}>
              <span>{signal.label}</span><strong>{signal.value}</strong><i aria-hidden="true" />
            </article>
          ))}
          <div className="streak-chip"><span>◆</span><div><b>7 day streak</b><small>Keep the rhythm</small></div></div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Learning outcomes">
        <p>One thoughtful system for</p>
        <div><span>✦</span> Everyday English</div><div><span>◉</span> Clear pronunciation</div>
        <div><span>↗</span> Visible progress</div><div><span>⌁</span> Lasting vocabulary</div>
      </section>

      <section className="method-section" id="method">
        <div className="section-intro"><p className="page-eyebrow">A BETTER DAILY LOOP</p><h2>Every lesson ends in something you can actually say.</h2><p>ENAcademy connects the four skills instead of teaching them in isolation. Hear the moment, notice the language, prove you understand it, then use your own voice.</p></div>
        <div className="method-steps">
          <article><span>01</span><div className="method-icon listen-icon"><i/><i/><i/><i/></div><h3>Hear the moment</h3><p>Start inside a short, realistic conversation and train your ear for meaning and rhythm.</p></article>
          <article><span>02</span><div className="method-icon pattern-icon">Aa</div><h3>See the pattern</h3><p>Collect useful words and discover one practical grammar pattern without the textbook fog.</p></article>
          <article><span>03</span><div className="method-icon speak-icon">◉</div><h3>Make it yours</h3><p>Answer a focused check, speak the phrase aloud, and save durable progress to your account.</p></article>
        </div>
      </section>

      <section className="product-showcase">
        <div className="showcase-copy"><p className="page-eyebrow">A LEARNING SPACE, NOT A SCOREBOARD</p><h2>Calm enough to return to.<br/>Powerful enough to grow with.</h2><p>Your dashboard turns the complete A1–A2 journey into one clear next step. Lessons unlock in sequence, saved words stay with you, and progress reflects completed work—not meaningless taps.</p><ul><li><span>✓</span> Personal learning path and next lesson</li><li><span>✓</span> XP, completion, accuracy, and word bank</li><li><span>✓</span> Account approval and secure role access</li></ul><Link className="button button-primary" href="/login">See your dashboard →</Link></div>
        <div className="dashboard-preview" aria-label="Student dashboard preview">
          <aside><b>EN</b><i/><i/><i/><i/></aside><div className="preview-main"><header><span/><div><i/><i/></div></header><p>YOUR LEARNING SPACE</p><h3>Good afternoon, learner.</h3><article><small>NEXT UP · A2</small><strong>Make weekend plans</strong><span>Turn future grammar into a real invitation.</span><button>Continue lesson →</button><div className="preview-orb">42%</div></article><div className="preview-cards"><i/><i/><i/></div></div>
        </div>
      </section>

      <section className="home-curriculum" id="curriculum">
        <div className="section-intro"><p className="page-eyebrow">THE FIRST COMPLETE PATH</p><h2>Two levels. Eight milestones. Sixteen useful moments.</h2><p>A focused route from your first introduction to independent A2 conversations.</p></div>
        <div className="level-cards"><article><span>A1</span><div><p className="page-eyebrow">FOUNDATIONS</p><h3>Build reliable everyday English</h3><p>Introductions · routines · cafés · shopping · directions · travel</p><strong>8 interactive lessons</strong></div><i>→</i></article><article><span>A2</span><div><p className="page-eyebrow">EVERYDAY FLUENCY</p><h3>Turn knowledge into your own voice</h3><p>Plans · invitations · stories · work · problems · opinions · goals</p><strong>8 interactive lessons</strong></div><i>→</i></article></div>
        <Link className="curriculum-link" href="/curriculum">Explore the complete curriculum <span>↗</span></Link>
      </section>

      <section className="roles-section">
        <div className="roles-visual"><div className="approval-card"><div><span>KM</span><p><b>Kourosh M.</b><small>Student application</small></p><i>New</i></div><div className="approval-actions"><button>Approve</button><button>Review</button></div></div><div className="approved-chip">✓ Access approved</div><div className="role-ring"><span>ADMIN</span></div></div>
        <div><p className="page-eyebrow">THOUGHTFUL ACCESS</p><h2>Students join freely. Admins keep the space intentional.</h2><p>New learners create a secure identity and enter a clear approval queue. The administrator can approve, reject, or suspend access while student progress remains protected on the server.</p><div className="role-points"><div><span>01</span><p><b>Student account</b><small>Sign in securely and request course access.</small></p></div><div><span>02</span><p><b>Admin review</b><small>Approve the learner from a dedicated control center.</small></p></div><div><span>03</span><p><b>Durable learning</b><small>Lessons, XP, scores, and saved words persist.</small></p></div></div></div>
      </section>

      <section className="home-about" id="about"><p className="page-eyebrow">A PROJECT WITH A POINT OF VIEW</p><blockquote>“Build the English product you wish learning apps felt like.”</blockquote><p>ENAcademy is a portfolio-grade product experiment spanning strategy, interface design, curriculum modeling, full-stack engineering, authentication, and data. It is being prepared for a future open-source release.</p><Link href="/about">Read the story behind ENAcademy →</Link></section>
      <section className="final-cta"><div className="cta-orbit"><i/><i/><span>EN</span></div><p className="page-eyebrow">YOUR FIRST MOMENT IS READY</p><h2>Less translating.<br/><em>More living.</em></h2><p>Start with a secure student account and twelve focused minutes.</p><Link className="button button-primary" href="/login">Begin your English path →</Link></section>
      <PublicFooter />
    </main>
  );
}
