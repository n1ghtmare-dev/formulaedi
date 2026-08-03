#!/usr/bin/env bash
#
# Выполняется НА СЕРВЕРЕ. Раннер отдаёт его по SSH:  ssh ... 'bash -s -- <PATH> <MODE>' < этот файл
#
#   <PATH>  каталог репозитория на сервере (напр. /var/www/formulaedi/data/www/formulaedi.ru)
#   <MODE>  dry-run (по умолчанию) — только показать, что уехало бы, ничего не писать
#           apply                  — реальная выкатка
#
# Порядок apply:
#   диагностика → бэкап дампа БД → git reset на нужный коммит → npm ci → build
#   → prisma db push → seed → pm2 reload → проверка порта 4000
#
# Идемпотентен: повторный запуск на том же коммите безопасен.
# Ничего не удаляет за пределами своего каталога. Соседние сайты FastPanel не трогает.

set -uo pipefail

DP="${1:?не передан путь установки}"
MODE="${2:-dry-run}"
REF="${3:-origin/prod}"

BACKUP_DIR="$HOME/_deploy_backups/formulaedi"
KEEP_BACKUPS=10

# Node на сервере стоит через nvm в домашнем каталоге (root на машине нам не дают,
# и соседние сайты живут так же). Неинтерактивный SSH не читает .bashrc, поэтому
# без этой строки node/npm/pm2 просто не найдутся.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1

say() { printf '\n===== %s =====\n' "$1"; }
die() { echo ">>> СТОП: $1"; exit 1; }

say "ДИАГНОСТИКА"
echo "user=$(whoami)  host=$(hostname)  режим=$MODE  ref=$REF"
echo "путь=$DP"
echo "node=$(node -v 2>/dev/null || echo НЕТ)  npm=$(npm -v 2>/dev/null || echo НЕТ)"
echo "pm2=$(pm2 -v 2>/dev/null || echo НЕТ)  git=$(git --version 2>/dev/null | awk '{print $3}' || echo НЕТ)"
echo "свободно на диске: $(df -h "$(dirname "$DP")" 2>/dev/null | awk 'NR==2{print $4" из "$2}')"

command -v git  >/dev/null || die "нет git"
command -v node >/dev/null || die "нет node"
[ -d "$DP/.git" ] || die "в $DP нет git-репозитория. Первичный клон делается вручную — см. DEPLOY.md"

cd "$DP" || die "не смог зайти в $DP"

say "ЧТО ИЗМЕНИТСЯ"
git fetch --all --prune -q 2>/dev/null || echo "(git fetch не прошёл — работаем с тем, что есть)"
CUR="$(git rev-parse --short HEAD 2>/dev/null)"
NEW="$(git rev-parse --short "$REF" 2>/dev/null)"
echo "сейчас: $CUR    станет: $NEW"
if [ "$CUR" = "$NEW" ]; then
  echo "(коммит тот же — пересборка будет, изменений кода нет)"
else
  git log --oneline --no-decorate "HEAD..$REF" 2>/dev/null | head -20
  echo "--- файлы ---"
  git diff --stat "HEAD..$REF" 2>/dev/null | tail -20
fi

if [ "$MODE" != "apply" ]; then
  say "DRY-RUN — ничего не записано"
  echo "Чтобы выкатить: запусти воркфлоу с mode=apply (или сделай merge в ветку prod)."
  exit 0
fi

# ─────────────────────────── БЭКАП БАЗЫ ───────────────────────────
# Код лежит в гите и восстанавливается всегда, а база — нет. Поэтому бэкапим именно её.
say "БЭКАП БАЗЫ"
if [ ! -f .env ]; then
  echo ">>> нет .env — бэкап и миграции пропускаю (см. DEPLOY.md)"
