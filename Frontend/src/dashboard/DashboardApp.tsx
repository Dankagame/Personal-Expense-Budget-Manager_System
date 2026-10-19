import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import { ApiError } from '../lib/api'
import {
  createExpense,
  deleteExpense,
  getAllExpenses,
  getBudget,
  getBudgetHistory,
  getCategories,
  getOverview,
  getSavedBudgets,
  setBudget,
  updateExpense,
} from './financeApi'
import {
  amountNumber,
  formatAmount,
  formatDate,
  localDate,
  monthLabel,
  type BudgetSummary,
  type Category,
  type DashboardSummary,
  type Expense,
  type ExpenseInput,
} from './types'
import { ProfileSettings } from './ProfileSettings'
import { ExpenseDialog } from './ExpenseDialog'
import { ButtonLoading, LoadingState } from '../Loading'
import './dashboard.css'

type View = 'overview' | 'expenses' | 'budgets' | 'categories' | 'settings'

const navigation: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'categories', label: 'Categories' },
  { id: 'settings', label: 'Settings' },
]

const CATEGORY_PAGE_SIZE = 10

function isSessionError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
  deletingExpenseId,
}: {
  expenses: Expense[]
  onEdit?: (expense: Expense) => void
  onDelete?: (expense: Expense) => void
  deletingExpenseId?: number | null
}) {
  return (
    <div className="table-scroll">
      <table className="expense-table">
        <thead>
          <tr>
            <th scope="col">Expense</th>
            <th scope="col">Category</th>
            <th scope="col">Date</th>
            <th scope="col">Payment</th>
            <th scope="col" className="amount-cell">Amount</th>
            {(onEdit || onDelete) && <th scope="col" className="actions-cell">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="expense-title">{expense.title}</td>
              <td>{expense.category_name}</td>
              <td>{formatDate(expense.expense_date)}</td>
              <td>{expense.payment_method}</td>
              <td className="amount-cell">{formatAmount(expense.amount)}</td>
              {(onEdit || onDelete) && (
                <td className="actions-cell">
                  {onEdit && <button className="inline-button" type="button" onClick={() => onEdit(expense)} disabled={deletingExpenseId !== null && deletingExpenseId !== undefined}>Edit</button>}
                  {onDelete && <button className="inline-button danger-link" type="button" onClick={() => onDelete(expense)} disabled={deletingExpenseId !== null && deletingExpenseId !== undefined} aria-busy={deletingExpenseId === expense.id}>{deletingExpenseId === expense.id ? <ButtonLoading label="Deleting…" /> : 'Delete'}</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

export function DashboardApp() {
  const { user, accessToken, signOut } = useAuth()
  const [view, setView] = useState<View>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  const [overview, setOverview] = useState<DashboardSummary | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryPage, setCategoryPage] = useState(0)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensesError, setExpensesError] = useState<string | null>(null)
  const [filterFormKey, setFilterFormKey] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterError, setFilterError] = useState<string | null>(null)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)
  const [expenseBudgets, setExpenseBudgets] = useState<BudgetSummary[]>([])
  const [expenseBudgetsLoading, setExpenseBudgetsLoading] = useState(false)
  const [expenseBudgetsError, setExpenseBudgetsError] = useState<string | null>(null)
  const [expenseBudgetsRequest, setExpenseBudgetsRequest] = useState(0)

  const [overviewMonth, setOverviewMonth] = useState(localDate().slice(0, 7))
  const [budgetMonthSelection, setBudgetMonthSelection] = useState(localDate().slice(0, 7))
  const [budget, setBudgetState] = useState<BudgetSummary | null>(null)
  const [budgetHistory, setBudgetHistory] = useState<BudgetSummary[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || view !== 'overview') return
    let active = true
    getOverview(accessToken, overviewMonth)
      .then((data) => { if (active) { setOverview(data); setOverviewError(null) } })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionError(error)) signOut()
        else setOverviewError(errorMessage(error))
      })
      .finally(() => { if (active) setOverviewLoading(false) })
    return () => { active = false }
  }, [accessToken, overviewMonth, revision, signOut, view])

  useEffect(() => {
    if (!accessToken) return
    let active = true
    getCategories(accessToken)
      .then((data) => { if (active) { setCategories(data); setCategoriesError(null) } })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionError(error)) signOut()
        else setCategoriesError(errorMessage(error))
      })
      .finally(() => { if (active) setCategoriesLoading(false) })
    return () => { active = false }
  }, [accessToken, revision, signOut])

  useEffect(() => {
    if (!accessToken || view !== 'expenses') return
    let active = true
    getAllExpenses(accessToken, {
      search,
      categoryId,
      startDate,
      endDate,
    })
      .then((data) => {
        if (!active) return
        setExpenses(data)
        setExpensesError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionError(error)) signOut()
        else setExpensesError(errorMessage(error))
      })
      .finally(() => { if (active) setExpensesLoading(false) })
    return () => { active = false }
  }, [accessToken, categoryId, endDate, revision, search, signOut, startDate, view])

  useEffect(() => {
    if (!accessToken || view !== 'budgets') return
    const [year, month] = budgetMonthSelection.split('-').map(Number)
    if (!year || !month) return
    let active = true
    Promise.all([
      getBudget(accessToken, year, month),
      getBudgetHistory(accessToken),
    ])
      .then(([current, history]) => {
        if (!active) return
        setBudgetState(current)
        setBudgetHistory(history)
        setBudgetAmount(current.budget_amount === null ? '' : String(current.budget_amount))
        setBudgetError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionError(error)) signOut()
        else setBudgetError(errorMessage(error))
      })
      .finally(() => { if (active) setBudgetLoading(false) })
    return () => { active = false }
  }, [accessToken, budgetMonthSelection, revision, signOut, view])

  useEffect(() => {
    if (!accessToken || !expenseFormOpen || editingExpense) return
    let active = true
    getSavedBudgets(accessToken)
      .then((data) => { if (active) { setExpenseBudgets(data); setExpenseBudgetsError(null) } })
      .catch((error: unknown) => {
        if (!active) return
        if (isSessionError(error)) signOut()
        else setExpenseBudgetsError(errorMessage(error))
      })
      .finally(() => { if (active) setExpenseBudgetsLoading(false) })
    return () => { active = false }
  }, [accessToken, editingExpense, expenseBudgetsRequest, expenseFormOpen, signOut])

  if (!user || !accessToken) return null

  function switchView(next: View) {
    if (next !== view) {
      if (next === 'overview') { setOverviewLoading(true); setOverviewError(null) }
      if (next === 'expenses') { setExpensesLoading(true); setExpensesError(null) }
      if (next === 'budgets') { setBudgetLoading(true); setBudgetError(null) }
    }
    setView(next)
    setMenuOpen(false)
    setExpenseFormOpen(false)
    setEditingExpense(null)
    window.scrollTo(0, 0)
  }

  function viewSelectedMonthExpenses() {
    const [year, month] = overviewMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    setSearch('')
    setCategoryId(null)
    setStartDate(`${overviewMonth}-01`)
    setEndDate(`${overviewMonth}-${String(lastDay).padStart(2, '0')}`)
    setFilterError(null)
    setFilterFormKey((value) => value + 1)
    switchView('expenses')
  }

  function startExpense(expense: Expense | null = null) {
    if (view !== 'expenses') { setExpensesLoading(true); setExpensesError(null) }
    if (!expense) { setExpenseBudgetsLoading(true); setExpenseBudgetsError(null) }
    setView('expenses')
    setMenuOpen(false)
    setEditingExpense(expense)
    setExpenseFormError(null)
    setExpenseFormOpen(true)
    if (view !== 'expenses') window.scrollTo(0, 0)
  }

  function closeExpense() {
    setExpenseFormOpen(false)
    setEditingExpense(null)
    setExpenseFormError(null)
  }

  function retryExpenseBudgets() {
    setExpenseBudgetsLoading(true)
    setExpenseBudgetsError(null)
    setExpenseBudgetsRequest((value) => value + 1)
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const nextStart = String(fields.get('start_date') ?? '')
    const nextEnd = String(fields.get('end_date') ?? '')
    if (nextStart && nextEnd && nextStart > nextEnd) {
      setFilterError('Start date must be on or before end date.')
      return
    }
    setFilterError(null)
    setSearch(String(fields.get('search') ?? '').trim())
    setCategoryId(Number(fields.get('category_id')) || null)
    setStartDate(nextStart)
    setEndDate(nextEnd)
    setExpensesLoading(true)
    setExpensesError(null)
    setRevision((value) => value + 1)
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const fields = new FormData(event.currentTarget)
    const payload: ExpenseInput = {
      title: String(fields.get('title') ?? '').trim(),
      amount: String(fields.get('amount') ?? ''),
      category_id: Number(fields.get('category_id')),
      expense_date: String(fields.get('expense_date') ?? ''),
      payment_method: String(fields.get('payment_method') ?? '').trim(),
      notes: String(fields.get('notes') ?? '').trim() || null,
    }
    if (!payload.title || !payload.payment_method || !payload.category_id || Number(payload.amount) <= 0) {
      setExpenseFormError('Complete all required fields with a positive amount.')
      return
    }
    if (!editingExpense) {
      const selectedBudgetMonth = String(fields.get('budget_month') ?? '')
      if (!expenseBudgets.some((item) => item.budget_month.startsWith(selectedBudgetMonth + '-')) || !payload.expense_date.startsWith(selectedBudgetMonth + '-')) {
        setExpenseFormError('Choose a saved budget and a date within that budget month.')
        return
      }
    }
    setExpenseSaving(true)
    setExpenseFormError(null)
    try {
      if (editingExpense) {
        await updateExpense(accessToken, editingExpense.id, payload)
      } else {
        await createExpense(accessToken, payload)
        setSearch('')
        setCategoryId(null)
        setStartDate('')
        setEndDate('')
        setFilterError(null)
        setFilterFormKey((value) => value + 1)
      }
      setExpenseFormOpen(false)
      setEditingExpense(null)
      setExpensesLoading(true)
      setRevision((value) => value + 1)
    } catch (error) {
      if (isSessionError(error)) signOut()
      else setExpenseFormError(errorMessage(error))
    } finally {
      setExpenseSaving(false)
    }
  }

  async function removeExpense(expense: Expense) {
    if (!accessToken || !window.confirm(`Delete “${expense.title}”? This cannot be undone.`)) return
    setDeletingExpenseId(expense.id)
    try {
      await deleteExpense(accessToken, expense.id)
      setExpensesLoading(true)
      setRevision((value) => value + 1)
    } catch (error) {
      if (isSessionError(error)) signOut()
      else setExpensesError(errorMessage(error))
    } finally {
      setDeletingExpenseId(null)
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const [year, month] = budgetMonthSelection.split('-').map(Number)
    if (!Number.isFinite(Number(budgetAmount)) || Number(budgetAmount) < 0 || !budgetAmount) {
      setBudgetNotice('Enter a valid amount of zero or more.')
      return
    }
    setBudgetSaving(true)
    setBudgetNotice(null)
    try {
      await setBudget(accessToken, year, month, budgetAmount)
      setBudgetNotice('Budget saved.')
      setBudgetLoading(true)
      setRevision((value) => value + 1)
    } catch (error) {
      if (isSessionError(error)) signOut()
      else setBudgetNotice(errorMessage(error))
    } finally {
      setBudgetSaving(false)
    }
  }

  const activeLabel = navigation.find((item) => item.id === view)?.label ?? 'Overview'
  const pageLoading = view === 'overview' ? overviewLoading
    : view === 'expenses' ? expensesLoading
    : view === 'budgets' ? budgetLoading
    : view === 'categories' ? categoriesLoading
    : false
  const [overviewYear, overviewMonthNumber] = overviewMonth.split('-').map(Number)
  const overviewMonthLabel = monthLabel(overviewYear, overviewMonthNumber)
  const [budgetYear, budgetMonth] = budgetMonthSelection.split('-').map(Number)
  const categoryPageCount = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE))
  const currentCategoryPage = Math.min(categoryPage, categoryPageCount - 1)
  const categoryStart = currentCategoryPage * CATEGORY_PAGE_SIZE
  const visibleCategories = categories.slice(categoryStart, categoryStart + CATEGORY_PAGE_SIZE)

  return (
    <div className="dashboard-shell">
      {menuOpen && <button className="sidebar-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} id="dashboard-navigation">
        <div className="sidebar-brand">retain<span>.</span></div>
        <nav aria-label="Main navigation" className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${view === item.id ? ' is-active' : ''}`}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => switchView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Personal finance, kept clear.</div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen((open) => !open)}>Menu</button>
            <span className="topbar-title">{activeLabel}</span>
            {pageLoading && <span className="topbar-loading" aria-hidden="true"><span className="app-spinner" />Loading…</span>}
          </div>
          <div className="topbar-right">
            <span className="user-name">{user.full_name}</span>
            <button className="signout-button" type="button" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <main className="dashboard-content" aria-busy={pageLoading}>
          {view === 'overview' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="section-kicker">YOUR FINANCES</p>
                  <h1>Overview</h1>
                  <p className="page-description">Spending and budget for {overviewMonthLabel}.</p>
                </div>
                <div className="overview-heading-actions">
                  <label className="month-selector overview-month-selector">Month
                    <input type="month" min="1900-01" max="9998-12" value={overviewMonth} onChange={(event) => { if (!event.target.value || event.target.value === overviewMonth) return; setOverviewLoading(true); setOverviewError(null); setOverviewMonth(event.target.value) }} />
                  </label>
                  <button className="dashboard-primary" type="button" onClick={() => startExpense()}>Add expense</button>
                </div>
              </div>

              {overviewLoading ? <LoadingState label="Loading overview…" /> : overviewError ? (
                <div className="error-panel" role="alert"><p>{overviewError}</p><button className="inline-button" type="button" onClick={() => { setOverviewLoading(true); setOverviewError(null); setRevision((value) => value + 1) }}>Try again</button></div>
              ) : overview && (
                <>
                  <div className="metric-grid">
                    <div className="metric-card"><span>Spending · {overviewMonthLabel}</span><strong>{formatAmount(overview.total_spending)}</strong><small>From recorded expenses</small></div>
                    <div className="metric-card"><span>Monthly budget</span><strong>{overview.budget_amount === null ? 'Not set' : formatAmount(overview.budget_amount)}</strong><small>{overview.budget_amount === null ? 'Create a budget to start tracking' : `Spending limit for ${overviewMonthLabel}`}</small></div>
                    <div className="metric-card"><span>Budget remaining</span><strong className={overview.remaining_budget !== null && amountNumber(overview.remaining_budget) < 0 ? 'negative-amount' : ''}>{overview.remaining_budget === null ? '—' : formatAmount(overview.remaining_budget)}</strong><small>{overview.remaining_budget === null ? `No budget set for ${overviewMonthLabel}` : amountNumber(overview.remaining_budget) < 0 ? 'Over your monthly budget' : 'Available within your budget'}</small></div>
                  </div>

                  <div className="overview-grid">
                    <section className="dashboard-panel">
                      <div className="panel-heading"><h2>Spending by category</h2><span>{overviewMonthLabel}</span></div>
                      {overview.spending_by_category.length === 0 ? <EmptyState title="No spending yet" detail={`Expenses for ${overviewMonthLabel} will appear here.`} /> : (
                        <div className="category-bars">
                          {overview.spending_by_category.map((category) => (
                            <div className="category-bar-row" key={category.category_id}>
                              <div className="bar-label"><span>{category.category_name}</span><strong>{formatAmount(category.amount)}</strong></div>
                              <div className="bar-track"><span style={{ width: `${amountNumber(overview.total_spending) > 0 ? Math.min(100, amountNumber(category.amount) / amountNumber(overview.total_spending) * 100) : 0}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="dashboard-panel">
                      <div className="panel-heading"><h2>Monthly budget</h2><button className="inline-button" type="button" onClick={() => switchView('budgets')}>Manage</button></div>
                      {overview.budget_amount === null ? <EmptyState title="No budget set" detail="Set a monthly limit to compare it with your spending." /> : (
                        <div className="budget-snapshot">
                          <div className="budget-snapshot-amount"><strong>{formatAmount(overview.total_spending)}</strong><span>spent of {formatAmount(overview.budget_amount)}</span></div>
                          <div className="bar-track budget-track"><span className={amountNumber(overview.remaining_budget) < 0 ? 'is-over' : ''} style={{ width: `${amountNumber(overview.budget_amount) > 0 ? Math.min(100, amountNumber(overview.total_spending) / amountNumber(overview.budget_amount) * 100) : amountNumber(overview.total_spending) > 0 ? 100 : 0}%` }} /></div>
                          <p>{amountNumber(overview.remaining_budget) < 0 ? `${formatAmount(Math.abs(amountNumber(overview.remaining_budget)))} over budget` : `${formatAmount(overview.remaining_budget)} remaining`}</p>
                        </div>
                      )}
                      {overview.highest_expense && <div className="highest-expense"><span>Largest expense in {overviewMonthLabel}</span><strong>{overview.highest_expense.title}</strong><span>{formatAmount(overview.highest_expense.amount)}</span></div>}
                    </section>
                  </div>

                  <section className="dashboard-panel recent-panel">
                    <div className="panel-heading"><h2>Recent expenses · {overviewMonthLabel}</h2><button className="inline-button" type="button" onClick={viewSelectedMonthExpenses}>View all</button></div>
                    {overview.recent_expenses.length === 0 ? <EmptyState title="No expenses recorded" detail={`No expenses were recorded for ${overviewMonthLabel}.`} /> : <ExpenseTable expenses={overview.recent_expenses} />}
                  </section>
                </>
              )}
            </>
          )}

          {view === 'expenses' && (
            <>
              <div className="page-heading">
                <div><p className="section-kicker">RECORDS</p><h1>Expenses</h1><p className="page-description">Add, review, and update your spending.</p></div>
                <button className="dashboard-primary" type="button" onClick={() => startExpense()}>Add expense</button>
              </div>

              {expenseFormOpen && (
                <ExpenseDialog
                  key={editingExpense?.id ?? 'new'}
                  categories={categories}
                  categoriesLoading={categoriesLoading}
                  categoriesError={categoriesError}
                  budgets={expenseBudgets}
                  budgetsLoading={expenseBudgetsLoading}
                  budgetsError={expenseBudgetsError}
                  editingExpense={editingExpense}
                  error={expenseFormError}
                  saving={expenseSaving}
                  onClose={closeExpense}
                  onOpenBudgets={() => switchView('budgets')}
                  onRetryBudgets={retryExpenseBudgets}
                  onSubmit={saveExpense}
                />
              )}

              <section className="dashboard-panel filters-panel">
                <h2>Filter expenses</h2>
                {filterError && <p className="form-error" role="alert">{filterError}</p>}
                <form className="filter-form" onSubmit={applyFilters} key={filterFormKey}>
                  <label>Search<input name="search" type="search" placeholder="Title or notes" defaultValue={search} /></label>
                  <label>Category<select name="category_id" defaultValue={categoryId ?? ''}><option value="">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                  <label>From<input name="start_date" type="date" defaultValue={startDate} /></label>
                  <label>To<input name="end_date" type="date" defaultValue={endDate} /></label>
                  <button className="secondary-action" type="submit" disabled={expensesLoading} aria-busy={expensesLoading}>{expensesLoading ? <ButtonLoading label="Loading…" /> : 'Apply filters'}</button>
                </form>
              </section>

              <section className="dashboard-panel">
                <div className="panel-heading"><h2>All expenses</h2><span>{expensesLoading ? 'Loading…' : `${expenses.length} ${expenses.length === 1 ? 'record' : 'records'}`}</span></div>
                {expensesLoading ? <LoadingState label="Loading expenses…" /> : expensesError ? <div className="error-panel" role="alert"><p>{expensesError}</p><button className="inline-button" type="button" onClick={() => { setExpensesLoading(true); setExpensesError(null); setRevision((value) => value + 1) }}>Try again</button></div> : (
                  <>
                    <ExpenseTable expenses={expenses} onEdit={startExpense} onDelete={removeExpense} deletingExpenseId={deletingExpenseId} />
                    {expenses.length === 0 && <EmptyState title="No expenses found" detail="Try different filters or add an expense." />}
                  </>
                )}
              </section>
            </>
          )}

          {view === 'budgets' && (
            <>
              <div className="page-heading"><div><p className="section-kicker">SPENDING LIMITS</p><h1>Budgets</h1><p className="page-description">Set a monthly budget and track what remains.</p></div></div>
              <section className="dashboard-panel budget-panel">
                <div className="panel-heading"><h2>Monthly budget</h2><label className="month-selector">Month<input type="month" min="1900-01" max="9998-12" value={budgetMonthSelection} onChange={(event) => { if (!event.target.value || event.target.value === budgetMonthSelection) return; setBudgetLoading(true); setBudgetMonthSelection(event.target.value); setBudgetNotice(null) }} /></label></div>
                {budgetLoading ? <LoadingState label="Loading budget…" /> : budgetError ? <div className="error-panel" role="alert"><p>{budgetError}</p><button className="inline-button" type="button" onClick={() => { setBudgetLoading(true); setBudgetError(null); setRevision((value) => value + 1) }}>Try again</button></div> : budget && (
                  <>
                    <div className="budget-detail-grid">
                      <div><span>Budget</span><strong>{budget.budget_amount === null ? 'Not set' : formatAmount(budget.budget_amount)}</strong></div>
                      <div><span>Spent</span><strong>{formatAmount(budget.total_spent)}</strong></div>
                      <div><span>Remaining</span><strong className={budget.remaining !== null && amountNumber(budget.remaining) < 0 ? 'negative-amount' : ''}>{formatAmount(budget.remaining)}</strong></div>
                    </div>
                    {budget.budget_amount !== null && <div className="bar-track budget-track"><span className={budget.status === 'over' ? 'is-over' : ''} style={{ width: `${amountNumber(budget.budget_amount) > 0 ? Math.min(100, amountNumber(budget.total_spent) / amountNumber(budget.budget_amount) * 100) : amountNumber(budget.total_spent) > 0 ? 100 : 0}%` }} /></div>}
                    <form className="budget-form" onSubmit={saveBudget}>
                      <label htmlFor="budget-amount">Set budget for {monthLabel(budgetYear, budgetMonth)} (FRW)</label>
                      <div><input id="budget-amount" type="number" min="0" step="0.01" required value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="0.00" /><button className="dashboard-primary" type="submit" disabled={budgetSaving} aria-busy={budgetSaving}>{budgetSaving ? <ButtonLoading label="Saving…" /> : 'Save budget'}</button></div>
                    </form>
                    {budgetNotice && <p className="budget-notice" role="status">{budgetNotice}</p>}
                  </>
                )}
              </section>
              <section className="dashboard-panel">
                <div className="panel-heading"><h2>Recent budgets</h2><span>Last 12 saved months</span></div>
                {budgetLoading ? <LoadingState label="Loading history…" /> : budgetError ? <p className="form-error" role="alert">Could not load budget history.</p> : budgetHistory.length === 0 ? <EmptyState title="No budgets saved" detail="Save a monthly budget to begin your history." /> : (
                  <div className="budget-history">{budgetHistory.map((item) => { const [year, month] = item.budget_month.split('-').map(Number); return <button className="history-row" type="button" key={item.budget_month} onClick={() => { const nextMonth = item.budget_month.slice(0, 7); if (nextMonth === budgetMonthSelection) return; setBudgetLoading(true); setBudgetNotice(null); setBudgetMonthSelection(nextMonth) }}><span>{monthLabel(year, month)}</span><span>{formatAmount(item.total_spent)} spent</span><strong>{formatAmount(item.budget_amount)}</strong></button> })}</div>
                )}
              </section>
            </>
          )}

          {view === 'categories' && (
            <>
              <div className="page-heading"><div><p className="section-kicker">ORGANIZATION</p><h1>Categories</h1><p className="page-description">Categories available for recording expenses.</p></div></div>
              <section className="dashboard-panel">
                <div className="panel-heading"><h2>Available categories</h2><span>{categories.length} total</span></div>
                {categoriesLoading ? <LoadingState label="Loading categories…" /> : categoriesError ? <div className="error-panel" role="alert"><p>{categoriesError}</p><button className="inline-button" type="button" onClick={() => { setCategoriesLoading(true); setCategoriesError(null); setRevision((value) => value + 1) }}>Try again</button></div> : categories.length === 0 ? <EmptyState title="No categories available" detail="An administrator can add categories before expenses are recorded." /> : (
                  <>
                    <div className="table-scroll">
                      <table className="category-table">
                        <thead><tr><th scope="col">#</th><th scope="col">Category name</th></tr></thead>
                        <tbody>{visibleCategories.map((category, index) => (
                          <tr key={category.id}><td>{categoryStart + index + 1}</td><td>{category.name}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="category-pagination">
                      <span>Showing {categoryStart + 1}–{Math.min(categoryStart + CATEGORY_PAGE_SIZE, categories.length)} of {categories.length}</span>
                      <nav aria-label="Categories pages" className="category-page-controls">
                        <button type="button" disabled={currentCategoryPage === 0} onClick={() => setCategoryPage(currentCategoryPage - 1)}>Previous</button>
                        <span>Page {currentCategoryPage + 1} of {categoryPageCount}</span>
                        <button type="button" disabled={currentCategoryPage >= categoryPageCount - 1} onClick={() => setCategoryPage(currentCategoryPage + 1)}>Next</button>
                      </nav>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          {view === 'settings' && <ProfileSettings />}
        </main>
      </div>
    </div>
  )
}
