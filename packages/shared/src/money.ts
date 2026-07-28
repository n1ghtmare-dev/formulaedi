// Работа с деньгами. Внутри — копейки (Int), наружу — рубли.

export function kopecksToRub(kopecks: number): number {
  return kopecks / 100;
}

export function rubToKopecks(rub: number): number {
  return Math.round(rub * 100);
}

/** Форматирует копейки в строку «540 ₽». */
export function formatKopecks(kopecks: number): string {
  const rub = Math.round(kopecks / 100);
  return `${rub.toLocaleString('ru-RU')} ₽`;
}
