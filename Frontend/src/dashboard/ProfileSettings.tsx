import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import { ApiError } from '../lib/api'
import { ButtonLoading } from '../Loading'

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function PasswordField({
  id,
  label,
  autoComplete,
  minLength,
  maxLength,
  fullWidth = false,
}: {
  id: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  minLength?: number
  maxLength?: number
  fullWidth?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`settings-password-field${fullWidth ? ' full-field' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="settings-password-input">
        <input
          id={id}
          name={id}
          autoComplete={autoComplete}
          type={visible ? 'text' : 'password'}
          minLength={minLength}
          maxLength={maxLength}
          required
        />
        <button
          className="settings-password-toggle"
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            {visible && <path d="M3 21 21 3" stroke="currentColor" strokeWidth="1.7" />}
          </svg>
        </button>
      </div>
    </div>
  )
}

export function ProfileSettings() {
  const { user, updateProfile, changePassword, signOut } = useAuth()
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)

  if (!user) return null

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const fullName = String(fields.get('full_name') ?? '').trim()
    const email = String(fields.get('email') ?? '').trim()
    const phone = String(fields.get('phone_number') ?? '').trim()

    setProfileNotice(null)
    if (!fullName || !email) {
      setProfileError('Enter your name and email address.')
      return
    }

    setProfileSaving(true)
    setProfileError(null)
    try {
      await updateProfile({
        full_name: fullName,
        email,
        phone_number: phone || null,
      })
      setProfileNotice('Profile updated.')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        signOut()
      } else {
        setProfileError(messageFor(error))
      }
    } finally {
      setProfileSaving(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const currentPassword = String(fields.get('current_password') ?? '')
    const newPassword = String(fields.get('new_password') ?? '')
    const confirmPassword = String(fields.get('confirm_password') ?? '')

    setPasswordNotice(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError('Use a password between 8 and 128 characters.')
      return
    }

    setPasswordSaving(true)
    setPasswordError(null)
    try {
      await changePassword(currentPassword, newPassword)
      form.reset()
      setPasswordNotice('Password changed.')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        signOut()
      } else {
        setPasswordError(messageFor(error))
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  const joined = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(user.created_at))

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="section-kicker">YOUR ACCOUNT</p>
          <h1>Settings</h1>
          <p className="page-description">Manage your profile and password.</p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="dashboard-panel" aria-labelledby="profile-title">
          <div className="panel-heading"><h2 id="profile-title">Profile</h2></div>
          <p className="settings-description">Your account details appear here and in the dashboard header.</p>
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          {profileNotice && <p className="settings-notice" role="status">{profileNotice}</p>}
          <form className="dashboard-form settings-form" onSubmit={saveProfile} key={`${user.id}:${user.full_name}:${user.email}:${user.phone_number}`}>
            <label>Full name<input name="full_name" autoComplete="name" defaultValue={user.full_name} maxLength={255} required /></label>
            <label>Email address<input name="email" autoComplete="email" defaultValue={user.email} type="email" required /></label>
            <label className="full-field">Phone number <span>(optional)</span><input name="phone_number" autoComplete="tel" defaultValue={user.phone_number ?? ''} type="tel" maxLength={20} /></label>
            <div className="form-actions"><button className="dashboard-primary" type="submit" disabled={profileSaving} aria-busy={profileSaving}>{profileSaving ? <ButtonLoading label="Saving…" /> : 'Save profile'}</button></div>
          </form>
          <p className="account-created">Member since {joined}</p>
        </section>

        <section className="dashboard-panel" aria-labelledby="password-title">
          <div className="panel-heading"><h2 id="password-title">Password</h2></div>
          <p className="settings-description">Changing your password signs out your other sessions. You stay signed in here.</p>
          {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
          {passwordNotice && <p className="settings-notice" role="status">{passwordNotice}</p>}
          <form className="dashboard-form settings-form" onSubmit={savePassword}>
            <PasswordField id="current_password" label="Current password" autoComplete="current-password" fullWidth />
            <PasswordField id="new_password" label="New password" autoComplete="new-password" minLength={8} maxLength={128} />
            <PasswordField id="confirm_password" label="Confirm new password" autoComplete="new-password" minLength={8} maxLength={128} />
            <div className="form-actions"><button className="dashboard-primary" type="submit" disabled={passwordSaving} aria-busy={passwordSaving}>{passwordSaving ? <ButtonLoading label="Changing…" /> : 'Change password'}</button></div>
          </form>
        </section>
      </div>
    </>
  )
}
