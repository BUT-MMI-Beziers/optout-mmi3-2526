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

  // Table variable -> valeur ('' si le champ n'est pas renseigné).
  const values: Record<string, string> = {
    '{{user.first_name}}': context.user.firstName || '',
    '{{user.last_name}}': context.user.lastName || '',
    '{{user.email}}': context.user.email || '',
    '{{user.address}}': context.userAddress || '',
    '{{broker.name}}': context.broker.name || '',
    '{{broker.email_contact}}': context.broker.emailContact || '',
    '{{request.date}}': formatDate(referenceDate, lang),
    '{{request.sent_date}}': formatDate(sentDate, lang),
    '{{request.deadline_date}}': formatDate(deadline, lang),
    '{{request.reminder_date}}': formatDate(reminderDate, lang),
    '{{request.id}}': context.request.id,
  };

  const placeholderRegex = /{{[^}]+}}/g;

  // Traitement ligne par ligne : si une ligne ne contient QUE des variables connues
  // et toutes vides (ex. "- Adresse : {{user.address}}" sans adresse renseignée),
  // on retire la ligne entière du corps pour ne pas laisser un libellé orphelin.
  return text
    .split('\n')
    .filter((line) => {
      const placeholders = line.match(placeholderRegex);
      if (!placeholders) return true; // ligne statique : conservée
      const allKnownAndEmpty = placeholders.every(
        (p) => p in values && values[p].trim() === ''
      );
      return !allKnownAndEmpty;
    })
    .map((line) =>
      line.replace(placeholderRegex, (m) => (m in values ? values[m] : m))
    )
    .join('\n');
}
