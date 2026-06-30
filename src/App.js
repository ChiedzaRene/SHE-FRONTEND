import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import SheDashboard from "./pages/SheDashboard";
import ScorecardOverview from "./pages/Scorecardoverview";
import SiteDashboard from "./pages/SiteDashboard";
import Sites from "./pages/Sites";
import CorrectiveActions from "./pages/CorrectiveActions";
import Incidents from "./pages/Incidents";
import AuditList from "./pages/AuditList";
import LegalCompliance from "./pages/LegalCompliance";
import Trainings from "./pages/Training";
import UserManagement from "./pages/Users";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
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
                  allowedRoles={["admin", "she_team", "site_manager"]}
                />
              }
            >
              <Route path="/she-dashboard" element={<SheDashboard />} />
              <Route path="/scorecard" element={<ScorecardOverview />} />
              <Route path="/audits" element={<AuditList />} />
              <Route path="/legal" element={<LegalCompliance />} />
            </Route>

            {/* Admin & SHE Team Routes */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "she_team", "site_manager"]}
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
