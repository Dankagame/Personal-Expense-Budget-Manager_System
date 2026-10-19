import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { ProfileSettings } from '../dashboard/ProfileSettings'
import { formatAmount, formatDate, localDate, monthLabel } from '../dashboard/types'
import { ApiError } from '../lib/api'
import { ButtonLoading, LoadingState } from '../Loading'
import { AdminAnalysis } from './AdminAnalysis'
import { AdminDeleteDialog, AdminEditDialog } from './AdminAccountDialogs'
import { AdminCategoryDeleteDialog, AdminCategoryDialog } from './AdminCategoryDialog'
import { AdminCreateDialog } from './AdminCreateDialog'
import { AdminUserDetail } from './AdminUserDetail'
import { PAGE_SIZE, Pagination } from './AdminPagination'
import { createAdminCategory, createAdminUser, deleteAdminCategory, deleteAdminUser, getAdminData, updateAdminCategory, updateAdminUser, type AdminCreateInput, type AdminData, type AdminUpdateInput, type AdminUser } from './adminApi'
import type { Category } from '../dashboard/types'
import '../dashboard/dashboard.css'
import './admin.css'

type AdminView = 'overview' | 'users' | 'expenses' | 'budgets' | 'categories' | 'settings'

const pages: { id: AdminView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'categories', label: 'Categories' },
  { id: 'settings', label: 'Settings' },
]

function joinedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function budgetMonthLabel(value: string) {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return monthLabel(year, month)
}

function Empty({ message }: { message: string }) {
  return <p className="admin-empty">{message}</p>
}

function userIdFromPath() {
  const match = /^\/admin\/users\/(\d+)\/?$/.exec(window.location.pathname)
  return match ? Number(match[1]) : null
}

