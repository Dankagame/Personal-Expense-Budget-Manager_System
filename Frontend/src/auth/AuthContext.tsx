import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
  type ProfileDetails,
  type SignupDetails,
} from './context'

const ACCESS_TOKEN_KEY = 'retain_access_token'

function getStoredToken(): string | null {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(() => getStoredToken() !== null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!accessToken) return

    let active = true

    apiFetch<AuthUser>('/users/me', { accessToken })
      .then((profile) => {
        if (active) setUser(profile)
      })
      .catch((error: unknown) => {
        if (!active) return

        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (error.status === 401 || error.status === 403)
        ) {
          window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
          setAccessToken(null)
          setUser(null)
          return
        }

        setSessionError(
          error instanceof Error
            ? error.message
            : 'Unable to verify your saved session.',
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, retryKey])

  const authenticate = useCallback(
    async (email: string, password: string) => {
      const form = new URLSearchParams({ username: email, password })
      const token = await apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      })
      const profile = await apiFetch<AuthUser>('/users/me', {
        accessToken: token.access_token,
      })

      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token.access_token)
      setAccessToken(token.access_token)
      setUser(profile)
      setSessionError(null)
      setIsLoading(false)
    },
    [],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authenticate(email, password)
    },
    [authenticate],
  )

  const signUp = useCallback(
    async (details: SignupDetails) => {
      await apiFetch<AuthUser>('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      await authenticate(details.email, details.password)
    },
    [authenticate],
  )

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    setAccessToken(null)
    setUser(null)
    setSessionError(null)
    setIsLoading(false)
  }, [])

  const updateProfile = useCallback(
    async (details: ProfileDetails) => {
      if (!accessToken) throw new Error('Your session has ended. Sign in again.')
      const profile = await apiFetch<AuthUser>('/users/me', {
        accessToken,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      setUser(profile)
    },
    [accessToken],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!accessToken) throw new Error('Your session has ended. Sign in again.')
      const token = await apiFetch<{ access_token: string }>('/users/me/password', {
        accessToken,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token.access_token)
      setAccessToken(token.access_token)
      setSessionError(null)
    },
    [accessToken],
  )

  const retrySession = useCallback(() => {
    setIsLoading(true)
    setSessionError(null)
    setRetryKey((key) => key + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAdmin: user?.roles.some((role) => role.name === 'admin') ?? false,
      sessionError,
      signIn,
      signUp,
      updateProfile,
      changePassword,
      signOut,
      retrySession,
    }),
    [
      user,
      accessToken,
      isLoading,
      sessionError,
      signIn,
      signUp,
      updateProfile,
      changePassword,
      signOut,
      retrySession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
