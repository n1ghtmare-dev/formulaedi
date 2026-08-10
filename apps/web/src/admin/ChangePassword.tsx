import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from './adminApi';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (next.length < 6) {
      setMsg('Новый пароль не короче 6 символов');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setMsg('Пароль изменён');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(44,49,24,0.45)] backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-line bg-paper p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-olive-800">Смена пароля</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div>
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-olive-700">
              Пароль изменён. Он действует при следующем входе.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-olive-600"
            >
              Готово
            </button>
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="Текущий пароль"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <input
              type="password"
              placeholder="Новый пароль"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="mt-3 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            {msg && <p className="mt-3 text-xs font-semibold text-danger">{msg}</p>}
            <button
              onClick={submit}
              disabled={busy || !current || !next}
              className="mt-4 w-full rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
            >
              {busy ? 'Меняем…' : 'Сменить пароль'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
