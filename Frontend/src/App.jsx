import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SubscribersPage from './pages/Subscribers/SubscribersPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route → subscribers */}
        <Route path="/" element={<Navigate to="/subscribers" replace />} />
        <Route path="/subscribers" element={<SubscribersPage />} />

        {/* Your group member will add auth routes here:
            <Route path="/login" element={<LoginPage />} />
        */}
      </Routes>
    </BrowserRouter>
  )
}
