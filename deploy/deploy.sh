#!/usr/bin/env bash
# Скрипт деплоя на сервере. Запускается из корня репозитория (DEPLOY_PATH).
# Идемпотентен: тянет код, ставит зависимости, собирает, применяет миграции, рестартит API.
set -euo pipefail

cd "$(dirname "$0")/.."   # корень репозитория

echo "==> git pull"
git fetch --all --prune
git reset --hard origin/main

echo "==> npm ci"
npm ci

echo "==> build (shared + api + web)"
npm run build

echo "==> prisma migrate deploy"
# грузим переменные окружения из корневого .env (там DATABASE_URL и др.)
set -a; [ -f .env ] && . ./.env; set +a
npm run db:deploy -w apps/api   # prisma migrate deploy

echo "==> restart API (pm2)"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env || pm2 start deploy/ecosystem.config.cjs

echo "==> done. web/dist собран в apps/web/dist, API работает на 127.0.0.1:4000"
