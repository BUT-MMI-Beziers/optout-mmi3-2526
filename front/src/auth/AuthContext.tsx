import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type User = { id: string; email: string }

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialise le cookie CSRF et récupère l'utilisateur courant
  useEffect(() => {
    apiFetch('/v1/auth/csrf')
      .then(() => apiFetch('/v1/auth/me'))
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { user: User }
          setUser(data.user)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json() as { error: string }
      throw new Error(data.error ?? 'Login failed')
    }
    const data = await res.json() as { user: User }
    setUser(data.user)
  }

  const register = async (email: string, password: string) => {
    const res = await apiFetch('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json() as { error: string | Record<string, string[]> }
      const msg =
        typeof data.error === 'string'
          ? data.error
          : Object.values(data.error).flat().join(', ')
      throw new Error(msg)
    }
    const data = await res.json() as { user: User }
    setUser(data.user)
  }

  const logout = async () => {
    await apiFetch('/v1/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
