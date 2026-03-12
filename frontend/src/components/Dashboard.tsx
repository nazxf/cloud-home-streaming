import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Navbar from './Navbar';
import VideoCard from './VideoCard';
import PlayerModal from './PlayerModal';
import { Video, api, getManualThumbnailUrl } from '../api';

interface DashboardProps {
    username: string;
    onLogout: () => void;
}

type BulkStatus = 'waiting' | 'uploading' | 'success' | 'error';

interface BulkUploadItem {
    id: string;
    file: File;
    title: string;
    progress: number;
    status: BulkStatus;
    error?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ username, onLogout }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadThumbInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);

    const bulkInputRef = useRef<HTMLInputElement | null>(null);
    const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
    const [bulkRunning, setBulkRunning] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const isAdmin = username.toLowerCase() === 'admin';

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getVideos();
            setVideos(data);
            setFilteredVideos(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load videos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredVideos(videos);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredVideos(videos.filter(v =>
                v.title.toLowerCase().includes(q) ||
                v.filename.toLowerCase().includes(q) ||
                v.extension.toLowerCase().includes(q) ||
                (v.seriesTitle || '').toLowerCase().includes(q)
            ));
        }
    }, [searchQuery, videos]);

    const grouped = useMemo(() => {
        const seriesMap = new Map<string, Map<number, Video[]>>();
        const other: Video[] = [];

        for (const video of filteredVideos) {
            if ((video.groupType || '').toLowerCase() === 'series') {
                const seriesTitle = video.seriesTitle || 'Untitled Series';
                const season = video.season || 1;

                if (!seriesMap.has(seriesTitle)) {
                    seriesMap.set(seriesTitle, new Map<number, Video[]>());
                }

                const seasonMap = seriesMap.get(seriesTitle)!;
                if (!seasonMap.has(season)) {
                    seasonMap.set(season, []);
                }

                seasonMap.get(season)!.push(video);
            } else {
                other.push(video);
            }
        }

        const seriesEntries = Array.from(seriesMap.entries()).map(([seriesTitle, seasons]) => {
            const seasonEntries = Array.from(seasons.entries())
                .sort(([a], [b]) => a - b)
                .map(([season, episodes]) => ({
                    season,
                    episodes: episodes.sort((a, b) => (a.episode || 0) - (b.episode || 0) || b.createdAt.localeCompare(a.createdAt)),
                }));

            return {
                seriesTitle,
                seasons: seasonEntries,
            };
        }).sort((a, b) => a.seriesTitle.localeCompare(b.seriesTitle));

        return { seriesEntries, other };
    }, [filteredVideos]);

    const handleVideoClick = (video: Video) => setSelectedVideo(video);
    const handleClosePlayer = () => setSelectedVideo(null);
    const handleChooseFile = () => fileInputRef.current?.click();
    const handleChooseThumbnail = () => uploadThumbInputRef.current?.click();
    const handleChooseBulk = () => bulkInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = e.target.files?.[0] || null;
        setUploadFile(nextFile);
        setUploadError('');
        setUploadSuccess('');
    };

    const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = e.target.files?.[0] || null;
        setUploadThumbnailFile(nextFile);
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
        if (!uploadFile) {
            setUploadError('Please choose a video file first.');
            return;
        }

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
        } finally {
            setUploading(false);
        }
    };

    const updateBulkItem = (id: string, patch: Partial<BulkUploadItem>) => {
        setBulkItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
    };

    const addBulkFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;

        const next: BulkUploadItem[] = [];
        Array.from(list).forEach((file) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const allowed = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'm2ts'];
            if (!allowed.includes(ext)) {
                return;
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[._-]+/g, ' ').trim();
            next.push({
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                file,
                title: baseName,
                progress: 0,
                status: 'waiting',
            });
        });

        if (next.length > 0) {
            setBulkItems((prev) => [...prev, ...next]);
        }
    };

    const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addBulkFiles(e.target.files);
        if (bulkInputRef.current) {
            bulkInputRef.current.value = '';
        }
    };

    const handleBulkDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragActive(false);
        addBulkFiles(e.dataTransfer.files);
    };

    const runBulkUpload = async () => {
        if (bulkRunning) return;
        const waiting = bulkItems.filter((item) => item.status === 'waiting' || item.status === 'error');
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
                updateBulkItem(item.id, {
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Upload failed',
                });
            }
        }

        setBulkRunning(false);
        await fetchVideos();
    };

    const clearBulk = () => {
        if (bulkRunning) return;
        setBulkItems([]);
    };

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
        if (!editTitle.trim()) {
            setEditError('Title is required.');
            return;
        }

        setEditLoading(true);
        setEditError('');

        try {
            const result = await api.editVideo(editingVideo.filename, editTitle.trim());
            const finalFilename = result.filename;
            if (editThumbnail) {
                await api.uploadThumbnail(finalFilename, editThumbnail);
            }
            await fetchVideos();
            closeEditModal();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Edit failed');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteVideo = async (video: Video) => {
        const ok = window.confirm(`Delete "${video.title}" and its thumbnail? This cannot be undone.`);
        if (!ok) return;

        try {
            await api.deleteVideo(video.filename);
            if (selectedVideo?.id === video.id) {
                setSelectedVideo(null);
            }
            await fetchVideos();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const latestVideo = videos[0];

    return (
        <div>
            <Navbar username={username} isAdmin={isAdmin} onLogout={onLogout} onSearch={setSearchQuery} />

            <section className="hero">
                <div className="hero-content">
                    <div className="hero-badge"><span />Private Library</div>
                    <h1 className="hero-title">Your <span className="highlight">Cinema</span>,<br />On Your Terms</h1>
                    <p className="hero-subtitle">
                        {loading
                            ? 'Loading your personal video collection...'
                            : `Browse ${videos.length} video${videos.length !== 1 ? 's' : ''} in your private library.`}
                    </p>
                </div>
            </section>

            <div className="content-area">
                {isAdmin && (
                    <section id="admin-upload" className="admin-upload-section">
                        <div className="section-header">
                            <h2 className="section-title">Admin Studio</h2>
                            <span className="section-count">Create / Edit / Delete</span>
                        </div>

                        <form className="admin-upload-card" onSubmit={handleUpload}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <input
                                ref={uploadThumbInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                onChange={handleThumbnailFileChange}
                                style={{ display: 'none' }}
                            />

                            <div className="admin-upload-grid">
                                <div>
                                    <label className="form-label" htmlFor="upload-title">Video Title (optional)</label>
                                    <input
                                        id="upload-title"
                                        className="form-input"
                                        type="text"
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        placeholder="Example: Episode 01 - Launch Night"
                                    />
                                </div>

                                <div className="admin-upload-file">
                                    <div className="admin-upload-file-name">{uploadFile ? uploadFile.name : 'No video selected'}</div>
                                    <button type="button" className="admin-secondary-btn" onClick={handleChooseFile}>Choose Video File</button>
                                </div>

                                <div className="admin-upload-file">
                                    <div className="admin-upload-file-name">{uploadThumbnailFile ? uploadThumbnailFile.name : 'No thumbnail selected (optional)'}</div>
                                    <button type="button" className="admin-secondary-btn" onClick={handleChooseThumbnail}>Choose Thumbnail</button>
                                </div>
                            </div>

                            <div className="admin-upload-actions">
                                <button type="submit" className="btn-login admin-upload-btn" disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Upload Video'}
                                </button>
                                <button type="button" className="admin-secondary-btn" onClick={clearUploadForm} disabled={uploading}>Reset</button>
                            </div>

                            {uploadError && <div className="login-error" style={{ marginTop: 14 }}>{uploadError}</div>}
                            {uploadSuccess && <div className="admin-success">{uploadSuccess}</div>}
                        </form>

                        <div className="bulk-upload-card" style={{ marginTop: 14 }}>
                            <input
                                ref={bulkInputRef}
                                type="file"
                                accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts"
                                multiple
                                onChange={handleBulkFileChange}
                                style={{ display: 'none' }}
                            />

                            <div
                                className={`bulk-dropzone ${dragActive ? 'active' : ''}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragActive(true);
                                }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleBulkDrop}
                            >
                                <strong>Bulk Upload</strong>
                                <span>Drag and drop videos here or use file picker.</span>
                                <button type="button" className="admin-secondary-btn" onClick={handleChooseBulk}>Choose Multiple Files</button>
                            </div>

                            {bulkItems.length > 0 && (
                                <div className="bulk-queue">
                                    {bulkItems.map((item) => (
                                        <div key={item.id} className="bulk-row">
                                            <div className="bulk-main">
                                                <div className="bulk-name">{item.file.name}</div>
                                                <div className="bulk-size">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</div>
                                            </div>
                                            <input
                                                className="form-input"
                                                value={item.title}
                                                onChange={(e) => updateBulkItem(item.id, { title: e.target.value })}
                                                placeholder="Optional title"
                                                disabled={bulkRunning}
                                            />
                                            <div className="bulk-progress-wrap">
                                                <div className="bulk-progress-bar" style={{ width: `${item.progress}%` }} />
                                            </div>
                                            <div className={`bulk-status ${item.status}`}>{item.status}</div>
                                            {item.error && <div className="bulk-error">{item.error}</div>}
                                        </div>
                                    ))}

                                    <div className="admin-upload-actions" style={{ marginTop: 8 }}>
                                        <button type="button" className="btn-login admin-upload-btn" onClick={runBulkUpload} disabled={bulkRunning}>
                                            {bulkRunning ? 'Bulk Upload Running...' : 'Start Bulk Upload'}
                                        </button>
                                        <button type="button" className="admin-secondary-btn" onClick={clearBulk} disabled={bulkRunning}>Clear Queue</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {latestVideo && !searchQuery && !loading && (
                    <section style={{ marginBottom: 48 }}>
                        <div className="section-header"><h2 className="section-title">Latest Addition</h2></div>
                        <FeaturedCard video={latestVideo} onClick={handleVideoClick} />
                    </section>
                )}

                <section id="all-videos">
                    <div className="section-header">
                        <h2 className="section-title">{searchQuery ? `Results for "${searchQuery}"` : 'All Videos'}</h2>
                        {!loading && <span className="section-count">{filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}</span>}
                    </div>

                    {loading && null}

                    {!loading && error && (
                        <div className="empty-state">
                            <div className="empty-icon">!</div>
                            <div className="empty-title">Oops! Something went wrong</div>
                            <div className="empty-subtitle">{error}</div>
                            <button onClick={fetchVideos} className="admin-secondary-btn" style={{ marginTop: 16 }}>Try Again</button>
                        </div>
                    )}

                    {!loading && !error && filteredVideos.length === 0 && (
                        <div className="empty-state empty-state-soft">
                            <div className="empty-icon">0</div>
                            <div className="empty-title">{searchQuery ? 'No videos found' : 'No videos yet'}</div>
                            <div className="empty-subtitle">
                                {searchQuery
                                    ? `No results for "${searchQuery}". Try a different search term.`
                                    : 'Upload your first video from the admin section to get started.'}
                            </div>
                        </div>
                    )}

                    {!loading && !error && filteredVideos.length > 0 && (
                        <>
                            {grouped.seriesEntries.map((series) => (
                                <div key={series.seriesTitle} className="series-block">
                                    <h3 className="series-title">{series.seriesTitle}</h3>
                                    {series.seasons.map((seasonGroup) => (
                                        <details key={`${series.seriesTitle}-${seasonGroup.season}`} className="season-accordion" open>
                                            <summary>Season {seasonGroup.season} ({seasonGroup.episodes.length} episodes)</summary>
                                            <div className="video-grid">
                                                {seasonGroup.episodes.map((video) => (
                                                    <div key={video.id} className="video-admin-item">
                                                        <VideoCard video={video} onClick={handleVideoClick} />
                                                        {isAdmin && (
                                                            <div className="video-admin-actions">
                                                                <button className="admin-secondary-btn" onClick={() => openEditModal(video)}>Edit</button>
                                                                <button className="admin-danger-btn" onClick={() => handleDeleteVideo(video)}>Delete</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            ))}

                            {grouped.other.length > 0 && (
                                <div className="series-block">
                                    <h3 className="series-title">Movies / Other</h3>
                                    <div className="video-grid">
                                        {grouped.other.map((video) => (
                                            <div key={video.id} className="video-admin-item">
                                                <VideoCard video={video} onClick={handleVideoClick} />
                                                {isAdmin && (
                                                    <div className="video-admin-actions">
                                                        <button className="admin-secondary-btn" onClick={() => openEditModal(video)}>Edit</button>
                                                        <button className="admin-danger-btn" onClick={() => handleDeleteVideo(video)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            {selectedVideo && <PlayerModal video={selectedVideo} videos={videos} onClose={handleClosePlayer} onSelectVideo={setSelectedVideo} />}

            {editingVideo && (
                <div className="edit-modal-overlay" onClick={closeEditModal}>
                    <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Edit Video</h3>
                        <p className="edit-modal-sub">Update title and thumbnail</p>
                        <form onSubmit={handleSaveEdit}>
                            <label className="form-label" htmlFor="edit-title">Title</label>
                            <input
                                id="edit-title"
                                className="form-input"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Enter new title"
                            />

                            <label className="form-label" htmlFor="edit-thumbnail" style={{ marginTop: 12 }}>Thumbnail (jpg/png)</label>
                            <input
                                id="edit-thumbnail"
                                className="form-input"
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                onChange={(e) => setEditThumbnail(e.target.files?.[0] || null)}
                            />

                            {editError && <div className="login-error" style={{ marginTop: 12 }}>{editError}</div>}

                            <div className="admin-upload-actions" style={{ marginTop: 16 }}>
                                <button className="btn-login admin-upload-btn" type="submit" disabled={editLoading}>
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button className="admin-secondary-btn" type="button" onClick={closeEditModal} disabled={editLoading}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const FeaturedCard: React.FC<{ video: Video; onClick: (v: Video) => void }> = ({ video, onClick }) => {
    const [imgError, setImgError] = useState(false);
    const thumbnailUrl = getManualThumbnailUrl(video);

    return (
        <div
            onClick={() => onClick(video)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(video)}
            style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                maxWidth: 760,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            }}
            className="featured-card"
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(229,9,20,0.25)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
        >
            <div style={{ width: 300, flexShrink: 0, position: 'relative' }}>
                {!imgError ? (
                    <img
                        src={thumbnailUrl}
                        alt={video.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
                    }}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="#e50914" strokeWidth="2" fill="none" opacity="0.6" />
                            <polygon points="19,16 19,32 36,24" fill="#e50914" opacity="0.8" />
                        </svg>
                    </div>
                )}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent 60%, rgba(26,26,46,1) 100%)',
                    pointerEvents: 'none',
                }} />
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--netflix-red)',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    background: 'rgba(229,9,20,0.1)',
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid rgba(229,9,20,0.2)',
                    width: 'fit-content',
                }}>
                    New
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>{video.title}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#888', background: '#222', padding: '3px 8px', borderRadius: 3 }}>
                        {video.extension.replace('.', '').toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: '#888' }}>{video.sizeHuman}</span>
                </div>
                <button style={{
                    marginTop: 8,
                    padding: '10px 24px',
                    background: 'var(--netflix-red)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--font)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: 'fit-content',
                    transition: 'background 0.2s',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="2,1 2,13 13,7" /></svg>
                    Play Now
                </button>
            </div>
        </div>
    );
};

export default Dashboard;

