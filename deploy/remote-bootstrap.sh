#!/usr/bin/env bash
# Выполняется НА СЕРВЕРЕ (через ssh 'bash -s -- "$DEPLOY_PATH"').
# Диагностика + бутстрап (клон/сборка) + деплой (миграции/PM2). Ничего не роняет — только рапортует.
DP="${1:-$HOME/formulaedi}"

echo "===== ДИАГНОСТИКА ====="
echo "user=$(whoami)  home=$HOME  deploy_path=$DP"
(sudo -n true 2>/dev/null && echo "sudo: ДА") || echo "sudo: НЕТ"
echo "node=$(node -v 2>/dev/null || echo НЕТ)  npm=$(npm -v 2>/dev/null || echo НЕТ)"
echo "pm2=$(pm2 -v 2>/dev/null || echo НЕТ)  git=$(git --version 2>/dev/null || echo НЕТ)  psql=$(psql --version 2>/dev/null || echo НЕТ)"
echo "nginx=$(command -v nginx || echo НЕТ)"
echo "каталоги сайтов:"; ls -d /var/www 2>/dev/null; ls -d "$HOME/data/www" 2>/dev/null; ls "$HOME" 2>/dev/null | head

echo "===== БУТСТРАП ====="
if ! command -v git >/dev/null || ! command -v node >/dev/null; then
  echo ">>> нет git и/или node — поставьте (FastPanel → Node.js, для системных пакетов нужен root). Останавливаюсь."
  exit 0
fi

if [ ! -d "$DP/.git" ]; then
  echo "клонирую репозиторий в $DP ..."
  git clone https://github.com/n1ghtmare-dev/formulaedi.git "$DP" 2>&1 | tail -4 || { echo ">>> CLONE FAILED — приватный репозиторий? Сделайте публичным или добавьте серверу токен."; exit 0; }
fi

cd "$DP" || { echo ">>> cd $DP failed"; exit 0; }
git fetch --all -q 2>/dev/null && git reset --hard origin/main -q 2>/dev/null
echo "версия: $(git rev-parse --short HEAD 2>/dev/null)"

echo "-- npm ci --"; npm ci 2>&1 | tail -5 || { echo ">>> npm ci FAILED"; exit 0; }
echo "-- build --"; npm run build 2>&1 | tail -8 || { echo ">>> build FAILED"; exit 0; }
echo "web/dist: $(ls -d apps/web/dist 2>/dev/null || echo НЕТ)"

if [ ! -f .env ]; then
  echo ">>> НЕТ .env в корне. Нужен DATABASE_URL из БД FastPanel. Миграции и запуск API пропускаю."
  echo ">>> Дальше: создать БД в панели → прислать строку подключения → я сгенерирую .env."
  exit 0
fi

echo "-- prisma db push (MySQL) --"
set -a; . ./.env; set +a
npm run db:push -w apps/api 2>&1 | tail -8 || { echo ">>> db push FAILED — проверьте DATABASE_URL/доступ к MySQL."; exit 0; }
echo "-- seed (идемпотентно) --"
npm run db:seed -w apps/api 2>&1 | tail -4 || echo ">>> seed не выполнен (ок, если данные уже есть)"

echo "-- pm2 --"
if command -v pm2 >/dev/null; then
  pm2 startOrReload deploy/ecosystem.config.cjs --update-env 2>&1 | tail -4 || pm2 start deploy/ecosystem.config.cjs 2>&1 | tail -4
  pm2 save 2>/dev/null || true
  echo ">>> API запущен на 127.0.0.1:4000"
else
  echo ">>> pm2 не установлен: npm i -g pm2 (возможно нужен root)."
fi
echo "===== ГОТОВО ====="
