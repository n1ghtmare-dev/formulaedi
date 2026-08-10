import { api } from './adminApi';
import { PageTitle, Loading, ErrorMsg, TableWrap, Th, Td, useLoad } from './shared';

export function Users({ onAuthError }: { onAuthError: () => void }) {
  const { data, loading, error, reload } = useLoad(() => api.users(), onAuthError);

  const toggleBlock = async (id: string, next: boolean) => {
    try {
      await api.setBlocked(id, next);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <PageTitle>Пользователи</PageTitle>
      {loading && <Loading />}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      {data && (
        <TableWrap>
          <thead>
            <tr>
              <Th>Почта</Th>
              <Th>Имя</Th>
              <Th>Роль</Th>
              <Th>Формулы</Th>
              <Th>Регистрация</Th>
              <Th>Статус</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/40">
                <Td className="font-semibold text-olive-800">
                  {u.email ?? '—'}
                  {!u.emailConfirmed && u.email && (
                    <span className="ml-1 text-xs font-normal text-ink-soft">(не подтв.)</span>
                  )}
                </Td>
                <Td>{u.fullName ?? '—'}</Td>
                <Td>
                  {u.role === 'ADMIN' ? (
                    <span className="rounded-full bg-olive-700 px-2 py-0.5 text-xs font-semibold text-white">
                      админ
                    </span>
                  ) : (
                    'клиент'
                  )}
                </Td>
                <Td className="font-semibold tabular-nums">{u.formulaBalance}</Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                </Td>
                <Td>
                  {u.isBlocked ? (
                    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                      заблокирован
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft">активен</span>
                  )}
                </Td>
                <Td>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => toggleBlock(u.id, !u.isBlocked)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                        u.isBlocked
                          ? 'text-olive-700 ring-line hover:bg-brand-50'
                          : 'text-danger ring-danger/40 hover:bg-danger-bg'
                      }`}
                    >
                      {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
