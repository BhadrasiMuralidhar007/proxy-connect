import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Discovery from './pages/Discovery.jsx'
import Chat from './pages/Chat.jsx'
import Auth from './pages/Auth.jsx'
import { isLoggedIn } from './api/client.js'

function ProtectedRoute({ children }) {
  const location = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text)' }}>
      <Routes>
        <Route path="/login" element={<Auth />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
                <Discovery />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
                <Chat />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:id"
          element={
            <ProtectedRoute>
              <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
                <Chat />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
