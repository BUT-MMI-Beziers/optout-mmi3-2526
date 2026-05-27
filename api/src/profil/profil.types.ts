// ── Enums ─────────────────────────────────────────────────────

export type ContactType = 'email' | 'phone' | 'address'

// ── Entités de réponse (déchiffrées, envoyées au client) ──────

export interface ContactDto {
  id: string
  type: ContactType
  value: string
  isPrimary: boolean
  label: string | null
  createdAt: string
}

export interface ProfilDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
  contacts: ContactDto[]
}

export interface NotificationDto {
  id: string
  requestId: string | null
  message: string
  isRead: boolean
  createdAt: string
}

// ── Corps des requêtes (input) ────────────────────────────────

export interface UpdateProfilBody {
  firstName?: string
  lastName?: string
}

export interface CreateContactBody {
  type: ContactType
  value: string
  isPrimary?: boolean
  label?: string
}

// ── Limites métier ────────────────────────────────────────────

export const CONTACT_LIMITS: Record<ContactType, { min: number; max: number }> = {
  email:   { min: 1, max: 5 },
  phone:   { min: 0, max: 3 },
  address: { min: 1, max: 5 },
}
