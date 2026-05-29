import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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

export const optOutMethodEnum = pgEnum('opt_out_method', ['email', 'form', 'postal', 'mixed'])

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
  sentAt: timestamp('sent_at'),           // date d'envoi effectif
  respondedAt: timestamp('responded_at'),      // date de réponse du broker
  nextActionAt: timestamp('next_action_at'),    // prochaine relance (utilisé par le scheduler)
  emailBody: text('email_body').notNull(),   // corps généré conservé pour traçabilité
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

