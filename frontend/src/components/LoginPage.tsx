import React, { useState } from 'react';
import { api } from '../api';

interface LoginPageProps {
    onLogin: (token: string, username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div className="login-page">
            <div className="login-bg" />
            <div className="login-bg-grid" />

            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-text">Stream<span>Flix</span></div>
                </div>

                <h1 className="login-title">Welcome Back</h1>
                <p className="login-subtitle">Sign in to your private library</p>

                {error && <div className="login-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username</label>
                        <input
                            id="username"
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-login"
                        id="btn-login-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <LoadingSpinner size={16} />
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="login-hints">
                    <p className="hint-title">Demo Credentials</p>
                    <div className="hint-list">
                        {[
                            { user: 'admin', pass: 'admin123', role: 'Admin' },
                            { user: 'user', pass: 'password', role: 'Viewer' },
                        ].map((cred) => (
                            <div
                                key={cred.user}
                                className="hint-item"
                                style={{ cursor: 'pointer' }}
                                onClick={() => { setUsername(cred.user); setPassword(cred.pass); setError(''); }}
                            >
                                <span className="hint-credential">{cred.user}</span>
                                <span className="hint-sep" />
                                <span className="hint-credential">{cred.pass}</span>
                                <span style={{
                                    fontSize: 10,
                                    color: '#555',
                                    background: '#222',
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                }}>{cred.role}</span>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 10 }}>
                        Click a row to auto-fill credentials
                    </p>
                </div>
            </div>
        </div>
    );
};

const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{ animation: 'spin 0.8s linear infinite' }}
    >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);

export default LoginPage;
