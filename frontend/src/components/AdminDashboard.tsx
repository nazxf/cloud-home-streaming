import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import VideoCard from './VideoCard';
import PlayerModal from './PlayerModal';
import { Video, api } from '../api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

// Pages
import DashboardPage from '../pages/DashboardPage';
import ContentPage from '../pages/ContentPage';
import UploadPage from '../pages/UploadPage';

interface AdminDashboardProps {
    username: string;
    onLogout: () => void;
    onSwitchToViewer: () => void;
}

type AdminTab = 'dashboard' | 'content' | 'upload';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ username, onLogout, onSwitchToViewer }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Edit state
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContentType, setEditContentType] = useState<'movie' | 'series'>('movie');
    const [editSeriesTitle, setEditSeriesTitle] = useState('');
    const [editComboboxOpen, setEditComboboxOpen] = useState(false);
    const [editSeason, setEditSeason] = useState<number>(1);
    const [editEpisode, setEditEpisode] = useState<number>(1);
    const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const existingSeries = useMemo(() => {
        const set = new Set<string>();
        videos.forEach(v => {
            if (v.seriesTitle) set.add(v.seriesTitle);
        });
        return Array.from(set).sort();
    }, [videos]);

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getVideos();
            setVideos(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load videos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredVideos = useMemo(() => {
        if (!searchQuery.trim()) return videos;
        const q = searchQuery.toLowerCase();
        return videos.filter(v =>
            v.title.toLowerCase().includes(q) ||
            v.filename.toLowerCase().includes(q) ||
            v.extension.toLowerCase().includes(q) ||
            (v.seriesTitle || '').toLowerCase().includes(q)
        );
    }, [searchQuery, videos]);

    // Edit handlers
    const openEditModal = (video: Video) => {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditContentType((video.contentType as 'movie' | 'series') || 'movie');
        setEditSeriesTitle(video.seriesTitle || '');
        setEditSeason(video.season || 1);
        setEditEpisode(video.episode || 1);
        setEditThumbnail(null);
        setEditError('');
    };

    const closeEditModal = () => {
        if (editLoading) return;
        setEditingVideo(null);
        setEditTitle('');
        setEditThumbnail(null);
        setEditError('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVideo) return;
        if (editContentType === 'movie' && !editTitle.trim()) { setEditError('Title is required for movies.'); return; }
        if (editContentType === 'series' && !editSeriesTitle.trim()) { setEditError('Series title is required.'); return; }
        setEditLoading(true);
        setEditError('');
        try {
            const result = await api.editVideo(editingVideo.filename, editTitle.trim(), {
                contentType: editContentType,
                seriesTitle: editSeriesTitle,
                season: editSeason,
                episode: editEpisode,
            });
            if (editThumbnail) await api.uploadThumbnail(result.filename, editThumbnail);
            await fetchVideos();
            closeEditModal();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Edit failed');
        } finally { setEditLoading(false); }
    };

    const handleDeleteVideo = async (video: Video) => {
        const ok = window.confirm(`Delete "${video.title}" and its thumbnail? This cannot be undone.`);
        if (!ok) return;
        try {
            await api.deleteVideo(video.filename);
            if (selectedVideo?.id === video.id) setSelectedVideo(null);
            await fetchVideos();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleVideoClick = (video: Video) => setSelectedVideo(video);
    const handleClosePlayer = () => setSelectedVideo(null);

    // Sidebar items
    const sidebarItems = [
        { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        )},
        { id: 'content' as AdminTab, label: 'Content', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        )},
        { id: 'upload' as AdminTab, label: 'Upload', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
        )},
    ];

    return (
        <div className="admin-layout">
            {/* ─── YouTube-Style Top Navbar ─── */}
            <nav className="admin-topbar">
                <div className="admin-topbar-left">
                    <button className="admin-topbar-icon-btn" onClick={() => setSidebarCollapsed(v => !v)} aria-label="Menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className="admin-topbar-logo" onClick={onSwitchToViewer} title="Switch to viewer mode">
                        Stream<span>Flix</span>
                        <span className="admin-topbar-studio-badge">Studio</span>
                    </div>
                </div>

                <div className="admin-topbar-center">
                    <div className="admin-yt-search">
                        <input
                            className="admin-yt-search-input"
                            placeholder="Search across your videos"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <button className="admin-yt-search-btn" aria-label="Search">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="admin-topbar-right">
                    <button className="admin-topbar-icon-btn" onClick={() => setActiveTab('upload')} aria-label="Upload video" title="Upload video">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m22 2-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                    <button className="admin-topbar-icon-btn" aria-label="Notifications" title="Notifications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span className="admin-notif-dot" />
                    </button>

                    <div className="admin-topbar-user" ref={userMenuRef}>
                        <button className="admin-avatar-btn" onClick={() => setUserMenuOpen(v => !v)}>
                            {username.charAt(0).toUpperCase()}
                        </button>
                        {userMenuOpen && (
                            <div className="admin-user-dropdown">
                                <div className="admin-user-dropdown-header">
                                    <div className="admin-dropdown-avatar">{username.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div className="admin-dropdown-name">{username}</div>
                                        <div className="admin-dropdown-role">Administrator</div>
                                    </div>
                                </div>
                                <div className="admin-user-dropdown-sep" />
                                <button className="admin-user-dropdown-item" onClick={() => { setUserMenuOpen(false); onSwitchToViewer(); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    Switch to Viewer
                                </button>
                                <button className="admin-user-dropdown-item admin-user-dropdown-danger" onClick={onLogout}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* ─── Sidebar ─── */}
            <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="admin-sidebar-nav">
                    {sidebarItems.map(item => (
                        <button
                            key={item.id}
                            className={`admin-sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                            title={item.label}
                        >
                            <span className="admin-sidebar-icon">{item.icon}</span>
                            <span className="admin-sidebar-label">{item.label}</span>
                        </button>
                    ))}
                </div>
                <div className="admin-sidebar-bottom">
                     <button className="admin-sidebar-item" onClick={onSwitchToViewer} title="Go to Viewer">
                        <span className="admin-sidebar-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                        </span>
                        <span className="admin-sidebar-label">Viewer Mode</span>
                    </button>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {activeTab === 'dashboard' && (
                    <DashboardPage 
                        username={username}
                        videos={videos}
                        loading={loading}
                        openEditModal={openEditModal}
                        handleDeleteVideo={handleDeleteVideo}
                        handleVideoClick={handleVideoClick}
                        setActiveTab={setActiveTab}
                    />
                )}

                {activeTab === 'content' && (
                    <ContentPage 
                        filteredVideos={filteredVideos}
                        loading={loading}
                        error={error}
                        fetchVideos={fetchVideos}
                        openEditModal={openEditModal}
                        handleDeleteVideo={handleDeleteVideo}
                        handleVideoClick={handleVideoClick}
                        setActiveTab={setActiveTab}
                        searchQuery={searchQuery}
                    />
                )}

                {activeTab === 'upload' && (
                    <UploadPage 
                        existingSeries={existingSeries}
                        fetchVideos={fetchVideos}
                    />
                )}
            </main>

            {/* Player Modal */}
            {selectedVideo && <PlayerModal video={selectedVideo} videos={videos} onClose={handleClosePlayer} onSelectVideo={setSelectedVideo} />}

            {/* Edit Modal */}
            {editingVideo && (
                <div className="edit-modal-overlay" onClick={closeEditModal}>
                    <div className="edit-modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Edit Video</h3>
                        <p className="edit-modal-sub">Update title and thumbnail</p>
                        <form onSubmit={handleSaveEdit}>
                            <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Content Type</label>
                                <Select value={editContentType} onValueChange={(v: 'movie'|'series') => setEditContentType(v)} >
                                    <SelectTrigger className="form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                        <SelectItem value="movie">Movie</SelectItem>
                                        <SelectItem value="series">Series</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {editContentType === 'series' && (
                                <div style={{ marginBottom: '1rem' }}>
<div className="admin-form-group">
    <label className="admin-form-label">Series Title</label>
    <Popover open={editComboboxOpen} onOpenChange={setEditComboboxOpen}>
        <PopoverTrigger asChild>
            <button
                type="button"
                className="admin-form-input"
                style={{ textAlign: 'left' }}
            >
                {editSeriesTitle || 'Select or type a series...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
            <Command style={{ backgroundColor: '#1a1a1a' }}>
                <CommandInput 
                    placeholder="Search series..." 
                    value={editSeriesTitle}
                    onValueChange={setEditSeriesTitle}
                    style={{ color: 'white' }}
                />
                <CommandEmpty style={{ color: '#aaa', padding: '10px' }}>
                    Type to add new series "{editSeriesTitle}"
                </CommandEmpty>
                <CommandGroup>
                    <CommandList>
                        {existingSeries.map((s) => (
                            <CommandItem
                                key={s}
                                value={s}
                                onSelect={(currentValue) => {
                                    setEditSeriesTitle(currentValue);
                                    setEditComboboxOpen(false);
                                }}
                                style={{ color: 'white', cursor: 'pointer' }}
                            >
                                <Check
                                    className={`mr-2 h-4 w-4 ${editSeriesTitle === s ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {s}
                            </CommandItem>
                        ))}
                    </CommandList>
                </CommandGroup>
            </Command>
        </PopoverContent>
    </Popover>
</div>
<div className="admin-form-group admin-inline-fields">
    <div className="admin-inline-field">
        <label className="admin-form-label">Season</label>
        <input className="admin-form-input" type="number" min="1" value={editSeason} onChange={e => setEditSeason(parseInt(e.target.value) || 1)} />
    </div>
    <div className="admin-inline-field">
        <label className="admin-form-label">Episode</label>
        <input className="admin-form-input" type="number" min="1" value={editEpisode} onChange={e => setEditEpisode(parseInt(e.target.value) || 1)} />
    </div>
</div>

                                </div>
                            )}

                            <label className="form-label" htmlFor="edit-title-admin">{editContentType === 'series' ? 'Episode Title' : 'Title'}</label>
                            <input id="edit-title-admin" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Enter title" />
                            <label className="form-label" htmlFor="edit-thumbnail-admin" style={{ marginTop: 12 }}>Thumbnail (jpg/png)</label>
                            <input id="edit-thumbnail-admin" className="form-input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={e => setEditThumbnail(e.target.files?.[0] || null)} />
                            {editError && <div className="login-error" style={{ marginTop: 12 }}>{editError}</div>}
                            <div className="admin-upload-actions" style={{ marginTop: 16 }}>
                                <button className="btn-login admin-upload-btn" type="submit" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                                <button className="admin-secondary-btn" type="button" onClick={closeEditModal} disabled={editLoading}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
