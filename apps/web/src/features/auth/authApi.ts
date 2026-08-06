// API и хранилище токенов для личного кабинета (вход по почте).
const BASE = '/api';
const KEY = 'fe_auth';

export interface AuthUser {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  phone: string | null;
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
export async function readErr(r: Response): Promise<string> {
  return readError(r);
}

/** Мгновенный вход/регистрация по почте. */
export async function login(
  email: string,
  fullName?: string,
): Promise<Tokens & { isNew: boolean; user: AuthUser }> {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName }),
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

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const r = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

/** fetch с Bearer и авто-refresh при 401. path — под /api. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const t = loadTokens();
  if (!t) throw new Error('Требуется вход');
  const call = (token: string) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  let res = await call(t.accessToken);
  if (res.status === 401) {
    try {
      const r = await refreshSession(t.refreshToken);
      saveTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      res = await call(r.accessToken);
    } catch {
      clearTokens();
      throw new Error('Сессия истекла, войдите заново');
    }
  }
  return res;
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

/** Запросить письмо со ссылкой подтверждения почты. */
export async function sendConfirmation(): Promise<{ sent: boolean; devLink?: string }> {
  const res = await authFetch('/auth/send-confirmation', { method: 'POST' });
  if (!res.ok) throw new Error(await readErr(res));
  return res.json();
}
