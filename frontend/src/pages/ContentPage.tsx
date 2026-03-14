import React, { useState } from 'react';
import { Video, getManualThumbnailUrl } from '../api';

interface ContentPageProps {
    filteredVideos: Video[];
    loading: boolean;
    error: string;
    fetchVideos: () => Promise<void>;
    openEditModal: (video: Video) => void;
    handleDeleteVideo: (video: Video) => void;
    handleVideoClick: (video: Video) => void;
    setActiveTab: (tab: 'dashboard' | 'content' | 'upload') => void;
    searchQuery: string;
}

const ContentPage: React.FC<ContentPageProps> = ({
    filteredVideos,
    loading,
    error,
    fetchVideos,
    openEditModal,
    handleDeleteVideo,
    handleVideoClick,
    setActiveTab,
    searchQuery
}) => {
    return (
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

export default ContentPage;
