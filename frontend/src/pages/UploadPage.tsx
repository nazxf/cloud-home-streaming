import React, { useState, useRef } from 'react';
import { api } from '../api';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import './UploadPage.css';

interface UploadPageProps {
    existingSeries: string[];
    fetchVideos: () => Promise<void>;
}

type BulkStatus = 'waiting' | 'uploading' | 'success' | 'error';

interface BulkUploadItem {
    id: string;
    file: File;
    title: string;
    progress: number;
    status: BulkStatus;
    error?: string;
    episode?: number;
}

const UploadPage: React.FC<UploadPageProps> = ({ existingSeries, fetchVideos }) => {
    // ── Single Upload state ──
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadContentType, setUploadContentType] = useState<'movie' | 'series'>('movie');
    const [uploadSeriesTitle, setUploadSeriesTitle] = useState('');
    const [uploadComboboxOpen, setUploadComboboxOpen] = useState(false);
    const [uploadSeason, setUploadSeason] = useState<number>(1);
    const [uploadEpisode, setUploadEpisode] = useState<number>(1);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadThumbInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);

    // ── Bulk Upload state ──
    const bulkInputRef = useRef<HTMLInputElement | null>(null);
    const [bulkContentType, setBulkContentType] = useState<'movie' | 'series'>('movie');
    const [bulkSeriesTitle, setBulkSeriesTitle] = useState('');
    const [bulkComboboxOpen, setBulkComboboxOpen] = useState(false);
    const [bulkSeason, setBulkSeason] = useState<number>(1);
    const [bulkStartEpisode, setBulkStartEpisode] = useState<number>(1);
    const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
    const [bulkRunning, setBulkRunning] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // ── Active tab ──
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

    // ── File handlers ──
    const handleChooseFile = () => fileInputRef.current?.click();
    const handleChooseThumbnail = () => uploadThumbInputRef.current?.click();
    const handleChooseBulk = () => bulkInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadFile(e.target.files?.[0] || null);
        setUploadError(''); setUploadSuccess('');
    };

    const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadThumbnailFile(e.target.files?.[0] || null);
        setUploadError(''); setUploadSuccess('');
    };

    const clearUploadForm = (resetAll: boolean | React.MouseEvent = true) => {
        if (resetAll === true || typeof resetAll !== 'boolean') {
            setUploadTitle(''); setUploadContentType('movie');
            setUploadSeriesTitle(''); setUploadSeason(1); setUploadEpisode(1);
        } else { setUploadTitle(''); }
        setUploadFile(null); setUploadThumbnailFile(null); setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (uploadThumbInputRef.current) uploadThumbInputRef.current.value = '';
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) { setUploadError('Please choose a video file first.'); return; }
        if (uploadContentType === 'series' && !uploadSeriesTitle.trim()) {
            setUploadError('Series title is required for episodes.'); return;
        }
        setUploading(true); setUploadError(''); setUploadSuccess('');
        try {
            const result = await api.uploadVideo(uploadFile, uploadTitle, {
                contentType: uploadContentType, seriesTitle: uploadSeriesTitle,
                season: uploadSeason, episode: uploadEpisode,
            });
            if (uploadThumbnailFile) await api.uploadThumbnail(result.filename, uploadThumbnailFile);
            setUploadSuccess(uploadThumbnailFile ? 'Video and thumbnail uploaded successfully.' : (result.message || 'Video uploaded successfully.'));
            if (uploadContentType === 'series') { setUploadEpisode(prev => prev + 1); clearUploadForm(false); }
            else { clearUploadForm(true); }
            await fetchVideos();
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally { setUploading(false); }
    };

    // ── Bulk handlers ──
    const updateBulkItem = (id: string, patch: Partial<BulkUploadItem>) => {
        setBulkItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
    };

    const addBulkFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const next: BulkUploadItem[] = [];
        let ep = bulkStartEpisode;
        Array.from(list).forEach(file => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const allowed = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'm2ts'];
            if (!allowed.includes(ext)) return;
            const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[._-]+/g, ' ').trim();
            next.push({
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                file, title: bulkContentType === 'movie' ? baseName : '',
                episode: bulkContentType === 'series' ? ep : undefined,
                progress: 0, status: 'waiting',
            });
            if (bulkContentType === 'series') ep++;
        });
        if (bulkContentType === 'series') setBulkStartEpisode(ep);
        if (next.length > 0) setBulkItems(prev => [...prev, ...next]);
    };

    const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addBulkFiles(e.target.files);
        if (bulkInputRef.current) bulkInputRef.current.value = '';
    };

    const handleBulkDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); setDragActive(false);
        addBulkFiles(e.dataTransfer.files);
    };

    const runBulkUpload = async () => {
        if (bulkRunning) return;
        if (bulkContentType === 'series' && !bulkSeriesTitle.trim()) {
            alert('Please select or specify a series title for the bulk upload'); return;
        }
        const waiting = bulkItems.filter(item => item.status === 'waiting' || item.status === 'error');
        if (waiting.length === 0) return;
        setBulkRunning(true);
        for (const item of waiting) {
            updateBulkItem(item.id, { status: 'uploading', progress: 0, error: undefined });
            try {
                await api.uploadVideoWithProgress(item.file, item.title, (percent) => {
                    updateBulkItem(item.id, { progress: percent });
                }, {
                    contentType: bulkContentType,
                    seriesTitle: bulkContentType === 'series' ? bulkSeriesTitle : undefined,
                    season: bulkContentType === 'series' ? bulkSeason : undefined,
                    episode: item.episode,
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

    // ── Combobox helper ──
    const renderSeriesCombobox = (
        open: boolean, setOpen: (v: boolean) => void,
        value: string, setValue: (v: string) => void,
        disabled?: boolean
    ) => (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type="button" disabled={disabled}
                    className="upload-select"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', color: value ? '#fff' : '#808080' }}
                >
                    {value || 'Select or type a series...'}
                    <ChevronsUpDown style={{ width: 16, height: 16, opacity: 0.5, flexShrink: 0 }} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                <Command style={{ backgroundColor: '#1a1a1a' }}>
                    <CommandInput placeholder="Search series..." value={value} onValueChange={setValue} style={{ color: 'white' }} />
                    <CommandEmpty style={{ color: '#808080', padding: '12px', fontSize: '13px' }}>
                        Type to add new series "{value}"
                    </CommandEmpty>
                    <CommandGroup>
                        <CommandList>
                            {existingSeries.map(s => (
                                <CommandItem key={s} value={s} onSelect={v => { setValue(v); setOpen(false); }} style={{ color: 'white', cursor: 'pointer' }}>
                                    <Check style={{ width: 16, height: 16, marginRight: 8, opacity: value === s ? 1 : 0 }} />
                                    {s}
                                </CommandItem>
                            ))}
                        </CommandList>
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );

    return (
        <div className="admin-page">
            {/* ─── Page Header ─── */}
            <div className="admin-page-header">
                <h1 className="admin-page-title">Upload Content</h1>
                <p className="admin-page-subtitle">Add new videos and episodes to your StreamFlix library</p>
            </div>

            {/* ─── Tabs ─── */}
            <div className="upload-tabs">
                <button type="button" className={`upload-tab ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>
                    Single Upload
                </button>
                <button type="button" className={`upload-tab ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
                    Bulk Upload
                </button>
            </div>

            {/* ═══════ Single Upload ═══════ */}
            {activeTab === 'single' && (
                <form onSubmit={handleUpload}>
                    <div className="upload-grid">
                        {/* ── Left Column ── */}
                        <div>
                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot red" />
                                    <h2 className="upload-section-title">Basic Information</h2>
                                </div>

                                <div className="upload-field">
                                    <label className="upload-label">Content Type</label>
                                    <select className="upload-select" value={uploadContentType}
                                        onChange={e => setUploadContentType(e.target.value as 'movie' | 'series')}>
                                        <option value="movie">Movie / Standalone</option>
                                        <option value="series">Series Episode</option>
                                    </select>
                                </div>

                                {uploadContentType === 'series' && (
                                    <div className="upload-row">
                                        <div className="upload-field">
                                            <label className="upload-label">Season</label>
                                            <input className="upload-input" type="number" min="1" value={uploadSeason}
                                                onChange={e => setUploadSeason(parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div className="upload-field">
                                            <label className="upload-label">Episode</label>
                                            <input className="upload-input" type="number" min="1" value={uploadEpisode}
                                                onChange={e => setUploadEpisode(parseInt(e.target.value) || 1)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot red" />
                                    <h2 className="upload-section-title">Video File</h2>
                                </div>
                                <div className={`upload-dropzone ${uploadFile ? 'has-file' : ''}`} onClick={handleChooseFile}>
                                    <div className="upload-dropzone-icon">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <span className="upload-dropzone-text">
                                        {uploadFile ? uploadFile.name : 'Drag and drop video here'}
                                    </span>
                                    <span className="upload-dropzone-sub">
                                        {uploadFile
                                            ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB — Click to change`
                                            : 'or click to browse files'}
                                    </span>
                                    <span className="upload-dropzone-hint">
                                        MP4, MKV, AVI, MOV, WebM supported
                                    </span>
                                    <input ref={fileInputRef} type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts"
                                        onChange={handleFileChange} style={{ display: 'none' }} />
                                </div>
                            </div>
                        </div>

                        {/* ── Right Column ── */}
                        <div>
                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot muted" />
                                    <h2 className="upload-section-title">Metadata &amp; Visuals</h2>
                                </div>

                                {uploadContentType === 'series' && (
                                    <div className="upload-field">
                                        <label className="upload-label">Series Title</label>
                                        {renderSeriesCombobox(uploadComboboxOpen, setUploadComboboxOpen, uploadSeriesTitle, setUploadSeriesTitle)}
                                    </div>
                                )}

                                <div className="upload-field">
                                    <label className="upload-label">
                                        {uploadContentType === 'series' ? 'Episode Title' : 'Video Title'}
                                        <span className="optional">optional</span>
                                    </label>
                                    <input className="upload-input" type="text" value={uploadTitle}
                                        onChange={e => setUploadTitle(e.target.value)}
                                        placeholder={uploadContentType === 'series' ? 'e.g. The Beginning' : 'Enter video title'} />
                                </div>
                            </div>

                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot muted" />
                                    <h2 className="upload-section-title">Thumbnail</h2>
                                </div>

                                <div className="upload-thumb-picker" onClick={handleChooseThumbnail}>
                                    <div className="upload-thumb-icon">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div className="upload-thumb-info">
                                        <span className="upload-thumb-name">{uploadThumbnailFile ? uploadThumbnailFile.name : 'Choose thumbnail image'}</span>
                                        <span className="upload-thumb-hint">1920×1080 recommended · JPG or PNG</span>
                                    </div>
                                    <input ref={uploadThumbInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                        onChange={handleThumbnailFileChange} style={{ display: 'none' }} />
                                </div>
                            </div>

                            {uploadError && <div className="upload-msg-error">{uploadError}</div>}
                            {uploadSuccess && <div className="upload-msg-success">{uploadSuccess}</div>}
                        </div>
                    </div>

                    <div className="upload-actions">
                        <button type="button" className="upload-btn-secondary" onClick={() => clearUploadForm(true)} disabled={uploading}>
                            Reset Form
                        </button>
                        <button type="submit" className="upload-btn-primary" disabled={uploading}>
                            {uploading ? 'Uploading…' : 'Upload Video'}
                        </button>
                    </div>
                </form>
            )}

            {/* ═══════ Bulk Upload ═══════ */}
            {activeTab === 'bulk' && (
                <div>
                    <div className="upload-grid">
                        {/* ── Left Column ── */}
                        <div>
                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot red" />
                                    <h2 className="upload-section-title">Bulk Settings</h2>
                                </div>

                                <div className="upload-field">
                                    <label className="upload-label">Content Type</label>
                                    <select className="upload-select" value={bulkContentType}
                                        onChange={e => setBulkContentType(e.target.value as 'movie' | 'series')}
                                        disabled={bulkRunning}>
                                        <option value="movie">Movies / Standalone</option>
                                        <option value="series">Series Episodes</option>
                                    </select>
                                </div>

                                {bulkContentType === 'series' && (
                                    <>
                                        <div className="upload-field">
                                            <label className="upload-label">Series Title</label>
                                            {renderSeriesCombobox(bulkComboboxOpen, setBulkComboboxOpen, bulkSeriesTitle, setBulkSeriesTitle, bulkRunning)}
                                        </div>
                                        <div className="upload-row">
                                            <div className="upload-field">
                                                <label className="upload-label">Season</label>
                                                <input className="upload-input" type="number" min="1" value={bulkSeason}
                                                    onChange={e => setBulkSeason(parseInt(e.target.value) || 1)} disabled={bulkRunning} />
                                            </div>
                                            <div className="upload-field">
                                                <label className="upload-label">Start Episode</label>
                                                <input className="upload-input" type="number" min="1" value={bulkStartEpisode}
                                                    onChange={e => setBulkStartEpisode(parseInt(e.target.value) || 1)} disabled={bulkRunning} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Right Column ── */}
                        <div>
                            <div className="upload-section">
                                <div className="upload-section-header">
                                    <span className="upload-section-dot muted" />
                                    <h2 className="upload-section-title">Add Files</h2>
                                </div>
                                <input ref={bulkInputRef} type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.m2ts"
                                    multiple onChange={handleBulkFileChange} style={{ display: 'none' }} />
                                <div className={`upload-dropzone ${dragActive ? 'active' : ''}`}
                                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={handleBulkDrop}
                                    onClick={handleChooseBulk}>
                                    <div className="upload-dropzone-icon">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <span className="upload-dropzone-text">Drag and drop videos here</span>
                                    <span className="upload-dropzone-sub">or click to browse files</span>
                                    <span className="upload-dropzone-hint">Select multiple files at once</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Queue ── */}
                    {bulkItems.length > 0 && (
                        <div className="upload-queue">
                            <h3 className="upload-queue-title">Upload Queue · {bulkItems.length} file{bulkItems.length !== 1 ? 's' : ''}</h3>
                            <div className="upload-queue-list">
                                {bulkItems.map(item => (
                                    <div key={item.id} className="upload-queue-item">
                                        <div className="upload-queue-main">
                                            <div className="upload-queue-header">
                                                <span className="upload-queue-name">{item.file.name}</span>
                                                <span className="upload-queue-size">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                            <div className="upload-queue-inputs">
                                                {bulkContentType === 'series' && (
                                                    <input className="upload-queue-input ep-num" type="number" min="1"
                                                        value={item.episode || ''} placeholder="Ep"
                                                        onChange={e => updateBulkItem(item.id, { episode: parseInt(e.target.value) || 1 })}
                                                        disabled={bulkRunning} />
                                                )}
                                                <input className="upload-queue-input flex-fill"
                                                    value={item.title}
                                                    onChange={e => updateBulkItem(item.id, { title: e.target.value })}
                                                    placeholder={bulkContentType === 'series' ? 'Episode title (optional)' : 'Title'}
                                                    disabled={bulkRunning} />
                                            </div>
                                            <div className="upload-queue-progress">
                                                <div className="upload-queue-progress-fill" style={{ width: `${item.progress}%` }} />
                                            </div>
                                            {item.error && <span className="upload-queue-error">{item.error}</span>}
                                        </div>
                                        <div className={`upload-queue-status s-${item.status}`}>{item.status}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="upload-actions">
                                <button type="button" className="upload-btn-secondary" onClick={clearBulk} disabled={bulkRunning}>
                                    Clear Queue
                                </button>
                                <button type="button" className="upload-btn-primary" onClick={runBulkUpload} disabled={bulkRunning}>
                                    {bulkRunning ? 'Uploading…' : 'Start Bulk Upload'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UploadPage;
