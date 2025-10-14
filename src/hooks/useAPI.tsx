/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import apiClient, { APIClient } from '../services/apiClient';

const APIContext = createContext<APIClient | null>(null);

export const APIProvider = ({ children }: { children: React.ReactNode }) => (
  <APIContext.Provider value={apiClient}>
    {children}
  </APIContext.Provider>
);

export const useAPI = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};
