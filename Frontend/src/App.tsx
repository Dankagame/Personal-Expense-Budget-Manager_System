import { useEffect, useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/context'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { DashboardApp } from './dashboard/DashboardApp'
import { LoadingState } from './Loading'
import './App.css'

type AuthPage = 'login' | 'signup'

function AppContent() {
  const { user, isLoading, sessionError, accessToken } = useAuth()
  const [authPage, setAuthPage] = useState<AuthPage>('login')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [authPage])

  if (isLoading) {
    return <LoadingState label="Checking your session…" fullPage />
  }

  if (!user) {
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
    <ProtectedRoute>
      <DashboardApp />
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
