import React, { useState, useRef } from 'react';
import { api, Video } from '../api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

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
    // Single Upload state
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

    // Bulk upload state
    const bulkInputRef = useRef<HTMLInputElement | null>(null);
    const [bulkContentType, setBulkContentType] = useState<'movie' | 'series'>('movie');
    const [bulkSeriesTitle, setBulkSeriesTitle] = useState('');
    const [bulkComboboxOpen, setBulkComboboxOpen] = useState(false);
    const [bulkSeason, setBulkSeason] = useState<number>(1);
    const [bulkStartEpisode, setBulkStartEpisode] = useState<number>(1);
    const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
    const [bulkRunning, setBulkRunning] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Handlers
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

    const clearUploadForm = (resetAll: boolean | React.MouseEvent = true) => {
        if (resetAll === true || (typeof resetAll !== 'boolean')) {
            setUploadTitle('');
            setUploadContentType('movie');
            setUploadSeriesTitle('');
            setUploadSeason(1);
            setUploadEpisode(1);
        } else {
            setUploadTitle('');
        }
        setUploadFile(null);
        setUploadThumbnailFile(null);
        setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (uploadThumbInputRef.current) uploadThumbInputRef.current.value = '';
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) { setUploadError('Please choose a video file first.'); return; }
        if (uploadContentType === 'series' && !uploadSeriesTitle.trim()) {
            setUploadError('Series title is required for episodes.');
            return;
        }
        setUploading(true);
        setUploadError('');
        setUploadSuccess('');
        try {
            const result = await api.uploadVideo(uploadFile, uploadTitle, {
                contentType: uploadContentType,
                seriesTitle: uploadSeriesTitle,
                season: uploadSeason,
                episode: uploadEpisode,
            });
            if (uploadThumbnailFile) {
                await api.uploadThumbnail(result.filename, uploadThumbnailFile);
            }
            setUploadSuccess(uploadThumbnailFile ? 'Video and thumbnail uploaded successfully.' : (result.message || 'Video uploaded successfully.'));
            
            if (uploadContentType === 'series') {
                setUploadEpisode(prev => prev + 1);
                clearUploadForm(false);
            } else {
                clearUploadForm(true);
            }
            await fetchVideos();
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally { setUploading(false); }
    };

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
                file, 
                title: bulkContentType === 'movie' ? baseName : '', 
                episode: bulkContentType === 'series' ? ep : undefined,
                progress: 0, 
                status: 'waiting',
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
        e.preventDefault();
        setDragActive(false);
        addBulkFiles(e.dataTransfer.files);
    };

    const runBulkUpload = async () => {
        if (bulkRunning) return;
        if (bulkContentType === 'series' && !bulkSeriesTitle.trim()) {
            alert('Please select or specify a series title for the bulk upload');
            return;
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

    return (
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
                            <label className="admin-form-label">Content Type</label>
                            <Select value={uploadContentType} onValueChange={(v: 'movie'|'series') => setUploadContentType(v)}>
                                <SelectTrigger className="admin-form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                    <SelectValue placeholder="Select content type" />
                                </SelectTrigger>
                                <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                    <SelectItem value="movie">Movie / Standalone</SelectItem>
                                    <SelectItem value="series">Series Episode</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {uploadContentType === 'series' && (
                            <>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Series Title</label>
                                    <Popover open={uploadComboboxOpen} onOpenChange={setUploadComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="admin-form-input"
                                                style={{ textAlign: 'left' }}
                                            >
                                                {uploadSeriesTitle || 'Select or type a series...'}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                            <Command style={{ backgroundColor: '#1a1a1a' }}>
                                                <CommandInput 
                                                    placeholder="Search series..." 
                                                    value={uploadSeriesTitle}
                                                    onValueChange={setUploadSeriesTitle}
                                                    style={{ color: 'white' }}
                                                />
                                                <CommandEmpty style={{ color: '#aaa', padding: '10px' }}>
                                                    Type to add new series "{uploadSeriesTitle}"
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    <CommandList>
                                                        {existingSeries.map((s) => (
                                                            <CommandItem
                                                                key={s}
                                                                value={s}
                                                                onSelect={(currentValue) => {
                                                                    setUploadSeriesTitle(currentValue);
                                                                    setUploadComboboxOpen(false);
                                                                }}
                                                                style={{ color: 'white', cursor: 'pointer' }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${uploadSeriesTitle === s ? 'opacity-100' : 'opacity-0'}`}
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
                                        <input className="admin-form-input" type="number" min="1" value={uploadSeason} onChange={e => setUploadSeason(parseInt(e.target.value) || 1)} />
                                    </div>
                                    <div className="admin-inline-field">
                                        <label className="admin-form-label">Episode</label>
                                        <input className="admin-form-input" type="number" min="1" value={uploadEpisode} onChange={e => setUploadEpisode(parseInt(e.target.value) || 1)} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="up-title">{uploadContentType === 'series' ? 'Episode Title (optional)' : 'Video Title'}</label>
                            <input id="up-title" className="admin-form-input" type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder={uploadContentType === 'series' ? "e.g., Pilot" : "Video Title"} />
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
                        <div className="admin-upload-form-grid admin-bulk-settings">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Bulk Content Type</label>
                                <Select value={bulkContentType} onValueChange={(v: 'movie'|'series') => setBulkContentType(v)} disabled={bulkRunning}>
                                    <SelectTrigger className="admin-form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                        <SelectValue placeholder="Select content type" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                        <SelectItem value="movie">Movies / Standalone</SelectItem>
                                        <SelectItem value="series">Series Episodes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {bulkContentType === 'series' && (
                                <>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Series Title</label>
                                        <Popover open={bulkComboboxOpen} onOpenChange={setBulkComboboxOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="admin-form-input"
                                                    style={{ textAlign: 'left' }}
                                                >
                                                    {bulkSeriesTitle || 'Select or type a series...'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                                <Command style={{ backgroundColor: '#1a1a1a' }}>
                                                    <CommandInput 
                                                        placeholder="Search series..." 
                                                        value={bulkSeriesTitle}
                                                        onValueChange={setBulkSeriesTitle}
                                                        style={{ color: 'white' }}
                                                    />
                                                    <CommandEmpty style={{ color: '#aaa', padding: '10px' }}>
                                                        Type to add new series "{bulkSeriesTitle}"
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandList>
                                                            {existingSeries.map((s) => (
                                                                <CommandItem
                                                                    key={s}
                                                                    value={s}
                                                                    onSelect={(currentValue) => {
                                                                        setBulkSeriesTitle(currentValue);
                                                                        setBulkComboboxOpen(false);
                                                                    }}
                                                                    style={{ color: 'white', cursor: 'pointer' }}
                                                                >
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${bulkSeriesTitle === s ? 'opacity-100' : 'opacity-0'}`}
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
                                            <input className="admin-form-input" type="number" min="1" value={bulkSeason} onChange={e => setBulkSeason(parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div className="admin-inline-field">
                                            <label className="admin-form-label">Start Episode (Auto-incremented)</label>
                                            <input className="admin-form-input" type="number" min="1" value={bulkStartEpisode} onChange={e => setBulkStartEpisode(parseInt(e.target.value) || 1)} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {bulkItems.map(item => (
                            <div key={item.id} className="admin-bulk-row">
                                <div className="admin-bulk-info">
                                    <span className="admin-bulk-name">{item.file.name}</span>
                                    <span className="admin-bulk-size">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                </div>
                                {bulkContentType === 'series' && (
                                    <input className="admin-form-input compact admin-episode-input" type="number" value={item.episode || ''} onChange={e => updateBulkItem(item.id, { episode: parseInt(e.target.value) || 1 })} placeholder="Ep" disabled={bulkRunning} />
                                )}
                                <input className="admin-form-input compact" value={item.title} onChange={e => updateBulkItem(item.id, { title: e.target.value })} placeholder={bulkContentType === 'series' ? "Optional Ep Title" : "Title"} disabled={bulkRunning} />
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
    );
};

export default UploadPage;
