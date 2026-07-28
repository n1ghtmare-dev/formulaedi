// Мета по категориям: ключевое слово для фото и оттенок подложки-фоллбэка.
// Иконки категорий — в lib/icons.tsx. Ключи — slug категорий из БД (см. seed).

export interface CatMeta {
  keyword: string; // англ. ключ для фото-стока
  tint: string; // фон карточки-фоллбэка (если фото не загрузилось)
}

const DEFAULT_META: CatMeta = { keyword: 'food', tint: '#e7ecd4' };

const MAP: Record<string, CatMeta> = {
  'street-food': { keyword: 'burger', tint: '#f0ead6' },
  sandwiches: { keyword: 'sandwich', tint: '#eef1e0' },
  'hot-snacks': { keyword: 'pizza', tint: '#f4e7d6' },
  'main-dishes': { keyword: 'lunch', tint: '#eaf0dd' },
  soups: { keyword: 'soup', tint: '#f1ebd8' },
  salads: { keyword: 'salad', tint: '#e6f0d9' },
  halal: { keyword: 'kebab', tint: '#eef0df' },
  desserts: { keyword: 'dessert', tint: '#f5ecdb' },
  drinks: { keyword: 'coffee', tint: '#efe8dc' },
};

export function catMeta(slug: string): CatMeta {
  return MAP[slug] ?? DEFAULT_META;
}
