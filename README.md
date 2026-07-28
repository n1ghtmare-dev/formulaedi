# Формула Еды — formulaedi.ru

Доставка еды до комнаты в общежитии МАДИ. Монорепо: React-витрина + NestJS API + PostgreSQL.

## Стек
- **web** — React 18 + Vite + TypeScript + Tailwind v4 (фирменная тема из логотипа)
- **api** — NestJS + Prisma + PostgreSQL, Redis/BullMQ (очереди формул)
- **shared** — общие типы, enum-ы и бизнес-логика «формул»

## Структура
```
apps/web       витрина (React)
apps/api       API (NestJS) + prisma/schema.prisma
packages/shared  общие типы и расчёты
docs           дизайн-система, разбор ТЗ
```

## База данных
Локально уже развёрнут **портативный PostgreSQL 16.6** в `.localpg/` (без прав администратора, порт 5432, БД `formulaedi`, пользователь `formulaedi`). Управление:
```
npm run pg:status   # статус
npm run pg:start    # запустить (после перезагрузки ПК)
npm run pg:stop     # остановить
```
> Автозапуска нет (нет службы) — после ребута ПК выполните `npm run pg:start`.
> Альтернатива: свой `DATABASE_URL` в `.env` (облачный Postgres) или `docker compose up -d` (если появится Docker).

## Запуск (разработка)
```
npm install
npm run build -w packages/shared
npm run db:generate
npm run db:migrate      # создаст таблицы (уже выполнено)
npm run db:seed         # 9 категорий + позиции + настройки (уже выполнено)
npm run dev             # web → http://localhost:6060 · api → http://localhost:4000/api
```
> Порт API — **4000** (3001 занят другим приложением на этом ПК).

Фронт умеет показывать демо-меню без бэкенда (для быстрого превью).

## Готово
- Схема БД (users, menu, orders, payments, formula_transactions, settings)
- API: `GET /api/menu`, `POST /api/orders/preview`, `POST /api/auth/request-code`, `POST /api/auth/verify`, `GET /api/settings`, `GET /api/health`
- Витрина: меню, живой чек с расчётом формул (7% начисление, ≤25% списание)

## Дальше (TODO)
- Создание заказа + интеграция ЮKassa (redirect + webhook)
- Начисление формул «завтра» и сгорание 1-го числа (BullMQ cron)
- JWT-guard, личный кабинет, история заказов
- Админ-панель (часть №2 ТЗ)

## Важное про прод (РФ)
- 152-ФЗ: персональные данные (телефон, ФИО) — только на серверах в РФ.
- Оплата: ЮKassa (привязка к ИП Богданов А.С.). SMS: SMS.ru/SMSC.
