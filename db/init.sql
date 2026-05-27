-- ============================================================
-- OptOut — Schéma de base de données
-- SAE 6D01 — BUT MMI 3 — IUT de Béziers
-- Version : v1.1 — Mai 2026
-- ============================================================

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'admin');

CREATE TYPE contact_type AS ENUM ('email', 'phone', 'address');

CREATE TYPE broker_category AS ENUM (
  'people-search',
  'marketing',
  'risk-mitigation',
  'recruitment',
  'other'
);

CREATE TYPE broker_region AS ENUM ('eu', 'us', 'global');

CREATE TYPE opt_out_method AS ENUM ('email', 'form', 'postal', 'mixed');

CREATE TYPE broker_difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE legal_basis AS ENUM ('gdpr_art17', 'gdpr_art15', 'ccpa', 'pipeda', 'other');

CREATE TYPE request_status AS ENUM (
  'DRAFT',
  'SENT',
  'ACKNOWLEDGED',
  'COMPLETED',
  'REFUSED',
  'NO_RESPONSE',
  'COMPLAINT',
  'SUPPRESSED'
);

CREATE TYPE event_type AS ENUM (
  'created',
  'sent',
  'reminder_sent',
  'status_changed',
  'note_added'
);

-- ============================================================
-- TABLE : users
-- Comptes utilisateurs de l'application
-- Les champs sensibles (first_name, last_name, birth_date)
-- doivent être chiffrés en AES-256 via APP_ENCRYPTION_KEY
-- ============================================================

CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  first_name    VARCHAR(100)  NOT NULL,           -- chiffré au repos
  last_name     VARCHAR(100)  NOT NULL,           -- chiffré au repos
  birth_date    DATE          NULL,               -- chiffré au repos
  role          user_role     NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : user_contacts
-- Données de contact de l'utilisateur (emails, téléphones,
-- adresses) utilisées pour générer les demandes de suppression.
-- La colonne value est chiffrée au repos (AES-256).
-- ============================================================

CREATE TABLE user_contacts (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       contact_type  NOT NULL,
  value      TEXT          NOT NULL,              -- chiffré au repos
  is_primary BOOLEAN       NOT NULL DEFAULT false,
  label      VARCHAR(50)   NULL,                  -- ex: domicile, pro, ancien
  created_at TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : brokers
-- Registre communautaire des data brokers.
-- Seed initial requis : 30 brokers EU + 20 internationaux.
-- ============================================================

CREATE TABLE brokers (
  id               UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255)      NOT NULL,
  slug             VARCHAR(255)      NOT NULL UNIQUE,
  email_contact    VARCHAR(255)      NOT NULL,
  website          VARCHAR(500)      NULL,
  opt_out_url      VARCHAR(500)      NULL,
  category         broker_category   NOT NULL,
  region           broker_region     NOT NULL,
  country          VARCHAR(2)        NULL,        -- code ISO ex: FR, DE, US
  opt_out_method   opt_out_method    NOT NULL,
  difficulty       broker_difficulty NOT NULL,
  legal_basis      legal_basis       NOT NULL,
  notes            TEXT              NULL,
  is_verified      BOOLEAN           NOT NULL DEFAULT false,
  last_verified_at TIMESTAMP         NULL,
  created_at       TIMESTAMP         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP         NOT NULL DEFAULT NOW()
);

-- Mise à jour automatique de updated_at lors des modifications de broker
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brokers_updated_at ON brokers;
CREATE TRIGGER trg_brokers_updated_at
BEFORE UPDATE ON brokers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE : email_templates
-- Templates d'emails RGPD pour les demandes de suppression.
-- Requis : gdpr_art17 (effacement), gdpr_art15 (accès),
--          relance (art.12), mise en demeure (art.77)
-- Variables : {{user.first_name}}, {{broker.name}}, etc.
-- ============================================================

