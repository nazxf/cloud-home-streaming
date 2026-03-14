import React from 'react';
import { Video } from '../../api/api';

interface EpisodeListProps {
  showEpisodes: boolean;
  isSeries: boolean;
  video: Video;
  seasonEpisodes: Video[];
  onSelectVideo: (video: Video) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  showEpisodes,
  isSeries,
  video,
  seasonEpisodes,
  onSelectVideo,
}) => {
  if (!showEpisodes || !isSeries) return null;

  return (
    <div className="animate-menu-pop" style={{
      position: 'absolute',
      bottom: '80px',
      right: '72px',
      zIndex: 40,
      background: 'rgba(18,18,18,0.95)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      padding: '10px',
      minWidth: '260px',
      maxWidth: '320px',
      maxHeight: '45vh',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '6px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Season {video.season || 1}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{video.seriesTitle || 'Series'}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{seasonEpisodes.length} episodes</div>
      </div>
      <div style={{ display: 'grid', gap: '6px', padding: '8px' }}>
        {seasonEpisodes.map((ep, idx) => (
          <button
            key={ep.filename}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectVideo(ep); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: ep.filename === video.filename ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.08)',
              background: ep.filename === video.filename ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Episode {ep.episode || idx + 1}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</span>
            </div>
            {ep.filename === video.filename && (
              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, letterSpacing: '0.4px' }}>PLAYING</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
