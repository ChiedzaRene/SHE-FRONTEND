import React from 'react';
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