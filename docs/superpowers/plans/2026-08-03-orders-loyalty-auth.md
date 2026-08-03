# Формула Еды — план реализации (заказы, формулы, ЛК, SMS) без оплаты

> **Для исполнителя:** реализовывать по задачам через superpowers:subagent-driven-development или executing-plans. Шаги помечены чекбоксами `- [ ]`. Оплата (ЮKassa) — вне этого плана (обсуждается отдельно). Админка (ТЗ часть №2) — заблокирована отсутствием спецификации.

**Цель:** довести пользовательскую часть ТЗ до рабочего сценария «собрал заказ → оформил → получил номер заказа → получил/списал формулы», плюс вход по телефону и планировщик формул. Оплата подключается позже как отдельный слой поверх готового `POST /orders`.

**Архитектура:** заказ создаётся одним транзакционным вызовом `POST /orders`: сервер пересчитывает корзину по ценам БД, списывает формулы, пишет леджер, создаёт заказ+позиции, ставит начисление 7% в статус PENDING (станет ACTIVE «завтра»). Шаг оплаты сейчас — заглушка (`mockConfirm`), которая помечает заказ PAID; позже заменяется на ЮKassa redirect+webhook без изменения остальной логики. Планировщик (`@nestjs/schedule`) активирует отложенные начисления и сжигает формулы 1-го числа.

**Технологии:** NestJS 11, Prisma 6 (MySQL/MariaDB), @nestjs/jwt, @nestjs/schedule, class-validator; фронт React+Vite+Tailwind; тесты Jest + supertest (e2e API) на отдельной тестовой БД MySQL.

## Global Constraints (действуют для КАЖДОЙ задачи)

- **БД — MySQL/MariaDB** (Prisma `provider = "mysql"`). Схема таблиц уже есть; **новых миграций схемы не требуется** — все модели (`Order`, `OrderItem`, `Payment`, `FormulaTransaction`, `VerificationCode`, `RefreshToken`, `SavedAddress`) созданы. Деплой схемы — `prisma db push`.
- **Деньги — целые копейки (Int)**. **Формулы — целые (Int), 1 формула = 1 ₽**.
- Ставки: **начисление 7%** от итога, **списание ≤ 25%** суммы, **сгорание 1-го числа**. Значения берём из таблицы `settings` (`formula_earn_percent`, `formula_spend_max_percent`), не хардкодить.
- Расчёт денег/формул — только через чистые функции из `packages/shared` (`maxSpendableFormulas`, `formulasToEarn`). Цены — **только из БД**, клиенту не доверять.
- **UI — русский, без эмодзи** (иконки — inline SVG / lucide-react). Кириллические шрифты. Копирайт из ТЗ.
- **Прод живой** (formulaedi.ru). Изменения схемы БД — только неразрушающие (в этом плане их нет). Выкатка — существующий CI (`Deploy PROD`).
- Ответы API — camelCase; глобальный префикс `/api`; деньги наружу в копейках (фронт форматирует через `formatKopecks`).

---

## Фазы

- **Фаза 0** — локальная MySQL + тестовый контур (предусловие для TDD).
- **Фаза 1** — создание заказа + леджер формул (бэкенд, ядро). **Детально.**
- **Фаза 2** — JWT-guard, личный кабинет, вход по телефону в вебе, валидация оформления.
- **Фаза 3** — планировщик формул (активация «завтра» + сгорание 1-го числа) + баннер «сгорят».
- **Фаза 4** — реальный SMS-провайдер (SMS.ru), поверх текущего dev-режима.
- **Фаза 5** — подключение реальных фото блюд (`imageUrl`).
- **Вне плана:** оплата ЮKassa (позже), админка/ТЗ ч.2 (нужен документ).

---

## Фаза 0 — локальная MySQL + тестовый контур

**Files:**
- Create: `.localdb/` (портативная MariaDB, в `.gitignore`)
- Modify: `.gitignore` (добавить `.localdb/`)
- Create: `apps/api/jest.config.cjs`, `apps/api/test/setup.ts`, `apps/api/.env.test`
- Modify: `apps/api/package.json` (скрипты `test`, `test:e2e`)

**Interfaces:**
- Produces: рабочая локальная БД `mysql://formulaedi:formulaedi@127.0.0.1:3306/formulaedi`; тестовая БД `formulaedi_test`; команды `npm test -w apps/api`.

