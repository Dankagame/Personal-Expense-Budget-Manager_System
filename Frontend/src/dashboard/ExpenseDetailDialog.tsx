import { useEffect, useRef } from 'react'
import { LoadingState } from '../Loading'
import { formatAmount, formatDate, type Expense } from './types'

type ExpenseDetailDialogProps = {
  expenseId: number
  expense: Expense | null
  loading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
}

export function ExpenseDetailDialog({ expenseId, expense, loading, error, onClose, onRetry }: ExpenseDetailDialogProps) {
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

  const createdAt = expense
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expense.created_at))
    : null

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog"
      aria-labelledby="expense-detail-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="expense-dialog-content">
        <div className="expense-dialog-heading">
          <div>
            <h2 id="expense-detail-title">Expense details</h2>
            <p>Expense #{expenseId}</p>
          </div>
          <button className="expense-dialog-close" type="button" aria-label="Close expense details" onClick={onClose}>×</button>
        </div>

        {loading ? <LoadingState label="Loading expense details…" /> : error ? (
          <div className="error-panel" role="alert">
            <p>{error}</p>
            <button className="inline-button" type="button" onClick={onRetry}>Try again</button>
          </div>
        ) : expense && (
          <dl className="expense-detail-grid">
            <div className="expense-detail-main"><dt>Title</dt><dd>{expense.title}</dd></div>
            <div><dt>Amount</dt><dd>{formatAmount(expense.amount)}</dd></div>
            <div><dt>Category</dt><dd>{expense.category_name}</dd></div>
            <div><dt>Expense date</dt><dd>{formatDate(expense.expense_date)}</dd></div>
            <div><dt>Payment method</dt><dd>{expense.payment_method}</dd></div>
            <div><dt>Created</dt><dd>{createdAt}</dd></div>
            <div className="expense-detail-main"><dt>Description / notes</dt><dd className="expense-detail-notes">{expense.notes?.trim() || 'No description added.'}</dd></div>
          </dl>
        )}

        <div className="expense-dialog-actions expense-detail-actions">
          <button className="secondary-action" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  )
}
