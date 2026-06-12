import { Hono } from 'hono'
import { db } from '../db/index.js'
import { brokers, users } from '../db/schema.js'
import { and, asc, desc, eq, getTableColumns, ilike } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import * as yaml from 'js-yaml'
import { authMiddleware, adminGuard, isAdminRequest } from './auth/auth.middleware.js'
import { notifyUser } from '../services/notification.service.js'

const brokersRoute = new Hono()


function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── GET / ────────────────────────────────────────────────
brokersRoute.get('/', authMiddleware, async (c) => {
  try {
    const category = c.req.query('category')
    const region = c.req.query('region')
    const difficulty = c.req.query('difficulty')
    const search = c.req.query('search')
    const isVerifiedStr = c.req.query('isVerified')

    const pageParam = c.req.query('page')
    const perPageParam = c.req.query('per_page') || c.req.query('limit')

    const parsedPage = parseInt(pageParam || '1', 10)
    const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage)

    const parsedPerPage = parseInt(perPageParam || '20', 10)
    const perPage = Math.max(1, isNaN(parsedPerPage) ? 20 : parsedPerPage)

    const offset = (page - 1) * perPage

    const conditions = []

    if (category) {
      conditions.push(eq(brokers.category, category as any))
    }
    if (region) {
      conditions.push(eq(brokers.region, region as any))
    }
    if (difficulty) {
      conditions.push(eq(brokers.difficulty, difficulty as any))
    }
    if (isVerifiedStr) {
      conditions.push(eq(brokers.isVerified, isVerifiedStr === 'true'))
    }
    if (search) {
      conditions.push(ilike(brokers.name, `%${search}%`))
    }

    // 1. Récupérer le total des éléments correspondants pour calculer la pagination
    const countQuery = db.select({ id: brokers.id }).from(brokers)
    const allMatching = conditions.length > 0
      ? await countQuery.where(and(...conditions))
      : await countQuery
    const total = allMatching.length

    // Tri : ?sort=createdAt|name (défaut name) et ?order=asc|desc (défaut asc)
    const sortParam = c.req.query('sort')
    const orderFn = c.req.query('order') === 'desc' ? desc : asc
    const sortCol = sortParam === 'createdAt' ? brokers.createdAt : brokers.name

    // 2. Récupérer les éléments paginés (+ email du proposeur pour le panel admin)
    const dataQuery = db
      .select({ ...getTableColumns(brokers), createdByEmail: users.email })
      .from(brokers)
      .leftJoin(users, eq(brokers.createdBy, users.id))
    const results = conditions.length > 0
      ? await dataQuery.where(and(...conditions)).orderBy(orderFn(sortCol)).limit(perPage).offset(offset)
      : await dataQuery.orderBy(orderFn(sortCol)).limit(perPage).offset(offset)

    // L'email du proposeur n'est visible que par les admins. Les utilisateurs
    // normaux voient seulement si le broker est par défaut (createdBy null) et sa date.
    const admin = await isAdminRequest(c.req.header('Cookie'))
    const data = admin ? results : results.map(({ createdByEmail, ...rest }) => rest)

    const lastPage = Math.ceil(total / perPage) || 1

    return c.json({
      data,
      total,
      currentPage: page,
      lastPage
    })
  } catch (error) {
    console.error('Error fetching brokers:', error)
    return c.json({ error: 'Une erreur interne est survenue lors de la récupération des brokers' }, 500)
  }
})

