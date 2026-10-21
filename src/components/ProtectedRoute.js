import React from 'react';
<<<<<<< HEAD
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // 1. Wait until AuthContext finishes checking token in localStorage
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // 2. If no user and no token found, send to login
  const token = localStorage.getItem('token');
  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }

  // 3. Normalize roles (case-insensitive & trim spaces)
  if (allowedRoles && allowedRoles.length > 0 && user?.role) {
    const userRole = String(user.role).toLowerCase().trim();
    const hasPermission = allowedRoles.some(
      (role) => String(role).toLowerCase().trim() === userRole
    );

    if (!hasPermission) {
      console.warn(`Access denied. User role '${user.role}' not in:`, allowedRoles);
      
      // Redirect to their default dashboard instead of kicking them out
      if (userRole === 'super_admin' || userRole === 'admin') {
        return <Navigate to="/admin/users" replace />;
      }
      if (userRole === 'site_manager') {
        return <Navigate to="/site-dashboard" replace />;
      }
      return <Navigate to="/she-dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
=======
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
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
