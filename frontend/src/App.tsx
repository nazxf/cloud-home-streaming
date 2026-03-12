import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

type Page = 'landing' | 'login' | 'dashboard' | 'admin';

function App() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sf_token'));
    const [username, setUsername] = useState<string>(() => localStorage.getItem('sf_user') || '');
    const [page, setPage] = useState<Page>(() => {
        const t = localStorage.getItem('sf_token');
        if (!t) return 'landing';
        const user = localStorage.getItem('sf_user') || '';
        return user.toLowerCase() === 'admin' ? 'admin' : 'dashboard';
    });

    const handleLogin = (newToken: string, user: string) => {
        localStorage.setItem('sf_token', newToken);
        localStorage.setItem('sf_user', user);
        setToken(newToken);
        setUsername(user);
        setPage(user.toLowerCase() === 'admin' ? 'admin' : 'dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
        setToken(null);
        setUsername('');
        setPage('landing');
    };

    if (token && page === 'admin') {
        return <AdminDashboard username={username} onLogout={handleLogout} onSwitchToViewer={() => setPage('dashboard')} />;
    }

    if (token && page === 'dashboard') {
        return <Dashboard username={username} onLogout={handleLogout} />;
    }

    if (page === 'login') {
        return <LoginPage onLogin={handleLogin} onBack={() => setPage('landing')} />;
    }

    return <LandingPage onGoToLogin={() => setPage('login')} />;
}

export default App;
