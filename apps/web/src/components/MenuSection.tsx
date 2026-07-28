import type { MenuCategoryDTO } from '@formulaedi/shared';
import { CategoryIcon } from '../lib/icons';
import { ProductCard } from './ProductCard';
import { Reveal } from './Reveal';

export function MenuSection({
  category,
  qtys,
  onAdd,
  onSub,
  registerRef,
}: {
  category: MenuCategoryDTO;
  qtys: Record<string, number>;
  onAdd: (id: string) => void;
  onSub: (id: string) => void;
  registerRef: (slug: string, el: HTMLElement | null) => void;
}) {
  return (
    <section
      data-section={category.slug}
      ref={(el) => registerRef(category.slug, el)}
      className="scroll-mt-36"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-olive-700">
          <CategoryIcon slug={category.slug} size={22} />
        </span>
        <h2 className="text-2xl sm:text-3xl">{category.name}</h2>
        <span className="ml-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-olive-700">
          {category.items.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {category.items.map((it, i) => (
          <Reveal key={it.id} delay={(i % 3) * 60} className="h-full">
            <ProductCard
              item={it}
              slug={category.slug}
              qty={qtys[it.id] ?? 0}
              onAdd={() => onAdd(it.id)}
              onSub={() => onSub(it.id)}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
