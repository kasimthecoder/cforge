'use client';

import { useState } from 'react';

type Props = { initialMode?: 'login' | 'register' };

export default function AuthForms({ initialMode = 'login' }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Unable to complete your request.');
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Unable to connect to the authentication service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <p className="auth-owner">Kasim Saifi · CForge Studio</p>
      <div className="auth-tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Sign in
        </button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Create account
        </button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div className="auth-divider"><span>or</span></div>
      <a className="secondary-button full-width" href="/api/auth/google">Continue with Google</a>
    </div>
  );
}
