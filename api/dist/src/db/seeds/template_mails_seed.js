import { db } from '../index.js';
import { emailTemplates } from '../schema.js';
import { sql } from 'drizzle-orm';
export async function seedTemplates(database = db) {
    try {
        const existing = await database.select({ count: sql `count(*)` }).from(emailTemplates);
        const count = Number(existing[0]?.count || 0);
        if (count > 0) {
            console.log('Les templates d\'emails existent déjà. Seed ignoré.');
            return;
        }
        console.log('Insertion des templates d\'emails...');
        await database.insert(emailTemplates).values([
            {
                name: 'Demande d\'effacement (art. 17)',
                legalBasis: 'gdpr_art17',
                language: 'fr',
                subject: 'Demande d\'effacement de données personnelles – Règlement (UE) 2016/679 – Réf. {{request.id}}',
                body: `Madame, Monsieur,

Je me permets de vous contacter en ma qualité de personne concernée au sens du Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 relatif à la protection des données personnelles (RGPD).

Identité du demandeur :
- Nom et prénom : {{user.last_name}} {{user.first_name}}
- Adresse : {{user.address}}
- Email : {{user.email}}

Par la présente, et conformément à l'article 17 du RGPD (droit à l'effacement / « droit à l'oubli »), je vous demande de procéder à la suppression de l'ensemble des données personnelles me concernant que votre organisation, {{broker.name}}, détient, traite ou a transmises à des tiers.

Cette demande inclut, sans s'y limiter :
- Mes coordonnées (nom, prénom, adresses postales, numéros de téléphone, adresses email)
- Mon historique d'achat ou de navigation
- Toute donnée d'identification ou de profilage me concernant

Je fonde cette demande sur le fait que ces données ne sont plus nécessaires au regard des finalités pour lesquelles elles ont été collectées, et/ou que je retire le consentement sur lequel le traitement était fondé.

Conformément à l'article 12 du RGPD, vous disposez d'un délai d'un mois à compter de la réception du présent email pour me répondre.

Je vous demande de me confirmer par écrit, à l'adresse email indiquée ci-dessus, que la suppression a bien été effectuée.

À défaut de réponse dans le délai imparti, je me réserve le droit de saisir la CNIL (www.cnil.fr).

{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date de la demande : {{request.date}} — Référence : {{request.id}}`,
                isDefault: true,
            },
            {
                name: 'Demande d\'accès (art. 15)',
                legalBasis: 'gdpr_art15',
                language: 'fr',
                subject: 'Demande d\'accès à mes données personnelles – Règlement (UE) 2016/679 – Réf. {{request.id}}',
                body: `Madame, Monsieur,

Je me permets de vous contacter en ma qualité de personne concernée au sens du Règlement (UE) 2016/679 (RGPD).

Identité du demandeur :
- Nom et prénom : {{user.last_name}} {{user.first_name}}
- Adresse : {{user.address}}
- Email : {{user.email}}

Conformément à l'article 15 du RGPD (droit d'accès), je vous demande de me communiquer l'ensemble des informations suivantes concernant les données personnelles que votre organisation, {{broker.name}}, détient à mon sujet :
- La confirmation que des données me concernant sont ou non traitées
- Une copie de l'ensemble de ces données personnelles
- Les finalités du traitement
- Les catégories de données concernées
- Les destinataires auxquels ces données ont été communiquées
- La durée de conservation prévue
- L'origine des données
- L'existence d'une prise de décision automatisée

Conformément à l'article 12 du RGPD, vous disposez d'un délai d'un mois à compter de la réception du présent email pour me répondre.

{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date de la demande : {{request.date}} — Référence : {{request.id}}`,
                isDefault: true,
            },
            {
                name: 'Relance (art. 12)',
                legalBasis: 'gdpr_art17',
                language: 'fr',
                subject: 'RELANCE – Demande d\'effacement sans réponse – Réf. {{request.id}} – Délai légal dépassé',
                body: `Madame, Monsieur,

Je me permets de revenir vers vous concernant ma demande d'effacement de données personnelles envoyée le {{request.sent_date}} à l'adresse {{broker.email_contact}}, restée à ce jour sans réponse.

Rappel de mon identité :
- Nom et prénom : {{user.last_name}} {{user.first_name}}
- Email : {{user.email}}
- Référence de la demande initiale : {{request.id}}

Conformément à l'article 12 du RGPD, vous disposiez d'un délai d'un mois à compter de la réception de ma demande initiale pour y répondre, soit au plus tard le {{request.deadline_date}}. Ce délai est désormais dépassé.

Je vous mets en demeure de traiter ma demande dans les meilleurs délais. Sans réponse dans un délai de 15 jours, je saisirai la CNIL via le portail www.cnil.fr, conformément à l'article 77 du RGPD.

{{user.first_name}} {{user.last_name}}
{{user.email}}

Date de relance : {{request.date}} — Référence : {{request.id}}`,
                isDefault: false,
            },
            {
                name: 'Mise en demeure (art. 77/79)',
                legalBasis: 'gdpr_art17',
                language: 'fr',
                subject: 'MISE EN DEMEURE – Violation du RGPD – Absence de traitement – Réf. {{request.id}}',
                body: `Madame, Monsieur,

Je me permets de vous adresser la présente mise en demeure formelle.

Identité du demandeur :
- Nom et prénom : {{user.last_name}} {{user.first_name}}
- Adresse : {{user.address}}
- Email : {{user.email}}

Rappel des faits :
- Le {{request.sent_date}} : envoi d'une demande d'effacement (art. 17 RGPD) — Réf. {{request.id}}
- Le {{request.reminder_date}} : envoi d'une relance (art. 12 RGPD) — sans réponse
- À ce jour : aucune réponse, aucun accusé de réception, aucune action

Votre organisation, {{broker.name}}, est en violation caractérisée des articles 12, 17 et 21 du RGPD.

Je vous mets formellement en demeure de :
- Supprimer l'intégralité des données personnelles me concernant dans un délai de 72 heures
- Me confirmer par écrit que cette suppression a été effectuée
- Me communiquer les coordonnées de votre DPO

À défaut, j'engagerai une plainte auprès de la CNIL (https://www.cnil.fr/fr/plaintes) et un recours juridictionnel (art. 79 RGPD).

Je vous rappelle que les infractions au RGPD sont passibles de sanctions pouvant atteindre 20 000 000 € ou 4 % du CA annuel mondial.

{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date : {{request.date}} — Référence : {{request.id}}`,
                isDefault: false,
            },
            {
                name: 'Erasure request (Art. 17)',
                legalBasis: 'gdpr_art17',
                language: 'en',
                subject: 'Request for erasure of personal data – Regulation (EU) 2016/679 – Ref. {{request.id}}',
                body: `Dear Sir or Madam,

I am writing to you as a data subject under Regulation (EU) 2016/679 (GDPR).

Requester identity:
- Full name: {{user.first_name}} {{user.last_name}}
- Address: {{user.address}}
- Email: {{user.email}}

Pursuant to Article 17 of the GDPR (right to erasure / "right to be forgotten"), I hereby request that your organisation, {{broker.name}}, erase all personal data held, processed, or transmitted to third parties that relates to me.

This request includes, but is not limited to:
- My contact details (name, postal addresses, phone numbers, email addresses)
- My purchase or browsing history
- Any identification or profiling data relating to me

I base this request on the grounds that the data is no longer necessary for the purposes for which it was collected, and/or that I withdraw the consent on which processing was based.

In accordance with Article 12 of the GDPR, you have one month from receipt of this email to respond.

Please confirm in writing that the erasure has been completed and that no data relating to me is retained by your organisation.

Yours faithfully,
{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date of request: {{request.date}} — Reference: {{request.id}}`,
                isDefault: true,
            },
            {
                name: 'Subject Access Request (Art. 15)',
                legalBasis: 'gdpr_art15',
                language: 'en',
                subject: 'Subject Access Request – Regulation (EU) 2016/679 – Ref. {{request.id}}',
                body: `Dear Sir or Madam,

I am writing to exercise my right of access under Article 15 of the GDPR.

Requester identity:
- Full name: {{user.first_name}} {{user.last_name}}
- Address: {{user.address}}
- Email: {{user.email}}

I hereby request that {{broker.name}} provide me with the following information regarding any personal data you hold about me:
- Confirmation of whether personal data relating to me is being processed
- A copy of all such personal data
- The purposes of the processing
- The categories of data concerned
- The recipients to whom the data has been or will be disclosed
- The envisaged retention period
- The source of the data
- The existence of any automated decision-making, including profiling

In accordance with Article 12 of the GDPR, you have one month from receipt of this request to respond.

Yours faithfully,
{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date of request: {{request.date}} — Reference: {{request.id}}`,
                isDefault: true,
            },
            {
                name: 'Reminder (Art. 12)',
                legalBasis: 'gdpr_art17',
                language: 'en',
                subject: 'REMINDER – Unanswered erasure request – Ref. {{request.id}} – Legal deadline exceeded',
                body: `Dear Sir or Madam,

I am writing to follow up on my erasure request submitted on {{request.sent_date}} to {{broker.email_contact}}, which has remained unanswered to date.

My identity:
- Full name: {{user.first_name}} {{user.last_name}}
- Email: {{user.email}}
- Original request reference: {{request.id}}

Under Article 12 of the GDPR, you were required to respond within one month of receiving my request, by {{request.deadline_date}} at the latest. This deadline has now passed.

I urge you to process my request without further delay and to confirm in writing that my personal data has been erased.

If I do not receive a response within 15 days of this email, I will be compelled to lodge a complaint with the competent supervisory authority, in accordance with Article 77 of the GDPR.

Yours faithfully,
{{user.first_name}} {{user.last_name}}
{{user.email}}

Date of reminder: {{request.date}} — Reference: {{request.id}}`,
                isDefault: false,
            },
            {
                name: 'Formal notice (Art. 77/79)',
                legalBasis: 'gdpr_art17',
                language: 'en',
                subject: 'FORMAL NOTICE – GDPR Violation – No action taken – Ref. {{request.id}}',
                body: `Dear Sir or Madam,

I am writing to issue this formal notice.

Requester identity:
- Full name: {{user.first_name}} {{user.last_name}}
- Address: {{user.address}}
- Email: {{user.email}}

Timeline of events:
- {{request.sent_date}}: erasure request (GDPR Art. 17) sent to {{broker.email_contact}} — Ref. {{request.id}}
- {{request.reminder_date}}: reminder sent (GDPR Art. 12) — no response received
- To date: no response, no acknowledgement, no action taken

Your organisation, {{broker.name}}, is in clear violation of Articles 12, 17 and 21 of Regulation (EU) 2016/679 (GDPR).

I formally require you to:
- Erase all personal data relating to me within 72 hours
- Confirm in writing that this erasure has been carried out
- Provide the contact details of your Data Protection Officer (DPO)

Should you fail to comply, I will lodge a complaint with the competent supervisory authority (Art. 77 GDPR) and seek judicial remedy (Art. 79 GDPR).

I remind you that GDPR infringements may result in fines of up to 20,000,000 EUR or 4% of total worldwide annual turnover (Art. 83 GDPR).

Yours faithfully,
{{user.first_name}} {{user.last_name}}
{{user.email}}
{{user.address}}

Date: {{request.date}} — Reference: {{request.id}}`,
                isDefault: false,
            },
        ]);
        console.log('8 templates RGPD insérés avec succès');
    }
    catch (error) {
        console.error('Erreur lors de l\'exécution du seed des templates d\'emails:', error);
    }
}
if (process.argv[1]?.endsWith('template_mails_seed.ts') || process.argv[1]?.endsWith('template_mails_seed.js')) {
    seedTemplates()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