- [ ] **Шаг 1.** Развернуть портативную MariaDB в `.localdb/` (скачать zip MariaDB, `mysql_install_db`/`mariadb-install-db`, запустить `mysqld` на 3306), создать базы `formulaedi` и `formulaedi_test` и пользователя `formulaedi`. Добавить npm-скрипты `db:start`/`db:stop`/`db:status` по аналогии с прежними `pg:*`.
- [ ] **Шаг 2.** `apps/api/.env.test` → `DATABASE_URL="mysql://formulaedi:formulaedi@127.0.0.1:3306/formulaedi_test"`, `JWT_ACCESS_SECRET=test`, `SMS_PROVIDER=dev`.
- [ ] **Шаг 3.** Установить dev-зависимости: `npm i -D jest ts-jest @types/jest supertest @types/supertest -w apps/api`. Настроить `jest.config.cjs` (ts-jest, `testEnvironment: node`).
- [ ] **Шаг 4.** `test/setup.ts`: перед прогоном — `prisma db push --force-reset` на `formulaedi_test` + сид справочников (категории/позиции/настройки) через `prisma/seed.ts`. Экспортировать хелпер `resetDb()` (truncate заказов/леджера/юзеров между тестами).
- [ ] **Шаг 5.** Скрипты: `"test": "dotenv -e .env.test -- jest"`, `"test:e2e": "dotenv -e .env.test -- jest --config jest-e2e.config.cjs"`. Прогнать пустой тест — убедиться, что контур поднимается.
- [ ] **Шаг 6.** Commit: `chore(api): локальная MySQL и тестовый контур (jest+supertest)`.

**Acceptance:** `npm test -w apps/api` поднимает тестовую БД, применяет схему, гоняет пример-тест зелёным.

---

## Фаза 1 — создание заказа + леджер формул (ядро)

### Файловая структура фазы
- Create: `packages/shared/src/order-calc.ts` — чистый расчёт итогов заказа (переиспользует loyalty/money).
- Create: `apps/api/src/orders/dto/create-order.dto.ts` — валидация тела `POST /orders`.
- Create: `apps/api/src/loyalty/loyalty.service.ts` — операции с леджером формул (spend/earn/burn/balance) в рамках переданной транзакции.
- Create: `apps/api/src/loyalty/loyalty.module.ts`.
- Modify: `apps/api/src/orders/orders.service.ts` — метод `create()` (транзакция).
- Modify: `apps/api/src/orders/orders.controller.ts` — `POST /orders`, `POST /orders/:id/mock-confirm`, `GET /orders/:id`.
- Modify: `apps/api/src/orders/orders.module.ts` — импорт LoyaltyModule.
- Test: `apps/api/test/orders.e2e-spec.ts`, `packages/shared/src/order-calc.test.ts`.

### Task 1.1 — Чистый расчёт итогов заказа (shared)

**Files:** Create `packages/shared/src/order-calc.ts`; export из `packages/shared/src/index.ts`; Test `packages/shared/src/order-calc.test.ts`.

**Interfaces:**
- Produces:
```ts
export interface PricedLine { menuItemId: string; nameSnapshot: string; priceKopecks: number; quantity: number; lineTotalKopecks: number; }
export interface OrderTotals {
  subtotalKopecks: number; formulasSpent: number; formulaDiscountKopecks: number;
  totalKopecks: number; formulasToEarn: number;
}
export function computeOrderTotals(
  lines: PricedLine[], requestedSpend: number, balance: number,
  earnPercent: number, spendMaxPercent: number,
): OrderTotals;
```

