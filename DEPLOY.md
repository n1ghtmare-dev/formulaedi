# Деплой formulaedi.ru

Стек на сервере: **Node 20+**, **MySQL/MariaDB**, **PM2** (демон API), **Nginx** (статика + прокси `/api`).
Схема: Nginx отдаёт `apps/web/dist` и проксирует `/api` → `127.0.0.1:4000` (NestJS).

## Где что живёт

| | |
|---|---|
| Сервер | `192.168.33.3` (FastPanel, LAN), SSH `:22`, Ubuntu / OpenSSH 9.6 |
| Панель | `https://cp.yesbeat.ru` (она же `192.168.33.3:8888`) |
| Пользователь сайта | `formulaedi`, домашний каталог `/var/www/formulaedi/data` |
| **Код (репозиторий)** | `/var/www/formulaedi/data/app` |
| **Document root сайта** | `/var/www/formulaedi/data/app/apps/web/dist` |
| Соседние сайты | на этой же машине **боевой `yesbeat.ru`** (~20 ТБ медиа) и ещё ~25 сайтов |
| Раннер | self-hosted на рабочей машине в LAN — см. [deploy/RUNNER-SETUP.md](deploy/RUNNER-SETUP.md) |

> ⚠️ **Репозиторий НЕ должен быть document root'ом.** В корне репозитория лежит `.env`
> с паролем от базы и JWT-секретами, а также `.git` со всей историей. Если docroot
> указать на репозиторий, всё это станет доступно по HTTP. Поэтому код в `data/app`,
> а наружу отдаётся только `apps/web/dist`.

Root на сервере нам не выдан (`sudo: НЕТ`), и он не нужен: Node стоит через **nvm**
в домашнем каталоге пользователя, PM2 — свой, пользовательский. Ровно так же живут
соседние сайты (`ordersflow`, `docsflow`, `music`).

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

Статус: пункты 1–3 **уже выполнены**. Осталось 4–6.

## 1. ✅ Node и PM2 (сделано)

Ставятся в домашний каталог, без root:

```bash
curl -sS -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
nvm install 22 && nvm alias default 22
npm i -g pm2
```

Сейчас на сервере: Node `v22.23.2`, npm, PM2 `7.0.3`, `pm2_home=/var/www/formulaedi/data/.pm2`.

> Неинтерактивный SSH **не читает** `.bashrc`, поэтому любой скрипт, запускаемый
> из пайплайна, обязан сам делать `. "$NVM_DIR/nvm.sh"` — иначе `node` не найдётся.
> В [remote-deploy.sh](deploy/remote-deploy.sh) это уже вшито.

## 2. ✅ Первый клон (сделано)

Пайплайн сам не клонирует — только обновляет существующий репозиторий:

```bash
git clone https://github.com/n1ghtmare-dev/formulaedi.git /var/www/formulaedi/data/app
```

## 3. ✅ Первая сборка (сделано)

```bash
cd /var/www/formulaedi/data/app
npm ci
npm run db:generate     # ОБЯЗАТЕЛЬНО перед build, см. «Грабли»
npm run build
```

## 4. База данных

В FastPanel: **Базы данных** → создать MySQL-базу и пользователя.
Записать имя базы / пользователя / пароль.

## 5. Продовый `.env`

**Не в git.** Взять шаблон и заполнить:

```bash
cd /var/www/formulaedi/data/app
cp .env.production.example .env
nano .env
```

Обязательно: `DATABASE_URL` из базы FastPanel и два JWT-секрета
(`openssl rand -hex 32` для каждого).

Затем создать таблицы и запустить API:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
set -a; . ./.env; set +a
npm run db:push  -w apps/api    # создаст таблицы
npm run db:seed  -w apps/api    # категории и позиции меню
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Автозапуск после ребута: `pm2 startup` требует root, которого у нас нет.
Вместо него — задание в планировщике FastPanel или пользовательский cron:

