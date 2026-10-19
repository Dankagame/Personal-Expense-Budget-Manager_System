export type Amount = string | number

export type Expense = {
  id: number
  title: string
  amount: Amount
  category_id: number
  category_name: string
  expense_date: string
  payment_method: string
  notes: string | null
  created_at: string
}

export type Category = {
  id: number
  name: string
}

export type CategorySpending = {
  category_id: number
  category_name: string
  amount: Amount
}

export type DashboardSummary = {
  total_spending: Amount
  budget_amount: Amount | null
  remaining_budget: Amount | null
  highest_expense: Expense | null
  spending_by_category: CategorySpending[]
  recent_expenses: Expense[]
}

export type BudgetSummary = {
  budget_month: string
  budget_amount: Amount | null
  total_spent: Amount
  remaining: Amount | null
  status: 'not_set' | 'within' | 'approaching' | 'over'
}

export type ExpenseInput = {
  title: string
  amount: string
  category_id: number
  expense_date: string
  payment_method: string
  notes: string | null
}

export function amountNumber(value: Amount | null): number {
  return value === null ? 0 : Number(value)
}

const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatAmount(value: Amount | null): string {
  return value === null ? '—' : `FRW ${amountFormatter.format(amountNumber(value))}`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

export function localDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
