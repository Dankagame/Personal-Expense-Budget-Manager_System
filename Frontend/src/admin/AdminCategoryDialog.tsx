import { useEffect, useRef, type FormEvent } from 'react'
import { ButtonLoading } from '../Loading'
import type { Category } from '../dashboard/types'

type AdminCategoryDialogProps = {
  category?: Category | null
  error: string | null
  saving: boolean
  onClose: () => void
  onSubmit: (name: string) => void
}

export function AdminCategoryDialog({ category, error, saving, onClose, onSubmit }: AdminCategoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

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
    onSubmit(nameRef.current?.value.trim() ?? '')
  }

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog admin-category-dialog"
      aria-labelledby="admin-category-title"
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
            <h2 id="admin-category-title">{category ? 'Edit category' : 'Add category'}</h2>
            <p>{category ? 'The new name will appear on existing expenses too.' : 'This category will be available to everyone adding expenses.'}</p>
          </div>
          <button className="expense-dialog-close" type="button" aria-label="Close category form" onClick={onClose} disabled={saving}>×</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="dashboard-form admin-category-form" onSubmit={submit}>
          <label>Category name<input ref={nameRef} name="name" defaultValue={category?.name ?? ''} required maxLength={100} placeholder="e.g. Transport" /></label>
          <div className="form-actions expense-dialog-actions">
            <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="dashboard-primary" type="submit" disabled={saving} aria-busy={saving}>
              {saving ? <ButtonLoading label="Saving…" /> : category ? 'Save changes' : 'Add category'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export function AdminCategoryDeleteDialog({ category, error, saving, onClose, onConfirm }: {
  category: Category
  error: string | null
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
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

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog admin-category-dialog"
      aria-labelledby="admin-category-delete-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}
    >
      <div className="expense-dialog-content">
        <div className="expense-dialog-heading">
          <div><h2 id="admin-category-delete-title">Delete category?</h2><p>This action cannot be undone.</p></div>
          <button className="expense-dialog-close" type="button" aria-label="Close delete confirmation" onClick={onClose} disabled={saving}>×</button>
        </div>
        <p className="admin-delete-description">Delete <strong>{category.name}</strong>? Expenses using this category will move to Uncategorized.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="expense-dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dashboard-primary admin-danger-button" type="button" onClick={onConfirm} disabled={saving} aria-busy={saving}>{saving ? <ButtonLoading label="Deleting…" /> : 'Delete category'}</button>
        </div>
      </div>
    </dialog>
  )
}
