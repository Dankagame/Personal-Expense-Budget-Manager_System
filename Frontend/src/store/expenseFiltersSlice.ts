import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ExpenseSortBy = 'expense_date' | 'amount'
export type ExpenseSortOrder = 'asc' | 'desc'

export type ExpenseFiltersState = {
  search: string
  categoryId: number | null
  paymentMethod: string
  startDate: string
  endDate: string
  sortBy: ExpenseSortBy
  sortOrder: ExpenseSortOrder
}

const initialState: ExpenseFiltersState = {
  search: '',
  categoryId: null,
  paymentMethod: '',
  startDate: '',
  endDate: '',
  sortBy: 'expense_date',
  sortOrder: 'desc',
}

const expenseFiltersSlice = createSlice({
  name: 'expenseFilters',
  initialState,
  reducers: {
    applyExpenseFilters: (_state, action: PayloadAction<ExpenseFiltersState>) => action.payload,
    resetExpenseFilters: () => initialState,
  },
})

export const { applyExpenseFilters, resetExpenseFilters } = expenseFiltersSlice.actions
export default expenseFiltersSlice.reducer
