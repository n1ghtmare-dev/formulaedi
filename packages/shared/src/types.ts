import type { Building, DeliveryType, OrderStatus } from './enums';

// ——— Меню ———
export interface MenuItemDTO {
  id: string;
  name: string;
  description: string | null;
  priceKopecks: number;
  imageUrl: string | null;
  isHalal: boolean;
  isAvailable: boolean;
}

export interface MenuCategoryDTO {
  id: string;
  slug: string;
  name: string;
  iconEmoji: string | null;
  items: MenuItemDTO[];
}

// ——— Пользователь ———
export interface UserDTO {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  phone: string | null;
  fullName: string | null;
  formulaBalance: number;
}

// ——— Корзина / расчёт чека ———
export interface CartItemInput {
  menuItemId: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CartItemInput[];
  cutleryCount: number;
  spendFormulas: number;
  deliveryType: DeliveryType;
  building?: Building;
  floor?: string;
  room?: string;
  contactPhone: string;
}

export interface OrderSummary {
  subtotalKopecks: number;
  formulasSpent: number;
  formulaDiscountKopecks: number;
  totalKopecks: number;
  formulasToEarn: number;
}

export interface OrderDTO extends OrderSummary {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
}

// ——— Авторизация ———
export interface RequestCodeInput {
  phone: string;
}
export interface VerifyCodeInput {
  phone: string;
  code: string;
  fullName?: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
