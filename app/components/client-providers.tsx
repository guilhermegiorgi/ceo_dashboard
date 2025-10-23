'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { APIProvider } from '@/hooks/useAPI';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

type ProvidersProps = {
  children: ReactNode;
};

export function ClientProviders({ children }: ProvidersProps) {
  return (
    <APIProvider>
      <SettingsModalProvider>
        <LanguageProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#334155',
                color: '#f1f5f9',
                border: '1px solid #475569',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </LanguageProvider>
      </SettingsModalProvider>
    </APIProvider>
  );
}
