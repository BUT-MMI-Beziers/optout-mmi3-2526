# Guide de Contribution - Équipe Bleu

Ce guide définit les standards, les flux de travail (workflows) et les conventions de nommage pour l'**Équipe Bleu** sur le projet **optout-mmi3-2526 (FLOAT)**.

L'Équipe Bleu est responsable du périmètre **Auth & Profil** (authentification et profil utilisateur), principalement sur la partie base de données et API (backend Hono).

---

## Sommaire

1. [Périmètre de l'Équipe Bleu](#-périmètre-de-léquipe-bleu)
2. [Configuration du Projet (Local Setup)](#-configuration-du-projet-local-setup)
3. [Stratégie de Branches (Git Workflow)](#-stratégie-de-branches-git-workflow)
4. [Conventions de Commits](#-conventions-de-commits)
5. [Normes de Code](#-normes-de-code)

---

## Périmètre de l'Équipe Bleu

L'Équipe Bleu est responsable du module **Auth & Profil** côté Base de données et API :

* **Base de données** :
  * Définition du schéma Drizzle (tables `users` et `user_contacts`) dans [api/src/db/schema.ts](file:///Users/gwen_b22/Desktop/SAE601/sae601_1/optout-mmi3-2526/api/src/db/schema.ts).
* **Backend (API)** :
  * Routes, contrôleurs et logique d'authentification (connexion, inscription, gestion des tokens JWT via cookies HttpOnly) dans le dossier [api/src/routes/auth/](file:///Users/gwen_b22/Desktop/SAE601/sae601_1/optout-mmi3-2526/api/src/routes/auth/).
  * Routes, contrôleurs et logique de gestion de profil utilisateur dans le dossier [api/src/routes/profil/](file:///Users/gwen_b22/Desktop/SAE601/sae601_1/optout-mmi3-2526/api/src/routes/profil/).
  * Intégration du middleware d'authentification pour sécuriser les routes privées.

---

## Configuration du Projet (Local Setup)

1. **Cloner le projet et installer les dépendances** :
   ```bash
   npm install
   cd api && npm install
   cd ../front && npm install
   ```
2. **Configurer les variables d'environnement** :
   Copier le fichier `.env.example` vers `.env` et renseigner les variables nécessaires (notamment `DATABASE_URL` et `JWT_SECRET`).
3. **Lancer la base de données et les services** :
   ```bash
   docker compose up -d
   ```
4. **Lancer les serveurs de développement** :
   * Backend : `cd api && npm run dev`
   * Frontend : `cd front && npm run dev`

---

## Stratégie de Branches (Git Workflow)

L'Équipe Bleu travaille sur la branche principale `bleu`. Le flux de travail recommandé est le suivant :

```mermaid
gitGraph
    commit id: "develop"
    branch bleu
    checkout bleu
    commit id: "Init Bleu"
    branch feature/bleu/auth
    checkout feature/bleu/auth
    commit id: "feat: auth routes"
    commit id: "fix: cookie auth"
    checkout bleu
    merge feature/bleu/auth
    checkout develop
    merge bleu
```

### 1. Cycle de vie d'une fonctionnalité

1. **Mise à jour** : Assurez-vous que votre branche `bleu` locale est synchronisée avec le dépôt distant.
2. **Création de la branche** : Créez une branche de ticket à partir de `bleu` :
   * Pour une fonctionnalité : `feature/bleu/<nom-fonctionnalité>`
   * Pour un correctif de bug : `fix/bleu/<nom-bug>`

   ```bash
   git checkout bleu
   git pull origin bleu
   git checkout -b feature/bleu/sessions
   ```
3. **Développement** : Effectuez vos modifications en suivant les conventions de commit.
4. **Pull Request** : Poussez votre branche sur le dépôt distant et ouvrez une Pull Request (PR) ciblant la branche `bleu`.
5. **Validation et Fusion** : Après relecture par un membre de l'équipe, la PR est fusionnée dans `bleu`.
6. **Mise en commun** : La branche `bleu` sera régulièrement fusionnée dans `develop` pour s'intégrer avec le travail des autres équipes (`rouge`, `vert`, `violet`).

---

## Conventions de Commits

Nous suivons une convention de commit claire pour faciliter la lecture de l'historique de l'équipe.

### Format du message

> **`<Keyword> : <Description courte en français>`** ou **`<Keyword>(<scope>): <Description en français>`**

* **Keyword** : Premier mot avec une majuscule (ou minuscule conventionnelle) indiquant le type de changement (ex: `feat`, `fix`, `refactor`, `docs`, `chore` ou `ADD`, `Fix`).
* **Séparateur** : Un espace suivi d'un deux-points et d'un autre espace (`:`).
* **Description** : Titre court en français décrivant l'action réalisée (pas de point final).

---

## Normes de Code

Pour assurer la cohérence de la base de code, veillez à respecter les règles suivantes :

### 1. Backend (Hono & Drizzle)

* **Typage TypeScript** : Évitez l'utilisation de `any`. Définissez des types ou interfaces clairs pour les payloads de requêtes et de réponses (dans `auth.types.ts` et `profil.types.ts`).
* **Sécurité & Cookies** : Utilisez des cookies HttpOnly pour le stockage des tokens afin d'éviter les failles XSS.
* **Gestion des erreurs** : Enveloppez les requêtes de base de données dans des blocs `try/catch`. Renvoyez des codes HTTP appropriés :
  * `200 OK` ou `201 Created` pour les succès.
  * `401 Unauthorized` si l'utilisateur n'est pas authentifié.
  * `403 Forbidden` si l'utilisateur n'a pas les droits requis.
  * `500 Internal Server Error` pour les exceptions système (avec un `console.error` de l'erreur).

### 2. Base de données & Drizzle ORM

* **Schémas descriptifs** : Déclarez les tables dans [schema.ts](file:///Users/gwen_b22/Desktop/SAE601/sae601_1/optout-mmi3-2526/api/src/db/schema.ts) avec les contraintes adaptées (ex: `references()` pour l'intégrité référentielle, `notNull()`, `unique()`).
* **Chiffrement** : Veillez à chiffrer les informations utilisateur sensibles (ex: mots de passe via `bcryptjs`).