CREATE TABLE email_templates (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,               -- ex: gdpr_erasure_fr
  legal_basis legal_basis NOT NULL,
  language   VARCHAR(5)  NOT NULL,                -- fr, en
  subject    VARCHAR(255) NOT NULL,               -- peut contenir des {{variables}}
  body       TEXT         NOT NULL,               -- HTML/texte avec {{variables}}
  is_default BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : removal_requests
-- Demandes de suppression envoyées aux brokers.
-- Machine à états : DRAFT → SENT → ACKNOWLEDGED → COMPLETED
--                                              └→ REFUSED → COMPLAINT
--                              └→ NO_RESPONSE → SENT (relance)
--                                           └→ COMPLAINT
--                              └→ SUPPRESSED
-- ============================================================

CREATE TABLE removal_requests (
  id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_id     UUID            NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  template_id   UUID            NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  status        request_status  NOT NULL DEFAULT 'DRAFT',
  sent_at       TIMESTAMP       NULL,             -- date d'envoi effectif
  responded_at  TIMESTAMP       NULL,             -- date de réponse du broker
  next_action_at TIMESTAMP      NULL,             -- prochaine relance prévue
  email_body    TEXT            NOT NULL,         -- corps de l'email généré (traçabilité)
  created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : request_events
-- Journal d'audit de chaque demande (historique des événements)
-- ============================================================

CREATE TABLE request_events (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID         NOT NULL REFERENCES removal_requests(id) ON DELETE CASCADE,
  event_type event_type   NOT NULL,
  old_status request_status NULL,                 -- pour event_type = status_changed
  new_status request_status NULL,                 -- pour event_type = status_changed
  note       TEXT          NULL,                  -- commentaire libre
  created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : notifications
-- Notifications in-app (relances automatiques, changements
-- de statut, dépassement du délai légal de 30 jours)
-- ============================================================

CREATE TABLE notifications (
  id         UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID      NULL REFERENCES removal_requests(id) ON DELETE SET NULL,
  message    TEXT      NOT NULL,
  is_read    BOOLEAN   NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX
-- ============================================================

-- Recherche des contacts par utilisateur
CREATE INDEX idx_user_contacts_user_id ON user_contacts(user_id);

-- Filtres sur les brokers (catégorie, région, difficulté)
CREATE INDEX idx_brokers_category   ON brokers(category);
CREATE INDEX idx_brokers_region     ON brokers(region);
CREATE INDEX idx_brokers_difficulty ON brokers(difficulty);
CREATE INDEX idx_brokers_is_verified ON brokers(is_verified);

-- Recherche des demandes par utilisateur et par statut
CREATE INDEX idx_removal_requests_user_id  ON removal_requests(user_id);
CREATE INDEX idx_removal_requests_status   ON removal_requests(status);
CREATE INDEX idx_removal_requests_next_action ON removal_requests(next_action_at)
  WHERE next_action_at IS NOT NULL;  -- index partiel pour le scheduler

-- Journal d'événements par demande
CREATE INDEX idx_request_events_request_id ON request_events(request_id);

-- Notifications non lues par utilisateur
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;

-- ============================================================
-- SEED — Email templates RGPD obligatoires
-- ============================================================

INSERT INTO email_templates (id, name, legal_basis, language, subject, body, is_default) VALUES

-- Demande d'effacement — RGPD Art. 17 — Français
(uuid_generate_v4(), 'gdpr_erasure_fr', 'gdpr_art17', 'fr',
 'Demande d''effacement de données personnelles — RGPD Art. 17 — Réf. {{request.id}}',
 'Madame, Monsieur,

Je me permets de vous contacter afin d''exercer mon droit à l''effacement de mes données personnelles, conformément à l''article 17 du Règlement Général sur la Protection des Données (RGPD — UE 2016/679).

Je vous demande de supprimer l''intégralité des données personnelles me concernant que vous détenez, notamment :
- Nom : {{user.last_name}}
- Prénom : {{user.first_name}}
- Adresse : {{user.address}}
- Email : {{user.email}}

Conformément à l''article 12 du RGPD, vous disposez d''un délai d''un mois à compter de la réception de la présente pour donner suite à ma demande.

Dans l''attente de votre réponse, je reste à votre disposition pour tout renseignement complémentaire.

Cordialement,
{{user.first_name}} {{user.last_name}}

Référence de la demande : {{request.id}}
Date : {{request.date}}',
true),

-- Demande d'effacement — RGPD Art. 17 — Anglais
(uuid_generate_v4(), 'gdpr_erasure_en', 'gdpr_art17', 'en',
 'Right to Erasure Request — GDPR Art. 17 — Ref. {{request.id}}',
 'Dear Data Protection Officer,

I am writing to exercise my right to erasure of my personal data, in accordance with Article 17 of the General Data Protection Regulation (GDPR — EU 2016/679).

I request that you delete all personal data you hold concerning me, including but not limited to:
- Last name: {{user.last_name}}
- First name: {{user.first_name}}
- Address: {{user.address}}
- Email: {{user.email}}

Pursuant to Article 12 of the GDPR, you have one month from receipt of this request to respond.

Please confirm in writing once the deletion has been completed.

Yours sincerely,
{{user.first_name}} {{user.last_name}}

Request reference: {{request.id}}
Date: {{request.date}}',
true),

-- Demande d'accès — RGPD Art. 15 — Français
(uuid_generate_v4(), 'gdpr_access_fr', 'gdpr_art15', 'fr',
 'Demande d''accès à mes données personnelles — RGPD Art. 15 — Réf. {{request.id}}',
 'Madame, Monsieur,

Je souhaite exercer mon droit d''accès à mes données personnelles conformément à l''article 15 du RGPD (UE 2016/679).

Je vous demande de bien vouloir me communiquer :
- La liste de toutes les données personnelles me concernant que vous détenez
- Les finalités du traitement
- Les éventuels destinataires auxquels ces données ont été communiquées
- La durée de conservation prévue

Informations permettant mon identification :
- Nom : {{user.last_name}}
- Prénom : {{user.first_name}}
- Email : {{user.email}}
- Adresse : {{user.address}}

Conformément à l''article 12 du RGPD, vous disposez d''un délai d''un mois pour répondre.

Cordialement,
{{user.first_name}} {{user.last_name}}

Référence : {{request.id}} — Date : {{request.date}}',
true),

-- Relance — RGPD Art. 12 — Français
(uuid_generate_v4(), 'gdpr_reminder_fr', 'gdpr_art15', 'fr',
 'Relance — Demande d''effacement sans réponse — RGPD Art. 12 — Réf. {{request.id}}',
 'Madame, Monsieur,

Sauf erreur de ma part, ma demande d''effacement de données personnelles envoyée le {{request.date}} (réf. {{request.id}}) est restée sans réponse de votre part.

Je vous rappelle qu''en vertu de l''article 12 du RGPD, vous êtes tenus de répondre dans un délai d''un mois à compter de la réception d''une telle demande. Ce délai est désormais dépassé.

Je vous renouvelle donc ma demande et vous invite à y donner suite dans les meilleurs délais, sous peine de signalement auprès de l''autorité de contrôle compétente (CNIL en France).

Cordialement,
{{user.first_name}} {{user.last_name}}

Référence initiale : {{request.id}}',
false),

-- Mise en demeure — RGPD Art. 77 — Français
(uuid_generate_v4(), 'gdpr_formal_notice_fr', 'gdpr_art17', 'fr',
 'MISE EN DEMEURE — Non-respect du RGPD — Art. 17 & 77 — Réf. {{request.id}}',
 'Madame, Monsieur,

En l''absence de réponse à ma demande d''effacement (réf. {{request.id}}, envoyée le {{request.date}}) et à la relance qui a suivi, je me vois contraint(e) de vous adresser la présente mise en demeure.

Vous n''avez pas respecté votre obligation de traitement des demandes d''exercice de droits dans le délai légal prescrit par l''article 12 du RGPD.

Je vous demande de régulariser votre situation dans un délai de 15 jours à compter de la réception du présent courrier.

À défaut, je me réserve le droit de :
1. Déposer une plainte auprès de la CNIL (www.cnil.fr), conformément à l''article 77 du RGPD
2. Saisir les juridictions compétentes pour obtenir réparation du préjudice subi

Cordialement,
{{user.first_name}} {{user.last_name}}

Référence : {{request.id}}',
false);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================