```
@reboot export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; pm2 resurrect
```

## 6. Домен

Состояние на 2026-08-03:

| | |
|---|---|
| Регистратор / DNS | reg.ru (`ns1.reg.ru`, `ns2.reg.ru`) |
| `formulaedi.ru` → | `95.163.244.138` — **парковка reg.ru** (openresty, отдаёт `400 Bad Request`) |
| `www.formulaedi.ru` → | тот же парковочный IP |
| HTTPS | не отвечает, сертификата нет |
| Публичный IP нашего сервера | **`79.137.237.2`** (для сравнения: `yesbeat.ru` → `79.137.237.2`) |

То есть домен зарегистрирован, но на сервер не направлен — висит на парковке регистратора.

**Что сделать в панели reg.ru** (Домены → `formulaedi.ru` → Управление зоной / DNS-записи):

| Тип | Имя | Значение |
|---|---|---|
| `A` | `@` | `79.137.237.2` |
| `A` | `www` | `79.137.237.2` |

Старые записи на `95.163.244.138` удалить. NS менять не нужно — зона и так на reg.ru.

Дальше:

1. Подождать обновления DNS (обычно минуты, по TTL до нескольких часов).
2. Проверить: `dig +short A formulaedi.ru @8.8.8.8` → должно вернуть `79.137.237.2`.
3. Только после этого выпускать **SSL Let's Encrypt** в FastPanel — проверка
   HTTP-01 ходит на домен снаружи и на парковке не пройдёт.

## 7. Nginx в FastPanel

- **Document root** сайта → `/var/www/formulaedi/data/app/apps/web/dist`
  (не корень репозитория — см. предупреждение выше).
- Проксирование `/api/` → `http://127.0.0.1:4000` — образец в
  [deploy/nginx-formulaedi.conf](deploy/nginx-formulaedi.conf).
- Для SPA обязательно `try_files $uri /index.html`, иначе прямые ссылки
  вида `/menu` будут отдавать 404.
- Выпустить SSL Let's Encrypt кнопкой в панели.

## 6. Раннер и секреты

См. [deploy/RUNNER-SETUP.md](deploy/RUNNER-SETUP.md) — установка службы, SSH-ключ,
четыре секрета репозитория.

---

# Грабли

Всё ниже реально всплыло при первой настройке — не «на всякий случай».

**1. `prisma generate` обязателен перед сборкой.**
`postinstall` от `@prisma/client` в монорепо со workspaces не находит схему в
`apps/api` и оставляет заглушку без типов (~4 КБ вместо ~700 КБ). Сборка API
падает с `Property 'priceKopecks' does not exist on type '{}'`. Локально это может
не проявляться, если клиент когда-то был сгенерирован руками и остался в
`node_modules`. В [remote-deploy.sh](deploy/remote-deploy.sh) шаг вшит.

**2. Точка входа API — `dist/src/main.js`, а не `dist/main.js`.**
В компиляцию попадает ещё и `prisma/seed.ts`, из-за чего `rootDir` растягивается
на весь `apps/api` и вывод получается вложенным. В
[ecosystem.config.cjs](deploy/ecosystem.config.cjs) указан правильный путь.

**3. Неинтерактивный SSH не читает `.bashrc`.**
Node стоит через nvm, поэтому каждый скрипт из пайплайна сам делает
`. "$NVM_DIR/nvm.sh"`. Без этого — `node: command not found`.

**4. CRLF.** На Windows-раннере `core.autocrlf=true`. Скрипты уезжают на Linux и
выполняются там — с CRLF bash падает на `\r: command not found`. Закрыто правилом
`*.sh text eol=lf` в [.gitattributes](.gitattributes).

**5. Smoke обязан проверять `Content-Type`.** Если Nginx настроен неверно и отдаёт
`index.html` на любой путь, то `/api/health` вернёт `200` с HTML внутри — и проверка
«код 200» это засчитает, хотя API мёртв.

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
