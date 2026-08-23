import Link from 'next/link';

export function PublicHeader({ dark = false }: { dark?: boolean }) {
  return (
    <header className={`site-header ${dark ? 'header-dark' : ''}`}>
      <Link className="wordmark" href="/" aria-label="ENAcademy home"><span className="wordmark-glyph">EN</span><span>ENAcademy</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/#method">How it works</Link><Link href="/curriculum">Curriculum</Link><Link href="/about">About us</Link>
      </nav>
      <div className="header-actions"><Link className="text-link" href="/login">Sign in</Link><Link className="button button-small" href="/login">Start learning <span>↗</span></Link></div>
    </header>
  );
}
