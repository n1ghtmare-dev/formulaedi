import { useState } from 'react';
import { api } from './adminApi';
import { PageTitle, Loading, ErrorMsg, TableWrap, Th, Td, useLoad } from './shared';

const TYPE: Record<string, string> = {
  EARN: 'Начисление',
  SPEND: 'Списание',
  BURN: 'Сгорание',
  ADJUST: 'Корректировка',
};

export function Loyalty({ onAuthError }: { onAuthError: () => void }) {
  const { data, loading, error, reload } = useLoad(
    () => Promise.all([api.loyalty(), api.users()]).then(([txs, users]) => ({ txs, users })),
    onAuthError,
  );

  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const adjust = async () => {
    const amt = parseInt(amount, 10);
    if (!userId || !Number.isInteger(amt) || amt === 0) {
      setMsg('Выберите пользователя и укажите ненулевую сумму');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const u = await api.adjust(userId, amt, note.trim() || undefined);
      setMsg(`Готово. Новый баланс: ${u.formulaBalance} формул`);
      setAmount('');
      setNote('');
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle>Формулы</PageTitle>

      {/* Ручная корректировка */}
      <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5">
        <h2 className="mb-3 font-serif text-lg text-olive-800">Ручная корректировка баланса</h2>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Пользователь…</option>
            {data?.users
              .filter((u) => u.role === 'CUSTOMER')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.id} · {u.formulaBalance} ф.
                </option>
              ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="±формул"
            className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Причина (необязательно)"
            className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={adjust}
            disabled={busy}
            className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
          >
            Применить
          </button>
        </div>
        {msg && <p className="mt-3 text-sm font-semibold text-olive-700">{msg}</p>}
      </div>

      <h2 className="mb-3 font-serif text-lg text-olive-800">Движения формул</h2>
      {loading && <Loading />}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      {data && data.txs.length === 0 && <p className="text-sm text-ink-soft">Движений пока нет.</p>}

      {data && data.txs.length > 0 && (
        <TableWrap>
          <thead>
            <tr>
              <Th>Дата</Th>
              <Th>Пользователь</Th>
              <Th>Тип</Th>
              <Th>Статус</Th>
              <Th>Сумма</Th>
              <Th>Баланс после</Th>
              <Th>Примечание</Th>
            </tr>
          </thead>
          <tbody>
            {data.txs.map((t) => (
              <tr key={t.id} className="hover:bg-brand-50/40">
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(t.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                </Td>
                <Td className="font-semibold text-olive-800">{t.user.email ?? t.user.fullName ?? '—'}</Td>
                <Td>{TYPE[t.type] ?? t.type}</Td>
                <Td className="text-xs text-ink-soft">{t.status}</Td>
                <Td className={`font-bold tabular-nums ${t.amount >= 0 ? 'text-brand-500' : 'text-danger'}`}>
                  {t.amount >= 0 ? `+${t.amount}` : t.amount}
                </Td>
                <Td className="tabular-nums">{t.balanceAfter ?? '—'}</Td>
                <Td className="text-xs text-ink-soft">{t.note ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
