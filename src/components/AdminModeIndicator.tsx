'use client';

import React, { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';

interface AdminModeIndicatorProps {
  expiresAt?: string | null;
  onDismiss?: () => void;
}

export const AdminModeIndicator: React.FC<AdminModeIndicatorProps> = ({ 
  expiresAt, 
  onDismiss 
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setIsExpired(true);
      return;
    }

    // Reset expired state when new timestamp arrives
    setIsExpired(false);

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirado');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || isExpired) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300"
         style={{ pointerEvents: 'auto' }}>
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-200">Admin Mode</span>
            <span className="text-[10px] text-zinc-500 font-mono">{timeLeft}</span>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
};
