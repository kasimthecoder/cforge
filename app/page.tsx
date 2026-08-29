import Link from 'next/link';
import { cookies } from 'next/headers';
import AuthForms from '../components/AuthForms';
import LogoutButton from '../components/LogoutButton';
import { getAuthenticatedUserFromCookieHeader } from './lib/auth';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; authError?: string; message?: string }>;
}) {
  const cookieHeader = (await cookies()).toString();
  const user = await getAuthenticatedUserFromCookieHeader(cookieHeader);
  const params = await searchParams;
  const authMessage = params.authError ? params.message ?? 'Google sign-in failed.' : '';
  const requiresAuth = params.auth === 'required';

  return (
    <main className="landing-shell">
      <header className="site-nav">
        <Link href="/" className="brand"><span className="brand-mark">KS</span><span>Kasim Saifi <em>CForge Studio</em></span></Link>
        <nav>{user ? <><span className="nav-user">Hi, {user.name}</span><Link href="/dashboard" className="nav-link">Dashboard</Link><LogoutButton /></> : <><a href="#auth" className="nav-link">Sign in</a><a href="/api/auth/google" className="nav-link">Google</a></>}</nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A calmer way to learn C</p>
          <h1>Write. Run. Understand.</h1>
          <p className="hero-lede">A focused browser IDE for students: edit with helpful indentation, run against real input, and keep every lab project ready for your next session.</p>
          <div className="landing-actions">{user ? <Link href="/dashboard" className="primary-button">Open your projects →</Link> : <Link href="/editor/new" className="primary-button">Try the editor →</Link>}<a href="#how-it-works" className="secondary-button">See how it works</a></div>
          <div className="trust-row"><span>✓ Judge0 execution</span><span>✓ CodeMirror 6 editor</span><span>✓ Private projects</span></div>
        </div>
        <div className="hero-console"><div className="console-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span>hello.c</span></div><pre><span className="code-muted">01 </span><span className="code-purple">#include</span> <span className="code-blue">&lt;stdio.h&gt;</span>{'\n\n'}<span className="code-muted">05 </span><span className="code-purple">int</span> main(<span className="code-purple">void</span>) {'{'}{'\n'}<span className="code-muted">06 </span>    printf(<span className="code-green">"Hello, CForge!\\n"</span>);{'\n'}<span className="code-muted">07 </span>    <span className="code-purple">return</span> 0;{'\n'}{'}'}</pre><div className="console-result"><span>OUTPUT</span><strong>Hello, CForge!</strong></div></div>
      </section>
      <section id="how-it-works" className="feature-grid"><article><span>01</span><h2>Practice without setup</h2><p>Start coding instantly in a clean workspace that works in your browser.</p></article><article><span>02</span><h2>See what your code does</h2><p>Provide stdin and inspect compiler errors, output, time, and memory.</p></article><article><span>03</span><h2>Build your own library</h2><p>Sign in to create, update, open, and delete your private projects.</p></article></section>
      {!user && <section id="auth" className="auth-section"><div><p className="eyebrow">Save your progress</p><h2>Make CForge your study desk.</h2><p className="subtle">Create a free account to keep projects synced across sessions.</p>{requiresAuth && <p className="auth-notice">Sign in is required to access your projects.</p>}{authMessage && <p className="auth-error">{authMessage}</p>}</div><AuthForms /></section>}
      {user && <section className="signed-in-banner"><p className="eyebrow">Ready when you are</p><h2>Your next program is one click away.</h2><Link href="/editor/new" className="secondary-button">＋ New project</Link></section>}
      <footer className="site-footer">Kasim Saifi · CForge Studio · Built for curious programmers</footer>
    </main>
  );
}
