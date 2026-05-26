import {
  pgTable, uuid, varchar, text,
  boolean, timestamp, pgEnum
} from 'drizzle-orm/pg-core'

export const legalBasisEnum = pgEnum('legal_basis', [
  'GDPR_17', 'GDPR_15', 'CCPA', 'OTHER'
])

export const requestStatusEnum = pgEnum('request_status', [
  'DRAFT', 'SENT', 'NO_RESPONSE', 'COMPLETED', 'REJECTED'
])

export const eventTypeEnum = pgEnum('event_type', [
  'CREATED', 'SENT', 'REMINDER_SENT', 'STATUS_CHANGED', 'NOTE_ADDED'
])

export const emailTemplates = pgTable('email_templates', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       varchar('name', { length: 255 }).notNull(),
  legalBasis: legalBasisEnum('legal_basis').notNull(),
  language:   varchar('language', { length: 10 }).notNull(),
  subject:    varchar('subject', { length: 500 }).notNull(),
  body:       text('body').notNull(),
  isDefault:  boolean('is_default').default(false),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
})

export const removalRequests = pgTable('removal_requests', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull(),
  brokerId:     uuid('broker_id').notNull(),
  templateId:   uuid('template_id').notNull(),
  status:       requestStatusEnum('status').notNull().default('DRAFT'),
  sentAt:       timestamp('sent_at'),
  respondedAt:  timestamp('responded_at'),
  nextActionAt: timestamp('next_action_at'),
  emailBody:    text('email_body').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

export const requestEvents = pgTable('request_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull(),
  eventType: eventTypeEnum('event_type').notNull(),
  oldStatus: requestStatusEnum('old_status'),
  newStatus: requestStatusEnum('new_status'),
  note:      text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})