import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/context'
import { AuthLayout } from './AuthLayout'
import { ButtonLoading } from '../../Loading'

type SignupPageProps = {
  onSwitchToLogin: () => void
  sessionError: string | null
}

export function SignupPage({ onSwitchToLogin, sessionError }: SignupPageProps) {
  const { signUp } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    const formData = new FormData(event.currentTarget)

    try {
      await signUp({
        full_name: String(formData.get('full_name')).trim(),
        email: String(formData.get('email')).trim(),
        password: String(formData.get('password')),
      })
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to create account.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout sessionError={sessionError}>
      <div className="auth-heading">
        <h1 id="auth-title">Create an Account</h1>
        <p>Start managing your money with Retain.</p>
      </div>

      {formError && (
        <p className="form-message error-message" role="alert">
          {formError}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="full_name">Full name</label>
          <input
            autoComplete="name"
            id="full_name"
            maxLength={255}
            name="full_name"
            placeholder="Enter your full name"
            required
          />
        </div>

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
              autoComplete="new-password"
              id="password"
              maxLength={128}
              minLength={8}
              name="password"
              placeholder="Create a password"
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
          <p className="field-hint">Use at least 8 characters.</p>
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <ButtonLoading label="Creating account…" /> : 'Sign Up'}
        </button>
      </form>

      <p className="switch-mode">
        Already have an account?{' '}
        <button className="text-button" type="button" onClick={onSwitchToLogin}>
          Log In
        </button>
      </p>
    </AuthLayout>
  )
}
