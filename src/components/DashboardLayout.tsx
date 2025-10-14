import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationSidebar from './NavigationSidebar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="flex min-h-screen">
        <NavigationSidebar />
        <main className="flex-1 min-h-screen overflow-hidden p-6">
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
