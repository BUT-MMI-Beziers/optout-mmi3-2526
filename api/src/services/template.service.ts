export interface RenderContext {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  userAddress: string;
  broker: {
    name: string | null;
    emailContact: string | null;
  };
  request: {
    id: string;
    createdAt: Date;
    sentAt?: Date | null;         // date d'envoi de la demande initiale (relance / mise en demeure)
    referenceDate?: Date | null;  // date affichée comme {{request.date}} (défaut : createdAt)
    reminderDate?: Date | null;   // date d'envoi de la relance (pour la mise en demeure)
  };
  language?: string;              // locale de formatage des dates (défaut : 'fr')
}

function formatDate(d: Date, language?: string): string {
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  return new Date(d).toLocaleDateString(locale);
}

export function renderTemplate(text: string, context: RenderContext): string {
  if (!text) return '';

  const lang = context.language;

  // Date de l'email courant ({{request.date}}) : date de relance pour une relance,
  // date de création pour un envoi initial.
  const referenceDate = context.request.referenceDate ?? context.request.createdAt;

  // Date d'envoi de la demande initiale ; on retombe sur createdAt si jamais envoyée.
  const sentDate = context.request.sentAt ?? context.request.createdAt;

  // Échéance légale : 30 jours après l'envoi initial (art. 12 RGPD).
  const deadline = new Date(sentDate);
  deadline.setDate(deadline.getDate() + 30);

  // Date de relance (pour la mise en demeure) ; défaut : l'échéance légale.
  const reminderDate = context.request.reminderDate ?? deadline;

  return text
    .replace(/{{user\.first_name}}/g, context.user.firstName || '')
    .replace(/{{user\.last_name}}/g, context.user.lastName || '')
    .replace(/{{user\.email}}/g, context.user.email || '')
    .replace(/{{user\.address}}/g, context.userAddress)
    .replace(/{{broker\.name}}/g, context.broker.name || '')
    .replace(/{{broker\.email_contact}}/g, context.broker.emailContact || '')
    .replace(/{{request\.date}}/g, formatDate(referenceDate, lang))
    .replace(/{{request\.sent_date}}/g, formatDate(sentDate, lang))
    .replace(/{{request\.deadline_date}}/g, formatDate(deadline, lang))
    .replace(/{{request\.reminder_date}}/g, formatDate(reminderDate, lang))
    .replace(/{{request\.id}}/g, context.request.id);
}
