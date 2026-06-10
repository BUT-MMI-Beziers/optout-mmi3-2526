// ─── Types (alignés sur le schéma BDD exact) ──────────────────────────────────

export type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'REFUSED'
  | 'NO_RESPONSE'
  | 'COMPLAINT'
  | 'SUPPRESSED'

export type BrokerCategory = 'people-search' | 'marketing' | 'risk-mitigation' | 'recruitment' | 'other'
export type BrokerRegion = 'eu' | 'us' | 'global'
export type OptOutMethod = 'email' | 'form' | 'postal' | 'mixed'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type LegalBasis = 'gdpr_art17' | 'gdpr_art15' | 'ccpa' | 'pipeda' | 'other'
export type ContactType = 'email' | 'phone' | 'address'

export type NotificationType =
  | 'reminder_sent'
  | 'no_response'
  | 'completed'
  | 'refused'
  | 'suppressed'
  | 'broker_verified'
  | 'broker_added'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  birthDate?: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface UserContact {
  id: string
  userId: string
  type: ContactType
  value: string
  isPrimary: boolean
  label?: string
  createdAt: string
  updatedAt: string
}

export interface Broker {
  id: string
  name: string
  slug: string
  emailContact: string
  website: string
  optOutUrl?: string
  category: BrokerCategory
  region: BrokerRegion
  country: string
  optOutMethod: OptOutMethod
  difficulty: Difficulty
  legalBasis: LegalBasis
  notes?: string
  isVerified: boolean
  lastVerifiedAt?: string
  createdAt: string
  updatedAt: string
}

export interface RemovalRequest {
  id: string
  userId: string
  brokerId: string
  brokerName?: string
  brokerUrl?: string
  brokerCategory?: BrokerCategory
  templateId: string
  parentRequestId?: string | null
  status: RequestStatus
  scheduledAt?: string | null
  sentAt?: string | null
  respondedAt?: string | null
  nextActionAt?: string | null
  emailBody: string
  createdAt: string
  updatedAt: string
  broker?: Broker
  template?: EmailTemplate
  events?: RequestEvent[]
}

export interface EmailTemplate {
  id: string
  name: string
  legalBasis: LegalBasis
  language: 'fr' | 'en'
  subject: string
  body: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface RequestEvent {
  id: string
  requestId: string
  eventType: 'created' | 'sent' | 'reminder_sent' | 'status_changed' | 'note_added'
  oldStatus?: RequestStatus
  newStatus?: RequestStatus
  note?: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  relatedRequestId?: string
  relatedBrokerId?: string
  createdAt: string
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const statusConfig: Record<RequestStatus, { label: string; color: string; dot: string; bg: string }> = {
  DRAFT:        { label: 'Brouillon',  color: 'text-gray-500',    dot: 'bg-gray-400',    bg: 'bg-gray-100' },
  PENDING:      { label: 'En attente d\'envoi', color: 'text-violet-600', dot: 'bg-violet-500', bg: 'bg-violet-50' },
  SENT:         { label: 'Envoyée',    color: 'text-blue-600',    dot: 'bg-blue-500',    bg: 'bg-blue-50' },
  ACKNOWLEDGED: { label: 'Pris en compte', color: 'text-amber-600', dot: 'bg-amber-500', bg: 'bg-amber-50' },
  COMPLETED:    { label: 'Confirmée',  color: 'text-green-600',   dot: 'bg-green-500',   bg: 'bg-green-50' },
  REFUSED:      { label: 'Refusée',    color: 'text-red-600',     dot: 'bg-red-500',     bg: 'bg-red-50' },
  NO_RESPONSE:  { label: 'À relancer', color: 'text-orange-600',  dot: 'bg-orange-500',  bg: 'bg-orange-50' },
  COMPLAINT:    { label: 'Plainte',    color: 'text-red-800',     dot: 'bg-red-800',     bg: 'bg-red-100' },
  SUPPRESSED:   { label: 'Supprimée', color: 'text-emerald-700', dot: 'bg-emerald-600', bg: 'bg-emerald-50' },
}

export const categoryLabels: Record<BrokerCategory, string> = {
  'people-search': 'People-search',
  'marketing': 'Marketing',
  'risk-mitigation': 'Risk-mitigation',
  'recruitment': 'Recruitment',
  'other': 'Autre',
}

export const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Moyenne',
  hard: 'Difficile',
}

export const methodLabels: Record<OptOutMethod, string> = {
  email: 'Email',
  form: 'Formulaire',
  postal: 'Courrier',
  mixed: 'Mixte',
}

export const regionLabels: Record<BrokerRegion, string> = {
  eu: 'EU',
  us: 'US',
  global: 'Global',
}