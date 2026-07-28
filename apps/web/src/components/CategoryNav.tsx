import { useEffect, useRef } from 'react';
import type { MenuCategoryDTO } from '@formulaedi/shared';
import { CategoryIcon } from '../lib/icons';

export function CategoryNav({
  categories,
  active,
  onPick,
}: {
  categories: MenuCategoryDTO[];
  active: string;
  onPick: (slug: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  // держим активную «таблетку» в зоне видимости ленты
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-pill="${active}"]`);
    if (el)
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <nav
      className="sticky z-30 border-b border-line/70 bg-cream/90 backdrop-blur-md"
      style={{ top: 63 }}
    >
      <div
        ref={stripRef}
        className="no-scrollbar mx-auto flex max-w-[1240px] gap-2 overflow-x-auto px-3 py-2.5 sm:px-6"
      >
        {categories.map((c) => {
          const isActive = c.slug === active;
          return (
            <button
              key={c.id}
              data-pill={c.slug}
              onClick={() => onPick(c.slug)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-olive-700 text-white shadow-[var(--shadow-soft)]'
                  : 'bg-paper text-olive-700 ring-1 ring-line hover:bg-brand-50'
              }`}
            >
              <CategoryIcon slug={c.slug} size={17} />
              {c.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
