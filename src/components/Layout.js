import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import emblem from '../assets/glow-emblem.png';
import Sidebar from './Sidebar';
import LoadingScreen from './LoadingScreen';
import IdleGuard from './IdleGuard';

export default function Layout() {
  // On phones and tablets the sidebar is a slide-in panel opened from the top bar
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setNavOpen(false), [pathname]); // choosing a page closes the menu

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className={`app-layout${navOpen ? ' nav-open' : ''}`}>
      <header className="mobile-topbar">
        <button type="button" className="mobile-topbar-button" aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen} aria-controls="app-sidebar" onClick={() => setNavOpen((open) => !open)}>
          {navOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="mobile-topbar-logo"><img src={emblem} alt="" width={26} height={26} /></span>
        <span className="mobile-topbar-title">Glow SHE</span>
      </header>

      <IdleGuard />
      <Sidebar id="app-sidebar" />
      <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="main-content">
        {/* Pages are lazy-loaded; keep the sidebar visible while a page's chunk downloads */}
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
