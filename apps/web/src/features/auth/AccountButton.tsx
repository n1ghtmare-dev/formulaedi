import { useState } from 'react';
import { User, Sparkles, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { requestCode } from './authApi';

type Step = 'phone' | 'code' | 'name';

export function AccountButton() {
  const { status, user, verify, setName, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setNameInput] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setNameInput('');
    setDevCode(null);
    setError(null);
    setBusy(false);
  };

  const close = () => {
    setOpen(false);
    if (status !== 'authed') reset();
  };

  const onSendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestCode(phone);
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { isNew } = await verify(phone, code);
      if (isNew) setStep('name');
      else close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSaveName = async () => {
    setBusy(true);
    setError(null);
    try {
      await setName(name);
      close();
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
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-paper p-4 shadow-[0_18px_50px_-20px_rgba(90,104,45,0.45)]">
            {status === 'authed' ? (
              <div className="space-y-3">
                <div>
                  <div className="font-serif text-lg text-olive-800">
                    {user!.fullName ? `Добро пожаловать, ${user!.fullName}` : 'Личный кабинет'}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-soft">{user!.phone}</div>
                </div>
                <div className="rounded-xl bg-brand-50 px-4 py-3">
                  <div className="text-xs text-ink-soft">баланс</div>
                  <div className="font-serif text-2xl text-brand-500">
                    {user!.formulaBalance} формул
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    close();
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-semibold text-ink-soft transition hover:border-danger hover:text-danger"
                >
                  <LogOut size={15} /> Выйти
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {step !== 'phone' && (
                  <button
                    onClick={() => {
                      setError(null);
                      setStep(step === 'name' ? 'code' : 'phone');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-olive-700"
                  >
                    <ArrowLeft size={13} /> назад
                  </button>
                )}

                {step === 'phone' && (
                  <>
                    <div className="font-serif text-lg text-olive-800">Вход по телефону</div>
                    <input
                      autoFocus
                      inputMode="tel"
                      placeholder="+7 900 000-00-00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      onClick={onSendCode}
                      disabled={busy || phone.replace(/\D/g, '').length < 10}
                      className="w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
                    >
                      {busy ? 'Отправляем…' : 'Отправить код'}
                    </button>
                  </>
                )}

                {step === 'code' && (
                  <>
                    <div className="font-serif text-lg text-olive-800">Введите код</div>
                    <div className="text-xs text-ink-soft">Код отправлен на {phone}</div>
                    <input
                      autoFocus
                      inputMode="numeric"
                      placeholder="0000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    {devCode && (
                      <div className="rounded-lg bg-wood-100 px-3 py-1.5 text-center text-xs text-[#7a5730]">
                        dev-код: <b>{devCode}</b>
                      </div>
                    )}
                    <button
                      onClick={onVerify}
                      disabled={busy || code.length < 4}
                      className="w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
                    >
                      {busy ? 'Проверяем…' : 'Войти'}
                    </button>
                  </>
                )}

                {step === 'name' && (
                  <>
                    <div className="font-serif text-lg text-olive-800">Как вас зовут?</div>
                    <div className="text-xs text-ink-soft">Введите ФИО для заказов</div>
                    <input
                      autoFocus
                      placeholder="Иван Иванов"
                      value={name}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      onClick={onSaveName}
                      disabled={busy || name.trim().length < 2}
                      className="w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
                    >
                      {busy ? 'Сохраняем…' : 'Готово'}
                    </button>
                  </>
                )}

                {error && <div className="text-xs font-semibold text-danger">{error}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
