import { AccountButton } from '../features/auth/AccountButton';

export function TopBar({ workHours }: { workHours: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <img src="/logo.png" alt="Формула Еды" className="h-11 w-11 shrink-0 object-contain" />
        <div className="mr-auto min-w-0">
          <div className="font-serif text-lg leading-none text-olive-800">Формула Еды</div>
          <div className="mt-1 hidden text-xs text-ink-soft sm:block">
            доставка до комнаты · студенческий городок МАДИ
          </div>
        </div>

        <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-olive-700 md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {workHours}
        </span>

        <AccountButton />
      </div>
    </header>
  );
}
