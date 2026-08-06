import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  clearTokens,
  fetchMe,
  loadTokens,
  refreshSession,
  saveName,
  saveTokens,
  verifyCode,
  type AuthUser,
} from './authApi';

type Status = 'loading' | 'anon' | 'authed';

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  /** Подтвердить код: возвращает isNew (нужен ли ввод ФИО). */
  verify: (phone: string, code: string) => Promise<{ isNew: boolean }>;
  /** Сохранить ФИО (после регистрации). */
  setName: (fullName: string) => Promise<void>;
  /** Перечитать профиль (напр. после заказа — обновить баланс). */
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Восстановление сессии по refresh-токену при загрузке.
  useEffect(() => {
    const t = loadTokens();
    if (!t) {
      setStatus('anon');
      return;
    }
    refreshSession(t.refreshToken)
      .then((res) => {
        saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        setUser(res.user);
        setStatus('authed');
      })
      .catch(() => {
        clearTokens();
        setStatus('anon');
      });
  }, []);

  const verify = useCallback(async (phone: string, code: string) => {
    const res = await verifyCode(phone, code);
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    setStatus('authed');
    return { isNew: res.isNew && !res.user.fullName };
  }, []);

  const setName = useCallback(async (fullName: string) => {
    const t = loadTokens();
    if (!t) return;
    const updated = await saveName(t.accessToken, fullName);
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = loadTokens();
    if (!t) return;
    try {
      const me = await fetchMe(t.accessToken);
      setUser(me);
    } catch {
      /* игнорируем — не критично */
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, verify, setName, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
