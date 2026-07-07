'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, role: 'admin' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
    } catch {
      setError('Network error. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, var(--bg-base) 60%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(245,158,11,0.35)',
          }}>🍴</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>DineSync Admin</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Sign in to the management console
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="admin@dinesync.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert-banner alert-banner-critical" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Dev credentials:</strong><br />
            admin@dinesync.local / Admin@123
          </div>
        </div>
      </div>
    </div>
  );
}
