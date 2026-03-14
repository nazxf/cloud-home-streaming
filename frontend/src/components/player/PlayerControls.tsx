import React from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings,
  Subtitles, PictureInPicture, Sparkles, RefreshCw, SkipForward, Check
} from 'lucide-react';
import { TooltipButton } from './TooltipButton';

interface PlayerControlsProps {
  isPlaying: boolean;
  isEnded: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showSettings: boolean;
  showEpisodes: boolean;
  isSeries: boolean;
  currentTime: string;
  duration: string;
  timeLeft: string;
  showTimeLeft: boolean;
  currentChapter: string;
  playbackSpeed: number;

  onTogglePlay: () => void;
  onNextEpisode: () => void;
  onSkipTime: (seconds: number) => void;
  onToggleMute: () => void;
  onVolumeScroll: (e: React.WheelEvent) => void;
  onToggleTimeDisplay: () => void;
  onAnalyzeScene: (e: React.MouseEvent<any>) => void | Promise<void>;
  onTogglePiP: () => void;
  onToggleEpisodes: (e: React.MouseEvent) => void;
  onToggleSettings: (e: React.MouseEvent) => void;
  onToggleFullscreen: () => void;
  onChangeSpeed: (speed: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying, isEnded, volume, isMuted, isFullscreen, showSettings,
  showEpisodes, isSeries, currentTime, duration, timeLeft, showTimeLeft,
  currentChapter, playbackSpeed,

  onTogglePlay, onNextEpisode, onSkipTime, onToggleMute, onVolumeScroll,
  onToggleTimeDisplay, onAnalyzeScene, onTogglePiP, onToggleEpisodes,
  onToggleSettings, onToggleFullscreen, onChangeSpeed
}) => {
  return (
    <>
      {/* Settings Popup */}
      {showSettings && (
        <div className="animate-menu-pop" style={{
          position: 'absolute',
          bottom: '80px',
          right: '16px',
          zIndex: 40,
          background: 'rgba(18,18,18,0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '8px 0',
          minWidth: '200px',
        }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kecepatan Pemutaran</span>
          </div>
          {[0.5, 1, 1.5, 2].map((speed) => (
            <button key={speed} onClick={(e) => { e.stopPropagation(); onChangeSpeed(speed); }} type="button" style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.9)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}>
              <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
              {playbackSpeed === speed && <Check size={16} style={{ color: '#ef4444' }} />}
            </button>
          ))}
        </div>
      )}

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Play/Pause */}
          <TooltipButton onClick={onTogglePlay} text={isEnded ? "Putar Ulang" : (isPlaying ? "Jeda (k)" : "Putar (k)")} className="hover:scale-110 hover:text-[#ff0000] transition-all">
            {isEnded ? <RefreshCw size={24} /> : (isPlaying ? <Pause fill="currentColor" size={26} /> : <Play fill="currentColor" size={26} style={{ marginLeft: '2px' }} />)}
          </TooltipButton>

          {/* Next */}
          {isSeries && (
            <TooltipButton onClick={onNextEpisode} text="Selanjutnya (Shift+N)">
              <SkipForward fill="currentColor" size={20} style={{ opacity: 0.8 }} />
            </TooltipButton>
          )}

          {/* Skip Back 15s */}
          <TooltipButton onClick={() => onSkipTime(-15)} text="Mundur 15 detik" className="hidden sm:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', opacity: 0.8 }}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <text x="12" y="12" textAnchor="middle" dy="0.35em" fontSize="7.5" fontWeight="bold" strokeWidth="0" fill="currentColor" fontFamily="sans-serif">15</text>
            </svg>
          </TooltipButton>

          {/* Skip Forward 15s */}
          <TooltipButton onClick={() => onSkipTime(15)} text="Maju 15 detik" className="hidden sm:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', opacity: 0.8 }}>
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <text x="12" y="12" textAnchor="middle" dy="0.35em" fontSize="7.5" fontWeight="bold" strokeWidth="0" fill="currentColor" fontFamily="sans-serif">15</text>
            </svg>
          </TooltipButton>

          {/* Separator */}
          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px', borderRadius: '9999px' }} />

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center' }} onWheel={onVolumeScroll}>
            <TooltipButton onClick={onToggleMute} text={isMuted || volume === 0 ? "Suarakan (m)" : "Bisukan (m)"}>
              {isMuted || volume === 0 ? <VolumeX size={24} style={{ opacity: 0.8 }} /> : <Volume2 size={24} style={{ opacity: 0.8 }} />}
            </TooltipButton>
          </div>

          {/* Separator */}
          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px', borderRadius: '9999px' }} />

          {/* Time Display + Equalizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
            <div onClick={onToggleTimeDisplay} style={{
              fontSize: '13px',
              letterSpacing: '0.025em',
              display: 'flex',
              alignItems: 'center',
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ fontWeight: 600, color: 'white' }}>{currentTime}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>/</span>
              <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{showTimeLeft ? `-${timeLeft}` : duration}</span>

              {/* Mini Equalizer */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '12px', marginLeft: '10px', opacity: 0.9 }}>
                <div className={isPlaying ? 'eq-1' : ''} style={{ width: '3px', backgroundColor: 'white', borderRadius: '1px 1px 0 0', height: isPlaying ? undefined : '3px', transition: 'all 0.3s' }} />
                <div className={isPlaying ? 'eq-2' : ''} style={{ width: '3px', backgroundColor: 'white', borderRadius: '1px 1px 0 0', height: isPlaying ? undefined : '4px', transition: 'all 0.3s' }} />
                <div className={isPlaying ? 'eq-3' : ''} style={{ width: '3px', backgroundColor: 'white', borderRadius: '1px 1px 0 0', height: isPlaying ? undefined : '3px', transition: 'all 0.3s' }} />
              </div>
            </div>

            {/* Chapter Info + 4K Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: '#ff0000',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentChapter}</span>
              <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>4K</span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
          <TooltipButton onClick={onAnalyzeScene} text="Tanya AI Adegan Ini ✨" className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
            <Sparkles size={22} />
          </TooltipButton>
          <TooltipButton onClick={onTogglePiP} text="Gambar dalam Gambar" className="hidden sm:flex">
            <PictureInPicture size={22} />
          </TooltipButton>
          {isSeries && (
            <TooltipButton onClick={onToggleEpisodes} text="Episodes" className={showEpisodes ? "text-white bg-white/20" : ""}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <rect x="3" y="10" width="18" height="4" rx="1" />
                <rect x="3" y="16" width="18" height="4" rx="1" />
              </svg>
            </TooltipButton>
          )}
          <TooltipButton text="Subtitle/CC">
            <Subtitles size={22} />
          </TooltipButton>
          <TooltipButton onClick={onToggleSettings} text="Pengaturan" className={showSettings ? "text-white bg-white/20" : ""}>
            <Settings size={22} style={{ transition: 'transform 0.3s', transform: showSettings ? 'rotate(90deg)' : 'none' }} />
          </TooltipButton>
          <TooltipButton onClick={onToggleFullscreen} text={isFullscreen ? "Keluar Layar Penuh (f)" : "Layar Penuh (f)"} className="ml-2">
            {isFullscreen ? <Minimize size={26} /> : <Maximize size={26} />}
          </TooltipButton>
        </div>
      </div>
    </>
  );
};
