// Строковые enum-ы, совпадающие с Prisma. Дублируем здесь, чтобы фронт
// не зависел от @prisma/client.

export const DeliveryType = { DELIVERY: 'DELIVERY', PICKUP: 'PICKUP' } as const;
export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

export const Building = { BUILDING_1: 'BUILDING_1', BUILDING_2: 'BUILDING_2' } as const;
export type Building = (typeof Building)[keyof typeof Building];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  DELIVERING: 'DELIVERING',
  WAITING_AT_CAFE: 'WAITING_AT_CAFE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  WAITING_FOR_CAPTURE: 'WAITING_FOR_CAPTURE',
  SUCCEEDED: 'SUCCEEDED',
  CANCELED: 'CANCELED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const UserRole = { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const BUILDING_LABELS: Record<Building, string> = {
  BUILDING_1: 'Корпус №1',
  BUILDING_2: 'Корпус №2',
};
