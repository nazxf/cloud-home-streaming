import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

type Page = 'landing' | 'login' | 'dashboard';

function App() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sf_token'));
    const [username, setUsername] = useState<string>(() => localStorage.getItem('sf_user') || '');
    const [page, setPage] = useState<Page>(() => (localStorage.getItem('sf_token') ? 'dashboard' : 'landing'));

    const handleLogin = (newToken: string, user: string) => {
        localStorage.setItem('sf_token', newToken);
        localStorage.setItem('sf_user', user);
        setToken(newToken);
        setUsername(user);
        setPage('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
        setToken(null);
        setUsername('');
        setPage('landing');
    };

    if (token && page === 'dashboard') {
        return <Dashboard username={username} onLogout={handleLogout} />;
    }

    if (page === 'login') {
        return <LoginPage onLogin={handleLogin} onBack={() => setPage('landing')} />;
    }

    return <LandingPage onGoToLogin={() => setPage('login')} />;
}

export default App;
