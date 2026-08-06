// API и хранилище токенов для личного кабинета.
const BASE = '/api';
const KEY = 'fe_auth';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string | null;
  formulaBalance: number;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}
export function saveTokens(t: Tokens) {
  localStorage.setItem(KEY, JSON.stringify(t));
}
export function clearTokens() {
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

export async function requestCode(phone: string): Promise<{ sent: boolean; devCode?: string }> {
  const r = await fetch(`${BASE}/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

export async function verifyCode(
  phone: string,
  code: string,
): Promise<Tokens & { isNew: boolean; user: AuthUser }> {
  const r = await fetch(`${BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

export async function refreshSession(refreshToken: string): Promise<Tokens & { user: AuthUser }> {
  const r = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

export async function saveName(accessToken: string, fullName: string): Promise<AuthUser> {
  const r = await fetch(`${BASE}/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fullName }),
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}
