import React, { useState, useEffect, useRef } from 'react';

interface NavbarProps {
    username: string;
    onLogout: () => void;
    onSearch: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ username, onLogout, onSearch }) => {
    const [scrolled, setScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearchToggle = () => {
        setSearchOpen((v) => {
            if (!v) setTimeout(() => searchRef.current?.focus(), 50);
            return !v;
        });
    };

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-logo">
                Stream<span>Flix</span>
            </div>

            <div className="navbar-right">
                {/* Search */}
                <div className={`search-bar ${searchOpen ? 'open' : ''}`} onClick={handleSearchToggle}>
                    <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={searchRef}
                        className="search-input"
                        placeholder="Search videos..."
                        onChange={(e) => onSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* User */}
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
