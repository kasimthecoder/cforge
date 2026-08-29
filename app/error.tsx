'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-shell">
      <section className="error-card">
        <p className="landing-kicker">CForge Studio</p>
        <h1>Something went wrong</h1>
        <p>The page could not be loaded. Your saved code is still stored locally.</p>
        <button type="button" className="primary-button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
