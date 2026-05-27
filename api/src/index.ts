import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { brokers } from './db/schema.js'

const app = new Hono()

app.use('/*', cors())

type BrokerUpdateBody = {
  name?: unknown
  emailContact?: unknown
  website?: unknown
  optOutUrl?: unknown
  category?: unknown
  region?: unknown
  country?: unknown
  optOutMethod?: unknown
  difficulty?: unknown
  legalBasis?: unknown
  notes?: unknown
}

const brokerCategories = ['people-search', 'marketing', 'risk-mitigation', 'recruitment', 'other'] as const
const brokerRegions = ['eu', 'us', 'global'] as const
const optOutMethods = ['email', 'form', 'postal', 'mixed'] as const
const brokerDifficulties = ['easy', 'medium', 'hard'] as const
const legalBases = ['gdpr_art17', 'gdpr_art15', 'ccpa', 'pipeda', 'other'] as const

function isAdminHeader(c: Context) {
  return c.req.header('x-user-role')?.toLowerCase() === 'admin'
}

async function requireAdmin(c: Context, next: Next) {
  if (!isAdminHeader(c)) {
    return c.json({ error: 'Admin access required' }, 403)
  }

  await next()
}

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toNullableString(value: unknown) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number])
}

function toIsoCountry(value: unknown) {
  const country = toNullableString(value)
  return typeof country === 'string' ? country.toUpperCase() : country
}

function buildBrokerUpdate(body: BrokerUpdateBody) {
  const updateData: Record<string, string | boolean | Date | null> = {}

  const name = toTrimmedString(body.name)
  if (name !== undefined) {
    updateData.name = name
  }

  const emailContact = toTrimmedString(body.emailContact)
  if (emailContact !== undefined) {
    updateData.emailContact = emailContact
  }

  const website = toNullableString(body.website)
  if (website !== undefined) {
    updateData.website = website
  }

  const optOutUrl = toNullableString(body.optOutUrl)
  if (optOutUrl !== undefined) {
    updateData.optOutUrl = optOutUrl
  }

  if (isOneOf(body.category, brokerCategories)) {
    updateData.category = body.category
  }

  if (isOneOf(body.region, brokerRegions)) {
    updateData.region = body.region
  }

  const country = toIsoCountry(body.country)
  if (country !== undefined) {
    updateData.country = country
  }

  if (isOneOf(body.optOutMethod, optOutMethods)) {
    updateData.optOutMethod = body.optOutMethod
  }

  if (isOneOf(body.difficulty, brokerDifficulties)) {
    updateData.difficulty = body.difficulty
  }

  if (isOneOf(body.legalBasis, legalBases)) {
    updateData.legalBasis = body.legalBasis
  }

  const notes = toNullableString(body.notes)
  if (notes !== undefined) {
    updateData.notes = notes
  }

  return updateData
}

app.use('/brokers/*', requireAdmin)

app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

app.put('/brokers/:slug', async (c) => {
  const slug = c.req.param('slug')

  let body: BrokerUpdateBody

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const updateData = buildBrokerUpdate(body)

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'At least one valid field must be provided' }, 400)
  }

  const [updatedBroker] = await db
    .update(brokers)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(brokers.slug, slug))
    .returning()

  if (!updatedBroker) {
    return c.json({ error: 'Broker not found' }, 404)
  }

  return c.json({ data: updatedBroker })
})

app.delete('/brokers/:slug', async (c) => {
  const slug = c.req.param('slug')

  const [deletedBroker] = await db
    .delete(brokers)
    .where(eq(brokers.slug, slug))
    .returning({ slug: brokers.slug })

  if (!deletedBroker) {
    return c.json({ error: 'Broker not found' }, 404)
  }

  return c.json({ message: 'Broker deleted successfully', data: deletedBroker })
})

app.patch('/brokers/:slug/verify', async (c) => {
  const slug = c.req.param('slug')

  const [verifiedBroker] = await db
    .update(brokers)
    .set({
      isVerified: true,
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(brokers.slug, slug))
    .returning()

  if (!verifiedBroker) {
    return c.json({ error: 'Broker not found' }, 404)
  }

  return c.json({ data: verifiedBroker })
})

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})