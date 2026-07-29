# Деплой formulaedi.ru (FastPanel + GitHub Actions)

Домен `formulaedi.ru` уже указывает на сервер `95.163.244.138`. Ниже — разовая настройка сервера и автодеплой по пушу в `main`.

Стек на сервере: **Node 20+**, **PostgreSQL**, **PM2** (демон API), **Nginx** (статика + прокси `/api`).
Схема: Nginx отдаёт `apps/web/dist` и проксирует `/api` → `127.0.0.1:4000` (Node/NestJS).

---

## 0. Безопасность (сначала)
- **Смените пароль**, который был отправлен в переписке.
- Для CI используем **SSH-ключ деплоя**, а не пароль.

---

## 1. Разовая настройка на сервере (по SSH под вашим пользователем)

```bash
# 1.1 Инструменты (если ещё не стоят). В FastPanel Node/PG можно поставить через панель.
node -v   # нужен >= 20;  pm2 -v || npm i -g pm2

# 1.2 Клонировать репозиторий в каталог сайта (пример пути — поправьте под FastPanel)
cd /var/www
git clone https://github.com/n1ghtmare-dev/formulaedi.git formulaedi
cd formulaedi

# 1.3 Продовый .env (НЕ в git). Взять шаблон и заполнить:
cp .env.production.example .env
nano .env   # DATABASE_URL из БД FastPanel, JWT-секреты: openssl rand -hex 32

# 1.4 Первая сборка + миграции + запуск API
npm ci
npm run build
set -a; . ./.env; set +a
npm run db:deploy -w apps/api      # создаст таблицы
npm run db:seed  -w apps/api       # 9 категорий + позиции (один раз)
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup            # автозапуск после ребута
```

## 2. База данных
В FastPanel создайте **PostgreSQL** базу и пользователя, впишите их в `DATABASE_URL` в `.env`.
(152-ФЗ: сервер российский — ок.)

## 3. Nginx / сайт в FastPanel
В панели для сайта `formulaedi.ru`:
- **Document root** → `/var/www/formulaedi/apps/web/dist`
- Добавить проксирование: `location /api/` → `http://127.0.0.1:4000` (см. `deploy/nginx-formulaedi.conf` как образец; для SPA — `try_files $uri /index.html`).
- Выпустить **SSL Let’s Encrypt** кнопкой в FastPanel (домен уже указывает на сервер).

## 4. Автодеплой через GitHub Actions
Воркфлоу `.github/workflows/deploy.yml` уже в репозитории. Он по пушу в `main` заходит на сервер по SSH и запускает `deploy/deploy.sh` (pull → build → миграции → рестарт API).

**Секреты репозитория** (GitHub → Settings → Secrets and variables → Actions → New secret):
| Секрет | Значение |
|---|---|
| `SSH_HOST` | `95.163.244.138` |
| `SSH_USER` | ваш пользователь на сервере |
| `SSH_PORT` | `50222` |
| `SSH_PASSWORD` | пароль пользователя (НОВЫЙ, после смены старого) |
| `DEPLOY_PATH` | путь к репозиторию (напр. `/var/www/formulaedi`); если не задать — воркфлоу возьмёт `$HOME/formulaedi` |

После этого каждый `git push` в `main` → автоматический деплой. Можно запустить вручную: вкладка **Actions → Deploy formulaedi.ru → Run workflow**.

---

## Что нужно от вас, чтобы я довёл настройку
1. Подтвердить путь установки на сервере (или дать свой) и порт SSH.
2. Node и PostgreSQL уже установлены в панели? Процесс API ведём через **PM2** (как здесь) или через встроенный Node-менеджер FastPanel?
3. Доступ к серверу мне отсюда закрыт (порт 22 режется в моём окружении) — разовые шаги 1–3 выполняете вы по инструкции; я помогаю с любым шагом и правлю конфиги.
