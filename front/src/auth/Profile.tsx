import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'

export default function Profile() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)
    try {
      const res = await apiFetch('/v1/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string | Record<string, string[]> }
        const msg =
          typeof data.error === 'string'
            ? data.error
            : Object.values(data.error).flat().join(', ')
        setError(msg)
        return
      }

      setSuccess('Mot de passe mis à jour avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <section className="space-y-4 rounded-lg border p-6">
        <h2 className="font-semibold">Changer de mot de passe</h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {success}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="newPassword" className="text-sm font-medium">
              Nouveau mot de passe{' '}
              <span className="text-muted-foreground">(8 caractères min.)</span>
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Mise à jour…' : 'Mettre à jour'}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-destructive/30 p-6">
        <h2 className="font-semibold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Déconnectez-vous de votre compte sur cet appareil.
        </p>
        <Button variant="destructive" className="mt-4" onClick={logout}>
          Se déconnecter
        </Button>
      </section>
    </div>
  )
}
