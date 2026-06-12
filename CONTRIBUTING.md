# Guide de Contribution - Équipe Rouge

Ce guide définit les standards, les flux de travail (workflows) et les conventions de nommage pour l'**Équipe Rouge** sur le projet **optout-mmi3-2526 (FLOAT)**.

L'Équipe Rouge est responsable du périmètre **Brokers** (gestion des courtiers de données), principalement sur la partie base de données et API (backend Hono).

---

## Sommaire

1. [Périmètre de l'Équipe Rouge](#-périmètre-de-léquipe-rouge)
2. [Configuration du Projet (Local Setup)](#-configuration-du-projet-local-setup)
3. [Stratégie de Branches (Git Workflow)](#-stratégie-de-branches-git-workflow)
4. [Conventions de Commits](#-conventions-de-commits)
5. [Normes de Code](#-normes-de-code)

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

