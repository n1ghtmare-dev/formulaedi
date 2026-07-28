import { useCallback, useMemo, useState } from 'react';
import {
  formulasToEarn,
  maxSpendableFormulas,
  type MenuItemDTO,
} from '@formulaedi/shared';

export interface CartLineView {
  item: MenuItemDTO;
  qty: number;
  slug: string;
}

export function useCart(itemsById: Map<string, MenuItemDTO>, slugByItem: Map<string, string>, balance: number) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [cutlery, setCutlery] = useState(0);
  const [spend, setSpend] = useState(0);

  const add = useCallback((id: string) => setQtys((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })), []);
  const sub = useCallback(
    (id: string) =>
      setQtys((c) => {
        const next = Math.max(0, (c[id] ?? 0) - 1);
        const copy = { ...c };
        if (next === 0) delete copy[id];
        else copy[id] = next;
        return copy;
      }),
    [],
  );
  const clear = useCallback(() => {
    setQtys({});
    setSpend(0);
    setCutlery(0);
  }, []);

  const lines: CartLineView[] = useMemo(
    () =>
      Object.entries(qtys)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({
          item: itemsById.get(id)!,
          qty,
          slug: slugByItem.get(id) ?? '',
        }))
        .filter((l) => l.item),
    [qtys, itemsById, slugByItem],
  );

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.item.priceKopecks * l.qty, 0);
  const maxSpend = maxSpendableFormulas(subtotal, balance);
  const spentFormulas = Math.min(spend, maxSpend);
  const discount = spentFormulas * 100;
  const total = Math.max(0, subtotal - discount);
  const willEarn = formulasToEarn(total);

  return {
    qtys, add, sub, clear,
    cutlery, setCutlery,
    spend, setSpend, spentFormulas, maxSpend,
    lines, count, subtotal, discount, total, willEarn,
  };
}
