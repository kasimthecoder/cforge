import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="error-shell">
      <section className="error-card">
        <p className="landing-kicker">CForge Studio</p>
        <h1>Page not found</h1>
        <p>That learning workspace does not exist.</p>
        <Link href="/" className="primary-button">
          Back to home
        </Link>
      </section>
    </main>
  );
}
