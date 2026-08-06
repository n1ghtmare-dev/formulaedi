import { authFetch, readErr } from '../auth/authApi';
import type { Building, DeliveryType, OrderDTO } from '@formulaedi/shared';

export interface CreateOrderBody {
  items: { menuItemId: string; quantity: number }[];
  cutleryCount: number;
  spendFormulas: number;
  deliveryType: DeliveryType;
  building?: Building;
  floor?: string;
  room?: string;
  contactPhone: string;
}

export interface OrderAccepted {
  orderNumber: number;
  status: string;
  message: string;
}

/** Создать заказ (требует входа). */
export async function createOrder(body: CreateOrderBody): Promise<OrderDTO> {
  const res = await authFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}

/** Подтвердить оплату (заглушка до ЮKassa) → данные окна «Заказ принят». */
export async function confirmOrder(id: string): Promise<OrderAccepted> {
  const res = await authFetch(`/orders/${id}/mock-confirm`, { method: 'POST' });
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}
