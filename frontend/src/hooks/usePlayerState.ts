import { useState, useRef } from 'react';

/**
 * usePlayerState
 *
 * Custom hook yang mengelola semua state terkait pemutar video.
 * Memisahkan logika state dari komponen tampilan (PlayerModal).
 */
export function usePlayerState() {
  // --- State Pemutaran Utama ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [timeLeft, setTimeLeft] = useState('0:00');
  const [showTimeLeft, setShowTimeLeft] = useState(false);

  // --- State Volume ---
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // --- State Layar & Kontrol ---
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [showCenterPlay, setShowCenterPlay] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [currentChapter, setCurrentChapter] = useState('Intro');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // --- State UI (Menu, Popup) ---
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [seekAnim, setSeekAnim] = useState({ visible: false, side: '', seconds: 0 });

  // --- State Resume Video (Lanjutkan Menonton) ---
  const [resumeSeconds, setResumeSeconds] = useState<number | null>(null);
  const [resumeApplied, setResumeApplied] = useState(false);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);

  // --- State Analisis AI ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // --- Refs (tidak memicu render) ---
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedSeconds = useRef(0);
  const lastProgressSentAtRef = useRef(0);
  const lastProgressPositionRef = useRef(0);

  // --- Fungsi Reset State (digunakan saat ganti video) ---
  const resetPlayerState = () => {
    setIsPlaying(false);
    setIsEnded(false);
    setProgress(0);
    setCurrentTime('0:00');
    setDuration('0:00');
    setTimeLeft('0:00');
    setShowCenterPlay(true);
    setCurrentChapter('Intro');
    setResumeApplied(false);
    setResumeSeconds(null);
    setResumeLoaded(false);
    setMetadataReady(false);
    setIsAnalyzing(false);
    setAiResult(null);
  };

  return {
    // State
    isPlaying, setIsPlaying,
    isEnded, setIsEnded,
    progress, setProgress,
    currentTime, setCurrentTime,
    duration, setDuration,
    timeLeft, setTimeLeft,
    showTimeLeft, setShowTimeLeft,
    volume, setVolume,
    isMuted, setIsMuted,
    isFullscreen, setIsFullscreen,
    showControls, setShowControls,
    isHoveringProgress, setIsHoveringProgress,
    showCenterPlay, setShowCenterPlay,
    isLooping, setIsLooping,
    currentChapter, setCurrentChapter,
    playbackSpeed, setPlaybackSpeed,
    showSettings, setShowSettings,
    showEpisodes, setShowEpisodes,
    contextMenu, setContextMenu,
    seekAnim, setSeekAnim,
    resumeSeconds, setResumeSeconds,
    resumeApplied, setResumeApplied,
    resumeLoaded, setResumeLoaded,
    metadataReady, setMetadataReady,
    isAnalyzing, setIsAnalyzing,
    aiResult, setAiResult,

    // Refs
    controlsTimeoutRef,
    clickTimeoutRef,
    animTimeoutRef,
    accumulatedSeconds,
    lastProgressSentAtRef,
    lastProgressPositionRef,

    // Aksi
    resetPlayerState,
  };
}
