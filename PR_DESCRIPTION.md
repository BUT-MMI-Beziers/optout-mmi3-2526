## Description de la PR : Importation de brokers et automatisation du seed

Cette PR introduit la prise en charge de l'importation de courtiers (brokers) à l'aide de fichiers locaux aux formats JSON et YAML, met en place l'interface d'administration brute pour les tester, et automatise le seed des 77 brokers lors des migrations Docker.

---

### Modifications apportées

#### Backend (API Hono)
* **Importation robuste (api/src/routes/brokers.ts)** :
  * Support des formats JSON et YAML (via js-yaml) selon le Content-Type.
  * Gestion des erreurs de syntaxe (400 Bad Request) avec retours explicites en cas de fichier malformé, évitant les crashs 500.
  * Application d'une valeur de repli ("no-email@optout.local") pour les brokers n'ayant pas d'adresse e-mail dans la graine, respectant la contrainte de base de données.
* **Seed automatique (api/src/db/seeds/brokers_seed.ts)** :
  * Conversion de la graine des 77 brokers au format TypeScript.
  * Intégration de seedBrokers dans le cycle de migration (api/src/db/migrate.ts) pour une insertion automatique et sans doublon au démarrage.

#### Frontend (React / Vite)
* **Interface d'administration (front/src/pages/AdminBrokers.tsx)** :
  * Implémentation d'une page d'import brute (/admin/brokers) avec sélecteur de fichier (.json, .yaml, .yml).
  * Affichage direct du résultat de l'importation (succès ou erreur de parsing renvoyée par l'API).

#### Infrastructure et Configuration
* **Caddyfile** : Suppression du strip-prefix /api qui bloquait les routes d'API Hono.
* **Proxy de développement (front/vite.config.ts)** : Proxy /api configuré pour faciliter le développement local sans Caddy.

---

### Procédure de test

1. Mettre à jour la branche locale et relancer les conteneurs :
   ```bash
   git checkout rouge
   git pull
   docker compose up -d --build --force-recreate -V
   ```

2. Vérifier que la base de données s'est automatiquement seedée au démarrage :
   ```bash
   docker compose logs api
   ```
   *(Attendu : "Les brokers existent déjà. Seed des brokers ignoré." ou "77 brokers insérés avec succès").*

3. Tester l'import manuel depuis l'interface :
   * Accéder à l'URL : http://localhost/admin/brokers
   * Sélectionner un fichier seed JSON ou YAML.
   * Cliquer sur Importer pour valider l'insertion.
