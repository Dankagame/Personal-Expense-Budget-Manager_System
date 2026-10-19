import type { ReactNode } from 'react'
import { useAuth } from './context'
import { LoadingState } from '../Loading'

type ProtectedRouteProps = {
  children: ReactNode
  requiredRole?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth()

  if (isLoading) {
    return <LoadingState label="Checking your session…" fullPage />
  }

  if (!user) {
    return null
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <section className="auth-card" role="alert">
        <h1>Access denied</h1>
        <p>This area is only available to administrators.</p>
      </section>
    )
  }

  return children
}