// ─── POST /brokers ───────────────────────────────────────
// Tout utilisateur authentifié peut proposer un broker. Il est créé en attente
// de vérification (isVerified: false, forcé ici). La vérification, la modification
// et la suppression restent réservées aux admins (voir routes plus bas).
brokersRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json()
  const userId = c.get('userId') as string

  const required = ['name', 'emailContact', 'category',
    'region', 'optOutMethod', 'difficulty', 'legalBasis']

  for (const field of required) {
    if (!body[field]) {
      return c.json({ error: `Champ manquant : ${field}` }, 400)
    }
  }

  // L'email de contact doit avoir un format valide (pas seulement être présent).
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.emailContact)) {
    return c.json({ error: "Format d'email invalide pour l'email de contact" }, 400)
  }

  try {
    const [newBroker] = await db
      .insert(brokers)
      .values({
        name:         body.name,
        slug:         toSlug(body.name),
        emailContact: body.emailContact,
        website:      body.website      ?? null,
        optOutUrl:    body.optOutUrl    ?? null,
        category:     body.category,
        region:       body.region,
        country:      body.country      ?? null,
        optOutMethod: body.optOutMethod,
        difficulty:   body.difficulty,
        legalBasis:   body.legalBasis,
        notes:        body.notes        ?? null,
        isVerified:   false,
        createdBy:    userId,
      })
      .returning()

    return c.json(newBroker, 201)

  } catch (err: any) {
    if (err.code === '23505' || err.cause?.code === '23505') {
      return c.json({ error: `Un broker avec le nom "${body.name}" existe déjà` }, 409)
    }
    console.error('Erreur POST /brokers:', err)
    return c.json({ error: 'Erreur interne lors de la création du broker' }, 500)
  }
})

// ─── GET /brokers/export ─────────────────────────────────
brokersRoute.get('/export', authMiddleware, async (c) => {

  const allBrokers = await db
    .select()
    .from(brokers)

  const format = c.req.query('format') ?? 'json' // ?format=yaml ou ?format=json
  const date = new Date().toISOString().split('T')[0]
  const data = {
    exportedAt: new Date().toISOString(),
    count: allBrokers.length,
    brokers: allBrokers,
  }

  if (format === 'yaml') {
    const filename = `brokers-export-${date}.yaml`
    c.header('Content-Disposition', `attachment; filename="${filename}"`)
    c.header('Content-Type', 'application/yaml')
    return c.text(yaml.dump(data))
  }

  const filename = `brokers-export-${date}.json`
  c.header('Content-Disposition', `attachment; filename="${filename}"`)
  c.header('Content-Type', 'application/json')
  return c.json(data)
})

// ─── POST /brokers/import ────────────────────────────────
// Import en masse réservé aux admins (insère des brokers potentiellement vérifiés).
brokersRoute.post('/import', authMiddleware, adminGuard, async (c) => {

  const contentType = c.req.header('Content-Type') ?? ''
  let list: any[]

  try {
    // Détecte automatiquement JSON ou YAML selon le Content-Type
    if (contentType.includes('yaml')) {
      const text = await c.req.text()
      const parsed: any = yaml.load(text)
      list = Array.isArray(parsed) ? parsed : parsed?.brokers
    } else {
      const body = await c.req.json()
      list = Array.isArray(body) ? body : body.brokers
    }
  } catch (err: any) {
    return c.json({ error: `Erreur de parsing du fichier : ${err.message}` }, 400)
  }

  if (!Array.isArray(list) || list.length === 0) {
    return c.json({ error: 'Body invalide : tableau de brokers attendu' }, 400)
  }

  const rows = list.map((b: any) => ({
    name: b.name,
    slug: b.slug ?? toSlug(b.name),
    emailContact: b.emailContact ?? b.email_contact ?? "no-email@optout.local",
    website: b.website ?? null,
    optOutUrl: b.optOutUrl ?? b.opt_out_url ?? null,
    category: b.category,
    region: b.region,
    country: b.country ?? null,
    optOutMethod: b.optOutMethod ?? b.opt_out_method,
    difficulty: b.difficulty,
    legalBasis: b.legalBasis ?? b.legal_basis,
    notes: b.notes ?? null,
    isVerified: b.isVerified ?? false,
  }))

  try {
    const inserted = await db
      .insert(brokers)
      .values(rows)
      .onConflictDoNothing()
      .returning()

    return c.json({
      imported: inserted.length,
      skipped: rows.length - inserted.length,
      brokers: inserted,
    }, 201)
  } catch (err: any) {
    return c.json({ error: `Erreur lors de l'insertion en base de données : ${err.message}` }, 500)
  }
})

