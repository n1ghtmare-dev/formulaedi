#!/usr/bin/env bash
# Деплой на сервере. Запускается из корня репозитория.
# Идемпотентен. На первом прогоне без .env/БД не падает, а сообщает, чего не хватает.
set -uo pipefail

cd "$(dirname "$0")/.."   # корень репозитория

echo "==> git sync"
git fetch --all --prune && git reset --hard origin/main || echo "git sync: пропущено"

echo "==> npm ci"
npm ci || { echo "npm ci FAILED"; exit 1; }

echo "==> build (shared + api + web)"
npm run build || { echo "build FAILED"; exit 1; }
echo "web/dist собран: $(ls -d apps/web/dist 2>/dev/null || echo НЕТ)"

if [ ! -f .env ]; then
  echo ">>> НЕТ .env в корне. Создайте его (cp .env.production.example .env) и впишите DATABASE_URL из БД FastPanel."
  echo ">>> Пропускаю миграции и запуск API до появления .env."
  exit 0
fi

echo "==> prisma db push (MySQL)"
set -a; . ./.env; set +a
npm run db:push -w apps/api || { echo ">>> db push не прошёл — проверьте DATABASE_URL/доступ к MySQL."; exit 0; }
npm run db:seed -w apps/api || echo ">>> seed пропущен (ок, если данные уже есть)"

echo "==> restart API (pm2)"
if command -v pm2 >/dev/null; then
  pm2 startOrReload deploy/ecosystem.config.cjs --update-env || pm2 start deploy/ecosystem.config.cjs
  pm2 save || true
  echo ">>> API запущен на 127.0.0.1:4000"
else
  echo ">>> pm2 не установлен: npm i -g pm2 (может понадобиться root)."
fi
