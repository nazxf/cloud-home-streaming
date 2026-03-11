import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sf_token'));
    const [username, setUsername] = useState<string>(() => localStorage.getItem('sf_user') || '');

    const handleLogin = (newToken: string, user: string) => {
        localStorage.setItem('sf_token', newToken);
        localStorage.setItem('sf_user', user);
        setToken(newToken);
        setUsername(user);
    };

    const handleLogout = () => {
        localStorage.removeItem('sf_token');
        localStorage.removeItem('sf_user');
        setToken(null);
        setUsername('');
    };

    if (!token) {
        return <LandingPage onLogin={handleLogin} />;
    }

    return <Dashboard username={username} onLogout={handleLogout} />;
}

export default App;
