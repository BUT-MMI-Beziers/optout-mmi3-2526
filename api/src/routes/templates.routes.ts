import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'

// ----------------------------------------------------------------------------
// IMPORTS 
// ----------------------------------------------------------------------------
import { db } from '../db/index' 
import { emailTemplates } from '../db/schema' 

export const templatesRoutes = new Hono()

// SÉCURITÉ : Regex pour valider le format UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// FEATURE 4 : LISTER LES TEMPLATES (Route de Clément)
// Route finale : GET /api/v1/templates
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique. 
 * Il faudra ajouter le middleware d'authentification (ex: JWT) lorsque l'équipe 
 * en charge l'aura terminé, conformément au cahier des charges.
 * Utilité : Récupère les templates d'emails, filtrables par langue et base légale.
 */
templatesRoutes.get('/', async (c) => {
  try {
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
        conditions.length > 0 ? and(...conditions) : undefined
      )

    return c.json({
      data: templates,
      count: templates.length
    }, 200)

  } catch (error) {
    // Log serveur conservé pour le debug
    console.error("[GET /templates] Erreur critique :", error)
    
    // SÉCURITÉ : Réponse client aseptisée
    return c.json({
      error: "Impossible de récupérer les templates d'emails.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 5 : RÉCUPÉRER UN TEMPLATE PAR SON ID (Ta Feature Fabien)
// Route finale : GET /api/v1/templates/:id
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique. 
 * Il faudra ajouter le middleware d'authentification (ex: JWT) lorsque l'équipe 
 * en charge l'aura terminé, conformément au cahier des charges.
 * Utilité : Récupère les détails complets d'un template spécifique grâce à son UUID.
 */
templatesRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // SÉCURITÉ : Vérification stricte du format UUID
    if (!uuidRegex.test(id)) {
      return c.json({
        error: "Format d'identifiant invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    const templateResult = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1)

    if (templateResult.length === 0) {
      return c.json({
        error: "Le template demandé est introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    return c.json({ 
      data: templateResult[0] 
    }, 200)

  } catch (error) {
    console.error(`[GET /templates/${c.req.param('id')}] Erreur critique :`, error)
    return c.json({
      error: "Une erreur interne est survenue lors de la récupération du template.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

export default templatesRoutes