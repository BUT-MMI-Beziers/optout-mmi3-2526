import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================
// PRÉFÉRENCES UTILISATEUR (stockées en JSONB sur users)
// Catégories de notifs alignées sur de vrais évènements backend :
//  - confirmation : demande complétée / ajout liste suppression
//  - relance      : relance auto 30j, relance programmée, mise en demeure 60j
//  - refus        : broker qui refuse la demande
// reminders.delayDays pilote le scheduler de relance automatique.
// ============================================================

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

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const contactTypeEnum = pgEnum('contact_type', ['email', 'phone', 'address'])

export const brokerCategoryEnum = pgEnum('broker_category', [
  'people-search',
  'marketing',
  'risk-mitigation',
  'recruitment',
  'other',
])

export const brokerRegionEnum = pgEnum('broker_region', ['eu', 'us', 'global'])

export const optOutMethodEnum = pgEnum('opt_out_method', ['email', 'form', 'mixed'])

export const brokerDifficultyEnum = pgEnum('broker_difficulty', ['easy', 'medium', 'hard'])

export const legalBasisEnum = pgEnum('legal_basis', [
  'gdpr_art17',
  'gdpr_art15',
  'ccpa',
  'pipeda',
  'other',
])

export const requestStatusEnum = pgEnum('request_status', [
  'DRAFT',
  'PENDING',
  'SENT',
  'ACKNOWLEDGED',
  'COMPLETED',
  'REFUSED',
  'NO_RESPONSE',
  'COMPLAINT',
  'SUPPRESSED',
])

export const eventTypeEnum = pgEnum('event_type', [
  'created',
  'sent',
  'reminder_sent',
  'status_changed',
  'note_added',
])

// ============================================================
// TABLE : users
// Comptes utilisateurs — champs sensibles chiffrés AES-256
// via APP_ENCRYPTION_KEY dans .env
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  totpSecret: text('totp_secret'),            // chiffré AES-256-GCM
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  totpLastCounter: integer('totp_last_counter'), // anti-replay : dernier compteur TOTP utilisé
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default(DEFAULT_PREFERENCES),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : user_contacts
// Emails, téléphones, adresses de l'utilisateur — chiffrés
// ============================================================

export const userContacts = pgTable('user_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: contactTypeEnum('type').notNull(),
  value: text('value').notNull(),              // chiffré AES-256
  isPrimary: boolean('is_primary').notNull().default(false),
  label: varchar('label', { length: 50 }),     // ex: domicile, pro, ancien
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : brokers
// Registre communautaire des data brokers
// Seed requis : 30 brokers EU + 20 internationaux
// ============================================================

export const brokers = pgTable('brokers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  emailContact: varchar('email_contact', { length: 255 }).notNull(),
  website: varchar('website', { length: 500 }),
  optOutUrl: varchar('opt_out_url', { length: 500 }),
  category: brokerCategoryEnum('category').notNull(),
  region: brokerRegionEnum('region').notNull(),
  country: varchar('country', { length: 2 }),
  optOutMethod: optOutMethodEnum('opt_out_method').notNull(),
  difficulty: brokerDifficultyEnum('difficulty').notNull(),
  legalBasis: legalBasisEnum('legal_basis').notNull(),
  notes: text('notes'),
  isVerified: boolean('is_verified').notNull().default(false),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : totp_challenges
// Tokens temporaires (5 min, usage unique) émis lors du login
// quand la 2FA est active — échangés contre les vrais cookies
// après vérification du code TOTP.
// ============================================================

// ============================================================
// TABLE : passkey_credentials
// Clés WebAuthn (passkeys) enregistrées par l'utilisateur
// ============================================================

export const passkeyCredentials = pgTable('passkey_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),  // base64url
  publicKey: text('public_key').notNull(),                 // base64url
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  deviceType: varchar('device_type', { length: 32 }),      // 'platform' | 'cross-platform'
  backedUp: boolean('backed_up').notNull().default(false),
  transports: text('transports'),                          // JSON array
  name: varchar('name', { length: 100 }),                  // ex: "MacBook Touch ID"
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
})

// ============================================================
// TABLE : totp_challenges
export const totpChallenges = pgTable('totp_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
})

