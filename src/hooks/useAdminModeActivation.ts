'use client';

import { useEffect } from 'react';
import { useAdminMode } from '../contexts/AdminModeContext';

/**
 * Hook to listen for admin mode activation events from the backend
 * When a task is completed with admin mode, the backend triggers path override
 * and we need to show the indicator in the UI
 */
export const useAdminModeActivation = () => {
  const { setAdminModeExpiry } = useAdminMode();

  useEffect(() => {
    const handleAdminModeActivated = (event: CustomEvent<{ expiresAt: string }>) => {
      if (event.detail?.expiresAt) {
        setAdminModeExpiry(event.detail.expiresAt);
      }
    };

    window.addEventListener('admin-mode-activated', handleAdminModeActivated as EventListener);

    return () => {
      window.removeEventListener('admin-mode-activated', handleAdminModeActivated as EventListener);
    };
  }, [setAdminModeExpiry]);
};
