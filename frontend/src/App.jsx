import { Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding.jsx'
import Login from './pages/Login.jsx'
import Discovery from './pages/Discovery.jsx'
import { isLoggedIn } from './api/client.js'

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to={isLoggedIn() ? '/discover' : '/onboarding'} replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/discover" element={<RequireAuth><Discovery /></RequireAuth>} />
      </Routes>
    </div>
  )
}
