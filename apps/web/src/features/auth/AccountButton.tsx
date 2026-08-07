import { useState } from 'react';
import { User, Sparkles, LogOut, Mail, CheckCircle2, X } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AccountButton() {
  const { status, user, login, requestConfirmation, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  // Баннер сгорания: с 27-го числа до конца месяца.
  const burnWarning = (() => {
    if (status !== 'authed' || !user || user.formulaBalance <= 0) return null;
    const now = new Date();
    if (now.getDate() < 27) return null;
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `01.${String(first.getMonth() + 1).padStart(2, '0')}`;
  })();

  const close = () => {
    setOpen(false);
    setError(null);
    if (status !== 'authed') {
      setEmail('');
      setName('');
    }
  };

  const onLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(email, name.trim() || undefined);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestConfirmation();
      setConfirmMsg('Письмо со ссылкой отправлено на почту');
      setDevLink(res.devLink ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const label =
    status === 'authed'
      ? `${user!.formulaBalance} формул`
      : status === 'loading'
        ? '…'
        : 'Войти';

  return (
    <div className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-paper px-3.5 py-2 text-sm font-bold text-olive-700 transition hover:border-brand-500 hover:bg-brand-50"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
          {status === 'authed' ? <Sparkles size={12} strokeWidth={2} /> : <User size={12} strokeWidth={2} />}
        </span>
        <span className="hidden sm:inline">Кабинет ·</span> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          {/* затемнение фона */}
          <div className="absolute inset-0 bg-[rgba(44,49,24,0.45)] backdrop-blur-sm" />
          {/* карточка по центру */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-line bg-paper p-5 pt-6 shadow-[0_30px_80px_-24px_rgba(90,104,45,0.55)]"
          >
            <button
              onClick={close}
              aria-label="Закрыть"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-cream hover:text-olive-700"
            >
              <X size={18} />
            </button>
            {status === 'authed' ? (
              <div className="space-y-3">
                <div>
                  <div className="font-serif text-lg text-olive-800">
                    {user!.fullName ? `Здравствуйте, ${user!.fullName}` : 'Личный кабинет'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
                    <Mail size={14} /> {user!.email}
                  </div>
                </div>

                {/* Подтверждение почты */}
                {user!.emailConfirmed ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-olive-700">
                    <CheckCircle2 size={14} className="text-brand-500" /> Почта подтверждена
                  </div>
                ) : confirmMsg ? (
                  <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-olive-700">
                    {confirmMsg}
                    {devLink && (
                      <a
                        href={devLink}
                        className="mt-1 block truncate font-semibold text-brand-500 underline"
                      >
                        dev: открыть ссылку
                      </a>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={onConfirm}
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-wood-100 py-2 text-sm font-semibold text-[#7a5730] transition hover:bg-wood-500/30 disabled:opacity-60"
                  >
                    <Mail size={15} /> {busy ? 'Отправляем…' : 'Подтвердить почту'}
                  </button>
                )}

                <div className="rounded-xl bg-brand-50 px-4 py-3">
                  <div className="text-xs text-ink-soft">баланс</div>
                  <div className="font-serif text-2xl text-brand-500">
                    {user!.formulaBalance} формул
                  </div>
                </div>
                {burnWarning && (
                  <div className="rounded-xl bg-danger-bg px-4 py-2.5 text-sm font-semibold text-danger">
                    {user!.formulaBalance} формул сгорят {burnWarning}
                  </div>
                )}

                <button
                  onClick={() => {
                    logout();
                    close();
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-semibold text-ink-soft transition hover:border-danger hover:text-danger"
                >
                  <LogOut size={15} /> Выйти
                </button>
                {error && <div className="text-xs font-semibold text-danger">{error}</div>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-serif text-lg text-olive-800">Вход по почте</div>
                <div className="text-xs text-ink-soft">Введите почту — сразу войдёте в кабинет</div>
                <input
                  autoFocus
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <input
                  placeholder="Имя (необязательно)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  onClick={onLogin}
                  disabled={busy || !/^\S+@\S+\.\S+$/.test(email)}
                  className="w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
                >
                  {busy ? 'Входим…' : 'Войти'}
                </button>
                {error && <div className="text-xs font-semibold text-danger">{error}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
