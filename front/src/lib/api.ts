/**
 * Couche API — tous les appels passent ici.
 * Les fallbacks sont vides ([], null) — sans API qui tourne, les pages seront vides.
 */
import {
  type User,
  type UserContact,
  type Broker,
  type RemovalRequest,
  type RequestEvent,
  type EmailTemplate,
  type RequestStatus,
  type BrokerCategory,
  type BrokerRegion,
  type Difficulty,
} from '@/lib/mock-data'

const BASE = '/api/v1'

// Verrou singleton — un seul refresh à la fois.
// Si plusieurs appels 401 arrivent en parallèle, ils attendent tous la même
// promesse au lieu de lancer chacun leur refresh (race condition → déconnexion forcée).
let refreshing: Promise<boolean> | null = null

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(r => r.ok)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

// Fetch générique avec refresh automatique — utilisable depuis n'importe quelle page.
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  }
  let res = await fetch(url, opts)
  if (res.status === 401) {
    const ok = await refreshOnce()
    if (!ok) { window.location.href = '/login'; return res }
    res = await fetch(url, opts)
  }
  return res
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallback: T
): Promise<T> {
  try {
    const opts: RequestInit = {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    }
    let res = await fetch(`${BASE}${path}`, opts)

    if (res.status === 401) {
      const ok = await refreshOnce()
      if (!ok) { window.location.href = '/login'; return fallback }
      res = await fetch(`${BASE}${path}`, opts)
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

// ─── Paginated response shape ─────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  lastPage: number
}

export type PaginatedBrokers = Paginated<Broker>
export type PaginatedRequests = Paginated<RemovalRequest>

// ─── Utilisateur ──────────────────────────────────────────────────────────────

export async function getMe(): Promise<User | null> {
  return request<User | null>('/users/me', {}, null)
}

export async function getContacts(): Promise<UserContact[]> {
  return request<UserContact[]>('/users/me/contacts', {}, [])
}

// ─── Brokers ──────────────────────────────────────────────────────────────────

export interface BrokersParams {
  page?: number
  perPage?: number
  category?: BrokerCategory | 'all'
  region?: BrokerRegion | 'all'
  difficulty?: Difficulty | 'all'
  search?: string
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'all') q.set(k, String(v))
  }
  return q.toString()
}

export async function getBrokers(params: BrokersParams = {}): Promise<Paginated<Broker>> {
  const { page = 1, perPage = 12, category, region, difficulty, search } = params
  const fallback: Paginated<Broker> = { data: [], total: 0, page, lastPage: 1 }

  const q = buildQuery({ page, per_page: perPage, category, region, difficulty, search })
  // API réelle retourne { data, total, currentPage, lastPage }
  const raw = await request<{ data: Broker[]; total: number; currentPage: number; lastPage: number }>(
    `/brokers?${q}`, {}, { data: [], total: 0, currentPage: page, lastPage: 1 }
  )
  return { data: raw.data, total: raw.total, page: raw.currentPage, lastPage: raw.lastPage }
}

export async function getBroker(slug: string): Promise<Broker | null> {
  return request<Broker | null>(`/brokers/${slug}`, {}, null)
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<EmailTemplate[]> {
  // API réelle retourne { data: EmailTemplate[], count }
  const raw = await request<{ data: EmailTemplate[]; count: number }>(
    '/templates', {}, { data: [], count: 0 }
  )
  return raw.data
}

export async function getTemplate(id: string): Promise<EmailTemplate | null> {
  // API réelle retourne { data: EmailTemplate }
  const raw = await request<{ data: EmailTemplate } | null>(`/templates/${id}`, {}, null)
  return raw?.data ?? null
}

// ─── Demandes ─────────────────────────────────────────────────────────────────

export interface RequestsParams {
  page?: number
  perPage?: number
  status?: RequestStatus | 'all'
  search?: string
  brokerId?: string
}

export async function getRequests(params: RequestsParams = {}): Promise<Paginated<RemovalRequest>> {
  const { page = 1, perPage = 12, status, search, brokerId } = params

  const q = buildQuery({ page, per_page: perPage, status, search, broker_id: brokerId })
  const raw = await request<{ data: RemovalRequest[]; total: number; page: number; limit: number; totalPages: number }>(
    `/requests?${q}`,
    {},
    { data: [], total: 0, page, limit: perPage, totalPages: 1 }
  )
  return { data: raw.data, total: raw.total, page: raw.page, lastPage: raw.totalPages }
}

export async function getRequest(id: string): Promise<RemovalRequest | null> {
  // API réelle retourne { data: { ...request, broker, template, events } }
  const raw = await request<{ data: RemovalRequest } | null>(`/requests/${id}`, {}, null)
  return raw?.data ?? null
}

export async function getRequestEvents(id: string): Promise<RequestEvent[]> {
  // API réelle retourne { data: RequestEvent[] }
  const raw = await request<{ data: RequestEvent[] }>(`/requests/${id}/events`, {}, { data: [] })
  return raw.data
}

export async function getEmailPreview(requestId: string): Promise<string> {
  // API réelle retourne { data: { subject, body } }
  const raw = await request<{ data: { subject: string; body: string } }>(
    `/requests/${requestId}/preview`,
    {},
    { data: { subject: '', body: '[Aperçu non disponible]' } }
  )
  if (!raw.data.subject && !raw.data.body) return '[Aperçu non disponible]'
  return `Objet : ${raw.data.subject}\n\n${raw.data.body}`
}

export async function sendReminder(
  requestId: string,
  delayDays: number
): Promise<RemovalRequest | null> {
  const raw = await request<{ data: RemovalRequest } | null>(
    `/requests/${requestId}/remind`,
    { method: 'POST', body: JSON.stringify({ delayDays }) },
    null
  )
  return raw?.data ?? null
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  userId: string
  requestId?: string
  message: string
  isRead: boolean
  createdAt: string
}

export async function getNotifications(): Promise<AppNotification[]> {
  return request<AppNotification[]>('/users/me/notifications', {}, [])
}

export async function markNotificationRead(id: string): Promise<void> {
  await request<unknown>(`/users/me/notifications/${id}`, { method: 'PATCH' }, null)
}

export async function sendBatch(payload: {
  brokerIds: string[]
  templateId: string
}): Promise<{ success: boolean; created: number; failed: number; createdIds: string[] }> {
  const raw = await request<{ message: string; data: { created: { id: string }[]; failed: unknown[] } } | null>(
    '/requests/batch',
    {
      method: 'POST',
      body: JSON.stringify({ templateId: payload.templateId, brokerIds: payload.brokerIds }),
    },
    null
  )
  if (!raw) return { success: false, created: 0, failed: payload.brokerIds.length, createdIds: [] }
  const createdIds = raw.data.created.map((r) => r.id)
  const failed = raw.data.failed.length
  return { success: failed === 0, created: createdIds.length, failed, createdIds }
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<RemovalRequest | null> {
  const raw = await request<{ data: RemovalRequest } | null>(
    `/requests/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    null
  )
  return raw?.data ?? null
}

export async function archiveRequest(id: string, archived: boolean): Promise<boolean> {
  const res = await apiFetch(`${BASE}/requests/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  })
  return res.ok
}

export async function cancelRequest(id: string): Promise<boolean> {
  const raw = await request<{ message: string } | null>(
    `/requests/${id}`,
    { method: 'DELETE' },
    null
  )
  return raw !== null
}

// ─── Stats (dashboard) ────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number
  sentTotal: number
  awaiting: number
  confirmed: number
  toFollowUp: number
  refused: number
  responseRate: number
}

