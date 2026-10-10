import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { authApi, getTokens, saveTokens, type AccountIdentifier, type Me } from '../api'
import { setSessionExpiredHandler } from '../api/client'

type Status = 'loading' | 'signedOut' | 'signedIn'

type AuthValue = {
  status: Status
  user: Me | null
  signIn: (account: AccountIdentifier, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

/** Only platform admins use this portal; car wash staff use the mobile app. */
const PLATFORM_ADMIN_ROLE = 'SUPER_ADMIN'
const NOT_ADMIN_MESSAGE = 'This portal is for platform admins. Car wash owners and staff should use the Vahanly app.'

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth() {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>(() => (getTokens() ? 'loading' : 'signedOut'))
  const [user, setUser] = useState<Me | null>(null)

  const loadSession = useCallback(async () => {
    const me = await authApi.me()
    if (me.role.name !== PLATFORM_ADMIN_ROLE) throw new Error(NOT_ADMIN_MESSAGE)
    setUser(me)
    setStatus('signedIn')
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      setStatus('signedOut')
    })
    if (getTokens()) {
      loadSession().catch(() => {
        saveTokens(null)
        setStatus('signedOut')
      })
    }
    return () => setSessionExpiredHandler(null)
  }, [loadSession])

  const signIn = useCallback(
    async (account: AccountIdentifier, password: string) => {
      const result = await authApi.login(account, password)
      if (result.user.role !== PLATFORM_ADMIN_ROLE) {
        authApi.logout(result.refreshToken).catch(() => {})
        throw new Error(NOT_ADMIN_MESSAGE)
      }
      saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      try {
        await loadSession()
      } catch (e) {
        saveTokens(null)
        throw e
      }
    },
    [loadSession],
  )

  const signOut = useCallback(async () => {
    const tokens = getTokens()
    saveTokens(null)
    setUser(null)
    setStatus('signedOut')
    if (tokens) await authApi.logout(tokens.refreshToken).catch(() => {})
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      // Other sessions are signed out; continue with the fresh token pair.
      saveTokens(await authApi.changePassword(currentPassword, newPassword))
      await loadSession()
    },
    [loadSession],
  )

  const value = useMemo(
    () => ({ status, user, signIn, signOut, changePassword }),
    [status, user, signIn, signOut, changePassword],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
