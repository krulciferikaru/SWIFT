import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ApprovalsProvider } from "./context/ApprovalContext";
import SubscribersPage from "./pages/Subscribers/SubscribersPage";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import PasswordConfirmHost from "./components/PasswordConfirmHost.jsx";
import Approvals from "./pages/Approvals.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Plans from "./pages/Plans.jsx";
import Users from "./pages/Users.jsx";
import Payments from "./pages/Payments.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import Guide from "./pages/Guide.jsx";
import ArchivePage from "./pages/Archive.jsx";
import AuditTrail from "./pages/AuditTrail.jsx";
import MfaSetup from "./pages/MfaSetup.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import Terms from "./pages/Terms.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ApprovalsProvider>
          <PasswordConfirmHost />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/security/mfa"
                element={
                  <ProtectedRoute allowMfaSetup>
                    <MfaSetup />
                  </ProtectedRoute>
                }
              />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/subscribers"
                element={
                  <ProtectedRoute permission="subscribers.view">
                    <Layout>
                      <SubscribersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/approvals"
                element={
                  <ProtectedRoute permission="approvals.manage">
                    <Layout>
                      <Approvals />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/plans"
                element={
                  <ProtectedRoute allowedRoles={["admin", "secretary"]}>
                    <Layout>
                      <Plans />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payments"
                element={
                  <ProtectedRoute permission={["payments.view", "payments.record"]}>
                    <Layout>
                      <Payments />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute permission="reports.view">
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/archive"
                element={
                  <ProtectedRoute permission="archive.manage">
                    <Layout>
                      <ArchivePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute permission="users.manage">
                    <Layout>
                      <Users />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit"
                element={
                  <ProtectedRoute permission="audit.view">
                    <Layout>
                      <AuditTrail />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/guide"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Guide />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </ApprovalsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
