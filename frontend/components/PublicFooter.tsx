import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div><Link className="wordmark" href="/"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link><p>English for real life—designed, built, and shared as a learning product experiment.</p></div>
      <div><strong>Explore</strong><Link href="/curriculum">Curriculum</Link><Link href="/about">About us</Link><Link href="/login">Student login</Link></div>
      <div><strong>Project</strong><span>A1–A2 release</span><span>Portfolio build</span><span>Open-source ready</span></div>
      <p className="footer-note">© 2026 ENAcademy. Built to learn in public.</p>
    </footer>
  );
}
