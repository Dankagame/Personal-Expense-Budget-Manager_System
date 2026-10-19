import { apiFetch } from '../lib/api'
import type {
  BudgetSummary,
  Category,
  DashboardSummary,
  Expense,
  ExpenseInput,
} from './types'

type ExpenseFilters = {
  search?: string
  categoryId?: number | null
  startDate?: string
  endDate?: string
}

export function getOverview(accessToken: string, month: string) {
  const params = new URLSearchParams({ month })
  return apiFetch<DashboardSummary>(`/dashboard?${params}`, { accessToken })
}

export function getCategories(accessToken: string) {
  return apiFetch<Category[]>('/categories', { accessToken })
}

export function getExpenses(
  accessToken: string,
  filters: ExpenseFilters & { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams()
  params.set('limit', String(filters.limit ?? 21))
  params.set('offset', String(filters.offset ?? 0))
  if (filters.search) params.set('search', filters.search)
  if (filters.categoryId) params.set('category_id', String(filters.categoryId))
  if (filters.startDate) params.set('start_date', filters.startDate)
  if (filters.endDate) params.set('end_date', filters.endDate)
  return apiFetch<Expense[]>(`/expenses?${params}`, { accessToken })
}

export async function getAllExpenses(
  accessToken: string,
  filters: ExpenseFilters = {},
): Promise<Expense[]> {
  const all: Expense[] = []
  const limit = 100
  while (true) {
    const page = await getExpenses(accessToken, {
      ...filters,
      limit,
      offset: all.length,
    })
    all.push(...page)
    if (page.length < limit) return all
  }
}

export function createExpense(accessToken: string, payload: ExpenseInput) {
  return apiFetch<Expense>('/expenses', {
    accessToken,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateExpense(
  accessToken: string,
  expenseId: number,
  payload: ExpenseInput,
) {
  return apiFetch<Expense>(`/expenses/${expenseId}`, {
    accessToken,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteExpense(accessToken: string, expenseId: number) {
  return apiFetch<void>(`/expenses/${expenseId}`, {
    accessToken,
    method: 'DELETE',
  })
}

export function getBudget(accessToken: string, year: number, month: number) {
  return apiFetch<BudgetSummary>(`/budgets/${year}/${month}`, { accessToken })
}

export function getBudgetHistory(accessToken: string) {
  return apiFetch<BudgetSummary[]>('/budgets?limit=12', { accessToken })
}

export async function getSavedBudgets(accessToken: string): Promise<BudgetSummary[]> {
  const budgets: BudgetSummary[] = []
  const limit = 100
  while (true) {
    const page = await apiFetch<BudgetSummary[]>(`/budgets?limit=${limit}&offset=${budgets.length}`, { accessToken })
    budgets.push(...page)
    if (page.length < limit) return budgets
  }
}

export function setBudget(
  accessToken: string,
  year: number,
  month: number,
  amount: string,
) {
  return apiFetch<BudgetSummary>(`/budgets/${year}/${month}`, {
    accessToken,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
}
