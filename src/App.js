import React, { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SheDashboard = lazy(() => import("./pages/SheDashboard"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const SiteDashboard = lazy(() => import("./pages/SiteDashboard"));
const Sites = lazy(() => import("./pages/Sites"));
const CorrectiveActions = lazy(() => import("./pages/CorrectiveActions"));
const Incidents = lazy(() => import("./pages/Incidents"));
const AuditList = lazy(() => import("./pages/AuditList"));
const LegalCompliance = lazy(() => import("./pages/LegalCompliance"));
const Trainings = lazy(() => import("./pages/Training"));
const UserManagement = lazy(() => import("./pages/Users"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "super_admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route
                path="/settings"
                element={
                  <div style={{ padding: "20px" }}>Settings placeholder</div>
                }
              />
            </Route>

            {/* Admin, SHE Team & Site Manager (Read-only for Site Manager in page logic) */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "super_admin", "she_team", "site_manager"]}
                />
              }
            >
              <Route path="/she-dashboard" element={<SheDashboard />} />
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/audits" element={<AuditList />} />
              <Route path="/legal" element={<LegalCompliance />} />
            </Route>

            {/* Admin & SHE Team Routes */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "super_admin", "she_team", "site_manager"]}
                />
              }
            >
              <Route path="/sites" element={<Sites />} />
              <Route path="/trainings" element={<Trainings />} />
            </Route>

            {/* Site Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={["site_manager"]} />}>
              <Route path="/site-dashboard" element={<SiteDashboard />} />
            </Route>

            {/* General Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/incidents" element={<Incidents />} />
              <Route
                path="/corrective-actions"
                element={<CorrectiveActions />}
              />
            </Route>

            {/* Catch-all redirect to login or dashboard based on ProtectedRoute's internal logic */}
            <Route path="*" element={<ProtectedRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
