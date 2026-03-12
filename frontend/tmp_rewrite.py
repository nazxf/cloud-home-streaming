import re
import os

filepath = r"c:\app-\streaming-app\frontend\src\components\AdminDashboard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Video, api, getManualThumbnailUrl } from '../api';",
    "import { Video, api, getManualThumbnailUrl } from '../api';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';\nimport { Popover, PopoverContent, PopoverTrigger } from './ui/popover';\nimport { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';\nimport { Check, ChevronsUpDown } from 'lucide-react';"
)

# 2. BulkUploadItem
content = content.replace(
    "    error?: string;\n}",
    "    error?: string;\n    episode?: number;\n}"
)

# 3. Upload state
content = content.replace(
    "    // Upload state\n    const [uploadTitle, setUploadTitle] = useState('');",
    "    // Upload state\n    const [uploadTitle, setUploadTitle] = useState('');\n    const [uploadContentType, setUploadContentType] = useState<'movie' | 'series'>('movie');\n    const [uploadSeriesTitle, setUploadSeriesTitle] = useState('');\n    const [uploadComboboxOpen, setUploadComboboxOpen] = useState(false);\n    const [uploadSeason, setUploadSeason] = useState<number>(1);\n    const [uploadEpisode, setUploadEpisode] = useState<number>(1);"
)

# 4. Bulk upload state
content = content.replace(
    "    // Bulk upload state\n    const bulkInputRef = useRef<HTMLInputElement | null>(null);",
    "    // Bulk upload state\n    const bulkInputRef = useRef<HTMLInputElement | null>(null);\n    const [bulkContentType, setBulkContentType] = useState<'movie' | 'series'>('movie');\n    const [bulkSeriesTitle, setBulkSeriesTitle] = useState('');\n    const [bulkComboboxOpen, setBulkComboboxOpen] = useState(false);\n    const [bulkSeason, setBulkSeason] = useState<number>(1);\n    const [bulkStartEpisode, setBulkStartEpisode] = useState<number>(1);"
)

# 5. Edit video state
content = content.replace(
    "    const [editTitle, setEditTitle] = useState('');",
    "    const [editTitle, setEditTitle] = useState('');\n    const [editContentType, setEditContentType] = useState<'movie' | 'series'>('movie');\n    const [editSeriesTitle, setEditSeriesTitle] = useState('');\n    const [editComboboxOpen, setEditComboboxOpen] = useState(false);\n    const [editSeason, setEditSeason] = useState<number>(1);\n    const [editEpisode, setEditEpisode] = useState<number>(1);"
)

# 6. Existing Series Memo
existing_series = """
    const existingSeries = useMemo(() => {
        const set = new Set<string>();
        videos.forEach(v => {
            if (v.seriesTitle) set.add(v.seriesTitle);
        });
        return Array.from(set).sort();
    }, [videos]);
"""
content = content.replace(
    "    const fetchVideos = useCallback(async () => {",
    existing_series + "\n    const fetchVideos = useCallback(async () => {"
)


# 7. clearUploadForm and handleUpload
old_upload = """
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
"""

new_upload = """
    const clearUploadForm = (resetAll = true) => {
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
"""
content = content.replace(old_upload.strip(), new_upload.strip())


# 8. addBulkFiles and runBulkUpload
old_bulk = """
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
"""

new_bulk = """
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
"""
content = content.replace(old_bulk.strip(), new_bulk.strip())


# 9. Handle Edit Video
old_edit_open = """
    const openEditModal = (video: Video) => {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditThumbnail(null);
        setEditError('');
    };
"""
new_edit_open = """
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
"""
content = content.replace(old_edit_open.strip(), new_edit_open.strip())

old_edit_save = """
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
"""
new_edit_save = """
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
"""
content = content.replace(old_edit_save.strip(), new_edit_save.strip())

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File updated successfully")
