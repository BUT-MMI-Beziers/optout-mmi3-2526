// ============================================================================
// SERVICE : MOTEUR D'INTERPOLATION DE TEMPLATES
// Utilité : Centralise la logique de remplacement des variables {{balises}}
//           pour les emails de demande d'opt-out.
// ============================================================================

/**
 * Interface définissant la structure stricte des données requises
 * pour alimenter le moteur de rendu de template.
 */
interface RenderContext {
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  userAddress: string // Adresse principale récupérée depuis user_contacts
  broker: {
    name: string
    emailContact: string
  }
  request: {
    id: string
    createdAt: Date | string
  }
}

/**
 * Remplace dynamiquement les balises de variables dans un texte (sujet ou corps)
 * par les données réelles du contexte (Utilisateur, Broker, Requête).
 * * @param text Le texte brut contenant les balises (ex: "Bonjour {{user.first_name}}")
 * @param context L'ensemble des données requises pour le remplacement
 * @returns Le texte final interpolé
 */
export const renderTemplate = (text: string, context: RenderContext): string => {
  if (!text) return ''

  // 1. Préparation des variables de dates de manière homogène
  const baseDate = new Date(context.request.createdAt)
  const requestDate = baseDate.toLocaleDateString('fr-FR')
  
  // Calcul de la date limite légale (ex: +30 jours max selon le RGPD)
  const deadline = new Date(baseDate)
  deadline.setDate(deadline.getDate() + 30)
  const deadlineDate = deadline.toLocaleDateString('fr-FR')

  // 2. Traitement des remplacements de variables par chaînage
  return text
    // Variables Utilisateur (User)
    .replace(/{{user\.first_name}}/g, context.user.firstName || '')
    .replace(/{{user\.last_name}}/g, context.user.lastName || '')
    .replace(/{{user\.email}}/g, context.user.email)
    .replace(/{{user\.address}}/g, context.userAddress)
    
    // Variables Data Broker
    .replace(/{{broker\.name}}/g, context.broker.name)
    .replace(/{{broker\.email_contact}}/g, context.broker.emailContact)
    
    // Variables Demande (Request)
    .replace(/{{request\.id}}/g, context.request.id)
    .replace(/{{request\.date}}/g, requestDate)
    .replace(/{{request\.deadline_date}}/g, deadlineDate)
}