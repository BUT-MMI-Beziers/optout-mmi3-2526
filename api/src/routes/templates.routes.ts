import { Hono } from 'hono'
import { db } from '../db'
import { emailTemplates } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const templatesRoutes = new Hono()

/**
 * GET /api/v1/templates
 * Liste des templates avec filtres optionnels
 */
templatesRoutes.get('/', async (c) => {
  const language = c.req.query('language')
  const legalBasis = c.req.query('legal_basis')

  const conditions = []

  if (language) {
    conditions.push(eq(emailTemplates.language, language))
  }

  if (legalBasis) {
    conditions.push(eq(emailTemplates.legalBasis, legalBasis))
  }

  const templates = await db
    .select()
    .from(emailTemplates)
    .where(conditions.length ? and(...conditions) : undefined)

  return c.json({
    data: templates,
    count: templates.length
  })
})

/**
 * GET /api/v1/templates/:id
 * Récupère un template par ID
 */
templatesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  if (!id || typeof id !== 'string') {
    return c.json({
      error: 'Invalid ID',
      code: 'BAD_REQUEST'
    }, 400)
  }

  const template = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, id))
    .limit(1)

  if (template.length === 0) {
    return c.json({
      error: 'Template introuvable',
      code: 'NOT_FOUND'
    }, 404)
  }

  return c.json({ data: template[0] })
})