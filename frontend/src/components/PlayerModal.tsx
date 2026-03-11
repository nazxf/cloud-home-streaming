import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  PictureInPicture,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  SkipForward,
  Check
} from 'lucide-react';
import { Video, getStreamUrl, getManualThumbnailUrl } from '../api';

interface PlayerModalProps {
  video: Video;
  onClose: () => void;
}

const TooltipButton: React.FC<{
  children: React.ReactNode;
  text: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}> = ({ children, text, onClick, className = "" }) => (
  <div className="relative group/btn flex items-center justify-center">
    <button
      type="button"
      onClick={onClick}
      className={`text-white/90 hover:text-white transition-all duration-200 p-2 rounded-full hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs py-1.5 px-3 rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none scale-95 group-hover/btn:scale-100 z-50">
      {text}
    </div>
  </div>
);

const PlayerModal: React.FC<PlayerModalProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [timeLeft, setTimeLeft] = useState('0:00');
  const [showTimeLeft, setShowTimeLeft] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [showCenterPlay, setShowCenterPlay] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [currentChapter, setCurrentChapter] = useState('Intro');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [seekAnim, setSeekAnim] = useState({ visible: false, side: '', seconds: 0 });
  const [hoverTime, setHoverTime] = useState('0:00');
  const [hoverPosition, setHoverPosition] = useState(0);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressContainerRef = useRef<HTMLDivElement | null>(null);
  const accumulatedSeconds = useRef(0);

  const streamUrl = getStreamUrl(video);
  const posterUrl = getManualThumbnailUrl(video);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play()
      .then(() => { setIsPlaying(true); setShowCenterPlay(false); })
      .catch(() => {});
  }, [streamUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'arrowright': case 'l': e.preventDefault(); skipTime(15); showSeekAnimation('right', 15); break;
        case 'arrowleft': case 'j': e.preventDefault(); skipTime(-15); showSeekAnimation('left', 15); break;
        case 'escape': if (!document.fullscreenElement) onClose(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, isMuted, isEnded, onClose]);

  const handleMouseMove = () => {
    setShowControls(true);
    document.body.style.cursor = 'default';
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isHoveringProgress && !contextMenu.visible && !showSettings) {
          setShowControls(false);
          if (isFullscreen) document.body.style.cursor = 'none';
        }
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying && !contextMenu.visible && !showSettings) setShowControls(false);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isEnded) {
      el.currentTime = 0; el.play();
      setIsPlaying(true); setIsEnded(false); setShowCenterPlay(false);
    } else if (el.paused) {
      el.play(); setIsPlaying(true); setShowCenterPlay(false);
    } else {
      el.pause(); setIsPlaying(false); setShowControls(true); setShowCenterPlay(true);
    }
  };

  const skipTime = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    const dur = Number.isFinite(el.duration) ? el.duration : undefined;
    const next = Math.max(0, el.currentTime + seconds);
    el.currentTime = dur ? Math.min(dur, next) : next;
    setShowControls(true);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    closeContextMenu(); setShowSettings(false);
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current); clickTimeoutRef.current = null;
      handleDoubleClick(e);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay(); clickTimeoutRef.current = null; accumulatedSeconds.current = 0;
      }, 250);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (clickX < width * 0.35) {
      accumulatedSeconds.current -= 15; skipTime(-15);
      showSeekAnimation('left', Math.abs(accumulatedSeconds.current));
    } else if (clickX > width * 0.65) {
      accumulatedSeconds.current += 15; skipTime(15);
      showSeekAnimation('right', Math.abs(accumulatedSeconds.current));
    } else {
      toggleFullscreen(); accumulatedSeconds.current = 0;
    }
  };

  const showSeekAnimation = (side: 'left' | 'right', seconds: number) => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    setSeekAnim({ visible: true, side, seconds });
    animTimeoutRef.current = setTimeout(() => {
      setSeekAnim({ visible: false, side: '', seconds: 0 }); accumulatedSeconds.current = 0;
    }, 800);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 220; const menuHeight = 160;
    const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
    const x = clickX + menuWidth > rect.width ? rect.width - menuWidth - 10 : clickX;
    const y = clickY + menuHeight > rect.height ? rect.height - menuHeight - 10 : clickY;
    setContextMenu({ visible: true, x, y }); setShowControls(true);
  };

  const closeContextMenu = () => {
    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const current = el.currentTime;
    const total = el.duration;
    setProgress((current / total) * 100);
    setCurrentTime(formatTime(current));
    setTimeLeft(formatTime(total - current));
    if (current < 60) setCurrentChapter('Intro');
    else if (current < 200) setCurrentChapter('Misi Dimulai');
    else if (current < 400) setCurrentChapter('Klimaks');
    else setCurrentChapter('Penutup');
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDuration(formatTime(el.duration));
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const value = Number(e.target.value);
    const newTime = (value / 100) * el.duration;
    el.currentTime = newTime; setProgress(value);
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressContainerRef.current || !videoRef.current) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    setHoverPosition(pos * 100);
    setHoverTime(formatTime(pos * videoRef.current.duration));
    setShowHoverTooltip(true);
  };

  const handleProgressMouseLeave = () => {
    setShowHoverTooltip(false); setIsHoveringProgress(false);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !isMuted; setIsMuted(!isMuted);
    if (volume === 0 && isMuted) { setVolume(0.5); el.volume = 0.5; }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume); el.volume = newVolume; setIsMuted(newVolume === 0);
  };

  const handleVolumeScroll = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = videoRef.current;
    if (!el) return;
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol); el.volume = newVol; setIsMuted(newVol === 0);
  };

  const toggleTimeDisplay = () => setShowTimeLeft(!showTimeLeft);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (!containerRef.current) return;
        await containerRef.current.requestFullscreen();
        const orientation = window.screen?.orientation as { lock?: (mode: string) => Promise<void> } | undefined;
        orientation?.lock?.('landscape').catch(() => {});
      } catch (err) { console.error(err); }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        const orientation = window.screen?.orientation as { unlock?: () => void } | undefined;
        orientation?.unlock?.();
      }
    }
  };

  const togglePiP = async () => {
    try {
      if (videoRef.current !== document.pictureInPictureElement && videoRef.current) await videoRef.current.requestPictureInPicture();
      else await document.exitPictureInPicture();
    } catch (error) { console.error("PiP failed", error); }
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed); setShowSettings(false);
  };

  const analyzeScene = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.pause(); setIsPlaying(false); setShowCenterPlay(true); setIsAnalyzing(true); setAiResult(null);
    const apiKey = "";
    if (!apiKey) { setAiResult("AI belum dikonfigurasi."); setIsAnalyzing(false); return; }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280; canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/png').split(',')[1];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = { contents: [{ role: "user", parts: [{ text: "Tolong jelaskan secara detail adegan gambar film pendek ini." }, { inlineData: { mimeType: "image/png", data: base64Image } }] }] };
      let attempt = 0; const maxRetries = 5; const delays = [1000, 2000, 4000, 8000, 16000]; let data: any = null;
      while (attempt < maxRetries) {
        try {
          const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!response.ok) throw new Error('API Error');
          data = await response.json(); break;
        } catch (error) {
          if (attempt === maxRetries - 1) throw error;
          await new Promise(r => setTimeout(r, delays[attempt])); attempt++;
        }
      }
      setAiResult(data?.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal dianalisis.");
    } catch (error) { setAiResult("Gagal terhubung ke AI."); } finally { setIsAnalyzing(false); }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) document.body.style.cursor = 'default';
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Inline styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ripple-wave { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes arrow-light { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .animate-youtube-ripple { animation: ripple-wave 0.6s ease-out forwards; }
        .arrow-seq-1 { animation: arrow-light 0.6s infinite 0s; }
        .arrow-seq-2 { animation: arrow-light 0.6s infinite 0.15s; }
        .arrow-seq-3 { animation: arrow-light 0.6s infinite 0.3s; }
        @keyframes menu-pop { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-menu-pop { animation: menu-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes eq-play { 0% { height: 3px; } 50% { height: 10px; } 100% { height: 3px; } }
        .eq-1 { animation: eq-play 0.8s infinite ease-in-out; }
        .eq-2 { animation: eq-play 0.5s infinite ease-in-out; }
        .eq-3 { animation: eq-play 1.1s infinite ease-in-out; }
        .player-container video::-webkit-media-controls { display: none !important; }
        .player-container video::-webkit-media-controls-enclosure { display: none !important; }
        .player-container video::-webkit-media-controls-panel { display: none !important; }
        .player-container video::-webkit-media-controls-start-playback-button { display: none !important; }
        .player-container video::-webkit-media-controls-overlay-play-button { display: none !important; }
        .player-container video::-webkit-media-controls-play-button { display: none !important; }
        .ai-scroll::-webkit-scrollbar { width: 4px; }
        .ai-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 4px; }
        .player-container input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
        .player-container input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: white; cursor: pointer; border: none; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
      `}} />

      {/* Main Video Container */}
      <div
        ref={containerRef}
        className="player-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: isFullscreen ? 'none' : '100%',
          maxHeight: isFullscreen ? 'none' : '100%',
          backgroundColor: '#000',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isFullscreen ? 0 : '12px',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        {/* Video Element */}
        <div style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          userSelect: 'none',
        }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: 'pointer',
              display: 'block',
            }}
            onClick={handleVideoClick}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsEnded(false)}
            onEnded={() => { setIsPlaying(false); setShowCenterPlay(true); setIsEnded(true); }}
            loop={isLooping}
            playsInline
            controls={false}
            controlsList="nodownload noplaybackrate"
            src={streamUrl}
            poster={posterUrl}
          />

          {/* ─── TOP OVERLAY: StreamFlix Branding ─── */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: '16px',
            paddingBottom: '64px',
            paddingLeft: '24px',
            paddingRight: '24px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)',
            transition: 'opacity 0.3s',
            opacity: showControls ? 1 : 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            zIndex: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto', cursor: 'pointer' }}>
                <div style={{
                  backgroundColor: '#ff0000',
                  padding: '6px',
                  borderRadius: '6px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(255,0,0,0.4)',
                }}>
                  <Play size={14} fill="currentColor" />
                </div>
                <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.05em', color: 'white' }}>
                  STREAM<span style={{ color: '#ff0000' }}>FLIX</span>
                </span>
              </div>
              {/* Title */}
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px', pointerEvents: 'auto' }}>
                <h1 style={{
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: '15px',
                  margin: 0,
                  maxWidth: '400px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {video.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              zIndex: 40,
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.6)',
              color: 'rgba(255,255,255,0.8)',
              border: 'none',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: showControls ? 1 : 0,
            }}
            aria-label="Close player"
          >
            <X size={18} />
          </button>

          {/* Center Play Button */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            transition: 'opacity 0.3s',
            opacity: showCenterPlay && !seekAnim.visible ? 1 : 0,
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '50%',
              padding: '24px',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}>
              <Play fill="white" size={48} style={{ marginLeft: '8px' }} />
            </div>
          </div>

          {/* Skip Animation */}
          {seekAnim.visible && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              overflow: 'hidden',
              ...(seekAnim.side === 'left' ? { left: 0 } : { right: 0 }),
            }}>
              <div className="animate-youtube-ripple" style={{
                position: 'absolute',
                width: '100%',
                height: '150%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                filter: 'blur(2px)',
                ...(seekAnim.side === 'left' ? { right: '50%' } : { left: '50%' }),
              }} />
              <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}>
                <div style={{ display: 'flex', marginLeft: '-16px' }}>
                  {seekAnim.side === 'left' ? (
                    <><ChevronLeft className="arrow-seq-3" size={40} strokeWidth={2.5}/><ChevronLeft className="arrow-seq-2" size={40} strokeWidth={2.5}/><ChevronLeft className="arrow-seq-1" size={40} strokeWidth={2.5}/></>
                  ) : (
                    <><ChevronRight className="arrow-seq-1" size={40} strokeWidth={2.5}/><ChevronRight className="arrow-seq-2" size={40} strokeWidth={2.5}/><ChevronRight className="arrow-seq-3" size={40} strokeWidth={2.5}/></>
                  )}
                </div>
                <span style={{
                  fontWeight: 500,
                  marginTop: '4px',
                  fontSize: '14px',
                  letterSpacing: '0.025em',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backdropFilter: 'blur(4px)',
                }}>
                  {seekAnim.seconds} detik
                </span>
              </div>
            </div>
          )}

          {/* AI Panel */}
          {(isAnalyzing || aiResult) && (
            <div className="animate-menu-pop" style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 30,
              width: '320px',
              maxWidth: '85%',
              background: 'rgba(18,18,18,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              color: 'white',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, letterSpacing: '0.025em' }}>
                  <Sparkles size={18} /><span style={{ fontSize: '14px' }}>Analisis Adegan AI</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setIsAnalyzing(false); setAiResult(null); }} type="button" style={{
                  color: 'rgba(255,255,255,0.5)',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}>
                  <X size={18} />
                </button>
              </div>
              {isAnalyzing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: '16px' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Menganalisis layar...</p>
                </div>
              ) : (
                <div className="ai-scroll" style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.9)',
                  overflowY: 'auto',
                  maxHeight: '30vh',
                  paddingRight: '8px',
                  whiteSpace: 'pre-line',
                }}>{aiResult}</div>
              )}
            </div>
          )}

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
                <button key={speed} onClick={(e) => { e.stopPropagation(); changeSpeed(speed); }} type="button" style={{
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
        </div>

        {/* ─── BOTTOM GRADIENT ─── */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)',
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
          opacity: showControls ? 1 : 0,
        }} />

        {/* ─── BOTTOM CONTROLS BAR ─── */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '48px 24px 8px 24px',
          transition: 'all 0.3s',
          transform: showControls ? 'translateY(0)' : 'translateY(16px)',
          opacity: showControls ? 1 : 0,
          zIndex: 30,
        }}>

          {/* Progress Bar */}
          <div
            ref={progressContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '20px',
              cursor: 'pointer',
              borderRadius: '9999px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={handleProgressMouseLeave}
            onMouseMove={handleProgressMouseMove}
          >
            {/* Hover Time Tooltip */}
            {showHoverTooltip && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
                background: 'white',
                color: 'black',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '4px',
                pointerEvents: 'none',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                zIndex: 10,
              }}>
                {hoverTime}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid white',
                }} />
              </div>
            )}

            {/* Track Background */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: isHoveringProgress ? '6px' : '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              transition: 'height 0.2s',
            }} />
            {/* Buffer */}
            <div style={{
              position: 'absolute',
              height: isHoveringProgress ? '6px' : '4px',
              width: `${Math.min(progress + 5, 100)}%`,
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: '9999px',
              transition: 'height 0.2s',
            }} />
            {/* Progress (Red) */}
            <div style={{
              position: 'absolute',
              height: isHoveringProgress ? '6px' : '4px',
              width: `${progress}%`,
              backgroundColor: '#ff0000',
              borderRadius: '9999px',
              pointerEvents: 'none',
              transition: 'height 0.2s',
              boxShadow: isHoveringProgress ? '0 0 8px rgba(255,0,0,0.8)' : 'none',
            }}>
              {/* Thumb */}
              <div style={{
                position: 'absolute',
                right: '-7px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: isHoveringProgress ? '14px' : '0',
                height: isHoveringProgress ? '14px' : '0',
                backgroundColor: '#ff0000',
                borderRadius: '50%',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            </div>
            {/* Hidden Range Input */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleProgressChange}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 10,
                margin: 0,
              }}
            />
          </div>

          {/* Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Play/Pause */}
              <TooltipButton onClick={togglePlay} text={isEnded ? "Putar Ulang" : (isPlaying ? "Jeda (k)" : "Putar (k)")} className="hover:scale-110 hover:text-[#ff0000] transition-all">
                {isEnded ? <RefreshCw size={24} /> : (isPlaying ? <Pause fill="currentColor" size={26} /> : <Play fill="currentColor" size={26} style={{ marginLeft: '2px' }} />)}
              </TooltipButton>

              {/* Next */}
              <TooltipButton onClick={() => {}} text="Selanjutnya (Shift+N)">
                <SkipForward fill="currentColor" size={20} style={{ opacity: 0.8 }} />
              </TooltipButton>

              {/* Skip Back 15s */}
              <TooltipButton onClick={() => skipTime(-15)} text="Mundur 15 detik" className="hidden sm:flex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', opacity: 0.8 }}>
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <text x="12" y="12" textAnchor="middle" dy="0.35em" fontSize="7.5" fontWeight="bold" strokeWidth="0" fill="currentColor" fontFamily="sans-serif">15</text>
                </svg>
              </TooltipButton>

              {/* Skip Forward 15s */}
              <TooltipButton onClick={() => skipTime(15)} text="Maju 15 detik" className="hidden sm:flex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', opacity: 0.8 }}>
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <text x="12" y="12" textAnchor="middle" dy="0.35em" fontSize="7.5" fontWeight="bold" strokeWidth="0" fill="currentColor" fontFamily="sans-serif">15</text>
                </svg>
              </TooltipButton>

              {/* Separator */}
              <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px', borderRadius: '9999px' }} />

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center' }} onWheel={handleVolumeScroll}>
                <TooltipButton onClick={toggleMute} text={isMuted || volume === 0 ? "Suarakan (m)" : "Bisukan (m)"}>
                  {isMuted || volume === 0 ? <VolumeX size={24} style={{ opacity: 0.8 }} /> : <Volume2 size={24} style={{ opacity: 0.8 }} />}
                </TooltipButton>
              </div>

              {/* Separator */}
              <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px', borderRadius: '9999px' }} />

              {/* Time Display + Equalizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <div onClick={toggleTimeDisplay} style={{
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
              <TooltipButton onClick={analyzeScene} text="Tanya AI Adegan Ini ✨" className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                <Sparkles size={22} />
              </TooltipButton>
              <TooltipButton onClick={togglePiP} text="Gambar dalam Gambar" className="hidden sm:flex">
                <PictureInPicture size={22} />
              </TooltipButton>
              <TooltipButton text="Subtitle/CC">
                <Subtitles size={22} />
              </TooltipButton>
              <TooltipButton
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                text="Pengaturan"
                className={showSettings ? "text-white bg-white/20" : ""}
              >
                <Settings size={22} style={{ transition: 'transform 0.3s', transform: showSettings ? 'rotate(90deg)' : 'none' }} />
              </TooltipButton>
              <TooltipButton onClick={toggleFullscreen} text={isFullscreen ? "Keluar Layar Penuh (f)" : "Layar Penuh (f)"} className="ml-2">
                {isFullscreen ? <Minimize size={26} /> : <Maximize size={26} />}
              </TooltipButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
