import type { MenuCategoryDTO, OrderSummary } from '@formulaedi/shared';
import { sampleMenu } from './sampleMenu';

const BASE = '/api';

/** Меню из API. При недоступном бэкенде — демо-данные (для превью). */
export async function fetchMenu(): Promise<{ menu: MenuCategoryDTO[]; live: boolean }> {
  try {
    const res = await fetch(`${BASE}/menu`);
    if (!res.ok) throw new Error(String(res.status));
    const menu = (await res.json()) as MenuCategoryDTO[];
    if (!Array.isArray(menu) || menu.length === 0) throw new Error('empty');
    return { menu, live: true };
  } catch {
    return { menu: sampleMenu, live: false };
  }
}

export async function fetchSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/settings`);
    if (!res.ok) return {};
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export async function previewOrder(body: {
  items: CartLine[];
  cutleryCount: number;
  spendFormulas: number;
  formulaBalance: number;
}): Promise<OrderSummary | null> {
  try {
    const res = await fetch(`${BASE}/orders/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as OrderSummary;
  } catch {
    return null;
  }
}
