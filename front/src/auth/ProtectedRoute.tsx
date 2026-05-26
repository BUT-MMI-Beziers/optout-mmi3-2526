import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <span className="text-sm text-muted-foreground">Chargement…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
