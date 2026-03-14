import { useState, useRef } from 'react';
import { api } from '../api';
import { ALLOWED_VIDEO_EXTENSIONS } from '../config/constants';

export type BulkStatus = 'waiting' | 'uploading' | 'success' | 'error';

export interface BulkUploadItem {
  id: string;
  file: File;
  title: string;
  progress: number;
  status: BulkStatus;
  error?: string;
  episode?: number;
}

interface UseVideoUploadOptions {
  fetchVideos: () => Promise<void>;
}

export function useVideoUpload({ fetchVideos }: UseVideoUploadOptions) {
  // ── Single Upload State ──
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContentType, setUploadContentType] = useState<'movie' | 'series'>('movie');
  const [uploadSeriesTitle, setUploadSeriesTitle] = useState('');
  const [uploadSeason, setUploadSeason] = useState<number>(1);
  const [uploadEpisode, setUploadEpisode] = useState<number>(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadThumbInputRef = useRef<HTMLInputElement | null>(null);

  // ── Bulk Upload State ──
  const [bulkContentType, setBulkContentType] = useState<'movie' | 'series'>('movie');
  const [bulkSeriesTitle, setBulkSeriesTitle] = useState('');
  const [bulkSeason, setBulkSeason] = useState<number>(1);
  const [bulkStartEpisode, setBulkStartEpisode] = useState<number>(1);
  const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  // ── Single Upload Handlers ──
  const handleChooseFile = () => fileInputRef.current?.click();
  const handleChooseThumbnail = () => uploadThumbInputRef.current?.click();

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

  const clearUploadForm = (resetAll: boolean = true) => {
    if (resetAll) {
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
    if (!uploadFile) { setUploadError('Pilih file video terlebih dahulu.'); return; }
    if (uploadContentType === 'series' && !uploadSeriesTitle.trim()) {
      setUploadError('Judul seri wajib diisi untuk episode.'); return;
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
      if (uploadThumbnailFile) await api.uploadThumbnail(result.filename, uploadThumbnailFile);
      setUploadSuccess(uploadThumbnailFile
        ? 'Video dan thumbnail berhasil diunggah.'
        : (result.message || 'Video berhasil diunggah.'));
      if (uploadContentType === 'series') {
        setUploadEpisode(prev => prev + 1);
        clearUploadForm(false);
      } else {
        clearUploadForm(true);
      }
      await fetchVideos();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unggahan gagal');
    } finally {
      setUploading(false);
    }
  };

  // ── Bulk Upload Handlers ──
  const updateBulkItem = (id: string, patch: Partial<BulkUploadItem>) => {
    setBulkItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addBulkFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next: BulkUploadItem[] = [];
    let ep = bulkStartEpisode;
    Array.from(list).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) return;
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[._-]+/g, ' ')
        .trim();
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

  const handleChooseBulk = () => bulkInputRef.current?.click();

  const runBulkUpload = async () => {
    if (bulkRunning) return;
    if (bulkContentType === 'series' && !bulkSeriesTitle.trim()) {
      alert('Pilih atau ketikkan judul seri untuk unggahan massal.'); return;
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
        updateBulkItem(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unggahan gagal',
        });
      }
    }
    setBulkRunning(false);
    await fetchVideos();
  };

  const clearBulk = () => { if (!bulkRunning) setBulkItems([]); };

  return {
    // Single Upload
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
    clearUploadForm,
    handleUpload,

    // Bulk Upload
    bulkContentType, setBulkContentType,
    bulkSeriesTitle, setBulkSeriesTitle,
    bulkSeason, setBulkSeason,
    bulkStartEpisode, setBulkStartEpisode,
    bulkItems, setBulkItems,
    bulkRunning,
    dragActive, setDragActive,
    bulkInputRef,
    handleChooseBulk,
    handleBulkFileChange,
    handleBulkDrop,
    updateBulkItem,
    runBulkUpload,
    clearBulk,
  };
}
