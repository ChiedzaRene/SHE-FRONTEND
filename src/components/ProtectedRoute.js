import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen fullPage message="Starting up..." />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // A temporary password (set by an admin) must be replaced before anything else is usable
  if (user.mcp && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard
    switch (user.role) {
      case 'admin':
      case 'super_admin': return <Navigate to="/admin" replace />;
      case 'she_team': return <Navigate to="/she-dashboard" replace />;
      case 'site_manager': return <Navigate to="/site-dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
