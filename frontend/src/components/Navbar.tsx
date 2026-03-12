import React, { useState, useEffect, useRef } from 'react';

interface NavbarProps {
    username: string;
    isAdmin: boolean;
    onLogout: () => void;
    onSearch: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ username, isAdmin, onLogout, onSearch }) => {
    const [scrolled, setScrolled] = useState(false);
    const [query, setQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearchSubmit = () => {
        onSearch(query);
        searchRef.current?.focus();
    };

    const handleCreateClick = () => {
        const el = document.getElementById('admin-upload');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleMenuToggle = () => {
        setMenuOpen((v) => !v);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-left">
                <div className="nav-menu" ref={menuRef}>
                    <button className="nav-icon-btn" type="button" aria-label="Menu" onClick={handleMenuToggle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                    {menuOpen && (
                        <div className="nav-menu-panel">
                            <button type="button" className="nav-menu-item" onClick={() => { setMenuOpen(false); document.getElementById('all-videos')?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>All Videos</button>
                            {isAdmin && (
                                <button type="button" className="nav-menu-item" onClick={() => { setMenuOpen(false); document.getElementById('admin-upload')?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Admin Studio</button>
                            )}
                        </div>
                    )}
                </button>
                </div>
                <div className="navbar-logo">
                    Stream<span>Flix</span>
                </div>
            </div>

            <div className="navbar-center">
                <div className="yt-search">
                    <input
                        ref={searchRef}
                        className="yt-search-input"
                        placeholder="Search videos"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
                    />
                    <button className="yt-search-btn" type="button" aria-label="Search" onClick={handleSearchSubmit}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="navbar-right">
                {isAdmin && (
                    <button className="nav-icon-btn" type="button" aria-label="Create" onClick={handleCreateClick}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </svg>
                    </button>
                )}

                <div className="navbar-user">
                    <div className="navbar-avatar">{username.charAt(0).toUpperCase()}</div>
                    <span className="navbar-username">{username}</span>
                </div>

                <button className="btn-logout" onClick={onLogout}>
                    Sign Out
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
