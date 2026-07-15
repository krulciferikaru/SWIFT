import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ApprovalsProvider } from "./context/ApprovalContext";
import SubscribersPage from "./pages/Subscribers/SubscribersPage";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Approvals from "./pages/Approvals.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Plans from "./pages/Plans.jsx";
import Users from "./pages/Users.jsx";
import Payments from "./pages/Payments.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ApprovalsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

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
                  <ProtectedRoute allowedRoles={["admin", "secretary"]}>
                    <Layout>
                      <SubscribersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/approvals"
                element={
                  <ProtectedRoute allowedRoles={["admin", "secretary"]}>
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
                  <ProtectedRoute allowedRoles={["admin", "secretary"]}>
                    <Layout>
                      <Payments />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Layout>
                      <Users />
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
            </Routes>
          </BrowserRouter>
        </ApprovalsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
