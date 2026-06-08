// Rôle : définit tous les types TypeScript du module profil.
// Contient les DTOs retournés au client (données déchiffrées), les corps de requêtes
// entrantes (update, ajout de contact) et les règles métier sur les contacts
// (min/max par type : email, phone, address).
//
// Types partagés entre profil.controller.ts et profil.service.ts

// Les trois types de contact acceptés
export type ContactType = 'email' | 'phone' | 'address'

// ── Objets retournés au client (données déchiffrées) ──────────

// Un contact tel qu'il est envoyé au front (valeur déchiffrée)
export interface ContactDto {
  id: string
  type: ContactType
  value: string           // déchiffré (stocké chiffré en base)
  isPrimary: boolean
  label: string | null
  createdAt: string
}

// Profil complet retourné par GET /users/me
export interface ProfilDto {
  id: string
  email: string
  firstName: string       // déchiffré
  lastName: string        // déchiffré
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
  contacts: ContactDto[]
}

// Une notification (ex: réponse d'un broker à une demande de suppression)
export interface NotificationDto {
  id: string
  requestId: string | null
  message: string
  isRead: boolean
  createdAt: string
}

// ── Corps des requêtes entrantes ──────────────────────────────

// PUT /users/me — les deux champs sont optionnels mais au moins un doit être fourni
export interface UpdateProfilBody {
  firstName?: string
  lastName?: string
}

// POST /users/me/contacts
export interface CreateContactBody {
  type: ContactType
  value: string
  isPrimary?: boolean
  label?: string
}

// ── Règles métier sur les contacts ────────────────────────────
// min : nombre minimum requis (suppression refusée en dessous)
// max : nombre maximum autorisé (ajout refusé au-dessus)
export const CONTACT_LIMITS: Record<ContactType, { min: number; max: number }> = {
  email:   { min: 1, max: 5 },
  phone:   { min: 0, max: 3 },
  address: { min: 1, max: 5 },
}
