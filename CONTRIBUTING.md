# Guide de Contribution — FLOAT (optout-mmi3-2526)

Ce guide définit les standards, les flux de travail (workflows) et les conventions de nommage des équipes du projet **optout-mmi3-2526 (FLOAT)**.

Chaque équipe travaille sur sa branche de groupe (`rouge`, `vert`, `violet`, `bleu`) avec des branches de feature, puis fusionne régulièrement dans `develop`.

---

## Sommaire

1. [Périmètre de l'Équipe Rouge](#-périmètre-de-léquipe-rouge)
2. [Périmètre de l'Équipe Verte](#-périmètre-de-léquipe-verte)
3. [Périmètre de l'Équipe Violette](#-périmètre-de-léquipe-violette)
4. [Stratégie de Branches (Git Workflow)](#-stratégie-de-branches-git-workflow)
5. [Conventions de Commits](#-conventions-de-commits)
6. [Normes de Code](#-normes-de-code)

---

## Périmètre de l'Équipe Rouge

L'Équipe Rouge est responsable du module **Brokers** côté Base de données et API :

* **Base de données** :
  * Définition du schéma Drizzle dans [api/src/db/schema.ts](file:///C:/Users/kevin/Desktop/FLOAT/optout-mmi3-2526/api/src/db/schema.ts).
  * Script d'exécution des migrations dans [api/src/db/migrate.ts](file:///C:/Users/kevin/Desktop/FLOAT/optout-mmi3-2526/api/src/db/migrate.ts).
  * Données initiales et de test (seeders) dans [api/src/db/seeds/brokers_seed.ts](file:///C:/Users/kevin/Desktop/FLOAT/optout-mmi3-2526/api/src/db/seeds/brokers_seed.ts).
* **Backend (API)** :
  * Routes, contrôleurs et logique dans [api/src/routes/brokers.routes.ts](file:///C:/Users/kevin/Desktop/FLOAT/optout-mmi3-2526/api/src/routes/brokers.routes.ts) (CRUD, export/import YAML et JSON, vérification).

*Note : La page du Frontend (`front/src/pages/AdminBrokers.tsx`) ont été créées temporairement pour tester nos routes et ne fait pas partie de notre périmètre de production.*

---

## Périmètre de l'Équipe Verte

L'Équipe Verte est responsable du **Frontend** complet et des **features transverses** (front + API quand la fonctionnalité traverse la stack) :

* **Frontend (React + TypeScript + Vite + shadcn/ui)** :
  * Design system (tokens, fonts, variables CSS) à partir de la maquette Figma, animations Framer Motion, responsive.
  * Layout général : sidebar, header (recherche globale, notifications), bottom nav mobile (`front/src/layouts/MainLayout.tsx`).
  * Pages : Dashboard (stats, graphiques, actions recommandées), Demandes (liste / détail / création / review), Data brokers (liste / fiche / proposition), Relances programmées, Notifications, Profil, Paramètres, Landing, Login / Register.
  * Couche API front avec fallback mock (`front/src/lib/api.ts`) — le front fonctionnait avant le branchement du backend réel.
* **Authentification & sécurité (front + back)** :
  * 2FA TOTP (QR code, anti-replay), passkeys WebAuthn, sessions actives révocables.
  * Refresh token rotatif en cookie HttpOnly avec verrou singleton côté front (fix race condition de déconnexion).
* **Flow relance / archivage (front + back)** :
  * Relance restreinte au statut `NO_RESPONSE`, création d'une demande enfant, archivage automatique du parent (`archivedAt`, route `PATCH /requests/:id/archive`), affichage cohérent sur toutes les pages.
  * Recherche des demandes (filtre `ilike` côté API).
* **Panel admin & provenance des brokers (front + back)** :
  * Panel de modération `/admin/brokers` : file d'attente triable, vérification, édition, suppression, import en masse.
  * Colonnes `created_by` / `verified_by` (badge « Registre par défaut » vs « Ajouté par la communauté », vérifié par qui et quand), email du proposeur visible uniquement des admins.
  * Compte admin par défaut seedé depuis le `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), idempotent, aucun mot de passe en dur.
* **Export RGPD** : modal d'export des données par catégorie (art. 20).

**Workflow Vert** : branches `feature/vert/<nom>` ou `fix/vert/<nom>` → PR vers `vert` → fusion régulière dans `develop`.
**Commits Vert** : convention *conventional commits* en français — `feat(scope): description`, `fix(scope): description`, corps de commit détaillé.

> ⚠️ Lorsqu'une PR Verte contient une migration ou de nouvelles dépendances API, le corps de la PR l'indique explicitement : les autres équipes doivent alors relancer `docker compose build api && docker compose up -d api`.

---

## Périmètre de l'Équipe Violette

L'Équipe Violette est responsable du module **Demandes de suppression & Emails** côté Base de données et API :

* **Base de données** :
  * Tables `email_templates`, `removal_requests` et `request_events` dans le schéma Drizzle.
  * Seed des 8 templates d'emails RGPD (FR + EN, art. 17 / art. 15) dans `api/src/db/seeds/template_mails_seed.ts`.
* **Backend (API)** :
  * Routes `requests` (`api/src/routes/requests.routes.ts`) : création de brouillons (DRAFT), création en lot (batch), envoi (`POST /:id/send`), machine à états des statuts (`PATCH /:id/status` avec transitions validées et journalisation d'événements), historique (`GET /:id/events`), prévisualisation d'email.
  * Routes `templates` (`api/src/routes/templates.routes.ts`) : listing filtrable par langue / base légale.
  * Service de rendu de templates (`api/src/services/template.service.ts`) : interpolation des variables `{{user.x}}`, `{{broker.x}}`, `{{request.x}}`.
  * Notifications in-app sur les statuts terminaux.
  * Préférence de langue des templates (FR/EN) appliquée à la création des demandes.
* **Worker d'emails (BullMQ + Redis)** :
  * Envoi asynchrone des emails (`api/src/workers/email.worker.ts`), mise à jour du statut `SENT`, journalisation `request_events`, throttling par utilisateur.
* **Documentation** : spécification OpenAPI des routes du module (`api/src/docs/openapi.yaml`, exposée sur `/docs`).
* **Validation** : validation des données des nouvelles demandes, validation UUID, format d'email exigé pour la proposition de broker.

**Workflow Violet** : branches `feature/violet/<nom>` → PR vers `violet` → fusion régulière dans `develop`.

---

## Stratégie de Branches (Git Workflow)

L'Équipe Rouge travaille sur la branche principale `rouge`. Le flux de travail recommandé est le suivant :

```
gitGraph
    commit id: "develop"
    branch rouge
    checkout rouge
    commit id: "Init Rouge"
    branch feature/rouge/brokers-api
    checkout feature/rouge/brokers-api
    commit id: "Add : Route GET brokers"
    commit id: "Fix : Validation des donnees"
    checkout rouge
    merge feature/rouge/brokers-api
    checkout develop
    merge rouge
```

### 1. Cycle de vie d'une fonctionnalité

1. **Mise à jour** : Assurez-vous que votre branche `rouge` locale est synchronisée avec le dépôt distant.
2. **Création de la branche** : Créez une branche de ticket à partir de `rouge` :
   * Pour une fonctionnalité : `feature/rouge/<nom-fonctionnalité>`
   * Pour un correctif de bug : `fix/rouge/<nom-bug>`

   ```bash
   git checkout rouge
   git pull origin rouge
   git checkout -b feature/rouge/brokers-pagination
   ```
3. **Développement** : Effectuez vos modifications en suivant les conventions de commit.
4. **Pull Request** : Poussez votre branche sur le dépôt distant et ouvrez une Pull Request (PR) ciblant la branche `rouge`.
5. **Validation et Fusion** : Après relecture par un membre de l'équipe, la PR est fusionnée dans `rouge`.
6. **Mise en commun** : La branche `rouge` sera régulièrement fusionnée dans `develop` pour s'intégrer avec le travail des autres équipes (`bleu`, `vert`, `violet`).

---

## Conventions de Commits

Nous suivons une convention de commit stricte pour faciliter la lecture de l'historique de l'équipe.

### Format du message

> **`<Keyword> : <Description courte en français>`**

* **Keyword** : Premier mot avec une majuscule indiquant le type de changement.
* **Séparateur** : Un espace suivi d'un deux-points et d'un autre espace (`:`).
* **Description** : Titre court en français décrivant l'action réalisée (pas de point final, verbe à l'infinitif ou nom d'action).

## Normes de Code

Pour assurer la cohérence de la base de code, veillez à respecter les règles suivantes :

### 1. Backend (Hono & Drizzle)

* **Typage TypeScript** : Évitez l'utilisation de `any`. Définissez des types ou interfaces clairs pour les requêtes et réponses.
* **Gestion des erreurs** : Enveloppez les appels de base de données dans des blocs `try/catch`. Renvoyez des codes HTTP explicites :
  * `200 OK` ou `201 Created` pour les succès.
  * `400 Bad Request` si les paramètres requis sont manquants ou mal formés.
  * `404 Not Found` si l'entité demandée n'existe pas.
  * `500 Internal Server Error` pour les exceptions système capturées (avec un `console.error` de l'erreur).

### 2. Base de données & Drizzle ORM

* **Schémas descriptifs** : Déclarez les champs de table dans [schema.ts](file:///C:/Users/kevin/Desktop/FLOAT/optout-mmi3-2526/api/src/db/schema.ts) avec les contraintes appropriées (ex: `notNull()`, `unique()`, etc.).
* **Relations et Index** : Indexez correctement les colonnes utilisées pour les recherches fréquentes (comme le `slug` ou le `name`).
* **Migrations sûres** : Ne modifiez jamais un fichier SQL de migration généré manuellement. Si le schéma change, relancez `npm run db:generate` pour générer une nouvelle migration propre.

