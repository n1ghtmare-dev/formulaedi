// Бизнес-логика бонусной валюты «формулы». Чистые функции —
// используются и на фронте (превью в чеке), и на бэке (авторитетный расчёт).
// Деньги в копейках. 1 формула = 1 ₽.

export const DEFAULT_EARN_PERCENT = 7; // возвращаем 7% от итога заказа
export const DEFAULT_SPEND_MAX_PERCENT = 25; // списать можно до 25% суммы

/**
 * Сколько формул можно списать с этого заказа.
 * = min(25% от суммы, весь баланс формул).
 * @param subtotalKopecks сумма позиций в копейках
 * @param balance текущий баланс формул (шт)
 */
export function maxSpendableFormulas(
  subtotalKopecks: number,
  balance: number,
  spendMaxPercent: number = DEFAULT_SPEND_MAX_PERCENT,
): number {
  const subtotalRub = Math.floor(subtotalKopecks / 100);
  const maxByPercent = Math.floor((subtotalRub * spendMaxPercent) / 100);
  return Math.max(0, Math.min(maxByPercent, Math.max(0, balance)));
}

/**
 * Сколько формул начислится за заказ (7% от итоговой стоимости).
 * @param totalKopecks итог к оплате в копейках
 */
export function formulasToEarn(
  totalKopecks: number,
  earnPercent: number = DEFAULT_EARN_PERCENT,
): number {
  const totalRub = totalKopecks / 100;
  return Math.max(0, Math.round((totalRub * earnPercent) / 100));
}

/** Первое число следующего месяца — момент сгорания формул. */
export function nextBurnDate(from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 1, 0, 0, 0, 0);
}

/** Начало следующего дня (00:00) — момент, когда начисленные «завтра» формулы активируются. */
export function startOfNextDay(from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0);
}