export function AdminDashboard() {
  const { user, accessToken, signOut, updateProfile } = useAuth()
  const [view, setView] = useState<AdminView>('overview')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(userIdFromPath)
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(0)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [categoryDeleting, setCategoryDeleting] = useState(false)
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null)
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminNotice, setAdminNotice] = useState<string | null>(null)
  const [adminPage, setAdminPage] = useState(0)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    function onLocationChange() {
      setSelectedUserId(userIdFromPath())
      setView('users')
      setMenuOpen(false)
    }
    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    getAdminData(accessToken, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
        else setError(cause instanceof Error ? cause.message : 'Could not load admin data.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [accessToken, refreshKey, signOut])

  if (!user || !accessToken) return null

  function changeView(next: AdminView) {
    if (selectedUserId !== null) window.history.pushState(null, '', '/admin')
    setSelectedUserId(null)
    setView(next)
    setPage(0)
    setCategoryNotice(null)
    setAdminNotice(null)
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  function openUser(account: AdminUser) {
    window.history.pushState({ fromAdminUsers: true }, '', `/admin/users/${account.id}`)
    setSelectedUserId(account.id)
    setView('users')
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }

  function closeUser() {
    if (window.history.state?.fromAdminUsers) window.history.back()
    else window.history.replaceState(null, '', '/admin')
    setSelectedUserId(null)
    setView('users')
    window.scrollTo(0, 0)
  }

  function refresh() {
    setLoading(true)
    setError(null)
    setCategoryNotice(null)
    setAdminNotice(null)
    setRefreshKey((value) => value + 1)
  }

  async function saveCategory(name: string) {
    if (!accessToken || categorySaving) return
    if (!name) {
      setCategoryError('Enter a category name.')
      return
    }
    setCategorySaving(true)
    setCategoryError(null)
    try {
      const category = editingCategory
        ? await updateAdminCategory(editingCategory.id, name, accessToken)
        : await createAdminCategory(name, accessToken)
      const categories = [
        ...(data?.categories ?? []).filter((item) => item.id !== category.id),
        category,
      ].sort((a, b) => a.name.localeCompare(b.name))
      setData((current) => current ? {
        ...current,
        categories,
        expenses: current.expenses.map((expense) => expense.category_id === category.id
          ? { ...expense, category_name: category.name }
          : expense),
      } : current)
      setPage(Math.floor(categories.findIndex((item) => item.id === category.id) / PAGE_SIZE))
      setCategoryNotice(`Category “${category.name}” ${editingCategory ? 'updated' : 'added'}.`)
      setCategoryDialogOpen(false)
      setEditingCategory(null)
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
      else setCategoryError(cause instanceof Error ? cause.message : 'Could not save the category.')
    } finally {
      setCategorySaving(false)
    }
  }

  async function removeCategory() {
    if (!accessToken || !deletingCategory || categoryDeleting) return
    setCategoryDeleting(true)
    setCategoryDeleteError(null)
    try {
      await deleteAdminCategory(deletingCategory.id, accessToken)
      const removed = deletingCategory
      setData((current) => {
        if (!current) return current
        const uncategorized = current.categories.find((item) => item.name.toLowerCase() === 'uncategorized')
        return {
          ...current,
          categories: current.categories.filter((item) => item.id !== removed.id),
          expenses: current.expenses.map((expense) => expense.category_id === removed.id && uncategorized
            ? { ...expense, category_id: uncategorized.id, category_name: uncategorized.name }
            : expense),
        }
      })
      setCategoryNotice(`Category “${removed.name}” deleted.`)
      setDeletingCategory(null)
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
      else setCategoryDeleteError(cause instanceof Error ? cause.message : 'Could not delete the category.')
    } finally {
      setCategoryDeleting(false)
    }
  }

  async function addAdmin(details: AdminCreateInput) {
    if (!accessToken || adminSaving) return
    setAdminSaving(true)
    setAdminError(null)
    try {
      const account = await createAdminUser(details, accessToken)
      setData((current) => current ? { ...current, users: [...current.users, account] } : current)
      setAdminPage(Math.floor(adminUsers.length / PAGE_SIZE))
      setAdminNotice(`Admin “${account.full_name}” added.`)
      setAdminDialogOpen(false)
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
      else setAdminError(cause instanceof Error ? cause.message : 'Could not add the admin.')
    } finally {
      setAdminSaving(false)
    }
  }

  async function saveAdmin(details: AdminUpdateInput) {
    if (!accessToken || !editingAdmin || editSaving) return
    setEditSaving(true)
    setEditError(null)
    try {
      let updated: AdminUser
      if (editingAdmin.id === user.id) {
        await updateProfile(details)
        updated = { ...editingAdmin, ...details }
      } else {
        updated = await updateAdminUser(editingAdmin.id, details, accessToken)
      }
      setData((current) => current ? { ...current, users: current.users.map((account) => account.id === updated.id ? updated : account) } : current)
      setAdminNotice(`Admin “${updated.full_name}” updated.`)
      setEditingAdmin(null)
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
      else setEditError(cause instanceof Error ? cause.message : 'Could not update the admin.')
    } finally {
      setEditSaving(false)
    }
  }

  async function removeAdmin() {
    if (!accessToken || !deletingAdmin || deleteSaving) return
    setDeleteSaving(true)
    setDeleteError(null)
    try {
      await deleteAdminUser(deletingAdmin.id, accessToken)
      setData((current) => current ? { ...current, users: current.users.filter((account) => account.id !== deletingAdmin.id) } : current)
      setAdminNotice(`Admin “${deletingAdmin.full_name}” deleted.`)
      setDeletingAdmin(null)
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) signOut()
      else setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the admin.')
    } finally {
      setDeleteSaving(false)
    }
  }

  const regularUsers = data?.users.filter((account) => !account.roles.includes('admin')) ?? []
  const selectedUser = regularUsers.find((account) => account.id === selectedUserId)
  const adminUsers = data?.users.filter((account) => account.roles.includes('admin')) ?? []
  const activeLabel = selectedUserId !== null ? 'User details' : pages.find((item) => item.id === view)?.label ?? 'Overview'
  const visiblePage = Math.min(page, Math.max(0, Math.ceil((view === 'users' ? regularUsers.length : view === 'expenses' ? data?.expenses.length ?? 0 : view === 'budgets' ? data?.budgets.length ?? 0 : data?.categories.length ?? 0) / PAGE_SIZE) - 1))
  const start = visiblePage * PAGE_SIZE
  const visibleAdminPage = Math.min(adminPage, Math.max(0, Math.ceil(adminUsers.length / PAGE_SIZE) - 1))
  const totalSpent = data?.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0) ?? 0
  const currentMonth = localDate().slice(0, 7)
  const currentMonthExpenses = data?.expenses.filter((expense) => expense.expense_date.startsWith(currentMonth)).length ?? 0
  const recentExpenses = [...(data?.expenses ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const recentUsers = [...regularUsers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <div className="dashboard-shell admin-shell">
      {menuOpen && <button className="sidebar-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} id="admin-navigation">
        <div className="sidebar-brand">retain<span>.</span><small>ADMIN</small></div>
        <nav aria-label="Admin navigation" className="sidebar-nav">
          {pages.map((item) => (
            <button key={item.id} className={`nav-item${view === item.id ? ' is-active' : ''}`} type="button" aria-current={view === item.id ? 'page' : undefined} onClick={() => changeView(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="sidebar-footer">Retain administration</div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen((open) => !open)}>Menu</button>
            <span className="topbar-title">Admin · {activeLabel}</span>
            {loading && <span className="topbar-loading" aria-hidden="true"><span className="app-spinner" />Loading…</span>}
          </div>
          <div className="topbar-right"><span className="user-name">{user.full_name}</span><button className="signout-button" type="button" onClick={signOut}>Sign out</button></div>
        </header>

        <main className="dashboard-content" aria-busy={loading}>
          {selectedUserId !== null ? (
            loading ? <LoadingState label="Loading user details…" /> : error ? (
              <div className="error-panel" role="alert"><p>{error}</p><button className="inline-button" type="button" onClick={refresh}>Try again</button></div>
            ) : data && selectedUser ? (
              <AdminUserDetail
                key={selectedUser.id}
                account={selectedUser}
                expenses={data.expenses.filter((expense) => expense.owner_id === selectedUser.id)}
                budgets={data.budgets.filter((budget) => budget.user_id === selectedUser.id)}
                onBack={closeUser}
                onRefresh={refresh}
                loading={loading}
              />
            ) : <div className="error-panel" role="alert"><p>User not found.</p><button className="inline-button" type="button" onClick={closeUser}>Back to users</button></div>
          ) : view === 'settings' ? (
            <>
              <ProfileSettings />
              <section className="dashboard-panel admin-settings-panel" aria-labelledby="admins-title">
                <div className="panel-heading">
                  <h2 id="admins-title">Administrators</h2>
                  <button className="dashboard-primary" type="button" onClick={() => { setAdminError(null); setAdminDialogOpen(true) }} disabled={loading || !!error} aria-haspopup="dialog">Add admin</button>
                </div>
                <p className="settings-description">Admin accounts can manage users, expenses, budgets, and categories.</p>
                {adminNotice && <p className="admin-category-notice" role="status">{adminNotice}</p>}
                {loading ? <LoadingState label="Loading administrators…" /> : error ? (
                  <div className="error-panel" role="alert"><p>{error}</p><button className="inline-button" type="button" onClick={refresh}>Try again</button></div>
                ) : adminUsers.length === 0 ? <Empty message="No administrators found." /> : (
                  <>
                    <div className="table-scroll"><table className="expense-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{adminUsers.slice(visibleAdminPage * PAGE_SIZE, (visibleAdminPage + 1) * PAGE_SIZE).map((account) => <tr key={account.id}><td className="expense-title">{account.full_name}{account.id === user.id ? ' (You)' : ''}</td><td>{account.email}</td><td>{joinedDate(account.created_at)}</td><td><div className="admin-account-actions"><button className="inline-button" type="button" onClick={() => { setEditError(null); setEditingAdmin(account) }}>Edit</button><button className="inline-button admin-delete-action" type="button" onClick={() => { setDeleteError(null); setDeletingAdmin(account) }} disabled={account.id === user.id || adminUsers.length <= 1} title={account.id === user.id ? 'You cannot delete your own account' : adminUsers.length <= 1 ? 'The last admin cannot be deleted' : undefined}>Delete</button></div></td></tr>)}</tbody></table></div>
                    <Pagination count={adminUsers.length} page={visibleAdminPage} onPage={setAdminPage} />
                  </>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div><p className="section-kicker">ADMINISTRATION</p><h1>{activeLabel}</h1><p className="page-description">{view === 'overview' ? 'A view across Retain accounts.' : `Review ${activeLabel.toLowerCase()} across all accounts.`}</p></div>
                <div className="admin-heading-actions">
                  <button className="secondary-action" type="button" onClick={refresh} disabled={loading} aria-busy={loading}>{loading ? <ButtonLoading label="Refreshing…" /> : 'Refresh'}</button>
                  {view === 'categories' && <button className="dashboard-primary" type="button" onClick={() => { setEditingCategory(null); setCategoryError(null); setCategoryDialogOpen(true) }} disabled={loading || !!error} aria-haspopup="dialog">Add category</button>}
                </div>
              </div>

              {loading ? <LoadingState label="Loading admin data…" /> : error ? (
                <div className="error-panel" role="alert"><p>{error}</p><button className="inline-button" type="button" onClick={refresh}>Try again</button></div>
              ) : data && (
                <>
                  {view === 'overview' && (
                    <>
                      <div className="metric-grid admin-metric-grid">
                        <div className="metric-card"><span>Registered users</span><strong>{regularUsers.length}</strong></div>
                        <div className="metric-card"><span>Expenses</span><strong>{data.expenses.length}</strong></div>
                        <div className="metric-card"><span>Total recorded spending</span><strong>{formatAmount(totalSpent)}</strong></div>
                        <div className="metric-card"><span>Expenses this month</span><strong>{currentMonthExpenses}</strong></div>
                      </div>
                      <AdminAnalysis expenses={data.expenses} categories={data.categories} />
                      <div className="admin-overview-grid">
                        <section className="dashboard-panel"><div className="panel-heading"><h2>Recently added expenses</h2><button className="inline-button" type="button" onClick={() => changeView('expenses')}>View all</button></div>{recentExpenses.length === 0 ? <Empty message="No expenses recorded yet." /> : <div className="table-scroll"><table className="expense-table"><thead><tr><th>Expense</th><th>User</th><th>Added</th><th className="amount-cell">Amount</th></tr></thead><tbody>{recentExpenses.map((expense) => <tr key={expense.id}><td className="expense-title">{expense.title}</td><td>{expense.owner_full_name}</td><td>{joinedDate(expense.created_at)}</td><td className="amount-cell">{formatAmount(expense.amount)}</td></tr>)}</tbody></table></div>}</section>
                        <section className="dashboard-panel"><div className="panel-heading"><h2>Recently registered users</h2><button className="inline-button" type="button" onClick={() => changeView('users')}>View all</button></div>{recentUsers.length === 0 ? <Empty message="No users registered yet." /> : <div className="table-scroll"><table className="expense-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead><tbody>{recentUsers.map((account) => <tr key={account.id}><td className="expense-title"><button className="inline-button admin-user-link" type="button" onClick={() => openUser(account)}>{account.full_name}</button></td><td>{account.email}</td><td>{joinedDate(account.created_at)}</td></tr>)}</tbody></table></div>}</section>
                      </div>
                    </>
                  )}

                  {view === 'users' && <section className="dashboard-panel"><div className="panel-heading"><h2>All users</h2><span>{regularUsers.length} accounts</span></div>{regularUsers.length === 0 ? <Empty message="No user accounts found." /> : <><div className="table-scroll"><table className="expense-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Details</th></tr></thead><tbody>{regularUsers.slice(start, start + PAGE_SIZE).map((account) => <tr key={account.id}><td className="expense-title"><button className="inline-button admin-user-link" type="button" onClick={() => openUser(account)}>{account.full_name}</button></td><td>{account.email}</td><td>{account.phone_number ?? '—'}</td><td>{account.roles.join(', ')}</td><td>{joinedDate(account.created_at)}</td><td><button className="inline-button" type="button" onClick={() => openUser(account)}>View</button></td></tr>)}</tbody></table></div><Pagination count={regularUsers.length} page={visiblePage} onPage={setPage} /></>}</section>}

                  {view === 'expenses' && <section className="dashboard-panel"><div className="panel-heading"><h2>All expenses</h2><span>{data.expenses.length} records</span></div>{data.expenses.length === 0 ? <Empty message="No expenses found." /> : <><div className="table-scroll"><table className="expense-table"><thead><tr><th>Expense</th><th>User</th><th>Category</th><th>Date</th><th className="amount-cell">Amount</th></tr></thead><tbody>{data.expenses.slice(start, start + PAGE_SIZE).map((expense) => <tr key={expense.id}><td className="expense-title">{expense.title}</td><td>{expense.owner_full_name}</td><td>{expense.category_name}</td><td>{formatDate(expense.expense_date)}</td><td className="amount-cell">{formatAmount(expense.amount)}</td></tr>)}</tbody></table></div><Pagination count={data.expenses.length} page={visiblePage} onPage={setPage} /></>}</section>}

                  {view === 'budgets' && <section className="dashboard-panel"><div className="panel-heading"><h2>All budgets</h2><span>{data.budgets.length} records</span></div>{data.budgets.length === 0 ? <Empty message="No budgets found." /> : <><div className="table-scroll"><table className="expense-table"><thead><tr><th>Month</th><th>User</th><th className="amount-cell">Budget</th><th className="amount-cell">Spent</th><th className="amount-cell">Remaining</th></tr></thead><tbody>{data.budgets.slice(start, start + PAGE_SIZE).map((budget) => <tr key={`${budget.user_id}-${budget.budget_month}`}><td>{budgetMonthLabel(budget.budget_month)}</td><td>{budget.user_full_name}</td><td className="amount-cell">{formatAmount(budget.budget_amount)}</td><td className="amount-cell">{formatAmount(budget.total_spent)}</td><td className="amount-cell">{formatAmount(budget.remaining)}</td></tr>)}</tbody></table></div><Pagination count={data.budgets.length} page={visiblePage} onPage={setPage} /></>}</section>}

                  {view === 'categories' && categoryNotice && <p className="admin-category-notice" role="status">{categoryNotice}</p>}
                  {view === 'categories' && <section className="dashboard-panel"><div className="panel-heading"><h2>All categories</h2><span>{data.categories.length} categories</span></div>{data.categories.length === 0 ? <Empty message="No categories found." /> : <><div className="table-scroll"><table className="expense-table"><thead><tr><th>#</th><th>Category</th><th>Actions</th></tr></thead><tbody>{data.categories.slice(start, start + PAGE_SIZE).map((category, index) => <tr key={category.id}><td>{start + index + 1}</td><td className="expense-title">{category.name}</td><td><div className="admin-account-actions"><button className="inline-button" type="button" aria-label={`Edit ${category.name}`} onClick={() => { setCategoryError(null); setEditingCategory(category); setCategoryDialogOpen(true) }}>Edit</button><button className="inline-button admin-delete-action" type="button" aria-label={`Delete ${category.name}`} onClick={() => { setCategoryDeleteError(null); setDeletingCategory(category) }} disabled={category.name.toLowerCase() === 'uncategorized'} title={category.name.toLowerCase() === 'uncategorized' ? 'Uncategorized cannot be deleted' : undefined}>Delete</button></div></td></tr>)}</tbody></table></div><Pagination count={data.categories.length} page={visiblePage} onPage={setPage} /></>}</section>}
                </>
              )}
            </>
          )}
        </main>
      </div>
      {categoryDialogOpen && <AdminCategoryDialog category={editingCategory} error={categoryError} saving={categorySaving} onClose={() => { setCategoryDialogOpen(false); setEditingCategory(null) }} onSubmit={saveCategory} />}
      {deletingCategory && <AdminCategoryDeleteDialog category={deletingCategory} error={categoryDeleteError} saving={categoryDeleting} onClose={() => setDeletingCategory(null)} onConfirm={removeCategory} />}
      {adminDialogOpen && <AdminCreateDialog error={adminError} saving={adminSaving} onClose={() => setAdminDialogOpen(false)} onSubmit={addAdmin} />}
      {editingAdmin && <AdminEditDialog account={editingAdmin} error={editError} saving={editSaving} onClose={() => setEditingAdmin(null)} onSubmit={saveAdmin} />}
      {deletingAdmin && <AdminDeleteDialog account={deletingAdmin} error={deleteError} saving={deleteSaving} onClose={() => setDeletingAdmin(null)} onConfirm={removeAdmin} />}
    </div>
  )
}
