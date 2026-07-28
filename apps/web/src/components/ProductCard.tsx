import { formatKopecks, type MenuItemDTO } from '@formulaedi/shared';
import { FoodImage } from './FoodImage';
import { Moon } from '../lib/icons';

export function ProductCard({
  item,
  slug,
  qty,
  onAdd,
  onSub,
}: {
  item: MenuItemDTO;
  slug: string;
  qty: number;
  onAdd: () => void;
  onSub: () => void;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] w-full">
        <FoodImage slug={slug} src={item.imageUrl} iconSize={46} className="h-full w-full" />
        {item.isHalal && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#37692f] shadow-sm backdrop-blur">
            <Moon size={12} strokeWidth={2} /> Халяль
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-serif text-lg leading-snug text-olive-800">{item.name}</h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-ink-soft">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-serif text-xl font-semibold text-olive-800">
            {formatKopecks(item.priceKopecks)}
          </span>

          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-olive-600 active:scale-95"
            >
              В корзину
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-brand-50 p-1">
              <button
                onClick={onSub}
                className="grid h-8 w-8 place-items-center rounded-full bg-paper text-lg font-bold text-olive-700 shadow-sm transition active:scale-90"
                aria-label="Убрать"
              >
                −
              </button>
              <span key={qty} className="pop w-6 text-center font-bold tabular-nums">
                {qty}
              </span>
              <button
                onClick={onAdd}
                className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-lg font-bold text-white shadow-sm transition active:scale-90"
                aria-label="Добавить"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
