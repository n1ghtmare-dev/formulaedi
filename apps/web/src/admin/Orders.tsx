import { useState } from 'react';
import { formatKopecks } from '@formulaedi/shared';
import { api } from './adminApi';
import { PageTitle, Loading, ErrorMsg, TableWrap, Th, Td, useLoad } from './shared';

const STATUS: Record<string, string> = {
  AWAITING_PAYMENT: 'Ждёт оплату',
  PAID: 'Оплачен',
  PREPARING: 'Готовится',
  DELIVERING: 'Доставляется',
  WAITING_AT_CAFE: 'Ждёт в кафе',
  COMPLETED: 'Выдан',
  CANCELLED: 'Отменён',
};
const STATUS_KEYS = Object.keys(STATUS);

export function Orders({ onAuthError }: { onAuthError: () => void }) {
  const [filter, setFilter] = useState('');
  const { data, loading, error, reload } = useLoad(() => api.orders(filter || undefined), onAuthError, [filter]);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.updateOrderStatus(id, status);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Заказы</PageTitle>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-olive-700 outline-none"
        >
          <option value="">Все статусы</option>
          {STATUS_KEYS.map((s) => (
            <option key={s} value={s}>
              {STATUS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loading />}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      {data && data.length === 0 && <p className="text-sm text-ink-soft">Заказов нет.</p>}

      {data && data.length > 0 && (
        <TableWrap>
          <thead>
            <tr>
              <Th>№</Th>
              <Th>Дата</Th>
              <Th>Клиент</Th>
              <Th>Состав</Th>
              <Th>Итог</Th>
              <Th>Оплата</Th>
              <Th>Доставка</Th>
              <Th>Статус</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id} className="hover:bg-brand-50/40">
                <Td className="font-bold">{o.orderNumber}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(o.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                </Td>
                <Td>
                  <div className="font-semibold text-olive-800">{o.user.fullName ?? '—'}</div>
                  <div className="text-xs text-ink-soft">{o.contactPhone}</div>
                </Td>
                <Td>
                  <div className="max-w-[220px] text-xs text-ink-soft">
                    {o.items.map((i) => `${i.nameSnapshot}×${i.quantity}`).join(', ')}
                  </div>
                </Td>
                <Td className="whitespace-nowrap font-semibold tabular-nums">
                  {formatKopecks(o.totalKopecks)}
                  {o.formulasSpent > 0 && (
                    <span className="block text-xs font-normal text-brand-500">−{o.formulasSpent} ф.</span>
                  )}
                </Td>
                <Td className="text-xs">{o.payment ? o.payment.status : '—'}</Td>
                <Td className="whitespace-nowrap text-xs">
                  {o.deliveryType === 'PICKUP'
                    ? 'Самовывоз'
                    : `${o.building === 'BUILDING_2' ? 'Корп. 2' : 'Корп. 1'}, эт.${o.floor}, к.${o.room}`}
                </Td>
                <Td>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-olive-700 outline-none"
                  >
                    {STATUS_KEYS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s]}
                      </option>
                    ))}
                  </select>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