interface RawStats {
  total: number
  byStatus: {
    DRAFT: number; PENDING: number; SENT: number; ACKNOWLEDGED: number; COMPLETED: number
    REFUSED: number; NO_RESPONSE: number; COMPLAINT: number; SUPPRESSED: number
  }
  avgResponseDays: number | null
}

export async function getStats(): Promise<DashboardStats> {
  const fallback: RawStats = {
    total: 0,
    byStatus: {
      DRAFT: 0, PENDING: 0, SENT: 0, ACKNOWLEDGED: 0, COMPLETED: 0,
      REFUSED: 0, NO_RESPONSE: 0, COMPLAINT: 0, SUPPRESSED: 0,
    },
    avgResponseDays: null,
  }
  // API réelle renvoie { data: { total, byStatus, avgResponseDays } }
  const raw = await request<{ data: RawStats }>('/stats', {}, { data: fallback })
  const d = raw.data ?? fallback
  const b = d.byStatus
  const sentTotal = b.SENT + b.ACKNOWLEDGED + b.COMPLETED + b.REFUSED + b.NO_RESPONSE + b.COMPLAINT + b.SUPPRESSED
  const awaiting = b.SENT + b.ACKNOWLEDGED
  const confirmed = b.COMPLETED + b.SUPPRESSED
  const refused = b.REFUSED + b.COMPLAINT
  const responded = confirmed + refused
  return {
    total: d.total,
    sentTotal,
    awaiting,
    confirmed,
    toFollowUp: b.NO_RESPONSE,
    refused,
    responseRate: sentTotal > 0 ? Math.round((responded / sentTotal) * 100) : 0,
  }
}

// ─── Préférences (paramètres) ───────────────────────────────────────────────

export interface UserPreferences {
  notifications: {
    confirmation: boolean
    relance: boolean
    refus: boolean
  }
  reminders: {
    enabled: boolean
    delayDays: number
  }
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: { confirmation: true, relance: true, refus: true },
  reminders: { enabled: true, delayDays: 30 },
}

// Patch partiel — on n'envoie que ce qui change (un toggle ou le délai).
export interface PreferencesPatch {
  notifications?: Partial<UserPreferences['notifications']>
  reminders?: Partial<UserPreferences['reminders']>
}

export async function getPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>('/users/me/preferences', {}, DEFAULT_PREFERENCES)
}

export async function updatePreferences(patch: PreferencesPatch): Promise<UserPreferences | null> {
  return request<UserPreferences | null>(
    '/users/me/preferences',
    { method: 'PATCH', body: JSON.stringify(patch) },
    null,
  )
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface ActiveSession {
  id: string
  device: string | null
  location: string | null
  ip: string | null
  createdAt: string
  lastSeenAt: string
  current: boolean
}

export async function getSessions(): Promise<ActiveSession[]> {
  return request<ActiveSession[]>('/auth/sessions', {}, [])
}

export async function revokeSession(id: string): Promise<void> {
  await request<null>(`/auth/sessions/${id}`, { method: 'DELETE' }, null)
}

export async function revokeOtherSessions(): Promise<void> {
  await request<null>('/auth/sessions', { method: 'DELETE' }, null)
}
