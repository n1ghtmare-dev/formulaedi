import { Leaf, Zap, Salad } from '../lib/icons';

export function Hero({ onBrowse }: { onBrowse: () => void }) {
  return (
    <section className="relative overflow-hidden">
      {/* мягкие пятна-подложки */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-wood-100 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        {/* Текст */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-olive-700">
            <Leaf size={14} strokeWidth={2} /> Свежее каждый день
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Вкусная еда —<br />
            <span className="text-brand-500">до вашей комнаты</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-soft">
            Доставим заказ в студенческий городок МАДИ за 30 минут. И вернём 7% бонусами «формулы».
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={onBrowse}
              className="rounded-full bg-brand-500 px-7 py-3.5 font-bold text-white shadow-[var(--shadow-soft)] transition hover:bg-olive-600 active:translate-y-px"
            >
              Смотреть меню
            </button>
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-paper text-brand-500 shadow-[var(--shadow-soft)]">
                <Zap size={16} strokeWidth={2} />
              </span>
              30 минут или быстрее
            </div>
          </div>
        </div>

        {/* Визуал */}
        <div className="relative mx-auto w-full max-w-md">
          <div
            className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[var(--radius-xl2)] shadow-[var(--shadow-lift)]"
            style={{
              background:
                'radial-gradient(130% 130% at 28% 18%, #ffffffaa, transparent 55%), linear-gradient(160deg, #e7ecd4, #f6eee3)',
            }}
          >
            <Salad size={120} strokeWidth={1} className="text-olive-700/45" />
            <img
              src="https://loremflickr.com/720/900/breakfast,bowl,healthy/?lock=42"
              alt="Свежее блюдо"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          {/* плавающие карточки */}
          <div className="floaty absolute -left-4 top-8 rounded-2xl bg-paper px-4 py-3 shadow-[var(--shadow-lift)]">
            <div className="text-xs text-ink-soft">кэшбэк</div>
            <div className="font-serif text-lg text-brand-500">+7% формул</div>
          </div>
          <div
            className="floaty absolute -bottom-4 right-2 rounded-2xl bg-paper px-4 py-3 shadow-[var(--shadow-lift)]"
            style={{ animationDelay: '1.5s' }}
          >
            <div className="text-xs text-ink-soft">скидка бонусами</div>
            <div className="font-serif text-lg text-olive-700">до 25%</div>
          </div>
        </div>
      </div>
    </section>
  );
}
