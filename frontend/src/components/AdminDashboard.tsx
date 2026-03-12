import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import VideoCard from './VideoCard';
import PlayerModal from './PlayerModal';
import { Video, api, getManualThumbnailUrl } from '../api';

interface AdminDashboardProps {
    username: string;
    onLogout: () => void;
    onSwitchToViewer: () => void;
}

type BulkStatus = 'waiting' | 'uploading' | 'success' | 'error';
type AdminTab = 'dashboard' | 'content' | 'upload';

interface BulkUploadItem {
    id: string;
    file: File;
    title: string;
    progress: number;
    status: BulkStatus;
    error?: string;
}

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

    // Upload state
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadThumbInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);

    // Bulk upload state
    const bulkInputRef = useRef<HTMLInputElement | null>(null);
    const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
    const [bulkRunning, setBulkRunning] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Edit state
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

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

    // Stats
    const totalSize = useMemo(() => {
        const bytes = videos.reduce((sum, v) => sum + v.size, 0);
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1024).toFixed(1) + ' KB';
    }, [videos]);

    const extensions = useMemo(() => {
        const map = new Map<string, number>();
        videos.forEach(v => {
            const ext = v.extension.replace('.', '').toUpperCase();
            map.set(ext, (map.get(ext) || 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [videos]);

    // Upload handlers
    const handleChooseFile = () => fileInputRef.current?.click();
    const handleChooseThumbnail = () => uploadThumbInputRef.current?.click();
    const handleChooseBulk = () => bulkInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadFile(e.target.files?.[0] || null);
        setUploadError('');
        setUploadSuccess('');
    };

    const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadThumbnailFile(e.target.files?.[0] || null);
        setUploadError('');
        setUploadSuccess('');
    };

    const clearUploadForm = () => {
        setUploadTitle('');
        setUploadFile(null);
        setUploadThumbnailFile(null);
        setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (uploadThumbInputRef.current) uploadThumbInputRef.current.value = '';
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) { setUploadError('Please choose a video file first.'); return; }
        setUploading(true);
        setUploadError('');
        setUploadSuccess('');
        try {
            const result = await api.uploadVideo(uploadFile, uploadTitle);
            if (uploadThumbnailFile) {
                await api.uploadThumbnail(result.filename, uploadThumbnailFile);
            }
            setUploadSuccess(uploadThumbnailFile ? 'Video and thumbnail uploaded successfully.' : (result.message || 'Video uploaded successfully.'));
            clearUploadForm();
            await fetchVideos();
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally { setUploading(false); }
    };

    // Bulk upload
    const updateBulkItem = (id: string, patch: Partial<BulkUploadItem>) => {
        setBulkItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
    };

    const addBulkFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const next: BulkUploadItem[] = [];
        Array.from(list).forEach(file => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const allowed = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'm2ts'];
            if (!allowed.includes(ext)) return;
            const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[._-]+/g, ' ').trim();
            next.push({
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                file, title: baseName, progress: 0, status: 'waiting',
            });
        });
        if (next.length > 0) setBulkItems(prev => [...prev, ...next]);
    };

    const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addBulkFiles(e.target.files);
        if (bulkInputRef.current) bulkInputRef.current.value = '';
    };

    const handleBulkDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragActive(false);
        addBulkFiles(e.dataTransfer.files);
    };

    const runBulkUpload = async () => {
        if (bulkRunning) return;
        const waiting = bulkItems.filter(item => item.status === 'waiting' || item.status === 'error');
        if (waiting.length === 0) return;
        setBulkRunning(true);
        for (const item of waiting) {
            updateBulkItem(item.id, { status: 'uploading', progress: 0, error: undefined });
            try {
                await api.uploadVideoWithProgress(item.file, item.title, (percent) => {
                    updateBulkItem(item.id, { progress: percent });
                });
                updateBulkItem(item.id, { status: 'success', progress: 100 });
            } catch (err: unknown) {
                updateBulkItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
            }
        }
        setBulkRunning(false);
        await fetchVideos();
    };

    const clearBulk = () => { if (!bulkRunning) setBulkItems([]); };

    // Edit handlers
    const openEditModal = (video: Video) => {
        setEditingVideo(video);
        setEditTitle(video.title);
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
        if (!editTitle.trim()) { setEditError('Title is required.'); return; }
        setEditLoading(true);
        setEditError('');
        try {
            const result = await api.editVideo(editingVideo.filename, editTitle.trim());
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
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1 className="admin-page-title">Channel Dashboard</h1>
                            <p className="admin-page-subtitle">Welcome back, {username}</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                    </svg>
                                </div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{videos.length}</span>
                                    <span className="admin-stat-label">Total Videos</span>
                                </div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-icon storage">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                    </svg>
                                </div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{totalSize}</span>
                                    <span className="admin-stat-label">Storage Used</span>
                                </div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-icon formats">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{extensions.length}</span>
                                    <span className="admin-stat-label">Formats</span>
                                </div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-icon series">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                    </svg>
                                </div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{videos.filter(v => v.groupType === 'series').length}</span>
                                    <span className="admin-stat-label">Series Episodes</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Videos */}
                        <div className="admin-section">
                            <div className="admin-section-header">
                                <h2>Recent Videos</h2>
                                <button className="admin-text-btn" onClick={() => setActiveTab('content')}>See all →</button>
                            </div>
                            {loading ? (
                                <div className="admin-loading">
                                    <div className="spinner" /><span>Loading...</span>
                                </div>
                            ) : (
                                <div className="admin-recent-grid">
                                    {videos.slice(0, 8).map(video => (
                                        <div key={video.id} className="admin-recent-item">
                                            <VideoCard video={video} onClick={handleVideoClick} />
                                            <div className="admin-recent-actions">
                                                <button className="admin-mini-btn" onClick={() => openEditModal(video)} title="Edit">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="admin-mini-btn danger" onClick={() => handleDeleteVideo(video)} title="Delete">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Format Breakdown */}
                        {extensions.length > 0 && (
                            <div className="admin-section">
                                <div className="admin-section-header"><h2>Format Breakdown</h2></div>
                                <div className="admin-format-list">
                                    {extensions.map(([ext, count]) => (
                                        <div key={ext} className="admin-format-row">
                                            <span className="admin-format-ext">{ext}</span>
                                            <div className="admin-format-bar-wrap">
                                                <div className="admin-format-bar" style={{ width: `${(count / videos.length) * 100}%` }} />
                                            </div>
                                            <span className="admin-format-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1 className="admin-page-title">Channel Content</h1>
                            <p className="admin-page-subtitle">{filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} in your library</p>
                        </div>

                        {loading ? (
                            <div className="admin-loading"><div className="spinner" /><span>Loading...</span></div>
                        ) : error ? (
                            <div className="admin-error-box">
                                <span>{error}</span>
                                <button className="admin-secondary-btn" onClick={fetchVideos}>Retry</button>
                            </div>
                        ) : filteredVideos.length === 0 ? (
                            <div className="admin-empty">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                </svg>
                                <h3>{searchQuery ? 'No results found' : 'No videos yet'}</h3>
                                <p>{searchQuery ? `No videos match "${searchQuery}".` : 'Upload your first video to get started.'}</p>
                                {!searchQuery && <button className="admin-primary-btn" onClick={() => setActiveTab('upload')}>Upload Video</button>}
                            </div>
                        ) : (
                            <div className="admin-content-table">
                                <div className="admin-table-header">
                                    <span className="admin-th thumb">Thumbnail</span>
                                    <span className="admin-th title">Title</span>
                                    <span className="admin-th format">Format</span>
                                    <span className="admin-th size">Size</span>
                                    <span className="admin-th date">Date</span>
                                    <span className="admin-th actions">Actions</span>
                                </div>
                                {filteredVideos.map(video => (
                                    <div key={video.id} className="admin-table-row" onClick={() => handleVideoClick(video)}>
                                        <div className="admin-td thumb">
                                            <ThumbnailSmall video={video} />
                                        </div>
                                        <div className="admin-td title">
                                            <span className="admin-td-title">{video.title}</span>
                                            {video.seriesTitle && <span className="admin-td-series">{video.seriesTitle} {video.season && `S${video.season}`}{video.episode && `E${video.episode}`}</span>}
                                        </div>
                                        <div className="admin-td format">
                                            <span className="admin-format-badge">{video.extension.replace('.', '').toUpperCase()}</span>
                                        </div>
                                        <div className="admin-td size">{video.sizeHuman}</div>
                                        <div className="admin-td date">{new Date(video.createdAt).toLocaleDateString()}</div>
                                        <div className="admin-td actions" onClick={e => e.stopPropagation()}>
                                            <button className="admin-mini-btn" onClick={() => openEditModal(video)} title="Edit">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button className="admin-mini-btn danger" onClick={() => handleDeleteVideo(video)} title="Delete">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="admin-page">
                        <div className="admin-page-header">
                            <h1 className="admin-page-title">Upload Videos</h1>
                            <p className="admin-page-subtitle">Add new content to your library</p>
                        </div>

                        {/* Single Upload */}
                        <div className="admin-section">
                            <div className="admin-section-header"><h2>Single Upload</h2></div>
                            <form className="admin-upload-form" onSubmit={handleUpload}>
                                <input ref={fileInputRef} type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts" onChange={handleFileChange} style={{ display: 'none' }} />
                                <input ref={uploadThumbInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleThumbnailFileChange} style={{ display: 'none' }} />

                                <div className="admin-upload-form-grid">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label" htmlFor="up-title">Video Title (optional)</label>
                                        <input id="up-title" className="admin-form-input" type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Episode 01 - Launch Night" />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Video File</label>
                                        <div className="admin-file-picker" onClick={handleChooseFile}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <span>{uploadFile ? uploadFile.name : 'Choose video file'}</span>
                                        </div>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Thumbnail (optional)</label>
                                        <div className="admin-file-picker" onClick={handleChooseThumbnail}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span>{uploadThumbnailFile ? uploadThumbnailFile.name : 'Choose thumbnail'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-upload-form-actions">
                                    <button type="submit" className="admin-primary-btn" disabled={uploading}>
                                        {uploading ? 'Uploading...' : 'Upload Video'}
                                    </button>
                                    <button type="button" className="admin-ghost-btn" onClick={clearUploadForm} disabled={uploading}>Reset</button>
                                </div>

                                {uploadError && <div className="admin-error-msg">{uploadError}</div>}
                                {uploadSuccess && <div className="admin-success-msg">{uploadSuccess}</div>}
                            </form>
                        </div>

                        {/* Bulk Upload */}
                        <div className="admin-section">
                            <div className="admin-section-header"><h2>Bulk Upload</h2></div>
                            <input ref={bulkInputRef} type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts" multiple onChange={handleBulkFileChange} style={{ display: 'none' }} />

                            <div
                                className={`admin-dropzone ${dragActive ? 'active' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleBulkDrop}
                            >
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="admin-dropzone-title">Drag and drop videos here</span>
                                <span className="admin-dropzone-sub">or use the file picker below</span>
                                <button type="button" className="admin-ghost-btn" onClick={handleChooseBulk}>Choose Multiple Files</button>
                            </div>

                            {bulkItems.length > 0 && (
                                <div className="admin-bulk-queue">
                                    {bulkItems.map(item => (
                                        <div key={item.id} className="admin-bulk-row">
                                            <div className="admin-bulk-info">
                                                <span className="admin-bulk-name">{item.file.name}</span>
                                                <span className="admin-bulk-size">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                            <input className="admin-form-input compact" value={item.title} onChange={e => updateBulkItem(item.id, { title: e.target.value })} placeholder="Optional title" disabled={bulkRunning} />
                                            <div className="admin-bulk-progress-wrap">
                                                <div className="admin-bulk-progress-bar" style={{ width: `${item.progress}%` }} />
                                            </div>
                                            <span className={`admin-bulk-status ${item.status}`}>{item.status}</span>
                                            {item.error && <span className="admin-bulk-error">{item.error}</span>}
                                        </div>
                                    ))}
                                    <div className="admin-upload-form-actions">
                                        <button type="button" className="admin-primary-btn" onClick={runBulkUpload} disabled={bulkRunning}>
                                            {bulkRunning ? 'Uploading...' : 'Start Bulk Upload'}
                                        </button>
                                        <button type="button" className="admin-ghost-btn" onClick={clearBulk} disabled={bulkRunning}>Clear Queue</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
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
                            <label className="form-label" htmlFor="edit-title-admin">Title</label>
                            <input id="edit-title-admin" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Enter new title" />
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

// Small thumbnail component for table view
const ThumbnailSmall: React.FC<{ video: Video }> = ({ video }) => {
    const [err, setErr] = useState(false);
    const url = getManualThumbnailUrl(video);
    if (err) {
        return (
            <div className="admin-thumb-placeholder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
            </div>
        );
    }
    return <img className="admin-thumb-img" src={url} alt={video.title} onError={() => setErr(true)} />;
};

export default AdminDashboard;
