import { useEffect, useRef, useState, type FormEventHandler } from 'react'
import { formatAmount, localDate, monthLabel, type BudgetSummary, type Category, type Expense } from './types'
import { ButtonLoading, LoadingState } from '../Loading'

type ExpenseDialogProps = {
  categories: Category[]
  categoriesLoading: boolean
  categoriesError: string | null
  budgets: BudgetSummary[]
  budgetsLoading: boolean
  budgetsError: string | null
  editingExpense: Expense | null
  error: string | null
  saving: boolean
  onClose: () => void
  onOpenBudgets: () => void
  onRetryBudgets: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
}

export function ExpenseDialog({
  categories,
  categoriesLoading,
  categoriesError,
  budgets,
  budgetsLoading,
  budgetsError,
  editingExpense,
  error,
  saving,
  onClose,
  onOpenBudgets,
  onRetryBudgets,
  onSubmit,
}: ExpenseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState('')
  const [expenseDate, setExpenseDate] = useState(editingExpense?.expense_date ?? '')
  const [year, month] = selectedBudgetMonth.split('-').map(Number)
  const lastDay = selectedBudgetMonth ? new Date(year, month, 0).getDate() : 0
  const maxDate = selectedBudgetMonth ? `${selectedBudgetMonth}-${String(lastDay).padStart(2, '0')}` : undefined

  function chooseBudgetMonth(nextMonth: string) {
    setSelectedBudgetMonth(nextMonth)
    setExpenseDate((currentDate) => {
      if (!nextMonth) return ''
      if (currentDate.startsWith(`${nextMonth}-`)) return currentDate
      const today = localDate()
      return today.startsWith(`${nextMonth}-`) ? today : `${nextMonth}-01`
    })
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    titleRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="expense-dialog"
      aria-labelledby="expense-dialog-title"
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
            <h2 id="expense-dialog-title">{editingExpense ? 'Edit expense' : 'Add expense'}</h2>
            <p>{editingExpense ? 'Update this record.' : 'Record a new expense.'}</p>
          </div>
          <button className="expense-dialog-close" type="button" aria-label="Close expense form" onClick={onClose} disabled={saving}>×</button>
        </div>

        {categoriesError && <p className="form-error" role="alert">{categoriesError}</p>}
        {categoriesLoading && <LoadingState label="Loading categories…" />}
        {categories.length === 0 && !categoriesLoading && !categoriesError && <p className="form-error" role="alert">No categories are available. An administrator must add one before expenses can be saved.</p>}
        {!editingExpense && budgetsLoading && <LoadingState label="Loading budgets…" />}
        {!editingExpense && budgetsError && <div className="form-error" role="alert">Could not load budgets. <button className="inline-button" type="button" onClick={onRetryBudgets}>Try again</button></div>}
        {!editingExpense && !budgetsLoading && !budgetsError && budgets.length === 0 && <div className="form-error" role="alert">Create a monthly budget before adding an expense. <button className="inline-button" type="button" onClick={onOpenBudgets}>Go to Budgets</button></div>}
        {error && <p className="form-error" role="alert">{error}</p>}

        <form className="dashboard-form" onSubmit={onSubmit}>
          <label>Title<input ref={titleRef} name="title" required maxLength={200} defaultValue={editingExpense?.title ?? ''} placeholder="What was this expense for?" /></label>
          <label>Amount (FRW)<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editingExpense ? String(editingExpense.amount) : ''} placeholder="0.00" /></label>
          <label>Category<select name="category_id" required defaultValue={editingExpense?.category_id ?? ''}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          {!editingExpense && <label>Budget month<select name="budget_month" required value={selectedBudgetMonth} onChange={(event) => chooseBudgetMonth(event.target.value)} disabled={budgetsLoading || !!budgetsError || budgets.length === 0}><option value="">{budgetsLoading ? 'Loading budgets…' : 'Choose a budget'}</option>{budgets.map((budget) => { const budgetMonth = budget.budget_month.slice(0, 7); const [budgetYear, budgetMonthNumber] = budgetMonth.split('-').map(Number); return <option value={budgetMonth} key={budgetMonth}>{monthLabel(budgetYear, budgetMonthNumber)} · {formatAmount(budget.budget_amount)}</option> })}</select></label>}
          <label>Date<input name="expense_date" required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} min={editingExpense ? undefined : selectedBudgetMonth ? `${selectedBudgetMonth}-01` : undefined} max={editingExpense ? undefined : maxDate} disabled={!editingExpense && !selectedBudgetMonth} /></label>
          <label>Payment method<input name="payment_method" required maxLength={50} defaultValue={editingExpense?.payment_method ?? ''} placeholder="Cash, card, bank transfer…" /></label>
          <label className="full-field">Notes <span>(optional)</span><textarea name="notes" rows={3} defaultValue={editingExpense?.notes ?? ''} /></label>
          <div className="form-actions expense-dialog-actions">
            <button className="secondary-action" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="dashboard-primary" type="submit" disabled={saving || categories.length === 0 || (!editingExpense && (budgetsLoading || !!budgetsError || budgets.length === 0))} aria-busy={saving}>{saving ? <ButtonLoading label="Saving…" /> : editingExpense ? 'Save changes' : 'Save expense'}</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
