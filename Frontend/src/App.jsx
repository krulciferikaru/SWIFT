import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SubscribersPage from './pages/Subscribers/SubscribersPage'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Approvals from './pages/Approvals.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Plans from './pages/Plans.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/subscribers" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/approvals" element={
          <ProtectedRoute>
            <Layout>
              <Approvals />
            </Layout>
          </ProtectedRoute>
        } />

        <Route
          path="/subscribers"
          element={
            <ProtectedRoute>
              <Layout>
                <SubscribersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/plans" element={
          <ProtectedRoute>
            <Layout>
              <Plans />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}