#!/bin/bash

docker compose up -d --build

until docker compose exec api echo "ok" >/dev/null 2>&1; do
  sleep 2
done

docker compose exec api npx drizzle-kit migrate
docker compose exec api npm run seed