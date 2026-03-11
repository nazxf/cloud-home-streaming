import React, { useState } from 'react';
import { Video, getAutoThumbnailUrl, getManualThumbnailUrl } from '../api';

interface VideoCardProps {
    video: Video;
    onClick: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
    const [imgError, setImgError] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const thumbnailUrl = getAutoThumbnailUrl(video);
    const previewUrl = getManualThumbnailUrl(video);

    return (
        <div
            className="video-card"
            onClick={() => onClick(video)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(video)}
            aria-label={`Play ${video.title}`}
        >
            <div className="card-thumbnail-wrapper">
                {!imgError ? (
                    <>
                        <img
                            className="card-thumbnail primary"
                            src={thumbnailUrl}
                            alt={video.title}
                            onError={() => setImgError(true)}
                            loading="lazy"
                        />
                        {!previewError && (
                            <img
                                className="card-thumbnail preview"
                                src={previewUrl}
                                alt={video.title}
                                onError={() => setPreviewError(true)}
                                loading="lazy"
                            />
                        )}
                    </>
                ) : (
                    <FallbackThumbnail title={video.title} ext={video.extension} />
                )}
                <div className="card-overlay">
                    <div className="play-button">
                        <div className="play-icon" />
                    </div>
                </div>
            </div>

            <div className="card-info">
                <div className="card-title" title={video.title}>{video.title}</div>
                <div className="card-meta">
                    <span className="card-badge">{video.extension.replace('.', '')}</span>
                    <span className="card-size">{video.sizeHuman}</span>
                </div>
            </div>
        </div>
    );
};

const FallbackThumbnail: React.FC<{ title: string; ext: string }> = ({ title, ext }) => {
    return (
        <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
        }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#e50914" strokeWidth="2" fill="none" opacity="0.7" />
                <polygon points="16,13 16,27 30,20" fill="#e50914" opacity="0.8" />
            </svg>
            <span style={{
                fontSize: 11,
                color: '#aaa',
                textAlign: 'center',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>{title}</span>
        </div>
    );
};

export default VideoCard;