- [ ] **Шаг 1.** Тест `order-calc.test.ts`:
```ts
import { computeOrderTotals } from './order-calc';
test('списание ограничено 25% и балансом, начисление 7% от итога', () => {
  const lines = [{ menuItemId:'a', nameSnapshot:'Бургер', priceKopecks:32000, quantity:1, lineTotalKopecks:32000 },
                 { menuItemId:'b', nameSnapshot:'Кола', priceKopecks:12000, quantity:2, lineTotalKopecks:24000 }];
  const t = computeOrderTotals(lines, 1000, 300, 7, 25); // subtotal 560₽, 25%=140, баланс 300 → списываем 140
  expect(t.subtotalKopecks).toBe(56000);
  expect(t.formulasSpent).toBe(140);
  expect(t.formulaDiscountKopecks).toBe(14000);
  expect(t.totalKopecks).toBe(42000);
  expect(t.formulasToEarn).toBe(29); // 7% от 420₽ = 29.4 → 29
});
```
- [ ] **Шаг 2.** Прогнать — падает (нет функции).
- [ ] **Шаг 3.** Реализовать `computeOrderTotals` через `maxSpendableFormulas(subtotal, min(balance,requested?), spendMaxPercent)` и `formulasToEarn(total, earnPercent)`. Списываем `min(requestedSpend, maxSpendable)`; `discount = spent*100`; `total = max(0, subtotal - discount)`; `earn = formulasToEarn(total)`.
- [ ] **Шаг 4.** Прогнать — зелёный. Добавить кейсы: баланс 0 → spent 0; requestedSpend 0 → spent 0; requested > allowed → обрезка.
- [ ] **Шаг 5.** `npm run build -w packages/shared`. Commit: `feat(shared): computeOrderTotals — расчёт итогов заказа`.

### Task 1.2 — LoyaltyService: операции леджера в транзакции

**Files:** Create `apps/api/src/loyalty/loyalty.service.ts`, `loyalty.module.ts`; Test — покрывается e2e в 1.4.

**Interfaces:**
- Consumes: `PrismaService`, тип транзакции `Prisma.TransactionClient`.
- Produces:
```ts
// Все методы принимают tx (клиент транзакции), чтобы вызываться внутри prisma.$transaction.
class LoyaltyService {
  // Списание при заказе: пишет FormulaTransaction(SPEND, status SPENT, amount -spent), уменьшает user.formulaBalance.
  spend(tx, userId: string, orderId: string, amount: number): Promise<void>;
  // Начисление 7%: FormulaTransaction(EARN, status PENDING, amount +earn, availableAt = завтра 00:00, expiresAt = 1-е след. месяца). Баланс НЕ трогаем до активации.
  accruePending(tx, userId: string, orderId: string, amount: number, now: Date): Promise<void>;
  // Текущий доступный баланс = user.formulaBalance (денормализованный, источник — леджер ACTIVE).
}
```

- [ ] **Шаг 1.** Реализовать `spend`: `tx.formulaTransaction.create({ type:'SPEND', status:'SPENT', amount:-amount, orderId, userId })`; `tx.user.update({ where:{id:userId}, data:{ formulaBalance:{ decrement: amount } } })`. Если `amount===0` — no-op.
- [ ] **Шаг 2.** Реализовать `accruePending`: `availableAt = startOfNextDay(now)`, `expiresAt = firstOfNextMonth(now)`; `create({ type:'EARN', status:'PENDING', amount, availableAt, expiresAt, ... })`. Баланс не меняем.
- [ ] **Шаг 3.** Вспомогательные даты — в `packages/shared` (`startOfNextDay`, рядом с `nextBurnDate`), с тестами.
- [ ] **Шаг 4.** `loyalty.module.ts` (provider+export). Commit: `feat(api): LoyaltyService — леджер формул (spend/accruePending)`.

### Task 1.3 — DTO создания заказа

**Files:** Create `apps/api/src/orders/dto/create-order.dto.ts`.

**Interfaces:**
- Produces:
```ts
class CreateOrderItemDto { @IsString() menuItemId!: string; @IsInt() @Min(1) quantity!: number; }
class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>CreateOrderItemDto) items!: CreateOrderItemDto[];
  @IsInt() @Min(0) @IsOptional() cutleryCount?: number = 0;
  @IsInt() @Min(0) @IsOptional() spendFormulas?: number = 0;
  @IsEnum(DeliveryType) deliveryType!: 'DELIVERY'|'PICKUP';
  @IsOptional() @IsEnum(Building) building?: 'BUILDING_1'|'BUILDING_2';
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() room?: string;
  @IsString() @Matches(/^(\+7|8|7)\d{10}$/) contactPhone!: string;
}
```
- [ ] **Шаг 1.** Написать DTO. Валидация: при `deliveryType==='DELIVERY'` требуются building/floor/room — проверить в сервисе (класс-валидатор не покрывает условную зависимость просто), вернуть `BadRequestException('Укажите корпус, этаж и комнату')`.
- [ ] **Шаг 2.** Commit: `feat(api): CreateOrderDto`.

### Task 1.4 — OrdersService.create() + эндпоинты + e2e

