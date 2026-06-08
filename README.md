# optout-mmi3-2526

## Commandes Drizzle

```bash
docker compose exec api npx drizzle-kit migrate
```

Seed tempaltes emails :

```bash
docker compose exec api npm run seed
```

### Startup (dev)

Ce script permet de lancer automatiquement le docker compose & d'initialiser les migrations

> Si besoin donner les permission au script

```bash
chmod +x ./setup.sh
```

Puis 
```bash
./setup.sh
```

Si besoin, rajouter des lignes de commandes apres pour d'autres init de migration ou autre.

