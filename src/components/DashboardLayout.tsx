'use client';

import { ReactNode } from 'react';
import NavigationSidebar from './NavigationSidebar';
import { AdminModeProvider, useAdminMode } from '../contexts/AdminModeContext';
import { AdminModeIndicator } from './AdminModeIndicator';

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayoutContent = ({ children }: DashboardLayoutProps) => {
  const { expiresAt, clearAdminMode } = useAdminMode();

  return (
    <div className="h-screen overflow-hidden bg-neutral-950 text-zinc-100">
      <AdminModeIndicator expiresAt={expiresAt} onDismiss={clearAdminMode} />
      <div className="flex h-full">
        <NavigationSidebar />
        <main className="flex-1 h-full overflow-hidden p-6">
          <div className="h-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => (
  <AdminModeProvider>
    <DashboardLayoutContent>{children}</DashboardLayoutContent>
  </AdminModeProvider>
);

export default DashboardLayout;
