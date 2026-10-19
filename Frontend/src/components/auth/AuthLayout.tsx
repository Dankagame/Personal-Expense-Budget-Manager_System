import type { ReactNode } from 'react'
import { useAuth } from '../../auth/context'
import './auth.css'

type AuthLayoutProps = {
  children: ReactNode
  sessionError: string | null
}

export function AuthLayout({ children, sessionError }: AuthLayoutProps) {
  const { retrySession, signOut } = useAuth()

  return (
    <main className="auth-layout">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-content">
          {sessionError && (
            <div className="form-message error-message" role="alert">
              <span>{sessionError}</span>
              <div className="session-actions">
                <button className="text-button" type="button" onClick={retrySession}>
                  Try again
                </button>
                <button className="text-button" type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </div>
          )}

          {children}
        </div>
      </section>
    </main>
  )
}
