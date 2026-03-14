import React from 'react';

interface TooltipButtonProps {
  children: React.ReactNode;
  text: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export const TooltipButton: React.FC<TooltipButtonProps> = ({ children, text, onClick, className = "" }) => (
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
