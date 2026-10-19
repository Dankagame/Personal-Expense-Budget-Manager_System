import { configureStore } from '@reduxjs/toolkit'
import expenseFiltersReducer from './expenseFiltersSlice'

export const store = configureStore({
  reducer: { expenseFilters: expenseFiltersReducer },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
