// ─── Types (alignés sur le schéma BDD exact) ──────────────────────────────────

export type RequestStatus =
  | 'DRAFT'
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
  brokerName: string
  brokerUrl: string
  brokerCategory: BrokerCategory
  templateId: string
  status: RequestStatus
  sentAt: string
  respondedAt?: string
  nextActionAt?: string
  emailBody: string
  createdAt: string
  updatedAt: string
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

// ─── Mock User ────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'user-1',
  email: 'leo.martin@example.com',
  firstName: 'Léo',
  lastName: 'Martin',
  birthDate: '1995-01-01',
  role: 'user',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
}

export const mockContacts: UserContact[] = [
  {
    id: 'c1',
    userId: 'user-1',
    type: 'email',
    value: 'leo.martin@example.com',
    isPrimary: true,
    label: 'Principal',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'c2',
    userId: 'user-1',
    type: 'email',
    value: 'leo.m.pro@gmail.com',
    isPrimary: false,
    label: 'Pro',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'c3',
    userId: 'user-1',
    type: 'address',
    value: '12 rue des Lilas, 75011 Paris',
    isPrimary: true,
    label: 'Domicile',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'c4',
    userId: 'user-1',
    type: 'phone',
    value: '+33 6 12 34 56 78',
    isPrimary: true,
    label: 'Mobile',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
]

// ─── Mock Brokers ─────────────────────────────────────────────────────────────

export const mockBrokers: Broker[] = [
  {
    id: '1', name: 'Spokeo', slug: 'spokeo',
    emailContact: 'privacy@spokeo.com', website: 'spokeo.com',
    optOutUrl: 'https://www.spokeo.com/optout',
    category: 'people-search', region: 'us', country: 'US',
    optOutMethod: 'form', difficulty: 'medium', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2', name: 'Pages Blanches', slug: 'pages-blanches',
    emailContact: 'dpo@pagesblanches.fr', website: 'pagesblanches.fr',
    category: 'people-search', region: 'eu', country: 'FR',
    optOutMethod: 'email', difficulty: 'easy', legalBasis: 'gdpr_art17',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '3', name: 'Acxiom', slug: 'acxiom',
    emailContact: 'privacy@acxiom.com', website: 'acxiom.com',
    category: 'marketing', region: 'global', country: 'US',
    optOutMethod: 'email', difficulty: 'hard', legalBasis: 'gdpr_art17',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '4', name: 'Intelius', slug: 'intelius',
    emailContact: 'privacy@intelius.com', website: 'intelius.com',
    category: 'people-search', region: 'us', country: 'US',
    optOutMethod: 'form', difficulty: 'medium', legalBasis: 'ccpa',
    isVerified: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '5', name: 'LexisNexis', slug: 'lexisnexis',
    emailContact: 'privacy@lexisnexis.com', website: 'lexisnexis.com',
    category: 'risk-mitigation', region: 'global', country: 'US',
    optOutMethod: 'postal', difficulty: 'hard', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '6', name: 'BeenVerified', slug: 'beenverified',
    emailContact: 'privacy@beenverified.com', website: 'beenverified.com',
    category: 'people-search', region: 'us', country: 'US',
    optOutMethod: 'form', difficulty: 'easy', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '7', name: 'Pipl', slug: 'pipl',
    emailContact: 'privacy@pipl.com', website: 'pipl.com',
    category: 'people-search', region: 'global', country: 'IL',
    optOutMethod: 'email', difficulty: 'medium', legalBasis: 'other',
    isVerified: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '8', name: 'Clearbit', slug: 'clearbit',
    emailContact: 'privacy@clearbit.com', website: 'clearbit.com',
    category: 'marketing', region: 'global', country: 'US',
    optOutMethod: 'form', difficulty: 'easy', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '9', name: 'ZoomInfo', slug: 'zoominfo',
    emailContact: 'privacy@zoominfo.com', website: 'zoominfo.com',
    category: 'marketing', region: 'global', country: 'US',
    optOutMethod: 'form', difficulty: 'hard', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '10', name: 'Whitepages', slug: 'whitepages',
    emailContact: 'support@whitepages.com', website: 'whitepages.com',
    category: 'people-search', region: 'us', country: 'US',
    optOutMethod: 'form', difficulty: 'easy', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '11', name: 'Radaris', slug: 'radaris',
    emailContact: 'privacy@radaris.com', website: 'radaris.com',
    category: 'people-search', region: 'us', country: 'US',
    optOutMethod: 'form', difficulty: 'easy', legalBasis: 'ccpa',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '12', name: 'Hunter.io', slug: 'hunter-io',
    emailContact: 'privacy@hunter.io', website: 'hunter.io',
    category: 'recruitment', region: 'global', country: 'FR',
    optOutMethod: 'email', difficulty: 'easy', legalBasis: 'gdpr_art17',
    isVerified: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
]

// ─── Mock Templates ───────────────────────────────────────────────────────────

export const mockTemplates: EmailTemplate[] = [
  {
    id: 'tpl-1',
    name: 'gdpr_erasure_fr',
    legalBasis: 'gdpr_art17',
    language: 'fr',
    subject: 'Demande de suppression de données personnelles (RGPD art. 17)',
    body: `Madame, Monsieur,

En vertu du Règlement Général sur la Protection des Données (RGPD), article 17 — droit à l'effacement —, je vous demande par la présente la suppression définitive de l'ensemble des données personnelles me concernant que vous détenez.

Je suis : {{user.first_name}} {{user.last_name}}, {{user.email}}, domicilié(e) au {{user.address}}.

Conformément au RGPD, vous disposez d'un délai d'un mois pour donner suite à cette demande (art. 12). Passé ce délai, je me réserve le droit de saisir la CNIL.

Cordialement,
{{user.first_name}} {{user.last_name}}`,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tpl-2',
    name: 'gdpr_erasure_en',
    legalBasis: 'gdpr_art17',
    language: 'en',
    subject: 'Request for deletion of personal data (GDPR art. 17)',
    body: `Dear Sir/Madam,

Pursuant to the General Data Protection Regulation (GDPR), Article 17 — right to erasure —, I hereby request the permanent deletion of all personal data you hold concerning me.

I am: {{user.first_name}} {{user.last_name}}, {{user.email}}, residing at {{user.address}}.

In accordance with the GDPR, you have one month to comply with this request (art. 12). After this deadline, I reserve the right to lodge a complaint with the relevant data protection authority.

Yours faithfully,
{{user.first_name}} {{user.last_name}}`,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

// ─── Mock Requests ────────────────────────────────────────────────────────────

export const mockRequests: RemovalRequest[] = [
  {
    id: 'req-1', userId: 'user-1', brokerId: '1', brokerName: 'Spokeo', brokerUrl: 'spokeo.com',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'SENT',
    sentAt: '2026-05-26T10:00:00Z', nextActionAt: '2026-06-25T10:00:00Z',
    emailBody: '', createdAt: '2026-05-26T09:55:00Z', updatedAt: '2026-05-26T10:00:00Z',
  },
  {
    id: 'req-2', userId: 'user-1', brokerId: '1', brokerName: 'Spokeo', brokerUrl: 'spokeo.com',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'SENT',
    sentAt: '2026-05-26T10:01:00Z',
    emailBody: '', createdAt: '2026-05-26T09:56:00Z', updatedAt: '2026-05-26T10:01:00Z',
  },
  {
    id: 'req-3', userId: 'user-1', brokerId: '2', brokerName: 'Pages Blanches', brokerUrl: 'pagesblanches.fr',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'ACKNOWLEDGED',
    sentAt: '2026-05-20T09:00:00Z', respondedAt: '2026-05-22T14:00:00Z',
    emailBody: '', createdAt: '2026-05-20T09:00:00Z', updatedAt: '2026-05-22T14:00:00Z',
  },
  {
    id: 'req-4', userId: 'user-1', brokerId: '2', brokerName: 'Pages Blanches', brokerUrl: 'pagesblanches.fr',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'ACKNOWLEDGED',
    sentAt: '2026-05-20T09:01:00Z',
    emailBody: '', createdAt: '2026-05-20T09:01:00Z', updatedAt: '2026-05-22T14:01:00Z',
  },
  {
    id: 'req-5', userId: 'user-1', brokerId: '3', brokerName: 'Acxiom', brokerUrl: 'acxiom.com',
    brokerCategory: 'marketing', templateId: 'tpl-1', status: 'NO_RESPONSE',
    sentAt: '2026-04-20T09:00:00Z', nextActionAt: '2026-05-28T09:00:00Z',
    emailBody: '', createdAt: '2026-04-20T09:00:00Z', updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'req-6', userId: 'user-1', brokerId: '3', brokerName: 'Acxiom', brokerUrl: 'acxiom.com',
    brokerCategory: 'marketing', templateId: 'tpl-1', status: 'NO_RESPONSE',
    sentAt: '2026-04-18T09:00:00Z', nextActionAt: '2026-05-27T09:00:00Z',
    emailBody: '', createdAt: '2026-04-18T09:00:00Z', updatedAt: '2026-05-18T09:00:00Z',
  },
  {
    id: 'req-7', userId: 'user-1', brokerId: '5', brokerName: 'LexisNexis', brokerUrl: 'lexisnexis.com',
    brokerCategory: 'risk-mitigation', templateId: 'tpl-1', status: 'COMPLETED',
    sentAt: '2026-04-10T09:00:00Z', respondedAt: '2026-04-28T09:00:00Z',
    emailBody: '', createdAt: '2026-04-10T09:00:00Z', updatedAt: '2026-04-28T09:00:00Z',
  },
  {
    id: 'req-8', userId: 'user-1', brokerId: '5', brokerName: 'LexisNexis', brokerUrl: 'lexisnexis.com',
    brokerCategory: 'risk-mitigation', templateId: 'tpl-1', status: 'COMPLETED',
    sentAt: '2026-04-10T09:01:00Z', respondedAt: '2026-04-30T09:00:00Z',
    emailBody: '', createdAt: '2026-04-10T09:01:00Z', updatedAt: '2026-04-30T09:00:00Z',
  },
  {
    id: 'req-9', userId: 'user-1', brokerId: '6', brokerName: 'BeenVerified', brokerUrl: 'beenverified.com',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'REFUSED',
    sentAt: '2026-04-05T09:00:00Z', respondedAt: '2026-04-15T09:00:00Z',
    emailBody: '', createdAt: '2026-04-05T09:00:00Z', updatedAt: '2026-04-15T09:00:00Z',
  },
  {
    id: 'req-10', userId: 'user-1', brokerId: '9', brokerName: 'ZoomInfo', brokerUrl: 'zoominfo.com',
    brokerCategory: 'marketing', templateId: 'tpl-1', status: 'DRAFT',
    sentAt: '2026-05-26T11:00:00Z',
    emailBody: '', createdAt: '2026-05-26T11:00:00Z', updatedAt: '2026-05-26T11:00:00Z',
  },
  {
    id: 'req-11', userId: 'user-1', brokerId: '10', brokerName: 'Whitepages', brokerUrl: 'whitepages.com',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'SENT',
    sentAt: '2026-05-25T09:00:00Z',
    emailBody: '', createdAt: '2026-05-25T09:00:00Z', updatedAt: '2026-05-25T09:00:00Z',
  },
  {
    id: 'req-12', userId: 'user-1', brokerId: '11', brokerName: 'Radaris', brokerUrl: 'radaris.com',
    brokerCategory: 'people-search', templateId: 'tpl-1', status: 'SENT',
    sentAt: '2026-05-25T09:01:00Z',
    emailBody: '', createdAt: '2026-05-25T09:01:00Z', updatedAt: '2026-05-25T09:01:00Z',
  },
]

// ─── Mock Events ──────────────────────────────────────────────────────────────

export const mockEvents: RequestEvent[] = [
  { id: 'e1', requestId: 'req-1', eventType: 'created', note: 'Demande créée', createdAt: '2026-05-26T09:55:00Z' },
  { id: 'e2', requestId: 'req-1', eventType: 'sent', newStatus: 'SENT', note: 'Email envoyé à privacy@spokeo.com', createdAt: '2026-05-26T10:00:00Z' },
  { id: 'e3', requestId: 'req-5', eventType: 'created', note: 'Demande créée', createdAt: '2026-04-20T09:00:00Z' },
  { id: 'e4', requestId: 'req-5', eventType: 'sent', newStatus: 'SENT', note: 'Email envoyé à privacy@acxiom.com', createdAt: '2026-04-20T09:05:00Z' },
  { id: 'e5', requestId: 'req-5', eventType: 'status_changed', oldStatus: 'SENT', newStatus: 'NO_RESPONSE', note: 'Aucune réponse après 30 jours — relance automatique envoyée', createdAt: '2026-05-20T09:05:00Z' },
  { id: 'e6', requestId: 'req-5', eventType: 'reminder_sent', note: 'Relance envoyée à privacy@acxiom.com', createdAt: '2026-05-20T09:06:00Z' },
  { id: 'e7', requestId: 'req-7', eventType: 'created', note: 'Demande créée', createdAt: '2026-04-10T09:00:00Z' },
  { id: 'e8', requestId: 'req-7', eventType: 'sent', newStatus: 'SENT', note: 'Email envoyé à privacy@lexisnexis.com', createdAt: '2026-04-10T09:05:00Z' },
  { id: 'e9', requestId: 'req-7', eventType: 'status_changed', oldStatus: 'SENT', newStatus: 'COMPLETED', note: 'Suppression confirmée par LexisNexis', createdAt: '2026-04-28T09:00:00Z' },
]

// ─── Bar chart data ───────────────────────────────────────────────────────────

export const mockBarChartData = [
  { month: 'Jan', envoyees: 2, confirmees: 1 },
  { month: 'Fév', envoyees: 3, confirmees: 2 },
  { month: 'Mar', envoyees: 4, confirmees: 1 },
  { month: 'Avr', envoyees: 6, confirmees: 3 },
  { month: 'Mai', envoyees: 8, confirmees: 2 },
  { month: 'Juin', envoyees: 5, confirmees: 4 },
]

// ─── Labels ───────────────────────────────────────────────────────────────────

export const statusConfig: Record<RequestStatus, { label: string; color: string; dot: string; bg: string }> = {
  DRAFT:        { label: 'Brouillon',  color: 'text-gray-500',    dot: 'bg-gray-400',    bg: 'bg-gray-100' },
  SENT:         { label: 'Envoyée',    color: 'text-blue-600',    dot: 'bg-blue-500',    bg: 'bg-blue-50' },
  ACKNOWLEDGED: { label: 'En attente', color: 'text-amber-600',   dot: 'bg-amber-500',   bg: 'bg-amber-50' },
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