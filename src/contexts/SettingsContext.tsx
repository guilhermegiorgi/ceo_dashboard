"use client";

import React, { createContext, useContext } from "react";
import { useSettingsPersistence } from "../components/settings/hooks/useSettingsPersistence";

const SettingsContext = createContext<ReturnType<typeof useSettingsPersistence> | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useSettingsPersistence();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
