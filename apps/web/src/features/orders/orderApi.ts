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

/** Заказ + ссылка на оплату PayKeeper (paymentUrl=null в dev-режиме). */
export type CreatedOrder = OrderDTO & { paymentUrl: string | null };

/** Создать заказ (требует входа). Возвращает заказ и paymentUrl для редиректа на оплату. */
export async function createOrder(body: CreateOrderBody): Promise<CreatedOrder> {
  const res = await authFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}

/** DEV-подтверждение оплаты (когда PayKeeper не настроен) → окно «Заказ принят». */
export async function confirmOrder(id: string): Promise<OrderAccepted> {
  const res = await authFetch(`/orders/${id}/mock-confirm`, { method: 'POST' });
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}

/** Последний оплаченный заказ — для окна после возврата со страницы оплаты. */
export async function getLastAccepted(): Promise<OrderAccepted | null> {
  const res = await authFetch('/orders/last-accepted');
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}
