import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ButtonLoading } from '../Loading'
import type { AdminCreateInput } from './adminApi'

type AdminCreateDialogProps = {
  error: string | null
  saving: boolean
  onClose: () => void
  onSubmit: (details: AdminCreateInput) => void
}

export function AdminCreateDialog({ error, saving, onClose, onSubmit }: AdminCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [showPasswords, setShowPasswords] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    nameRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const fullName = String(fields.get('full_name') ?? '').trim()
    const email = String(fields.get('email') ?? '').trim()
    const password = String(fields.get('password') ?? '')
    const confirmation = String(fields.get('confirm_password') ?? '')
    if (!fullName || !email) {
      setFormError('Enter the admin’s name and email.')
      return
    }
    if (password !== confirmation) {
      setFormError('Passwords do not match.')
      return
    }
    setFormError(null)
    onSubmit({ full_name: fullName, email, password })
  }

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog admin-create-dialog"
      aria-labelledby="admin-create-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div className="expense-dialog-content">
        <div className="expense-dialog-heading">
          <div>
            <h2 id="admin-create-title">Add admin</h2>
            <p>This account will have administrator access to Retain.</p>
          </div>
          <button className="expense-dialog-close" type="button" aria-label="Close admin form" onClick={onClose} disabled={saving}>×</button>
        </div>
        {(formError || error) && <p className="form-error" role="alert">{formError || error}</p>}
        <form className="dashboard-form admin-create-form" onSubmit={submit} autoComplete="off">
          <label>Full name<input ref={nameRef} name="full_name" required maxLength={255} placeholder="Admin name" /></label>
          <label>Email address<input name="email" type="email" required placeholder="admin@example.com" /></label>
          <label>Password<input name="password" type={showPasswords ? 'text' : 'password'} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
          <label>Confirm password<input name="confirm_password" type={showPasswords ? 'text' : 'password'} minLength={8} maxLength={128} autoComplete="new-password" required /></label>
          <button className="inline-button admin-show-passwords" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? 'Hide passwords' : 'Show passwords'}</button>
          <div className="form-actions expense-dialog-actions">
            <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="dashboard-primary" type="submit" disabled={saving} aria-busy={saving}>{saving ? <ButtonLoading label="Creating…" /> : 'Add admin'}</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
