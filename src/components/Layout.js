import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Pages are lazy-loaded; keep the sidebar visible while a page's chunk downloads */}
        <Suspense fallback={<div className="loading-screen"><div className="spinner"></div></div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
