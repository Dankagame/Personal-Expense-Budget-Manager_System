import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ButtonLoading } from '../Loading'
import type { AdminUpdateInput, AdminUser } from './adminApi'

function useDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return dialogRef
}

type DialogProps = {
  account: AdminUser
  error: string | null
  saving: boolean
  onClose: () => void
}

export function AdminEditDialog({ account, error, saving, onClose, onSubmit }: DialogProps & { onSubmit: (details: AdminUpdateInput) => void }) {
  const dialogRef = useDialog()
  const nameRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const fullName = String(fields.get('full_name') ?? '').trim()
    const email = String(fields.get('email') ?? '').trim()
    const phone = String(fields.get('phone_number') ?? '').trim()
    if (!fullName || !email) {
      setFormError('Enter the admin’s name and email.')
      return
    }
    setFormError(null)
    onSubmit({ full_name: fullName, email, phone_number: phone || null })
  }

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog admin-create-dialog"
      aria-labelledby="admin-edit-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}
    >
      <div className="expense-dialog-content">
        <div className="expense-dialog-heading">
          <div><h2 id="admin-edit-title">Edit admin</h2><p>Update this administrator’s account details.</p></div>
          <button className="expense-dialog-close" type="button" aria-label="Close admin form" onClick={onClose} disabled={saving}>×</button>
        </div>
        {(formError || error) && <p className="form-error" role="alert">{formError || error}</p>}
        <form className="dashboard-form admin-create-form" onSubmit={submit}>
          <label>Full name<input ref={nameRef} name="full_name" defaultValue={account.full_name} required maxLength={255} /></label>
          <label>Email address<input name="email" type="email" defaultValue={account.email} required /></label>
          <label className="full-field">Phone number <span>(optional)</span><input name="phone_number" type="tel" defaultValue={account.phone_number ?? ''} maxLength={20} /></label>
          <div className="form-actions expense-dialog-actions">
            <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="dashboard-primary" type="submit" disabled={saving} aria-busy={saving}>{saving ? <ButtonLoading label="Saving…" /> : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export function AdminDeleteDialog({ account, error, saving, onClose, onConfirm }: DialogProps & { onConfirm: () => void }) {
  const dialogRef = useDialog()
  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog admin-category-dialog"
      aria-labelledby="admin-delete-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}
    >
      <div className="expense-dialog-content">
        <div className="expense-dialog-heading">
          <div><h2 id="admin-delete-title">Delete admin?</h2><p>This action cannot be undone.</p></div>
          <button className="expense-dialog-close" type="button" aria-label="Close delete confirmation" onClick={onClose} disabled={saving}>×</button>
        </div>
        <p className="admin-delete-description">Delete <strong>{account.full_name}</strong> ({account.email})? Accounts with expenses or budgets cannot be deleted.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="expense-dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dashboard-primary admin-danger-button" type="button" onClick={onConfirm} disabled={saving} aria-busy={saving}>{saving ? <ButtonLoading label="Deleting…" /> : 'Delete admin'}</button>
        </div>
      </div>
    </dialog>
  )
}
