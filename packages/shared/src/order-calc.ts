import { maxSpendableFormulas, formulasToEarn } from './loyalty';

// Позиция заказа со снимком цены/названия (цены — из БД, не от клиента).
export interface PricedLine {
  menuItemId: string;
  nameSnapshot: string;
  priceKopecks: number;
  quantity: number;
  lineTotalKopecks: number;
}

export interface OrderTotals {
  subtotalKopecks: number;
  formulasSpent: number;
  formulaDiscountKopecks: number;
  totalKopecks: number;
  formulasToEarn: number;
}

/**
 * Итог заказа: сумма позиций, списание формул (≤25% и ≤баланс),
 * итог к оплате и начисление 7% от итога. Чистая функция — общий источник
 * правды для превью (фронт) и создания заказа (бэк).
 */
export function computeOrderTotals(
  lines: PricedLine[],
  requestedSpend: number,
  balance: number,
  earnPercent: number,
  spendMaxPercent: number,
): OrderTotals {
  const subtotalKopecks = lines.reduce((s, l) => s + l.lineTotalKopecks, 0);
  const allowed = maxSpendableFormulas(subtotalKopecks, balance, spendMaxPercent);
  const formulasSpent = Math.max(0, Math.min(requestedSpend, allowed));
  const formulaDiscountKopecks = formulasSpent * 100; // 1 формула = 1 ₽
  const totalKopecks = Math.max(0, subtotalKopecks - formulaDiscountKopecks);
  const formulasToEarnValue = formulasToEarn(totalKopecks, earnPercent);

  return {
    subtotalKopecks,
    formulasSpent,
    formulaDiscountKopecks,
    totalKopecks,
    formulasToEarn: formulasToEarnValue,
  };
}
