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

// Route API GET TEMPLATE BY ID
/*
 * TODO (SECURITÉ) : L'authentification n'étant pas encore implémentée par l'équipe,
 * cette route est temporairement publique. Il faudra ajouter le middleware JWT plus tard.
 * La route sert à récupérer un template d'email précis grâce à son identifiant unique.
 */
app.get('/api/v1/templates/:id', async (c) => {
  try {
    // 1. Récupération de l'ID depuis les paramètres de l'URL
    const id = c.req.param('id')

    // 2. Requête Drizzle pour trouver le template spécifique
    // On utilise eq() pour correspondre à l'ID et limit(1) car l'ID est unique
    const templateResult = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1)

    // 3. Gestion de l'erreur 404 (Si aucun template n'est trouvé)
    if (templateResult.length === 0) {
      return c.json({
        error: "Template introuvable",
        code: "NOT_FOUND",
        details: {}
      }, 404)
    }

    // 4. Renvoi du template trouvé avec un code 200 (Succès)
    // templateResult est un tableau, on renvoie donc le premier (et unique) élément
    return c.json({
      data: templateResult[0]
    }, 200)

  } catch (error) {
    // 5. Gestion des erreurs internes
    console.error("Erreur lors de la récupération du template détaillé :", error)
    return c.json({
      error: "Une erreur interne est survenue",
      code: "INTERNAL_SERVER_ERROR",
      details: error instanceof Error ? error.message : {}
    }, 500)
  }
})


serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})