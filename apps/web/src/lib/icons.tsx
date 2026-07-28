import {
  Beef,
  Sandwich,
  Pizza,
  UtensilsCrossed,
  Soup,
  Salad,
  Drumstick,
  Cookie,
  Coffee,
  type LucideIcon,
} from 'lucide-react';

// Иконка категории по slug (line-стиль, наследует цвет через currentColor).
const CATEGORY_ICON: Record<string, LucideIcon> = {
  'street-food': Beef,
  sandwiches: Sandwich,
  'hot-snacks': Pizza,
  'main-dishes': UtensilsCrossed,
  soups: Soup,
  salads: Salad,
  halal: Drumstick,
  desserts: Cookie,
  drinks: Coffee,
};

export function CategoryIcon({
  slug,
  size = 20,
  strokeWidth = 1.75,
  className,
}: {
  slug: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[slug] ?? UtensilsCrossed;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

// UI-иконки — единый стиль обводки задаём на месте использования.
export { ShoppingBag, Bike, Store, Leaf, Zap, Moon, Sparkles, Salad, Trash2 } from 'lucide-react';
