// API types and utilities

export interface Video {
  id: string;
  title: string;
  filename: string;
  size: number;
  sizeHuman: string;
  duration: string;
  extension: string;
  thumbnail: string;
  createdAt: string;
  streamUrl: string;
  seriesTitle?: string;
  season?: number;
  episode?: number;
  groupType?: 'series' | 'other' | string;
}

export interface VideoProgress {
  filename: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt?: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  message: string;
}

export const API_BASE = import.meta.env.VITE_API_URL || '';

export const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('sf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const unauthorizedGuard = (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    window.location.reload();
    throw new Error('Unauthorized');
  }
};

export const getStreamUrl = (video: Video): string => {
  const token = localStorage.getItem('sf_token');
  const baseUrl = `${API_BASE}/api/stream/${encodeURIComponent(video.filename)}`;
  return `${baseUrl}?token=${token}`;
};

export const getManualThumbnailUrl = (video: Video): string => {
  const token = localStorage.getItem('sf_token');
  const version = localStorage.getItem('sf_thumb_v') || '1';
  const baseUrl = `${API_BASE}/api/thumbnail/${encodeURIComponent(video.filename)}`;
  return `${baseUrl}?token=${token}&mode=manual&v=${version}`;
};

export const getAutoThumbnailUrl = (video: Video): string => {
  const token = localStorage.getItem('sf_token');
  const version = localStorage.getItem('sf_thumb_v') || '1';
  const baseUrl = `${API_BASE}/api/thumbnail/${encodeURIComponent(video.filename)}`;
  return `${baseUrl}?token=${token}&mode=auto&v=${version}`;
};

export const getThumbnailUrl = getManualThumbnailUrl;

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  getProgress: async (filename: string): Promise<VideoProgress> => {
    const res = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(filename)}`, { headers: getHeaders() });
    unauthorizedGuard(res);
    if (!res.ok) throw new Error('Failed to load progress');
    return res.json();
  },

  saveProgress: async (filename: string, position: number, duration: number, completed = false): Promise<void> => {
    const payload = { position: Math.floor(position), duration: Math.floor(duration), completed };
    const res = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    unauthorizedGuard(res);
    if (!res.ok) throw new Error('Failed to save progress');
  },

  getVideos: async (): Promise<Video[]> => {
    const res = await fetch(`${API_BASE}/api/videos`, { headers: getHeaders() });
    unauthorizedGuard(res);
    if (!res.ok) throw new Error('Failed to load videos');
    return res.json();
  },

  uploadVideo: async (file: File, title?: string): Promise<{ message: string; filename: string }> => {
    const token = localStorage.getItem('sf_token');
    const formData = new FormData();
    formData.append('video', file);
    if (title?.trim()) {
      formData.append('title', title.trim());
    }

    const res = await fetch(`${API_BASE}/api/videos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    unauthorizedGuard(res);
    const payload = await res.json().catch(() => ({ error: 'Upload failed' }));
    if (!res.ok) {
      throw new Error(payload.error || 'Upload failed');
    }

    return payload;
  },

  uploadVideoWithProgress: (file: File, title: string, onProgress: (percent: number) => void): Promise<{ message: string; filename: string }> => {
    const token = localStorage.getItem('sf_token');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('video', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }

      xhr.open('POST', `${API_BASE}/api/videos/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      };

      xhr.onload = () => {
        if (xhr.status === 401) {
          localStorage.removeItem('sf_token');
          localStorage.removeItem('sf_user');
          window.location.reload();
          reject(new Error('Unauthorized'));
          return;
        }

        let payload: { message?: string; filename?: string; error?: string } = {};
        try {
          payload = JSON.parse(xhr.responseText || '{}');
        } catch {
          payload = {};
        }

        if (xhr.status >= 200 && xhr.status < 300 && payload.filename) {
          onProgress(100);
          resolve({
            message: payload.message || 'Video uploaded successfully',
            filename: payload.filename,
          });
          return;
        }

        reject(new Error(payload.error || 'Upload failed'));
      };

      xhr.onerror = () => reject(new Error('Network error while uploading'));
      xhr.send(formData);
    });
  },

  editVideo: async (filename: string, title: string): Promise<{ message: string; filename: string }> => {
    const res = await fetch(`${API_BASE}/api/videos/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });

    unauthorizedGuard(res);
    const payload = await res.json().catch(() => ({ error: 'Edit failed' }));
    if (!res.ok) throw new Error(payload.error || 'Edit failed');
    return payload;
  },

  deleteVideo: async (filename: string): Promise<{ message: string }> => {
    const token = localStorage.getItem('sf_token');
    const res = await fetch(`${API_BASE}/api/videos/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    unauthorizedGuard(res);
    const payload = await res.json().catch(() => ({ error: 'Delete failed' }));
    if (!res.ok) throw new Error(payload.error || 'Delete failed');
    return payload;
  },

  uploadThumbnail: async (filename: string, file: File): Promise<{ message: string }> => {
    const token = localStorage.getItem('sf_token');
    const formData = new FormData();
    formData.append('thumbnail', file);

    const res = await fetch(`${API_BASE}/api/videos/${encodeURIComponent(filename)}/thumbnail`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    unauthorizedGuard(res);
    const payload = await res.json().catch(() => ({ error: 'Thumbnail upload failed' }));
    if (!res.ok) throw new Error(payload.error || 'Thumbnail upload failed');

    localStorage.setItem('sf_thumb_v', String(Date.now()));
    return payload;
  },
};
