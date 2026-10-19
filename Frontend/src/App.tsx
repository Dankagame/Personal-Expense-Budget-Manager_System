import { useEffect, useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/context'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { DashboardApp } from './dashboard/DashboardApp'
import { AdminDashboard } from './admin/AdminDashboard'
import { AdminLoginPage } from './admin/AdminLoginPage'
import { LoadingState } from './Loading'
import './App.css'

type AuthPage = 'login' | 'signup'

function AppContent() {
  const { user, isAdmin, isLoading, sessionError, accessToken } = useAuth()
  const [authPage, setAuthPage] = useState<AuthPage>('login')
  const adminPath = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [authPage])

  useEffect(() => {
    if (user && isAdmin && !adminPath) {
      window.history.replaceState(null, '', '/admin')
    }
  }, [adminPath, isAdmin, user])

  if (isLoading) {
    return <LoadingState label="Checking your session…" fullPage />
  }

  if (!user) {
    if (adminPath) {
      return <AdminLoginPage sessionError={sessionError && accessToken ? sessionError : null} />
    }
    const setLoginPage = () => setAuthPage('login')
    const setSignupPage = () => setAuthPage('signup')

    return authPage === 'signup' ? (
      <SignupPage
        onSwitchToLogin={setLoginPage}
        sessionError={sessionError && accessToken ? sessionError : null}
      />
    ) : (
      <LoginPage
        onSwitchToSignup={setSignupPage}
        sessionError={sessionError && accessToken ? sessionError : null}
      />
    )
  }

  return (
    <ProtectedRoute requiredRole={isAdmin || adminPath ? 'admin' : undefined}>
      {isAdmin || adminPath ? <AdminDashboard /> : <DashboardApp />}
    </ProtectedRoute>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