**Files:** Modify `orders.service.ts`, `orders.controller.ts`, `orders.module.ts`; Test `apps/api/test/orders.e2e-spec.ts`.

**Interfaces:**
- Consumes: `computeOrderTotals`, `LoyaltyService`, `SettingsService`, `PrismaService`.
- Produces:
  - `POST /api/orders` (требует авторизации — Фаза 2; до неё принимает `userId` из dev-заголовка/тестового guard) → `OrderDTO` (`{ id, orderNumber, status, subtotalKopecks, formulaDiscountKopecks, totalKopecks, formulasToEarn, formulasSpent }`).
  - `POST /api/orders/:id/mock-confirm` → помечает `Payment` SUCCEEDED + `Order` PAID, активирует отложенные EARN этого заказа (status PENDING→? — активация по расписанию, но для mock сразу не активируем «завтра»; только помечаем оплату). Возвращает данные для окна «Ваш заказ №___ принят…».
  - `GET /api/orders/:id` → заказ с позициями.

- [ ] **Шаг 1.** e2e-тест «создание заказа списывает формулы и создаёт запись»:
```ts
it('POST /orders создаёт заказ, списывает 140 формул, ставит начисление 29', async () => {
  // seed: пользователь с balance=300; позиции Бургер 320₽, Кола 120₽
  const res = await request(app).post('/api/orders').set(devAuth(user.id)).send({
    items:[{menuItemId:burger.id,quantity:1},{menuItemId:cola.id,quantity:2}],
    spendFormulas:1000, deliveryType:'DELIVERY', building:'BUILDING_1', floor:'3', room:'314', contactPhone:'+79001112233',
  });
  expect(res.status).toBe(201);
  expect(res.body.orderNumber).toBeGreaterThan(0);
  expect(res.body.formulasSpent).toBe(140);
  expect(res.body.totalKopecks).toBe(42000);
  expect(res.body.formulasToEarn).toBe(29);
  const u = await prisma.user.findUnique({where:{id:user.id}});
  expect(u.formulaBalance).toBe(160); // 300 - 140
});
```
- [ ] **Шаг 2.** Прогнать — падает.
- [ ] **Шаг 3.** Реализовать `create(userId, dto)`:
  1. Загрузить позиции `menuItem.findMany({ where:{ id:{in}, isAvailable:true } })`; собрать `PricedLine[]` (цена и имя из БД); если чего-то нет — `BadRequestException`.
  2. Проверить адрес при DELIVERY.
  3. Прочитать `earnPercent`, `spendMaxPercent`, баланс пользователя.
  4. `computeOrderTotals(...)`.
  5. `prisma.$transaction(async tx => { создать Order (status AWAITING_PAYMENT, суммы, formulasToEarn), OrderItem[], Payment(PENDING, amount=total), loyalty.spend(tx,...), loyalty.accruePending(tx,...) })`.
  6. Вернуть DTO.
- [ ] **Шаг 4.** Прогнать — зелёный. Добавить тесты: недоступная позиция → 400; DELIVERY без адреса → 400; spendFormulas сверх допустимого → обрезается; идемпотентность orderNumber (autoincrement уникален).
- [ ] **Шаг 5.** `mock-confirm` + `GET /orders/:id` + тесты (после оплаты статус PAID, окно с текстом «Ваш заказ №… принят»). Текст — из ТЗ, вынести в константу.
- [ ] **Шаг 6.** Commit: `feat(api): создание заказа с леджером формул (+mock-confirm, get)`.

**Acceptance:** заказ создаётся в транзакции; баланс и леджер консистентны; расчёт совпадает с `/orders/preview`; всё покрыто e2e зелёным.

---

## Фаза 2 — авторизация (JWT-guard) + личный кабинет + вход в вебе + валидация

### Файловая структура
- Create: `apps/api/src/auth/jwt.guard.ts`, `apps/api/src/auth/current-user.decorator.ts`.
- Modify: `apps/api/src/auth/auth.service.ts` (метод `refresh`, `me`), `auth.controller.ts` (`GET /auth/me`, `POST /auth/refresh`).
- Modify: `orders.controller.ts` — навесить `@UseGuards(JwtGuard)`, брать `userId` из токена; добавить `GET /orders/my` (история).
- Frontend Create: `apps/web/src/features/auth/*` (хранение токена, хук `useAuth`), `LoginButton.tsx` (кнопка-перевёртыш), `Account`/история.
- Frontend Modify: `TopBar.tsx` (реальный баланс/кабинет), `CartContents.tsx` (гейтинг оплаты, красная подсветка), `api.ts` (создание заказа, me, история).