// ============================================================
// TABLE : user_sessions
// Sessions actives — créées à chaque login/register
// sessionId embarqué dans le JWT pour identifier la session courante
// ============================================================

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  device: varchar('device', { length: 255 }),    // ex: "MacBook · Chrome 124"
  location: varchar('location', { length: 255 }), // placeholder — pas de géoloc en dev
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : email_templates
// Templates RGPD pour les demandes de suppression
// Requis : gdpr_art17 (FR+EN), gdpr_art15 (FR), relance, mise en demeure
// Variables : {{user.first_name}}, {{broker.name}}, {{request.id}}, etc.
// ============================================================

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  legalBasis: legalBasisEnum('legal_basis').notNull(),
  language: varchar('language', { length: 5 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : removal_requests
// Demandes de suppression — machine à états :
// DRAFT → SENT → ACKNOWLEDGED → COMPLETED
//                            └→ REFUSED → COMPLAINT
//              └→ NO_RESPONSE → SENT (relance) | COMPLAINT
//              └→ SUPPRESSED
// ============================================================

export const removalRequests = pgTable('removal_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brokerId: uuid('broker_id').notNull().references(() => brokers.id, { onDelete: 'restrict' }),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id, { onDelete: 'restrict' }),
  status: requestStatusEnum('status').notNull().default('DRAFT'),
  // Si renseigné, cette demande est une relance d'une demande initiale (→ template relance)
  parentRequestId: uuid('parent_request_id'),
  scheduledAt: timestamp('scheduled_at'),      // date d'envoi planifié (PENDING → SENT)
  sentAt: timestamp('sent_at'),                // date d'envoi effectif
  respondedAt: timestamp('responded_at'),      // date de réponse du broker
  nextActionAt: timestamp('next_action_at'),   // prochaine relance (utilisé par le scheduler)
  emailBody: text('email_body').notNull(),     // corps généré conservé pour traçabilité
  archivedAt: timestamp('archived_at'),        // null = active, valeur = archivée (lecture seule)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : request_events
// Journal d'audit de chaque demande (historique complet)
// ============================================================

export const requestEvents = pgTable('request_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => removalRequests.id, { onDelete: 'cascade' }),
  eventType: eventTypeEnum('event_type').notNull(),
  oldStatus: requestStatusEnum('old_status'),  // renseigné pour status_changed
  newStatus: requestStatusEnum('new_status'),  // renseigné pour status_changed
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// TABLE : notifications
// Notifications in-app (relances auto, changements de statut,
// dépassement du délai légal de 30 jours)
// ============================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').references(() => removalRequests.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// RELATIONS (pour les requêtes Drizzle avec .with())
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(userContacts),
  removalRequests: many(removalRequests),
  notifications: many(notifications),
  sessions: many(userSessions),
}))

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}))

export const userContactsRelations = relations(userContacts, ({ one }) => ({
  user: one(users, { fields: [userContacts.userId], references: [users.id] }),
}))

export const brokersRelations = relations(brokers, ({ many }) => ({
  removalRequests: many(removalRequests),
}))

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  removalRequests: many(removalRequests),
}))

export const removalRequestsRelations = relations(removalRequests, ({ one, many }) => ({
  user: one(users, { fields: [removalRequests.userId], references: [users.id] }),
  broker: one(brokers, { fields: [removalRequests.brokerId], references: [brokers.id] }),
  template: one(emailTemplates, { fields: [removalRequests.templateId], references: [emailTemplates.id] }),
  events: many(requestEvents),
  notifications: many(notifications),
}))

export const requestEventsRelations = relations(requestEvents, ({ one }) => ({
  request: one(removalRequests, { fields: [requestEvents.requestId], references: [removalRequests.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  request: one(removalRequests, { fields: [notifications.requestId], references: [removalRequests.id] }),
}))

