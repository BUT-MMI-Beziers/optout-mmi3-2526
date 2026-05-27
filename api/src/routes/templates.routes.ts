import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'

// ----------------------------------------------------------------------------
// IMPORTS CORRIGÉS (Correction du bug "db is not defined")
// On remonte d'un niveau (../) car ce fichier est dans le dossier /routes
// ----------------------------------------------------------------------------
import { db } from '../db/index' // Chemin vers l'initialisation de la DB
import { emailTemplates } from '../schema' // Chemin vers le schéma Drizzle

export const templatesRoutes = new Hono()

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
    // 1. Récupération des paramètres de requête optionnels
    const language = c.req.query('language') ?? undefined
    const legalBasis = c.req.query('legal_basis') ?? undefined

    const conditions = []

    // 2. Application des filtres Drizzle si les paramètres sont fournis
    if (language) {
      conditions.push(eq(emailTemplates.language, language))
    }

    if (legalBasis) {
      conditions.push(eq(emailTemplates.legalBasis, legalBasis))
    }

    // 3. Exécution de la requête en base de données
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(
        conditions.length > 0 ? and(...conditions) : undefined
      )

    // 4. Renvoi de la liste des templates
    return c.json({
      data: templates,
      count: templates.length
    }, 200)

  } catch (error) {
    console.error("Erreur lors de la récupération de la liste des templates :", error)
    return c.json({
      error: "Une erreur interne est survenue",
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
    // 1. Récupération de l'ID dynamique depuis l'URL
    const id = c.req.param('id')

    // 2. Recherche du template spécifique en base de données (optimisé avec limit 1)
    const templateResult = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1)

    // 3. Gestion de l'erreur 404 si le template n'existe pas
    if (templateResult.length === 0) {
      return c.json({
        error: "Template introuvable",
        code: "NOT_FOUND",
        details: {}
      }, 404)
    }

    // 4. Renvoi du template trouvé (le premier élément du tableau)
    return c.json({ 
      data: templateResult[0] 
    }, 200)

  } catch (error) {
    // 5. Gestion des erreurs inattendues (ex: mauvaise syntaxe d'UUID)
    console.error("Erreur lors de la récupération du template détaillé :", error)
    return c.json({
      error: "Une erreur interne est survenue",
      code: "INTERNAL_SERVER_ERROR",
      details: error instanceof Error ? error.message : {}
    }, 500)
  }
})