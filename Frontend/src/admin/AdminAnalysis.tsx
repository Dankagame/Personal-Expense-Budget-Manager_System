import { formatAmount, monthLabel, type Category } from '../dashboard/types'
import type { AdminExpense } from './adminApi'

export function AdminAnalysis({ expenses, categories: allCategories }: { expenses: AdminExpense[]; categories: Category[] }) {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const categoryTotals = new Map<string, number>()
  const categoryCounts = new Map<number, number>()
  const monthlyTotals = new Map<string, number>()

  for (const expense of expenses) {
    const amount = Number(expense.amount)
    categoryTotals.set(expense.category_name, (categoryTotals.get(expense.category_name) ?? 0) + amount)
    categoryCounts.set(expense.category_id, (categoryCounts.get(expense.category_id) ?? 0) + 1)
    const month = expense.expense_date.slice(0, 7)
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + amount)
  }

  const categories = [...categoryTotals].sort((a, b) => b[1] - a[1])
  const usage = allCategories.map((category) => ({ ...category, count: categoryCounts.get(category.id) ?? 0 }))
  const mostUsed = [...usage].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5)
  const leastUsed = [...usage].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name)).slice(0, 5)
  const today = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, label: monthLabel(date.getFullYear(), date.getMonth() + 1), amount: monthlyTotals.get(key) ?? 0 }
  })
  const highestMonth = Math.max(...months.map((month) => month.amount), 0)

  return (
    <section aria-labelledby="admin-analysis-title">
      <h2 className="admin-analysis-title" id="admin-analysis-title">Analysis</h2>
      <div className="admin-overview-grid admin-analysis-grid">
        <section className="dashboard-panel" aria-labelledby="admin-categories-chart-title">
          <div className="panel-heading"><h3 id="admin-categories-chart-title">Spending by category</h3><span>All accounts · all time</span></div>
          {categories.length === 0 ? <p className="admin-empty">No spending recorded yet.</p> : (
            <div className="category-bars">
              {categories.map(([name, amount]) => (
                <div className="category-bar-row" key={name}>
                  <div className="bar-label"><span>{name}</span><strong>{formatAmount(amount)}</strong></div>
                  <div className="bar-track" aria-hidden="true"><span style={{ width: `${totalSpent > 0 ? Math.min(100, amount / totalSpent * 100) : 0}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="dashboard-panel" aria-labelledby="admin-months-chart-title">
          <div className="panel-heading"><h3 id="admin-months-chart-title">Monthly spending</h3><span>Last six months</span></div>
          {highestMonth === 0 ? <p className="admin-empty">No spending in the last six months.</p> : (
            <div className="category-bars">
              {months.map((month) => (
                <div className="category-bar-row" key={month.key}>
                  <div className="bar-label"><span>{month.label}</span><strong>{formatAmount(month.amount)}</strong></div>
                  <div className="bar-track admin-month-track" aria-hidden="true"><span style={{ width: `${month.amount / highestMonth * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="admin-overview-grid admin-rank-grid">
        <section className="dashboard-panel" aria-labelledby="admin-most-used-title">
          <div className="panel-heading"><h3 id="admin-most-used-title">Top 5 most-used categories</h3><span>By expense count</span></div>
          {mostUsed.length === 0 ? <p className="admin-empty">No categories available.</p> : (
            <ol className="admin-rank-list">{mostUsed.map((category) => <li key={category.id}><span>{category.name}</span><strong>{category.count} {category.count === 1 ? 'expense' : 'expenses'}</strong></li>)}</ol>
          )}
        </section>
        <section className="dashboard-panel" aria-labelledby="admin-least-used-title">
          <div className="panel-heading"><h3 id="admin-least-used-title">Bottom 5 least-used categories</h3><span>Includes unused categories</span></div>
          {leastUsed.length === 0 ? <p className="admin-empty">No categories available.</p> : (
            <ol className="admin-rank-list">{leastUsed.map((category) => <li key={category.id}><span>{category.name}</span><strong>{category.count} {category.count === 1 ? 'expense' : 'expenses'}</strong></li>)}</ol>
          )}
        </section>
      </div>
    </section>
  )
}
