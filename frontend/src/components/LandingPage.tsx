import React, { useRef } from 'react';

interface LandingPageProps {
  onGoToLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const howRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);

  return (
    <div className="landing-page">
      {/* ── Header ── */}
      <header className="landing-header">
        <div className="landing-logo">Stream<span>Flix</span></div>
        <div className="landing-actions">
          <button className="landing-link" type="button" onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button className="landing-link" type="button" onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
          <button className="landing-ghost" type="button" onClick={onGoToLogin}>Sign In</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Private &amp; Local
          </div>
          <h1 className="landing-hero-title">
            Your Personal<br /><span className="landing-hero-accent">Cinema</span>, On Your Terms
          </h1>
          <p className="landing-hero-subtitle">
            Stream, organize, and watch your entire video library anywhere on your home network. Zero ads, zero tracking, 100% private.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta" type="button" onClick={onGoToLogin}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginRight: 8 }}><polygon points="5,3 19,12 5,21" /></svg>
              Get Started
            </button>
            <button className="landing-cta-secondary" type="button" onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </button>
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
                <span /><span /><span />
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

      {/* ── Features ── */}
      <section ref={featRef} className="landing-section">
        <div className="landing-section-header">
          <h2>Feature Highlights</h2>
          <p>Built for personal libraries, fast streaming, and private use.</p>
        </div>
        <div className="feature-grid">
          {[
            {
              title: 'Blazing Fast Streaming',
              desc: 'Optimized for your home network with instant, buffer-free playback at full quality.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h6l2-4 4 8 2-4h4" />
                </svg>
              ),
            },
            {
              title: 'Smart Episode Detection',
              desc: 'Auto-detects series, seasons, and episodes from your filenames — no manual sorting needed.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M7 20h10" />
                  <path d="M9 9l6 3-6 3z" />
                </svg>
              ),
            },
            {
              title: 'Continue Watching',
              desc: 'Resume exactly where you left off, independently per user account.',
              icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              ),
            },
            {
              title: 'Admin Studio',
              desc: 'Batch upload, rename, manage thumbnails, and organize your entire library with ease.',
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

      {/* ── How It Works ── */}
      <section ref={howRef} className="landing-section how-it-works">
        <div className="landing-section-header">
          <h2>How It Works</h2>
          <p>Upload once, watch anywhere on your network.</p>
        </div>
        <div className="steps-grid">
          {[
            { step: '01', title: 'Upload Your Videos', desc: 'Drag & drop your videos or upload in bulk from the admin control panel.' },
            { step: '02', title: 'Auto-Organized', desc: 'Series and episodes are detected from filenames and sorted automatically.' },
            { step: '03', title: 'Watch Anywhere', desc: 'Stream on any device connected to your local network — phone, tablet, or PC.' },
          ].map((item) => (
            <div key={item.step} className="step-card">
              <span className="step-number">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-strip">
        {[
          { 
            icon: (
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            ), 
            label: 'Zero Ads' 
          },
          { 
            icon: (
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ), 
            label: 'Local-First' 
          },
          { 
            icon: (
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ), 
            label: 'Multi-User' 
          },
        ].map((item) => (
          <div key={item.label} className="stat-item">
            <span className="stat-value">{item.icon}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-cta-banner">
        <div className="cta-banner-content">
          <h2>Ready to Stream?</h2>
          <p>Sign in and start watching your private library now.</p>
          <button className="landing-cta landing-cta-large" type="button" onClick={onGoToLogin}>
            Sign In to StreamFlix
          </button>
        </div>
      </section>

      <footer className="landing-footer">© 2026 StreamFlix. Private streaming, personal library.</footer>
    </div>
  );
};

export default LandingPage;
