import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/auth/AuthLayout'
import { ButtonLoading } from '../Loading'

export function AdminLoginPage({ sessionError }: { sessionError: string | null }) {
  const { signInAdmin } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await signInAdmin(String(fields.get('email') ?? '').trim(), String(fields.get('password') ?? ''))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout sessionError={sessionError}>
      <div className="auth-heading">
        <h1 id="auth-title">Admin sign in</h1>
        <p>Sign in to manage Retain.</p>
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}

      <form className="auth-form" onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="email" placeholder="Enter your email address" required />
        </div>
        <div className="form-field">
          <label htmlFor="admin-password">Password</label>
          <div className="password-wrapper">
            <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" maxLength={128} required />
            <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                {showPassword && <path d="M3 21 21 3" stroke="currentColor" strokeWidth="1.7" />}
              </svg>
            </button>
          </div>
        </div>
        <button className="primary-button" type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? <ButtonLoading label="Signing in…" /> : 'Sign in as admin'}
        </button>
      </form>

    </AuthLayout>
  )
}