### Задачи
- [ ] **2.1 JwtGuard + /auth/me.** Guard проверяет `Authorization: Bearer`, кладёт `{ userId, role }` в request. `GET /auth/me` → `{ id, phone, fullName, formulaBalance }`. e2e: без токена 401, с токеном 200.
- [ ] **2.2 Refresh-токены.** `POST /auth/refresh` (ротация refreshToken из БД, хэш сверяем). e2e на ротацию/отзыв.
- [ ] **2.3 Заказы под guard.** `POST /orders`, `GET /orders/:id`, `GET /orders/my` требуют токен; `userId` — из токена (убрать dev-заголовок). Заказ виден только владельцу (иначе 403/404). e2e.
- [ ] **2.4 Веб-вход (кнопка-перевёртыш).** По ТЗ без новых окон: состояния кнопки «личный кабинет» → ввод `+7…` → «отправить код» → ввод кода → (если новый) «Введите ФИО» → «Добро пожаловать, {ФИО}, у вас {N} формул». Хранить access в памяти, refresh в `localStorage`; автologin по refresh. В dev код показываем из ответа (`devCode`).
- [ ] **2.5 Реальный баланс/история.** `TopBar` показывает `formulaBalance` из `/auth/me`; страница/шторка «Мои заказы» из `/orders/my`.
- [ ] **2.6 Гейтинг оформления (ТЗ).** Кнопку «Оплатить и оформить» нельзя нажать без входа ИЛИ без адреса (для доставки); незаполненные обязательные поля — подсветка `--color-danger`, сообщение. При клике на «Оплатить» без выполнения условий — не отправлять, подсветить.
- [ ] **2.7** Оформление из UI: `POST /orders` → окно «Ваш заказ №___ принят, спешим доставить…» (текст ТЗ) → при новом заказе окно исчезает, снова «Ваш чек». (Оплата — заглушка `mock-confirm` до подключения ЮKassa.)

**Acceptance:** пользователь входит по телефону в вебе, видит реальный баланс и историю; без входа/адреса оформить нельзя; успешный заказ показывает окно из ТЗ. Всё e2e (бэк) + ручная проверка (фронт, скриншот).

---

## Фаза 3 — планировщик формул (активация + сгорание) + баннер

### Файловая структура
- Modify: `apps/api/package.json` — `@nestjs/schedule`.
- Create: `apps/api/src/loyalty/loyalty.scheduler.ts` (Cron-задачи), доп. методы в `LoyaltyService` (`activateDue`, `burnExpired`, `pendingBurnInfo`).
- Modify: `app.module.ts` — `ScheduleModule.forRoot()`, LoyaltyModule.
- Modify: `auth.controller.ts`/`me` или отдельный `GET /loyalty/summary` — баланс + дата/сумма ближайшего сгорания (для баннера).
- Frontend: баннер «сгорят 01.__» у иконки кабинета в период с 27-го числа.

### Задачи
- [ ] **3.1 Активация «завтра».** `activateDue(now)`: `FormulaTransaction` где `status=PENDING AND availableAt<=now` → `status=ACTIVE`, и `user.formulaBalance += amount` (в транзакции, батчами по пользователю). Юнит/интеграционный тест: начисление становится доступным после `availableAt`.
- [ ] **3.2 Сгорание 1-го числа.** `burnExpired(now)`: все `ACTIVE` с `expiresAt<=now` → `status=BURNED`, `create(FormulaTransaction BURN, amount=-x)`, `user.formulaBalance` обнуляем на сумму сгоревших. Тест: 1-го числа активные сгорают, баланс уменьшается.
- [ ] **3.3 Cron.** `@Cron('5 0 * * *')` (00:05) — `activateDue`; `@Cron('10 0 1 * *')` (1-е число 00:10) — `burnExpired`. Идемпотентность (повторный запуск ничего не ломает). Тесты вызывают методы напрямую с фиксированной датой (не полагаться на реальное время).
- [ ] **3.4 Баннер сгорания.** `GET /api/loyalty/summary` → `{ balance, burnAt, burnAmount }`. Фронт: с 27-го по 1-е у кабинета показывать «у вас {N} формул · сгорят 01.__» (стиль из ТЗ/дизайн-системы).
- [ ] **3.5** Прод-замечание: без Redis (используем `@nestjs/schedule`, один инстанс API через PM2 — ок). Задокументировать в `DEPLOY.md`.

