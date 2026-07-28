import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import InspectionScorecard from "./pages/Inspectionscorecard";
import AuditLog from "./pages/AuditLog";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            
            {/* Super Admin Only */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
              <Route path="/audit-logs" element={<AuditLog />} />
            </Route>

            {/* Super Admin & Admin Access */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/settings" element={<div style={{ padding: "20px" }}>Settings placeholder</div>} />
            </Route>

            {/* Super Admin, Admin & SHE Team Access */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin", "she_team"]} />}>
              <Route path="/she-dashboard" element={<SheDashboard />} />
              <Route path="/scorecard" element={<ScorecardOverview />} />
            </Route>

            {/* Site Manager only */}
            <Route element={<ProtectedRoute allowedRoles={["site_manager"]} />}>
              <Route path="/site-dashboard" element={<SiteDashboard />} />
            </Route>

            {/* Shared Operational Routes (Super Admin, Admin, SHE Team & Site Managers) */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin", "she_team", "site_manager"]} />}>
              <Route path="/audits" element={<AuditList />} />
              <Route path="/legal" element={<LegalCompliance />} />
              <Route path="/sites" element={<Sites />} />
              <Route path="/trainings" element={<Trainings />} />
              <Route path="/inspection" element={<InspectionScorecard />} />
              <Route path="/corrective-actions" element={<CorrectiveActions />} />
              <Route path="/incidents" element={<Incidents />} />
            </Route>

            {/* Default Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;