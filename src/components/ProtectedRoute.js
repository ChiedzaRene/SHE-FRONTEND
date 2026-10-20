import React from 'react';
import { homeFor } from '../utils/home';
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
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <Outlet />;
}
