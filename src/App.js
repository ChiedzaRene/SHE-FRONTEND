import React, { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { FeedbackProvider } from "./components/Feedback";
import ActivityBar from "./components/ActivityBar";

import Login from "./pages/Login";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SheDashboard = lazy(() => import("./pages/SheDashboard"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const SiteDashboard = lazy(() => import("./pages/SiteDashboard"));
const Sites = lazy(() => import("./pages/Sites"));
const CorrectiveActions = lazy(() => import("./pages/CorrectiveActions"));
const Incidents = lazy(() => import("./pages/Incidents"));
const AuditList = lazy(() => import("./pages/AuditList"));
const Inspections = lazy(() => import("./pages/Inspections"));
const InspectionReport = lazy(() => import("./pages/InspectionReport"));
const LegalCompliance = lazy(() => import("./pages/LegalCompliance"));
const Trainings = lazy(() => import("./pages/Training"));
const UserManagement = lazy(() => import("./pages/Users"));
const SiteHours = lazy(() => import("./pages/SiteHours"));
const SheFiles = lazy(() => import("./pages/SheFiles"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
      <ActivityBar />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "super_admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/users" element={<UserManagement />} />
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
              {/* the earlier audit records; new inspections live under /inspections */}
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

            {/* Monthly hours worked and headcount (TRIR/LTIFR denominator): entered by site managers, read by SHE */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "super_admin", "she_team", "site_manager"]} />
              }
            >
              <Route path="/site-hours" element={<SiteHours />} />
              <Route path="/she-files" element={<SheFiles />} />
            </Route>

            {/* Inspection reports: written by the SHE team, acknowledged by the regional office, actioned by sites */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin", "super_admin", "she_team", "site_manager", "regional_manager"]} />
              }
            >
              <Route path="/inspections" element={<Inspections />} />
              <Route path="/inspections/:id" element={<InspectionReport />} />
            </Route>

            {/* Site Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={["site_manager"]} />}>
              <Route path="/site-dashboard" element={<SiteDashboard />} />
            </Route>

            {/* General Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
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
    </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;
