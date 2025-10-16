import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationSidebar from './NavigationSidebar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="h-screen bg-neutral-950 text-zinc-100 overflow-hidden">
      <div className="flex h-full">
        <NavigationSidebar />
        <main className="flex-1 h-full overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
