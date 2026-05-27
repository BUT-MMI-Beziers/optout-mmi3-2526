import { Hono } from 'hono'
import { db } from '../db'
import { emailTemplates } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const templatesRoutes = new Hono()


// Route API GET TEMPLATES
/*
La route sert a récupérer les templates d'emails selon les parametres de langues & la base légale.
Les templates sont directemenet récupérées depuis les migrations Drizzle / ORM
*/
templatesRoutes.get('/', async (c) => {
  const language = c.req.query('language') ?? undefined
  const legalBasis = c.req.query('legal_basis') ?? undefined

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
    .where(
      conditions.length ? and(...conditions) : undefined
    )

  return c.json({
    data: templates,
    count: templates.length
  })
})

