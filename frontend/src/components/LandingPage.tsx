import React, { useState, useRef } from 'react';
import { api } from '../api';

interface LandingPageProps {
  onLogin: (token: string, username: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username.trim(), password);
      onLogin(res.token, res.username);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-logo">Stream<span>Flix</span></div>
        <div className="landing-actions">
          <button className="landing-link" type="button" onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
          <button className="landing-ghost" type="button" onClick={() => loginRef.current?.scrollIntoView({ behavior: 'smooth' })}>Sign In</button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">Private Library</div>
          <h1 className="landing-hero-title">Your Private Cinema,<br />On Your Terms</h1>
          <p className="landing-hero-subtitle">Stream, organize, and watch your personal video library anywhere on your network.</p>
          <div className="landing-hero-actions">
            <button className="landing-cta" type="button" onClick={() => loginRef.current?.scrollIntoView({ behavior: 'smooth' })}>Start Streaming</button>
            <button className="landing-cta-secondary" type="button" onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}>See How It Works</button>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="mockup">
            <div className="mockup-sidebar">
              <div className="mockup-pill" />
              <div className="mockup-item" />
              <div className="mockup-item" />
              <div className="mockup-item" />
              <div className="mockup-item" />
            </div>
            <div className="mockup-screen">
              <div className="mockup-video" />
              <div className="mockup-controls">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
          <div className="floating-card fc-1">
            <span>Fast Local Streaming</span>
            <strong>0 ads</strong>
          </div>
          <div className="floating-card fc-2">
            <span>Continue Watching</span>
            <strong>Per User</strong>
          </div>
          <div className="floating-card fc-3">
            <span>Auto Episodes</span>
            <strong>Smart Sort</strong>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-header">
          <h2>Feature Highlights</h2>
          <p>Built for personal libraries, fast streaming, and private use.</p>
        </div>
        <div className="feature-grid">
          {[
            {
              title: 'Fast Local Streaming',
              desc: 'Optimized for your home network with instant playback.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h6l2-4 4 8 2-4h4" />
                </svg>
              ),
            },
            {
              title: 'Auto Thumbnails & Episode Detection',
              desc: 'Smart scanning turns filenames into episodes.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M7 20h10" />
                  <path d="M9 9l6 3-6 3z" />
                </svg>
              ),
            },
            {
              title: 'Continue Watching per User',
              desc: 'Resume exactly where you left off, per account.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              ),
            },
            {
              title: 'Admin Studio for Uploads',
              desc: 'Batch upload, rename, and manage your library.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="M7 8l5-5 5 5" />
                  <rect x="4" y="15" width="16" height="6" rx="2" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.title} className="feature-card">
              <div className="feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section ref={howRef} className="landing-section how-it-works">
        <div className="landing-section-header">
          <h2>How It Works</h2>
          <p>Upload once, watch anywhere on your network.</p>
        </div>
        <div className="steps-grid">
          {[
            { step: '01', title: 'Upload video', desc: 'Drag & drop your videos or upload in bulk.' },
            { step: '02', title: 'Auto organize', desc: 'Series and episodes are detected automatically.' },
            { step: '03', title: 'Watch anywhere', desc: 'Stream on any device connected to your network.' },
          ].map((item) => (
            <div key={item.step} className="step-card">
              <span className="step-number">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-strip">
        {[{ label: '0 ads' }, { label: 'Local-first' }, { label: 'Multi-user support' }].map((item) => (
          <div key={item.label} className="stat-item">
            <span className="stat-value">?</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </section>

      <section ref={loginRef} className="landing-section landing-signin">
        <div className="landing-section-header">
          <h2>Start Streaming</h2>
          <p>Sign in to your private StreamFlix library.</p>
        </div>
        <div className="signin-card">
          {error && <div className="login-error">?????? {error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="landing-username">Username</label>
              <input
                id="landing-username"
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="landing-password">Password</label>
              <input
                id="landing-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'Start Streaming'}
            </button>
          </form>
          <div className="signin-hints">
            <span>Demo: admin / admin123</span>
            <span>user / password</span>
          </div>
        </div>
      </section>

      <footer className="landing-footer">? 2026 StreamFlix. Private streaming, personal library.</footer>
    </div>
  );
};

export default LandingPage;
