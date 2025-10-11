import React from 'react';
import { Outlet } from 'react-router-dom';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100">
      <main className="min-h-screen overflow-hidden p-6">
        <div className="h-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
