'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
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
        body: JSON.stringify({ studentId, password, role: 'student' }),
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
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="animate-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #6366f1, #2dd4bf)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 16px',
            boxShadow: '0 8px 40px rgba(99,102,241,0.4)',
          }}>🍴</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Sign in to your DineSync account
          </p>
        </div>

        {/* Form */}
        <div className="glass-card" style={{ padding: '28px 24px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="login-studentid">Student ID (Roll)</label>
              <input
                id="login-studentid"
                type="text"
                className="form-input"
                placeholder="e.g. 2207103"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--indigo-light)' }}>Dev helper:</strong> Try logging in with ID 2207103 (Shawon) or 103 (Shahidur). 
            <br />
            <span style={{ display: 'inline-block', marginTop: 4 }}>
              * Default password is the same as the roll/Student ID.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
