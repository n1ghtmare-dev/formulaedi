import { formatKopecks } from '@formulaedi/shared';
import { api } from './adminApi';
import { PageTitle, Loading, ErrorMsg, useLoad } from './shared';

export function Dashboard({ onAuthError }: { onAuthError: () => void }) {
  const { data, loading, error } = useLoad(() => api.stats(), onAuthError);

  return (
    <div>
      <PageTitle>Сводка</PageTitle>
      {loading && <Loading />}
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Клиентов" value={String(data.customers)} />
          <Stat label="Заказов" value={String(data.orders)} />
          <Stat label="Выручка" value={formatKopecks(data.revenueKopecks)} />
          <Stat label="Активных формул" value={String(data.activeFormulas)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-paper p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-2 font-serif text-3xl text-olive-800">{value}</div>
    </div>
  );
}
