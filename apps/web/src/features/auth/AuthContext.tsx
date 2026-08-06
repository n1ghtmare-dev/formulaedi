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
  login as loginApi,
  refreshSession,
  saveName,
  saveTokens,
  sendConfirmation,
  type AuthUser,
} from './authApi';

type Status = 'loading' | 'anon' | 'authed';

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  /** Мгновенный вход/регистрация по почте. */
  login: (email: string, fullName?: string) => Promise<void>;
  /** Сохранить ФИО. */
  setName: (fullName: string) => Promise<void>;
  /** Запросить письмо подтверждения почты. */
  requestConfirmation: () => Promise<{ sent: boolean; devLink?: string }>;
  /** Перечитать профиль (баланс, статус подтверждения). */
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

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

  const login = useCallback(async (email: string, fullName?: string) => {
    const res = await loginApi(email, fullName);
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    setStatus('authed');
  }, []);

  const setName = useCallback(async (fullName: string) => {
    const t = loadTokens();
    if (!t) return;
    const updated = await saveName(t.accessToken, fullName);
    setUser(updated);
  }, []);

  const requestConfirmation = useCallback(() => sendConfirmation(), []);

  const refreshUser = useCallback(async () => {
    const t = loadTokens();
    if (!t) return;
    try {
      setUser(await fetchMe(t.accessToken));
    } catch {
      /* игнорируем */
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, login, setName, requestConfirmation, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
