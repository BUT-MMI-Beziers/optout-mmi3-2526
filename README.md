# Projet FLOAT (optout-mmi3-2526)

Bienvenue dans le dépôt du projet **FLOAT**. Cette application web est conçue pour simplifier et automatiser les démarches d'opt-out auprès de divers courtiers de données (data brokers).

Le projet s'appuie sur une architecture moderne séparant le Frontend (React + Vite), l'API Backend (Hono + Drizzle ORM) et des services d'infrastructure (PostgreSQL, Redis, Mailpit, Caddy).

---

##  Sommaire

1. [Prérequis et Installation](#-prérequis-et-installation)
2. [Configuration des variables d'environnement](#-configuration-des-variables-denvironnement)
3. [Développement local](#-développement-local)
4. [Gestion de la Base de Données & Migrations](#-gestion-de-la-base-de-données--migrations)
5. [Déploiement en Production](#-déploiement-en-production)

---

##  Prérequis et Installation

### 1. Prérequis système
Pour installer et faire tourner le projet localement, vous devez disposer des outils suivants :
* **Docker** et **Docker Compose** (Fortement recommandé pour orchestrer tous les services)
* **Node.js** (Version 22.x recommandée) & **npm** (si vous souhaitez exécuter les services hors Docker)

### 2. Clonage du projet
```bash
git clone https://github.com/votre-organisation/optout-mmi3-2526.git
cd optout-mmi3-2526
```

---

##  Configuration des variables d'environnement

Copiez le fichier d'exemple à la racine du projet pour créer votre fichier `.env` :
```bash
cp .env.example .env
```

### Génération des clés de sécurité
Pour sécuriser l'application en développement comme en production, vous devez générer des clés uniques et les ajouter dans votre fichier `.env` :

1. **Clé de chiffrement de l'application (`APP_ENCRYPTION_KEY`)** :
   Générez une clé de 32 octets (exprimée en hexadécimal) avec la commande :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Secret JWT (`JWT_SECRET`)** :
   Générez une clé de 64 octets avec la commande :
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

Mettez à jour les variables respectives dans le fichier `.env`.

---

##  Développement local

### Option A : Démarrage complet avec Docker Compose (Recommandé)

Cette méthode permet de démarrer l'application (API et Frontend) ainsi que toute l'infrastructure sous-jacente en une seule commande.

1. **Lancer les conteneurs** :
   ```bash
   docker compose up --build -d
   ```
   *Cette commande va builder les images de l'API et du Front et les démarrer en arrière-plan.*

2. **Accès aux services** :
   * **Application Frontend** : [http://localhost:5173](http://localhost:5173) (ou [http://localhost](http://localhost) si configuré via le proxy Caddy)
   * **API Backend** : [http://localhost:3000](http://localhost:3000)
   * **Mailpit (Intercepteur d'emails de test)** : [http://localhost:8025](http://localhost:8025)
   * **Base de données PostgreSQL** : Port `5432` (accessible localement avec les identifiants configurés dans le `.env`)
   * **Redis** : Port `6379`

3. **Arrêt des services** :
   ```bash
   docker compose down
   ```

---

### Option B : Exécution hybride (Infrastructure Docker + Code en local)

Si vous préférez exécuter l'API et le Frontend directement sur votre machine hôte (par exemple pour bénéficier d'un rechargement à chaud ultra-rapide ou de débogueurs IDE locaux) :

1. **Démarrer uniquement les bases et outils d'infrastructure** :
   ```bash
   docker compose up -d db redis mailpit
   ```

2. **Démarrer l'API Backend** :
   Dans un terminal dédié :
   ```bash
   cd api
   npm install
   npm run dev
   ```
   *Note : Le script `dev` applique automatiquement les migrations de base de données avant de démarrer le serveur Hono sur le port `3000`.*

3. **Démarrer le Worker et le Scheduler** (nécessaires pour exécuter les tâches asynchrones BullMQ comme l'envoi d'emails) :
   Ouvrez deux autres terminaux :
   ```bash
   # Terminal Worker
   cd api
   npm run worker

   # Terminal Scheduler
   cd api
   npm run scheduler
   ```

4. **Démarrer le Frontend** :
   Dans un autre terminal :
   ```bash
   cd front
   npm install
   npm run dev
   ```
   *Le frontend sera disponible à l'adresse [http://localhost:5173](http://localhost:5173).*

---