else
  set -a; . ./.env; set +a
  mkdir -p "$BACKUP_DIR" || die "не создать $BACKUP_DIR"
  TS="$(date +%F-%H%M%S)"
  DUMP="$BACKUP_DIR/db-$TS.sql.gz"

  # DATABASE_URL вида mysql://user:pass@host:port/db.
  # Парсим через node (он на сервере всё равно нужен) — так спецсимволы в пароле
  # не ломают разбор. Значения читаем построчно, без eval.
  DB_PARTS="$(node -e '
    const u = new URL(process.env.DATABASE_URL);
    process.stdout.write([
      decodeURIComponent(u.username),
      decodeURIComponent(u.password),
      u.hostname,
      u.port || "3306",
      u.pathname.replace(/^\//, ""),
      u.searchParams.get("socket") || "",
    ].join("\n"));
  ' 2>/dev/null)" || die "не смог разобрать DATABASE_URL"

  {
    IFS= read -r DB_USER
    IFS= read -r DB_PASS
    IFS= read -r DB_HOST
    IFS= read -r DB_PORT
    IFS= read -r DB_NAME
    IFS= read -r DB_SOCKET
  } <<EOF
$DB_PARTS
EOF
  [ -n "$DB_NAME" ] || die "в DATABASE_URL не указано имя базы"

  # Пользователь БД из FastPanel заведён как user@localhost — это в MySQL означает
  # ТОЛЬКО unix-сокет. С --host/--port mysqldump уходит по TCP и получает
  # «Access denied for user ...@127.0.0.1», хотя пароль верный.
  if [ -n "$DB_SOCKET" ]; then
    DB_CONN="--socket=$DB_SOCKET"
  else
    DB_CONN="--host=$DB_HOST --port=$DB_PORT"
  fi

  if command -v mysqldump >/dev/null; then
    ERRLOG="$(mktemp)"
    # shellcheck disable=SC2086
    MYSQL_PWD="$DB_PASS" mysqldump \
      $DB_CONN --user="$DB_USER" \
      --single-transaction --quick --routines --no-tablespaces \
      "$DB_NAME" 2>"$ERRLOG" | gzip > "$DUMP"

    # Проверять размер файла НЕДОСТАТОЧНО: gzip от пустого потока весит ~20 байт,
    # то есть формально «не пустой». Единственный надёжный признак успеха —
    # завершающая строка «Dump completed», которую mysqldump пишет в самом конце.
    if ! gzip -dc "$DUMP" 2>/dev/null | tail -3 | grep -q "Dump completed"; then
      echo "--- вывод mysqldump ---"; head -5 "$ERRLOG"
      rm -f "$DUMP" "$ERRLOG"
      die "дамп не снялся — деплой отменён (проверь доступ к БД $DB_NAME)"
    fi
    rm -f "$ERRLOG"
    echo "бэкап: $DUMP ($(du -h "$DUMP" | cut -f1), $(gzip -dc "$DUMP" | grep -c '^CREATE TABLE') таблиц)"
    # держим последние N
    ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm -f
  else
    echo ">>> mysqldump не найден — бэкап БД пропущен."
    echo ">>> Пока база пустая это терпимо; до боевого запуска mysqldump обязателен."
  fi
fi

# ─────────────────────────── КОД ───────────────────────────
say "ВЫКАТКА КОДА"
git reset --hard "$REF" || die "git reset не прошёл"
echo "версия: $(git rev-parse --short HEAD)"

say "ЗАВИСИМОСТИ"
# --include=dev обязателен. Выше мы уже загрузили .env, где NODE_ENV=production,
# а в этом режиме npm пропускает devDependencies — вместе с @nestjs/cli, tsc и vite.
# Без них сборка падает с «sh: 1: nest: not found».
npm ci --include=dev 2>&1 | tail -5 || die "npm ci упал"

# ОБЯЗАТЕЛЬНО и ДО сборки. postinstall от @prisma/client в монорепо со
# workspaces не находит схему в apps/api и оставляет заглушку без типов —
# тогда сборка API падает на «Property 'priceKopecks' does not exist on type '{}'».
say "PRISMA CLIENT"
npm run db:generate 2>&1 | tail -3 || die "prisma generate не прошёл"

say "СБОРКА"
npm run build 2>&1 | tail -10 || die "build упал"
[ -d apps/web/dist ] || die "apps/web/dist не собрался"
echo "web/dist: $(du -sh apps/web/dist | cut -f1)"

# ─────────────────────────── БАЗА ───────────────────────────
if [ -f .env ]; then
  say "СХЕМА БАЗЫ"
  # ВНИМАНИЕ: db push приводит базу к схеме без истории миграций. Пока проект не в бою —
  # это ок. До первого реального заказа переводим на prisma migrate deploy (см. DEPLOY.md).
  npm run db:push -w apps/api 2>&1 | tail -8 || die "prisma db push не прошёл — проверь DATABASE_URL"

  say "SEED"
  npm run db:seed -w apps/api 2>&1 | tail -4 || echo "(seed пропущен — нормально, если данные уже есть)"
fi

# ─────────────────────────── ЗАПУСК ───────────────────────────
say "ЗАПУСК API"
if command -v pm2 >/dev/null; then
  pm2 startOrReload deploy/ecosystem.config.cjs --update-env 2>&1 | tail -5 \
    || pm2 start deploy/ecosystem.config.cjs 2>&1 | tail -5
  pm2 save >/dev/null 2>&1 || true
else
  die "pm2 не установлен: npm i -g pm2"
fi

say "ПРОВЕРКА ПОРТА"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf --max-time 3 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "API отвечает на 127.0.0.1:4000/api/health"
    break
  fi
  [ "$i" = 10 ] && { pm2 logs formulaedi-api --lines 20 --nostream 2>/dev/null; die "API не поднялся за 10 попыток"; }
  sleep 2
done

say "ГОТОВО"
echo "версия на сервере: $(git rev-parse --short HEAD)"
