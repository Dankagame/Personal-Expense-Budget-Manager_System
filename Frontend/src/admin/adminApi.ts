import { apiFetch } from '../lib/api'
import type { BudgetSummary, Category, Expense } from '../dashboard/types'

export type AdminUser = {
  id: number
  full_name: string
  email: string
  phone_number: string | null
  created_at: string
  roles: string[]
  must_change_password: boolean
}

export type AdminExpense = Expense & {
  owner_id: number
  owner_full_name: string
  owner_email: string
}

export type AdminBudget = BudgetSummary & {
  user_id: number
  user_full_name: string
  user_email: string
}

export type AdminData = {
  users: AdminUser[]
  expenses: AdminExpense[]
  budgets: AdminBudget[]
  categories: Category[]
}

export type AdminCreateInput = {
  full_name: string
  email: string
  password: string
}

export type AdminUpdateInput = {
  full_name: string
  email: string
  phone_number: string | null
}

export function createAdminUser(details: AdminCreateInput, accessToken: string): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/users', {
    accessToken,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
}

export function updateAdminUser(id: number, details: AdminUpdateInput, accessToken: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}`, {
    accessToken,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
}

export function deleteAdminUser(id: number, accessToken: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}`, {
    accessToken,
    method: 'DELETE',
  })
}

export function createAdminCategory(name: string, accessToken: string): Promise<Category> {
  return apiFetch<Category>('/admin/categories', {
    accessToken,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function updateAdminCategory(id: number, name: string, accessToken: string): Promise<Category> {
  return apiFetch<Category>(`/admin/categories/${id}`, {
    accessToken,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function deleteAdminCategory(id: number, accessToken: string): Promise<void> {
  return apiFetch<void>(`/admin/categories/${id}`, {
    accessToken,
    method: 'DELETE',
  })
}

async function getAllPages<T>(path: string, accessToken: string, signal: AbortSignal): Promise<T[]> {
  const all: T[] = []
  const limit = 100
  while (true) {
    const page = await apiFetch<T[]>(`${path}?limit=${limit}&offset=${all.length}`, { accessToken, signal })
    all.push(...page)
    if (page.length < limit) return all
  }
}

export async function getAdminData(accessToken: string, signal: AbortSignal): Promise<AdminData> {
  const [users, expenses, budgets, categories] = await Promise.all([
    getAllPages<AdminUser>('/admin/users', accessToken, signal),
    getAllPages<AdminExpense>('/admin/expenses', accessToken, signal),
    getAllPages<AdminBudget>('/admin/budgets', accessToken, signal),
    apiFetch<Category[]>('/categories', { accessToken, signal }),
  ])
  return { users, expenses, budgets, categories }
}
