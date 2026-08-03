# Деплой formulaedi.ru

Стек на сервере: **Node 20+**, **MySQL/MariaDB**, **PM2** (демон API), **Nginx** (статика + прокси `/api`).
Схема: Nginx отдаёт `apps/web/dist` и проксирует `/api` → `127.0.0.1:4000` (NestJS).

## Где что живёт

| | |
|---|---|
| Сервер | `192.168.33.3` (FastPanel, LAN), SSH `:22` |
| Панель | `https://192.168.33.3:8888` |
| Соседний сайт | **боевой `yesbeat.ru`** на этой же машине, ~20 ТБ медиа |
| Раннер | self-hosted на рабочей машине в LAN — см. [deploy/RUNNER-SETUP.md](deploy/RUNNER-SETUP.md) |

> ⚠️ На сервере крутится чужой боевой сайт. Всё, что делает деплой, происходит строго
> внутри `PROD_DEPLOY_PATH`. Никаких `rsync --delete`, никаких операций за пределами
> своего каталога.

## Как устроен деплой

```
   push в main ──► tests.yml (typecheck + build)        облачный раннер, прод не трогает
                        │
                        ▼
   merge main → prod ──► deploy.yml                     self-hosted раннер в LAN
                        │
                        ├─ бэкап дампа MySQL (пустой дамп → стоп)
                        ├─ ssh на .3 → deploy/remote-deploy.sh
                        │     git reset → npm ci → build → prisma db push → seed → pm2 reload
                        └─ tests/smoke.sh по https://formulaedi.ru
```

**Деплой = merge `main` → `prod`.** Пуш в `main` ничего не выкатывает, только прогоняет тесты.

Ручной запуск: Actions → *Deploy PROD (formulaedi.ru)* → Run workflow.
По умолчанию там **dry-run** — он только показывает, какие коммиты и файлы уехали бы,
и ничего не пишет. Реальная выкатка — выбрать `apply`.

Отдельно есть *Inspect PROD (read-only)* — осмотр сервера (что стоит, что запущено,
место на диске, логи PM2) без единой записи. Пригодится, когда деплой упал.

## Файлы

| Файл | Что делает |
|---|---|
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | выкатка на прод |
| [.github/workflows/tests.yml](.github/workflows/tests.yml) | гейт: typecheck + build + синтаксис bash |
| [.github/workflows/inspect-prod.yml](.github/workflows/inspect-prod.yml) | read-only осмотр сервера |
| [deploy/remote-deploy.sh](deploy/remote-deploy.sh) | выполняется НА СЕРВЕРЕ: бэкап → код → сборка → БД → PM2 |
| [deploy/ecosystem.config.cjs](deploy/ecosystem.config.cjs) | PM2-конфиг API |
| [deploy/nginx-formulaedi.conf](deploy/nginx-formulaedi.conf) | образец конфига Nginx |
| [tests/smoke.sh](tests/smoke.sh) | post-deploy проверка сайта по HTTP |
| [deploy/RUNNER-SETUP.md](deploy/RUNNER-SETUP.md) | установка раннера, ключи, секреты |

---

# Первичная настройка сервера

Разовые шаги, руками по SSH. Дальше всё делает пайплайн.

## 1. Сайт и база в FastPanel

- Создать сайт `formulaedi.ru`, **document root** → `<путь>/apps/web/dist`.
- Создать базу **MySQL** и пользователя. Записать имя базы / пользователя / пароль.
- Выпустить SSL Let's Encrypt кнопкой в панели (домен должен указывать на сервер).
- Добавить проксирование `/api/` → `http://127.0.0.1:4000` — образец в
  [deploy/nginx-formulaedi.conf](deploy/nginx-formulaedi.conf). Для SPA обязательно
  `try_files $uri /index.html`, иначе прямые ссылки вида `/menu` будут отдавать 404.

## 2. Инструменты

```bash
node -v          # нужен >= 20
npm i -g pm2     # если pm2 ещё нет
which mysqldump  # нужен для бэкапа перед деплоем
```

## 3. Первый клон

Пайплайн сам не клонирует — только обновляет существующий репозиторий:

```bash
cd <родительский каталог>
git clone https://github.com/n1ghtmare-dev/formulaedi.git formulaedi.ru
cd formulaedi.ru
git checkout prod
```

## 4. Продовый `.env`

**Не в git.** Взять шаблон и заполнить:

```bash
cp .env.production.example .env
nano .env
```

Обязательно: `DATABASE_URL` из базы FastPanel и два JWT-секрета
(`openssl rand -hex 32` для каждого).

## 5. Первый запуск

```bash
npm ci
npm run build
set -a; . ./.env; set +a
npm run db:push  -w apps/api    # создаст таблицы
npm run db:seed  -w apps/api    # категории и позиции меню
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup         # автозапуск после ребута
```

## 6. Раннер и секреты

См. [deploy/RUNNER-SETUP.md](deploy/RUNNER-SETUP.md) — установка службы, SSH-ключ,
четыре секрета репозитория.

---

# Что нужно знать про базу

Схема накатывается через **`prisma db push`** — Prisma просто приводит базу к виду
[schema.prisma](apps/api/prisma/schema.prisma), без истории миграций.

Пока проект не в бою — это удобно и быстро. Но у `db push` есть свойство: он не различает
переименование и «удалили одну колонку, добавили другую». На боевых данных это потеря.

**До первого реального заказа надо перейти на миграции:**

```bash
npm run db:migrate -w apps/api -- --name init   # создаст prisma/migrations/
```

и в [remote-deploy.sh](deploy/remote-deploy.sh) заменить `db:push` на `prisma migrate deploy`.
Пока этого не сделано, единственная страховка — бэкап дампа перед каждым деплоем
(он уже в пайплайне, лежит в `~/_deploy_backups/formulaedi/`, хранятся последние 10).

## Откат

```bash
# код
cd <PROD_DEPLOY_PATH> && git reset --hard <старый-коммит> && npm ci && npm run build && pm2 reload formulaedi-api

# база
gunzip < ~/_deploy_backups/formulaedi/db-<дата>.sql.gz | mysql -u <user> -p <база>
```
