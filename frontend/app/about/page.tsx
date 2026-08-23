import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

export default function AboutPage() {
  return (
    <main className="inner-page"><PublicHeader />
      <section className="about-hero"><div><p className="page-eyebrow">ABOUT THE EXPERIMENT</p><h1>A serious learning product, built as a public test of craft.</h1></div><p>ENAcademy began as a portfolio challenge: design an English platform that feels calm, useful, and complete—not another collection of disconnected exercises.</p></section>
      <section className="about-manifesto"><div className="manifesto-number">01</div><div><p className="page-eyebrow">WHY IT EXISTS</p><h2>Learning should move from knowing to doing.</h2></div><div><p>Traditional apps can make learners good at tapping answers while real conversations still feel difficult. ENAcademy organizes every lesson around a moment you may genuinely face: meeting someone, ordering lunch, solving a problem, sharing an opinion.</p><p>Vocabulary, grammar, listening, and speaking are taught together so each new pattern becomes something you can use—not just recognize.</p></div></section>
      <section className="principle-grid"><article><span>01</span><h3>Context before complexity</h3><p>Every skill begins inside a believable conversation, then reveals the language underneath it.</p></article><article><span>02</span><h3>Small wins, visible growth</h3><p>Short sessions, saved progress, clear milestones, and honest feedback make consistency feel possible.</p></article><article><span>03</span><h3>Voice before perfection</h3><p>Speaking practice starts early. Learners build courage while accuracy grows naturally.</p></article></section>
      <section className="open-source-story"><div className="code-window" aria-hidden="true"><div><i/><i/><i/></div><pre><code>{`const mission = {\n  product: "useful",\n  learning: "human",\n  source: "open—soon"\n};`}</code></pre></div><div><p className="page-eyebrow">BUILT IN THE OPEN</p><h2>A portfolio project with product-level ambition.</h2><p>This release demonstrates product strategy, interface design, full-stack engineering, curriculum modeling, accessibility, authentication, and durable data. The codebase is being prepared for a future open-source release so other builders can study it, extend it, and improve it.</p><Link className="button button-primary" href="/curriculum">Explore the curriculum →</Link></div></section>
      <section className="about-cta"><p className="page-eyebrow">READY WHEN YOU ARE</p><h2>Your next English moment starts here.</h2><Link className="button button-primary" href="/login">Create your student account →</Link></section>
      <PublicFooter />
    </main>
  );
}
