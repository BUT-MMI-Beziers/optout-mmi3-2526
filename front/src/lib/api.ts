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
const token = () => localStorage.getItem('token') ?? ''

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallback: T
): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
        ...options.headers,
      },
    })
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
  const fallback = { data: [], total: 0, page, limit: perPage, totalPages: 1 }

  const q = buildQuery({ page, per_page: perPage, status, search, broker_id: brokerId })
  // API réelle retourne { data, total, page, limit, totalPages }
  const raw = await request<{ data: RemovalRequest[]; total: number; page: number; limit: number; totalPages: number }>(
    `/requests?${q}`, {}, fallback
  )
  return { data: raw.data, total: raw.total, page: raw.page, lastPage: raw.totalPages }
}

export async function getRequest(id: string): Promise<RemovalRequest | null> {
  // API réelle retourne { data: { ...request, broker, template, events } }
  const raw = await request<{ data: RemovalRequest } | null>(`/requests/${id}`, {}, null)
  return raw?.data ?? null
}

export async function getRequestEvents(id: string): Promise<RequestEvent[]> {
  return request<RequestEvent[]>(`/requests/${id}/events`, {}, [])
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

export async function sendReminder(requestId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/requests/${requestId}/remind`,
    { method: 'POST' },
    { success: false }
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'warning' | 'info' | 'success'
  read: boolean
  requestId?: string
  createdAt: string
}

export async function getNotifications(): Promise<AppNotification[]> {
  return request<AppNotification[]>('/notifications', {}, [])
}

// Crée et envoie les demandes en batch
export async function sendBatch(payload: {
  brokerIds: string[]
  templateId: string
}): Promise<{ success: boolean }> {
  // API réelle attend { userId, templateId, brokerIds } en camelCase
  const user = await getMe()
  if (!user) return { success: false }

  const raw = await request<{ message: string; data: { created: number; failed: number } } | null>(
    '/requests/batch',
    {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        templateId: payload.templateId,
        brokerIds: payload.brokerIds,
      }),
    },
    null
  )
  return { success: raw !== null && raw.data.failed === 0 }
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<RemovalRequest | null> {
  return request<RemovalRequest | null>(
    `/requests/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    null
  )
}

// ─── Stats (dashboard) ────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number
  sent: number
  acknowledged: number
  completed: number
  noResponse: number
  refused: number
  responseRate: number
}

export async function getStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/stats', {}, {
    total: 0, sent: 0, acknowledged: 0, completed: 0,
    noResponse: 0, refused: 0, responseRate: 0,
  })
}
