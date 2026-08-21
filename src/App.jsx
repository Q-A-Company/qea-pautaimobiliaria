import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import TvAccessGate from './components/TvAccessGate'
import Login from './pages/Login'
import Admin from './pages/Admin'
import TV from './pages/TV'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/tv" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/tv"
            element={
              <TvAccessGate>
                <TV />
              </TvAccessGate>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/tv" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
