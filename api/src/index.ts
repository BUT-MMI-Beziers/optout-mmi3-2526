import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

import { db } from './db/index'
import { emailTemplates } from './db/schema'
import { eq, and } from 'drizzle-orm'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

// Route API GET TEMPLATES
/*
La route sert a récupérer les templates d'emails selon les parametres de langues & la base légale.
Les templates sont directemenet récupérées depuis les migrations Drizzle / ORM
*/
app.get('/api/v1/templates', async (c) => {
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
      conditions.length > 0
        ? and(...conditions)
        : undefined
    )

  return c.json({
    data: templates,
    count: templates.length
  })
})


serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})