**Acceptance:** отложенные начисления активируются на следующий день; 1-го числа неиспользованные формулы сгорают; баннер показывается в нужный период. Логика покрыта тестами с инъекцией даты.

---

## Фаза 4 — реальный SMS-провайдер (SMS.ru)

### Файловая структура
- Create: `apps/api/src/auth/sms/sms.service.ts` (интерфейс `SmsSender`), `sms.dev.ts` (лог), `sms.smsru.ts` (SMS.ru).
- Modify: `auth.service.ts` — слать код через `SmsSender` (DI по `SMS_PROVIDER`).
- Modify: `.env*.example` — `SMS_PROVIDER`, `SMS_RU_API_ID`.

### Задачи
- [ ] **4.1 Абстракция.** `interface SmsSender { send(phone: string, text: string): Promise<void> }`. Провайдер выбирается фабрикой по `SMS_PROVIDER` (`dev` → лог, `smsru` → HTTP).
- [ ] **4.2 SMS.ru.** `POST https://sms.ru/sms/send` с `api_id`, `to`, `msg`, `json=1`; разобрать статус, кинуть ошибку при отказе. Юнит-тест с моком fetch.
- [ ] **4.3 Интеграция.** `auth.requestCode` шлёт «Ваш код для входа: NNNN» через выбранный провайдер; в `dev` по-прежнему возвращает `devCode`. Тест: при `SMS_PROVIDER=dev` код в ответе; при `smsru` — вызывается HTTP-клиент.
- [ ] **4.4** Документация: как получить `api_id` в SMS.ru, лимиты, стоимость — в `DEPLOY.md`.

**Acceptance:** при заданном `SMS_RU_API_ID` коды уходят реальным SMS; без него — dev-режим (лог). Провайдер переключается переменной окружения.

---

## Фаза 5 — реальные фото блюд (imageUrl)

### Задачи
- [ ] **5.1** Убедиться, что фронт использует `item.imageUrl` (уже так; фоллбэк — плитка-иконка). Проверить отображение при заданном URL.
- [ ] **5.2** Сид/скрипт `apps/api/prisma/set-images.ts` — проставить `imageUrl` позициям из подготовленного маппинга (когда будут реальные снимки). До получения фото — оставить фоллбэк-плитки.
- [ ] **5.3** (Опционально, если появится админка ч.2) — загрузка фото через админку. Пока — вручную скриптом/через Prisma Studio.

**Acceptance:** позиции с `imageUrl` показывают реальные фото; без URL — аккуратная плитка-иконка (без «ИИ-слопа»).

---

## Вне этого плана (зафиксировано)

- **Оплата (ЮKassa)** — отдельно, по вашему решению. Точка интеграции готова: `POST /orders` создаёт заказ+Payment(PENDING); заменяем `mock-confirm` на: создание платежа в ЮKassa → `confirmationUrl` (redirect) → webhook `POST /api/payments/webhook` помечает Payment SUCCEEDED + Order PAID. Нужны `YOOKASSA_SHOP_ID`/`SECRET_KEY` (договор ИП).
- **Админка (ТЗ часть №2)** — заблокирована отсутствием документа. Нужна ч.2 или ТЗ на админку (управление меню, позиции/цены/фото, заказы и статусы, настройки-«прочерки»: часы, e-mail, ставки).
- **Дизайн-редизайн** — выбор из 3 «насыщенных» прототипов (Садовый стол / Аппетит-маркет / Тёплая веранда) не сделан; это отдельная задача, не блокирует функциональность.

## Порядок выполнения (рекомендация)
Фаза 0 → 1 → 2 → 3 → 4 → 5. После Фазы 2 сценарий «собрать и оформить заказ» уже работает (оплата — заглушка). Фазы 3–5 независимы и могут идти в любом порядке после Фазы 1.

## Деплой
Изменений схемы БД нет (все модели существуют) → на проде безопасно: `prisma db push` не тронет данные. Выкатка через существующий CI `Deploy PROD` по пушу в `main`. Тесты гонять в `Tests` до деплоя.
