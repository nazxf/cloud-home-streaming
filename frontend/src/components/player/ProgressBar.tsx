import React, { useRef, useState } from 'react';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (percent: number) => void;
  formatTime: (seconds: number) => string;
  onHoverChange?: (isHover: boolean) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  duration,
  onSeek,
  formatTime,
  onHoverChange,
}) => {
  const progressContainerRef = useRef<HTMLDivElement | null>(null);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState('0:00');

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressContainerRef.current) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    setHoverPosition(pos * 100);
    setHoverTime(formatTime(pos * duration));
    setShowHoverTooltip(true);
  };

  const handleProgressMouseLeave = () => {
    setShowHoverTooltip(false);
    setIsHoveringProgress(false);
    if (onHoverChange) onHoverChange(false);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onSeek(value);
  };

  return (
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
      onMouseEnter={() => {
        setIsHoveringProgress(true);
        if (onHoverChange) onHoverChange(true);
      }}
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
  );
};
