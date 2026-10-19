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
  const { user, isLoading, isAdmin, signOut } = useAuth()

  if (isLoading) {
    return <LoadingState label="Checking your session…" fullPage />
  }

  if (!user) {
    return null
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <main className="access-page">
        <section className="access-card" role="alert">
          <h1>Administrator access required</h1>
          <p>This account cannot open the admin dashboard.</p>
          <div className="access-actions">
            <a href="/">Go to your dashboard</a>
            <button type="button" onClick={signOut}>Sign out</button>
          </div>
        </section>
      </main>
    )
  }

  return children
}
