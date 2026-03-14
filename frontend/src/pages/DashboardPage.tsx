import React, { useMemo } from 'react';
import VideoCard from '../components/VideoCard';
import { Video } from '../api';

interface DashboardPageProps {
    username: string;
    videos: Video[];
    loading: boolean;
    openEditModal: (video: Video) => void;
    handleDeleteVideo: (video: Video) => void;
    handleVideoClick: (video: Video) => void;
    setActiveTab: (tab: 'dashboard' | 'content' | 'upload') => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    username,
    videos,
    loading,
    openEditModal,
    handleDeleteVideo,
    handleVideoClick,
    setActiveTab
}) => {
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

    return (
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
    );
};

export default DashboardPage;
