import React, { createContext, useCallback, useContext, useState } from 'react';
import { SettingsModalRefactored as SettingsModal } from '../components/SettingsModalRefactored';

type SettingsModalContextValue = {
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsModalContext = createContext<SettingsModalContextValue | undefined>(undefined);

export const SettingsModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

  return (
    <SettingsModalContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      <SettingsModal open={open} onClose={closeSettings} />
    </SettingsModalContext.Provider>
  );
};

export const useSettingsModal = (): SettingsModalContextValue => {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error('useSettingsModal deve ser usado dentro de SettingsModalProvider');
  }
  return context;
};
