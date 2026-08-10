// API и токены админки. Токены хранятся отдельно от клиентской сессии (ключ fe_admin).
const BASE = '/api';
const KEY = 'fe_admin';

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  formulaBalance: number;
  isBlocked: boolean;
  emailConfirmed: boolean;
  createdAt: string;
}

export interface AdminItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceKopecks: number;
  imageUrl: string | null;
  isHalal: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  items: AdminItem[];
}

export interface AdminOrderItem {
  id: string;
  nameSnapshot: string;
  priceKopecks: number;
  quantity: number;
  lineTotalKopecks: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  status: string;
  contactPhone: string;
  deliveryType: 'DELIVERY' | 'PICKUP';
  building: string | null;
  floor: string | null;
  room: string | null;
  subtotalKopecks: number;
  cutleryCount: number;
  formulasSpent: number;
  totalKopecks: number;
  formulasToEarn: number;
  createdAt: string;
  items: AdminOrderItem[];
  payment: { status: string; amountKopecks: number } | null;
  user: { email: string | null; fullName: string | null };
}

export interface AdminTx {
  id: string;
  type: 'EARN' | 'SPEND' | 'BURN' | 'ADJUST';
  status: string;
  amount: number;
  balanceAfter: number | null;
  note: string | null;
  createdAt: string;
  user: { email: string | null; fullName: string | null };
}

export interface AdminStats {
  customers: number;
  orders: number;
  revenueKopecks: number;
  activeFormulas: number;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function loadAdminTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}
export function saveAdminTokens(t: Tokens) {
  localStorage.setItem(KEY, JSON.stringify(t));
}
export function clearAdminTokens() {
  localStorage.removeItem(KEY);
}

async function readError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return Array.isArray(j.message) ? j.message.join(', ') : j.message || 'Ошибка';
  } catch {
    return 'Ошибка сети';
  }
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<Tokens & { user: AdminUser }> {
  const r = await fetch(`${BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

async function refresh(refreshToken: string): Promise<Tokens> {
  const r = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

/** fetch под /api с Bearer админа и авто-refresh при 401. */
async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const t = loadAdminTokens();
  if (!t) throw new Error('Требуется вход');
  const call = (token: string) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  let res = await call(t.accessToken);
  if (res.status === 401) {
    try {
      const r = await refresh(t.refreshToken);
      saveAdminTokens(r);
      res = await call(r.accessToken);
    } catch {
      clearAdminTokens();
      throw new Error('Сессия истекла, войдите заново');
    }
  }
  return res;
}

async function get<T>(path: string): Promise<T> {
  const r = await adminFetch(path);
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}
async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const r = await adminFetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

// ——— Обёртки эндпоинтов ———
export const api = {
  stats: () => get<AdminStats>('/admin/stats'),

  menu: () => get<AdminCategory[]>('/admin/menu'),
  createCategory: (b: Partial<AdminCategory>) => send<AdminCategory>('/admin/categories', 'POST', b),
  updateCategory: (id: string, b: Partial<AdminCategory>) =>
    send<AdminCategory>(`/admin/categories/${id}`, 'PATCH', b),
  deleteCategory: (id: string) => send<{ ok: boolean }>(`/admin/categories/${id}`, 'DELETE'),
  createItem: (b: Partial<AdminItem>) => send<AdminItem>('/admin/items', 'POST', b),
  updateItem: (id: string, b: Partial<AdminItem>) => send<AdminItem>(`/admin/items/${id}`, 'PATCH', b),
  deleteItem: (id: string) => send<{ ok: boolean }>(`/admin/items/${id}`, 'DELETE'),

  orders: (status?: string) => get<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id: string, status: string) =>
    send<AdminOrder>(`/admin/orders/${id}/status`, 'PATCH', { status }),

  users: () => get<AdminUser[]>('/admin/users'),
  setBlocked: (id: string, isBlocked: boolean) =>
    send<AdminUser>(`/admin/users/${id}/block`, 'PATCH', { isBlocked }),

  loyalty: (userId?: string) => get<AdminTx[]>(`/admin/loyalty${userId ? `?userId=${userId}` : ''}`),
  adjust: (userId: string, amount: number, note?: string) =>
    send<AdminUser>('/admin/loyalty/adjust', 'POST', { userId, amount, note }),

  changePassword: (currentPassword: string, newPassword: string) =>
    send<{ ok: boolean }>('/admin/change-password', 'POST', { currentPassword, newPassword }),
};
