'use client';

import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="error-shell">
          <section className="error-card">
            <p className="landing-kicker">CForge Studio</p>
            <h1>Application error</h1>
            <p>Refresh the page to restart the learning environment.</p>
            <button type="button" className="primary-button" onClick={reset}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