// ─── GET /brokers/:slug ────────────────────────────────
brokersRoute.get('/:slug', authMiddleware, async (c) => {
  const slug = c.req.param('slug')

  // Deux alias sur users : le proposeur (created_by) et l'admin vérificateur (verified_by)
  const creator = alias(users, 'creator')
  const verifier = alias(users, 'verifier')

  const [broker] = await db
    .select({
      ...getTableColumns(brokers),
      createdByEmail: creator.email,
      verifiedByEmail: verifier.email,
    })
    .from(brokers)
    .leftJoin(creator, eq(brokers.createdBy, creator.id))
    .leftJoin(verifier, eq(brokers.verifiedBy, verifier.id))
    .where(eq(brokers.slug, slug))
    .limit(1)

  if (!broker) {
    return c.json({ error: 'Broker introuvable' }, 404)
  }

  // Email du proposeur réservé aux admins ; verifiedByEmail reste public
  // (affiché sur la fiche : « vérifié par X le … »).
  const admin = await isAdminRequest(c.req.header('Cookie'))
  if (!admin) {
    const { createdByEmail, ...rest } = broker
    return c.json(rest)
  }

  return c.json(broker)
})


// ─── PUT /brokers/:slug ──────────────────────────────────
brokersRoute.put('/:slug', authMiddleware, adminGuard, async (c) => {
  const slug = c.req.param('slug')
  const body = await c.req.json()

  const [existing] = await db
    .select()
    .from(brokers)
    .where(eq(brokers.slug, slug))
    .limit(1)

  if (!existing) {
    return c.json({ error: 'Broker introuvable' }, 404)
  }

  const nextName = body.name ?? existing.name
  const [updatedBroker] = await db
    .update(brokers)
    .set({
      name: nextName,
      slug: body.name ? toSlug(nextName) : existing.slug,
      emailContact: body.emailContact ?? existing.emailContact,
      website: body.website ?? existing.website,
      optOutUrl: body.optOutUrl ?? existing.optOutUrl,
      category: body.category ?? existing.category,
      region: body.region ?? existing.region,
      country: body.country ?? existing.country,
      optOutMethod: body.optOutMethod ?? existing.optOutMethod,
      difficulty: body.difficulty ?? existing.difficulty,
      legalBasis: body.legalBasis ?? existing.legalBasis,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(brokers.slug, slug))
    .returning()

  return c.json(updatedBroker)
})

// ─── DELETE /brokers/:slug ────────────────────────────────
brokersRoute.delete('/:slug', authMiddleware, adminGuard, async (c) => {
  const slug = c.req.param('slug')

  const [deletedBroker] = await db
    .delete(brokers)
    .where(eq(brokers.slug, slug))
    .returning()

  if (!deletedBroker) {
    return c.json({ error: 'Broker introuvable' }, 404)
  }

  return c.json({ success: true, broker: deletedBroker })
})

// ─── PATCH /brokers/:slug/verify ─────────────────────────
brokersRoute.patch('/:slug/verify', authMiddleware, adminGuard, async (c) => {
  const slug = c.req.param('slug')
  const userId = c.get('userId') as string

  const [verifiedBroker] = await db
    .update(brokers)
    .set({
      isVerified: true,
      lastVerifiedAt: new Date(),
      verifiedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(brokers.slug, slug))
    .returning()

  if (!verifiedBroker) {
    return c.json({ error: 'Broker introuvable' }, 404)
  }

  // Prévenir l'utilisateur qui a proposé ce broker que sa proposition est validée.
  if (verifiedBroker.createdBy) {
    await notifyUser(verifiedBroker.createdBy, 'confirmation', {
      message: `Votre proposition de broker « ${verifiedBroker.name} » a été vérifiée et ajoutée au registre. Merci pour votre contribution !`,
    }).catch((e) => console.error('[PATCH /brokers/:slug/verify] notif échouée :', e))
  }

  return c.json(verifiedBroker)
})

export default brokersRoute