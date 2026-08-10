import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminLogin, saveAdminTokens } from './adminApi';

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await adminLogin(email.trim(), password);
      saveAdminTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-cream px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-line bg-paper p-7 shadow-[0_30px_80px_-24px_rgba(90,104,45,0.4)]"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
          <ShieldCheck size={30} strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-center font-serif text-2xl text-olive-800">Вход в админку</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">Формула Еды</p>

        <input
          autoFocus
          type="email"
          placeholder="admin@formulaedi.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-5 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-4 w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
        {error && <p className="mt-3 text-center text-xs font-semibold text-danger">{error}</p>}
      </form>
    </div>
  );
}
