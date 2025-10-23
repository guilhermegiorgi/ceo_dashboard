'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AdminModeContextValue {
  expiresAt: string | null;
  setAdminModeExpiry: (expiresAt: string | null) => void;
  clearAdminMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextValue | null>(null);

export const AdminModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const setAdminModeExpiry = useCallback((newExpiresAt: string | null) => {
    setExpiresAt(newExpiresAt);
  }, []);

  const clearAdminMode = useCallback(() => {
    setExpiresAt(null);
  }, []);

  return (
    <AdminModeContext.Provider value={{ expiresAt, setAdminModeExpiry, clearAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (!context) {
    throw new Error('useAdminMode must be used within AdminModeProvider');
  }
  return context;
};
