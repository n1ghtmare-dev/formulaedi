import { useEffect, useState } from 'react';

/** Загрузка данных с обработкой ошибок и авто-выходом при истёкшей сессии. */
export function useLoad<T>(
  loader: () => Promise<T>,
  onAuthError: () => void,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => alive && setData(d))
      .catch((e) => {
        if (!alive) return;
        const m = (e as Error).message;
        setError(m);
        if (/войдите|сесси/i.test(m)) onAuthError();
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-5 font-serif text-3xl text-olive-800">{children}</h1>;
}

export function Loading() {
  return <p className="text-sm text-ink-soft">Загрузка…</p>;
}

export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">{children}</p>
  );
}

/** Обёртка таблицы со скроллом по горизонтали. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-line/60 px-4 py-3 align-middle ${className}`}>{children}</td>;
}
