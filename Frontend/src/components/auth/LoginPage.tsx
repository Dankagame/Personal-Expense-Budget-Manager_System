import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/context'
import { AuthLayout } from './AuthLayout'
import { ButtonLoading } from '../../Loading'

type LoginPageProps = {
  onSwitchToSignup: () => void
  sessionError: string | null
}

export function LoginPage({ onSwitchToSignup, sessionError }: LoginPageProps) {
  const { signIn } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    const formData = new FormData(event.currentTarget)

    try {
      await signIn(
        String(formData.get('email')).trim(),
        String(formData.get('password')),
      )
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout sessionError={sessionError}>
      <div className="auth-heading">
        <h1 id="auth-title">Welcome Back!</h1>
        <p>Let’s get you signed in securely.</p>
      </div>

      {formError && (
        <p className="form-message error-message" role="alert">
          {formError}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="Enter your email address"
            required
            type="email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              autoComplete="current-password"
              id="password"
              maxLength={128}
              name="password"
              placeholder="Your password"
              required
              type={showPassword ? 'text' : 'password'}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                {showPassword && <path d="M3 21 21 3" stroke="currentColor" strokeWidth="1.7" />}
              </svg>
            </button>
          </div>
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <ButtonLoading label="Signing in…" /> : 'Log in with Email'}
        </button>
      </form>

      <p className="switch-mode">
        Don’t have an account?{' '}
        <button className="text-button" type="button" onClick={onSwitchToSignup}>
          Sign Up
        </button>
      </p>
    </AuthLayout>
  )
}
