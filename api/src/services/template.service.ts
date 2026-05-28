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
  };
}

export function renderTemplate(text: string, context: RenderContext): string {
  if (!text) return '';

  // Formatage des dates directement dans le service pour garantir l'uniformité
  const requestDate = new Date(context.request.createdAt).toLocaleDateString('fr-FR');
  
  const deadline = new Date(context.request.createdAt);
  deadline.setDate(deadline.getDate() + 30);
  const deadlineDate = deadline.toLocaleDateString('fr-FR');

  return text
    .replace(/{{user\.first_name}}/g, context.user.firstName || '')
    .replace(/{{user\.last_name}}/g, context.user.lastName || '')
    .replace(/{{user\.email}}/g, context.user.email || '')
    .replace(/{{user\.address}}/g, context.userAddress)
    .replace(/{{broker\.name}}/g, context.broker.name || '')
    .replace(/{{broker\.email_contact}}/g, context.broker.emailContact || '')
    .replace(/{{request\.date}}/g, requestDate)
    .replace(/{{request\.deadline_date}}/g, deadlineDate)
    .replace(/{{request\.id}}/g, context.request.id);
}