import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import './UploadPage.css';
import { useVideoUpload } from '../hooks/useVideoUpload';

interface UploadPageProps {
    existingSeries: string[];
    fetchVideos: () => Promise<void>;
}

const UploadPage: React.FC<UploadPageProps> = ({ existingSeries, fetchVideos }) => {
    // ── Active tab ──
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

    // ── Upload combobox UI state (tetap lokal karena hanya UI) ──
    const [uploadComboboxOpen, setUploadComboboxOpen] = useState(false);
    const [bulkComboboxOpen, setBulkComboboxOpen] = useState(false);

    // ── Semua logika upload diambil dari hook terpusat ──
    const {
        uploadTitle, setUploadTitle,
        uploadContentType, setUploadContentType,
        uploadSeriesTitle, setUploadSeriesTitle,
        uploadSeason, setUploadSeason,
        uploadEpisode, setUploadEpisode,
        uploadFile,
        uploadThumbnailFile,
        uploading,
        uploadError,
        uploadSuccess,
        fileInputRef,
        uploadThumbInputRef,
        handleChooseFile,
        handleChooseThumbnail,
        handleFileChange,
        handleThumbnailFileChange,
        handleUpload,
        clearUploadForm,
        bulkContentType, setBulkContentType,
        bulkSeriesTitle, setBulkSeriesTitle,
        bulkSeason, setBulkSeason,
        bulkStartEpisode, setBulkStartEpisode,
        bulkItems,
        bulkRunning,
        dragActive, setDragActive,
        bulkInputRef,
        handleChooseBulk,
        handleBulkFileChange,
        handleBulkDrop,
        updateBulkItem,
        runBulkUpload,
        clearBulk,
    } = useVideoUpload({ fetchVideos });

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
