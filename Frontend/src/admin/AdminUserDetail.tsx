import { useState } from 'react'
import { ExpenseDetailDialog } from '../dashboard/ExpenseDetailDialog'
import { amountNumber, formatAmount, formatDate, monthLabel } from '../dashboard/types'
import type { AdminBudget, AdminExpense, AdminUser } from './adminApi'
import { PAGE_SIZE, Pagination } from './AdminPagination'

function joinedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function budgetMonthLabel(value: string) {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return monthLabel(year, month)
}

export function AdminUserDetail({ account, expenses, budgets, onBack, onRefresh, loading }: {
  account: AdminUser
  expenses: AdminExpense[]
  budgets: AdminBudget[]
  onBack: () => void
  onRefresh: () => void
  loading: boolean
}) {
  const [expensePage, setExpensePage] = useState(0)
  const [budgetPage, setBudgetPage] = useState(0)
  const [selectedExpense, setSelectedExpense] = useState<AdminExpense | null>(null)
  const sortedExpenses = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.id - a.id)
  const sortedBudgets = [...budgets].sort((a, b) => b.budget_month.localeCompare(a.budget_month))
  const currentExpensePage = Math.min(expensePage, Math.max(0, Math.ceil(sortedExpenses.length / PAGE_SIZE) - 1))
  const currentBudgetPage = Math.min(budgetPage, Math.max(0, Math.ceil(sortedBudgets.length / PAGE_SIZE) - 1))
  const totalSpent = expenses.reduce((sum, expense) => sum + amountNumber(expense.amount), 0)

  return (
    <>
      <div className="page-heading admin-user-heading">
        <div>
          <button className="inline-button admin-back-link" type="button" onClick={onBack}>← Back to users</button>
          <p className="section-kicker">USER ACCOUNT #{account.id}</p>
          <h1>{account.full_name}</h1>
          <p className="page-description">{account.email}</p>
        </div>
        <button className="secondary-action" type="button" onClick={onRefresh} disabled={loading} aria-busy={loading}>Refresh</button>
      </div>

      <div className="metric-grid admin-user-metrics">
        <div className="metric-card"><span>Expenses</span><strong>{expenses.length}</strong></div>
        <div className="metric-card"><span>Total spending</span><strong>{formatAmount(totalSpent)}</strong></div>
        <div className="metric-card"><span>Monthly budgets</span><strong>{budgets.length}</strong></div>
      </div>

      <section className="dashboard-panel admin-user-profile" aria-labelledby="admin-user-profile-title">
        <div className="panel-heading"><h2 id="admin-user-profile-title">Profile</h2></div>
        <dl>
          <div><dt>Full name</dt><dd>{account.full_name}</dd></div>
          <div><dt>Email</dt><dd>{account.email}</dd></div>
          <div><dt>Phone</dt><dd>{account.phone_number || '—'}</dd></div>
          <div><dt>Joined</dt><dd>{joinedDate(account.created_at)}</dd></div>
        </dl>
      </section>

      <section className="dashboard-panel" aria-labelledby="admin-user-expenses-title">
        <div className="panel-heading"><h2 id="admin-user-expenses-title">Expenses</h2><span>{expenses.length} records</span></div>
        {expenses.length === 0 ? <p className="admin-empty">This user has no expenses yet.</p> : <>
          <div className="table-scroll"><table className="expense-table"><thead><tr><th>ID</th><th>Expense</th><th>Category</th><th>Date</th><th>Payment</th><th className="amount-cell">Amount</th><th>Details</th></tr></thead><tbody>
            {sortedExpenses.slice(currentExpensePage * PAGE_SIZE, (currentExpensePage + 1) * PAGE_SIZE).map((expense) => <tr key={expense.id}>
              <td>#{expense.id}</td><td className="expense-title"><button className="inline-button admin-user-link" type="button" onClick={() => setSelectedExpense(expense)}>{expense.title}</button></td><td>{expense.category_name}</td><td>{formatDate(expense.expense_date)}</td><td>{expense.payment_method}</td><td className="amount-cell">{formatAmount(expense.amount)}</td><td><button className="inline-button" type="button" onClick={() => setSelectedExpense(expense)}>View</button></td>
            </tr>)}
          </tbody></table></div>
          <Pagination count={expenses.length} page={currentExpensePage} onPage={setExpensePage} label="Expense pages" />
        </>}
      </section>

      <section className="dashboard-panel" aria-labelledby="admin-user-budgets-title">
        <div className="panel-heading"><h2 id="admin-user-budgets-title">Budgets</h2><span>{budgets.length} months</span></div>
        {budgets.length === 0 ? <p className="admin-empty">This user has no budgets yet.</p> : <>
          <div className="table-scroll"><table className="expense-table"><thead><tr><th>Month</th><th className="amount-cell">Budget</th><th className="amount-cell">Spent</th><th className="amount-cell">Remaining</th><th>Status</th></tr></thead><tbody>
            {sortedBudgets.slice(currentBudgetPage * PAGE_SIZE, (currentBudgetPage + 1) * PAGE_SIZE).map((budget) => <tr key={budget.budget_month}>
              <td>{budgetMonthLabel(budget.budget_month)}</td><td className="amount-cell">{formatAmount(budget.budget_amount)}</td><td className="amount-cell">{formatAmount(budget.total_spent)}</td><td className="amount-cell">{formatAmount(budget.remaining)}</td><td>{budget.status.replace('_', ' ')}</td>
            </tr>)}
          </tbody></table></div>
          <Pagination count={budgets.length} page={currentBudgetPage} onPage={setBudgetPage} label="Budget pages" />
        </>}
      </section>

      {selectedExpense && <ExpenseDetailDialog expenseId={selectedExpense.id} expense={selectedExpense} loading={false} error={null} onClose={() => setSelectedExpense(null)} onRetry={() => {}} />}
    </>
  )
}
