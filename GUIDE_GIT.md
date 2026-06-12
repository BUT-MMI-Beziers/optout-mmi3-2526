# Guide Git/Github - SAE 6D01

## Somaire

- [Guide Git/Github - SAE 6D01](#guide-gitgithub---sae-6d01)
  - [Somaire](#somaire)
  - [Ressources](#ressources)
  - [Structure des branches](#structure-des-branches)
  - [Workflow type pour une feature](#workflow-type-pour-une-feature)
    - [1. Se mettre à jour](#1-se-mettre-à-jour)
    - [2. Créer la branche de feature](#2-créer-la-branche-de-feature)
    - [3. Travailler en commits atomiques](#3-travailler-en-commits-atomiques)
    - [4. Pousser la branche](#4-pousser-la-branche)
    - [5. Ouvrir une Pull Request](#5-ouvrir-une-pull-request)
  - [Hiérarchie des Pull Requests](#hiérarchie-des-pull-requests)
  - [Faire une review](#faire-une-review)
    - [Actions possibles](#actions-possibles)
    - [Tester la branche localement](#tester-la-branche-localement)
  - [Merger une PR](#merger-une-pr)
  - [Gérer les conflits](#gérer-les-conflits)
    - [Conseils pour éviter les conflits](#conseils-pour-éviter-les-conflits)


## Ressources

- Comprendre Git en 15 minutes : https://www.youtube.com/watch?v=Ala6PHlYjmw
- Conventional Commits : https://www.conventionalcommits.org/fr/

## Structure des branches

Le projet utilise une hiérarchie de branches pour s'adapter à votre travail en équipes.

```
main  
└── develop  
    ├── violet  
    │   ├── features/violet/login
    │   └── features/violet/navbar
    ├── bleu  
    ├── rouge  
    └── vert
```

- `main` : [protégée], contient uniquement les releases.
- `develop` : Reçoit les PR des branches d'équipe (vert, bleu, rouge, violet). Le chef d'une couleur fait la PR et un autre chef d'une autre équipe review la PR.
- `violet`, `bleu`, `rouge`, `vert` : branches d'équipe qui reçoivent les PR des features de l'équipe.
- `features/couleur/description` : branches de travail individuelles.

Note : les slashs dans les noms de branches n'ont pas signification hiérarchique en Git, c'est juste une convention de nommage.

## Workflow type pour une feature

### 1. Se mettre à jour

Avant de commencer toute nouvelle feature, partir d'une base à jour.

```bash
git checkout vert
git pull origin vert
```

### 2. Créer la branche de feature

Le nom doit être assez explicite:

```bash
git checkout -b features/rouge/frontend-broker-page
```
Note: `git switch -c` == `git checkout -b`

### 3. Travailler en commits atomiques

Un commit = un changement logique cohérent. Éviter les commits fourre-tout du type "wip" ou "fix".

```bash
git add broker.js broker.css
git commit -m "feat: add frontend for broker page"
```

Convention de messages recommandée ([Conventional Commits](https://www.conventionalcommits.org/fr/)) :

- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `refactor:` refactorisation sans changer la fonction
- `style:` formatage, CSS, indentation
- `docs:` documentation
- `chore:` tâches techniques (modification/MaJ des dépendances)

### 4. Pousser la branche

```bash
git push --set-upstream origin <nom-de-la-branche>
```

Pour les push suivants, un simple `git push` suffit.

### 5. Ouvrir une Pull Request

Sur GitHub :

1. Aller sur l'onglet Pull requests.
2. Cliquer New pull request.
3. Choisir `base: vert` (branche cible/destination) et `compare: features/vert/formulaire-contact` (branche source).
4. Donner un titre clair et une description listant les changements.
5. Assigner un reviewer (le chef d'équipe).

## Hiérarchie des Pull Requests

```
features/...  ->   couleur  -> chef d'équipe valide
couleur       ->   develop  -> coordination inter-équipes
develop       ->   main     -> release (enseignant)
```

Ne jamais merger directement dans `develop` ou `main` sans passer par la branche d'équipe.

## Faire une review

Le chef d'équipe review chaque PR avant merge.

- La PR ne mélange pas plusieurs fonctionnalités sans rapport.
- Vérifiez absolument qu'il n'y ai pas de `.env` commités.
- Regardez pour éviter des `console.log` oubliés.
- Les commits sont propres et descriptifs.
- Le code fonctionne et a été testé localement si nécessaire (voir [Tester la branche localement](#tester-la-branche-localement)).

### Actions possibles

- Approve : le code est bon, merge possible.
- Request changes : des modifications sont nécessaires avant merge.
- Comment : juste un petit commentaire sans blocage.

### Tester la branche localement

```bash
git fetch origin
git checkout features/16-formulaire-contact
```

## Merger une PR

Trois stratégies de merge sur GitHub :

- Merge commit : Par défaut. À utiliser pour merger une branche d'équipe dans `develop`.
- Squash and merge : Combine tous les commits en un seul. Recommandé pour merger une feature dans une branche d'équipe (si vous avez beaucoup de commit pour une feature ça garde l'historique principal lisible).
- Rebase and merge : À éviter (ré-applique les commits sans commit de merge)

Recommandation pour ce projet :

- `features/*` vers `couleur` : Squash and merge.
- `couleur` vers `develop` : Merge commit.
- `develop` vers `main` : Merge commit (avec un tag de version).

Après merge, supprimer la branche de feature (bouton Delete branch sur GitHub).

## Gérer les conflits

Un conflit survient quand deux branches modifient les mêmes lignes d'un fichier.
Lors d'une PR GitHub indique que le merge ne peut pas être fait automatiquement. Il faut résoudre en local.

```bash
git checkout features/bleu/add-database-scheme
git fetch origin
git merge origin/bleu
```

Git va lister les fichiers en conflit. Ouvrez les fichiers et les zones en conflit sont marquées comme ça :

```
<<<<<<< HEAD
ma version
=======
version de l'autre branche
>>>>>>> origin/vert
```

Vous pouvez cliquer sur "Accept Current Change" pour garder vos modifs, ou "Accept Incoming" pour garder l'autre verison. Si les options n'apparaissent pas, éditez le fichier pour garder ce qui convient et supprimer les marqueurs `<<<<<<<`, `=======`, `>>>>>>>`.

Pour finaliser le conflit :

```bash
git add fichier-resolu.js
git commit
git push
```

La PR se met automatiquement à jour.

### Conseils pour éviter les conflits

- Communiquer avec l'équipe sur qui touche à quels fichiers.
- Éviter de toucher au même fichier en parallèle si possible.
- Faire des features courtes.

Si vous avez un message d'erreur cryptique lors d'un merge, n'hésitez pas à faire une recherche en ligne ou à demander à un LLM; ils sont très bons pour débugger ce genre de cas.