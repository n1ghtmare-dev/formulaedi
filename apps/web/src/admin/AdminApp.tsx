import { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  Users as UsersIcon,
  Sparkles,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { loadAdminTokens, clearAdminTokens } from './adminApi';
import { AdminLogin } from './AdminLogin';
import { ChangePasswordModal } from './ChangePassword';
import { Dashboard } from './Dashboard';
import { Products } from './Products';
import { Orders } from './Orders';
import { Users } from './Users';
import { Loyalty } from './Loyalty';

type Tab = 'dashboard' | 'products' | 'orders' | 'users' | 'loyalty';

const NAV: { key: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Сводка', Icon: LayoutDashboard },
  { key: 'products', label: 'Товары', Icon: UtensilsCrossed },
  { key: 'orders', label: 'Заказы', Icon: Receipt },
  { key: 'users', label: 'Пользователи', Icon: UsersIcon },
  { key: 'loyalty', label: 'Формулы', Icon: Sparkles },
];

export function AdminApp() {
  const [authed, setAuthed] = useState(() => !!loadAdminTokens());
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showPwd, setShowPwd] = useState(false);

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  const logout = () => {
    clearAdminTokens();
    setAuthed(false);
  };
  // Сессия истекла где-то в разделе → вернуться ко входу.
  const onAuthError = () => logout();

  return (
    <div className="flex min-h-[100dvh] bg-cream text-ink">
      {/* Боковая навигация */}
      <aside className="flex w-16 flex-col border-r border-line bg-paper py-4 sm:w-56">
        <div className="mb-6 flex items-center gap-2 px-3 sm:px-5">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="hidden font-serif text-lg text-olive-800 sm:block">Админка</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 sm:px-3">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? 'bg-brand-500 text-white shadow-[var(--shadow-soft)]'
                  : 'text-olive-700 hover:bg-brand-50'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => setShowPwd(true)}
          className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-olive-700 transition hover:bg-brand-50 sm:mx-3"
        >
          <KeyRound size={18} strokeWidth={2} />
          <span className="hidden sm:block">Пароль</span>
        </button>
        <button
          onClick={logout}
          className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-danger-bg hover:text-danger sm:mx-3"
        >
          <LogOut size={18} strokeWidth={2} />
          <span className="hidden sm:block">Выйти</span>
        </button>
      </aside>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}

      {/* Контент */}
      <main className="flex-1 overflow-x-auto p-4 sm:p-8">
        {tab === 'dashboard' && <Dashboard onAuthError={onAuthError} />}
        {tab === 'products' && <Products onAuthError={onAuthError} />}
        {tab === 'orders' && <Orders onAuthError={onAuthError} />}
        {tab === 'users' && <Users onAuthError={onAuthError} />}
        {tab === 'loyalty' && <Loyalty onAuthError={onAuthError} />}
      </main>
    </div>
  );
}
