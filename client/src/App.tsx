import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { authApi } from "./services/authApi";
import { useAuthStore } from "./store/authStore";

import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import AssetsPage from "./features/assets/AssetsPage";
import AssetDetailPage from "./features/assets/AssetDetailPage";
import BookingsPage from "./features/bookings/BookingsPage";
import MaintenancePage from "./features/maintenance/MaintenancePage";
import OrgSetupPage from "./features/departments/OrgSetupPage";
import TransfersPage from "./features/allocations/TransfersPage";
import AuditsPage from "./features/audits/AuditsPage";
import ReportsPage from "./features/reports/ReportsPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import AIAssistantPage from "./features/ai/AIAssistantPage";

export default function App() {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    authApi
      .refresh()
      .then((data) => setSession(data.user, data.accessToken))
      .catch(() => clear())
      .finally(() => setBootstrapped(true));
  }, [setSession, clear]);

  if (!bootstrapped) {
    return <div className="flex h-screen items-center justify-center text-slate-500 font-medium">Loading AssetFlow…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/audits"
          element={
            <ProtectedRoute roles={["Admin", "AssetManager", "DepartmentHead"]}>
              <AuditsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["Admin", "AssetManager", "DepartmentHead"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org-setup"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <OrgSetupPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
