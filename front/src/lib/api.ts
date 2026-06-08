/**
 * Couche API — tous les appels passent ici.
 * Si l'API n'est pas encore disponible, on retombe sur les données mockées.
 * Quand le backend répond, le fallback est ignoré automatiquement.
 */
import {
  mockUser,
  mockContacts,
  mockBrokers,
  mockRequests,
  mockEvents,
  mockTemplates,
  type User,
  type UserContact,
  type Broker,
  type RemovalRequest,
  type RequestEvent,
  type EmailTemplate,
  type RequestStatus,
  type BrokerCategory,
  type BrokerRegion,
} from '@/lib/mock-data'

const BASE = '/api/v1'

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallback: T
): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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

export async function getMe(): Promise<User> {
  return request<User>('/users/me', {}, mockUser)
}

export async function getContacts(): Promise<UserContact[]> {
  return request<UserContact[]>('/users/me/contacts', {}, mockContacts)
}

// ─── Brokers ──────────────────────────────────────────────────────────────────

export interface BrokersParams {
  page?: number
  perPage?: number
  category?: BrokerCategory | 'all'
  region?: BrokerRegion | 'all'
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
  const { page = 1, perPage = 12, category, region, search } = params

  const filtered = mockBrokers.filter((b) => {
    const okCat = !category || category === 'all' || b.category === category
    const okReg = !region || region === 'all' || b.region === region
    const okSearch = !search || b.name.toLowerCase().includes(search.toLowerCase())
    return okCat && okReg && okSearch
  })
  const fallback: Paginated<Broker> = {
    data: filtered.slice((page - 1) * perPage, page * perPage),
    total: filtered.length,
    page,
    lastPage: Math.max(1, Math.ceil(filtered.length / perPage)),
  }

  const q = buildQuery({ page, per_page: perPage, category, region, search })
  return request<Paginated<Broker>>(`/brokers?${q}`, {}, fallback)
}

export async function getBroker(slug: string): Promise<Broker | null> {
  const fallback = mockBrokers.find((b) => b.slug === slug) ?? null
  return request<Broker | null>(`/brokers/${slug}`, {}, fallback)
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<EmailTemplate[]> {
  return request<EmailTemplate[]>('/templates', {}, mockTemplates)
}

export async function getTemplate(id: string): Promise<EmailTemplate | null> {
  const fallback = mockTemplates.find((t) => t.id === id) ?? null
  return request<EmailTemplate | null>(`/templates/${id}`, {}, fallback)
}

// ─── Demandes ─────────────────────────────────────────────────────────────────

export interface RequestsParams {
  page?: number
  perPage?: number
  status?: RequestStatus | 'all'
  search?: string
}

export async function getRequests(params: RequestsParams = {}): Promise<Paginated<RemovalRequest>> {
  const { page = 1, perPage = 12, status, search } = params

  const filtered = mockRequests.filter((r) => {
    const okStatus = !status || status === 'all' || r.status === status
    const okSearch = !search || r.brokerName.toLowerCase().includes(search.toLowerCase())
    return okStatus && okSearch
  })
  const fallback: Paginated<RemovalRequest> = {
    data: filtered.slice((page - 1) * perPage, page * perPage),
    total: filtered.length,
    page,
    lastPage: Math.max(1, Math.ceil(filtered.length / perPage)),
  }

  const q = buildQuery({ page, per_page: perPage, status, search })
  return request<Paginated<RemovalRequest>>(`/requests?${q}`, {}, fallback)
}

export async function getRequest(id: string): Promise<RemovalRequest | null> {
  const fallback = mockRequests.find((r) => r.id === id) ?? null
  return request<RemovalRequest | null>(`/requests/${id}`, {}, fallback)
}

export async function getRequestEvents(id: string): Promise<RequestEvent[]> {
  const fallback = mockEvents.filter((e) => e.requestId === id)
  return request<RequestEvent[]>(`/requests/${id}/events`, {}, fallback)
}

export async function getEmailPreview(requestId: string): Promise<string> {
  const req = mockRequests.find((r) => r.id === requestId)
  const tpl = req ? mockTemplates.find((t) => t.id === req.templateId) : null
  const address = mockContacts.find((c) => c.type === 'address' && c.userId === mockUser.id)?.value ?? ''
  const filledBody = tpl
    ? tpl.body
        .replace(/\{\{user\.first_name\}\}/g, mockUser.firstName)
        .replace(/\{\{user\.last_name\}\}/g, mockUser.lastName)
        .replace(/\{\{user\.email\}\}/g, mockUser.email)
        .replace(/\{\{user\.address\}\}/g, address)
    : null
  const fallback = filledBody && req && tpl
    ? `À : ${req.brokerUrl}\nObjet : ${tpl.subject}\n\n${filledBody}`
    : '[Aperçu non disponible]'
  return request<string>(`/requests/${requestId}/preview`, {}, fallback)
}

export async function sendReminder(requestId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/requests/${requestId}/remind`,
    { method: 'POST' },
    { success: true }
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
  const fallback: AppNotification[] = mockRequests
    .filter((r) => r.status === 'NO_RESPONSE' || r.status === 'REFUSED')
    .map((r, i) => ({
      id: `notif-${i}`,
      title: r.status === 'NO_RESPONSE' ? 'Relance requise' : 'Demande refusée',
      message: r.status === 'NO_RESPONSE'
        ? `${r.brokerName} n'a pas répondu depuis 30 jours.`
        : `${r.brokerName} a refusé votre demande de suppression.`,
      type: r.status === 'NO_RESPONSE' ? 'warning' : 'info',
      read: false,
      requestId: r.id,
      createdAt: r.nextActionAt ?? r.sentAt,
    }))
  return request<AppNotification[]>('/notifications', {}, fallback)
}

// Crée un brouillon puis l'envoie immédiatement (flow batch)
export async function sendBatch(payload: {
  brokerIds: string[]
  templateId: string
}): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    '/requests/batch',
    { method: 'POST', body: JSON.stringify({ broker_ids: payload.brokerIds, template_id: payload.templateId }) },
    { success: true } // mock : on simule toujours le succès
  )
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<RemovalRequest | null> {
  const fallback = mockRequests.find((r) => r.id === id) ?? null
  return request<RemovalRequest | null>(
    `/requests/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    fallback
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
  const total = mockRequests.length
  const completed = mockRequests.filter((r) => r.status === 'COMPLETED').length
  const fallback: DashboardStats = {
    total,
    sent: mockRequests.filter((r) => r.status === 'SENT').length,
    acknowledged: mockRequests.filter((r) => r.status === 'ACKNOWLEDGED').length,
    completed,
    noResponse: mockRequests.filter((r) => r.status === 'NO_RESPONSE').length,
    refused: mockRequests.filter((r) => r.status === 'REFUSED').length,
    responseRate: Math.round((completed / total) * 100),
  }
  return request<DashboardStats>('/stats', {}, fallback)
}
