import { Hono } from 'hono'
import { db } from '../db/index.js'
import { brokers } from '../db/schema.js'
import { and, eq, ilike } from 'drizzle-orm'

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
brokersRoute.get('/', async (c) => {
  try {
    const category = c.req.query('category')
    const region = c.req.query('region')
    const difficulty = c.req.query('difficulty')
    const search = c.req.query('search')
    const isVerifiedStr = c.req.query('isVerified')

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

    const query = db.select().from(brokers)
    const results = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query

    return c.json(results)
  } catch (error) {
    console.error('Error fetching brokers:', error)
    return c.json({ error: 'Une erreur interne est survenue lors de la récupération des brokers' }, 500)
  }
})

// ─── POST /brokers ───────────────────────────────────────
brokersRoute.post('/', async (c) => {
  const body = await c.req.json()

  
  const required = ['name', 'emailContact', 'category',
                    'region', 'optOutMethod', 'difficulty', 'legalBasis']

  for (const field of required) {
    if (!body[field]) {
      return c.json({ error: `Champ manquant : ${field}` }, 400)
    }
  }

  const [newBroker] = await db
    .insert(brokers)
    .values({
      name:          body.name,
      slug:          toSlug(body.name),
      emailContact:  body.emailContact,
      website:       body.website ?? null,
      optOutUrl:     body.optOutUrl ?? null,
      category:      body.category,
      region:        body.region,
      country:       body.country ?? null,
      optOutMethod:  body.optOutMethod,
      difficulty:    body.difficulty,
      legalBasis:    body.legalBasis,
      notes:         body.notes ?? null,
      isVerified:    false,   
    })
    .returning()

  return c.json(newBroker, 201)
})

// ─── GET /brokers/export ─────────────────────────────────
brokersRoute.get('/export', async (c) => {

  // Récupère tous les brokers
  const allBrokers = await db
    .select()
    .from(brokers)

  const date = new Date().toISOString().split('T')[0] 
  const filename = `brokers-export-${date}.json`

  c.header('Content-Disposition', `attachment; filename="${filename}"`)
  c.header('Content-Type', 'application/json')

  return c.json({
    exportedAt: new Date().toISOString(),
    count:      allBrokers.length,
    brokers:    allBrokers,
  })
})

// ─── POST /brokers/import ────────────────────────────────
brokersRoute.post('/import', async (c) => {
  const body = await c.req.json()

  const list = Array.isArray(body) ? body : body.brokers

  if (!Array.isArray(list) || list.length === 0) {
    return c.json({ error: 'Body invalide : tableau de brokers attendu' }, 400)
  }

  const rows = list.map((b: any) => ({
    name:         b.name,
    slug:         b.slug ?? toSlug(b.name),
    emailContact: b.emailContact ?? b.email_contact,
    website:      b.website      ?? null,
    optOutUrl:    b.optOutUrl    ?? b.opt_out_url ?? null,
    category:     b.category,
    region:       b.region,
    country:      b.country      ?? null,
    optOutMethod: b.optOutMethod ?? b.opt_out_method,
    difficulty:   b.difficulty,
    legalBasis:   b.legalBasis   ?? b.legal_basis,
    notes:        b.notes        ?? null,
    isVerified:   b.isVerified   ?? false,
  }))


  const inserted = await db
    .insert(brokers)
    .values(rows)
    .onConflictDoNothing()  
    .returning()

  return c.json({
    imported: inserted.length,
    skipped:  rows.length - inserted.length,
    brokers:  inserted,
  }, 201)
})

export default brokersRoute