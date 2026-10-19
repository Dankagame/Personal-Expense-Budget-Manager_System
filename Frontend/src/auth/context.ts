import { createContext, useContext } from 'react'

export type AuthUser = {
  id: number
  full_name: string
  email: string
  phone_number: string | null
  created_at: string
  roles: { id: number; name: string }[]
}

export type SignupDetails = {
  full_name: string
  email: string
  phone_number?: string
  password: string
}

export type ProfileDetails = {
  full_name: string
  email: string
  phone_number: string | null
}

export type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  isAdmin: boolean
  sessionError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (details: SignupDetails) => Promise<void>
  updateProfile: (details: ProfileDetails) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  signOut: () => void
  retrySession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
