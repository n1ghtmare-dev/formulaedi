import type { MenuCategoryDTO } from '@formulaedi/shared';

// Демо-меню для превью фронтенда без запущенного бэкенда.
// В рантайме заменяется реальными данными из /api/menu.
export const sampleMenu: MenuCategoryDTO[] = [
  {
    id: 'c1', slug: 'street-food', name: 'Стрит-фуд', iconEmoji: '🥙',
    items: [
      { id: 'i1', name: 'Бургер классический', description: 'Говяжья котлета, сыр, овощи', priceKopecks: 32000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i2', name: 'Шаурма куриная', description: null, priceKopecks: 26000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i3', name: 'Буррито с говядиной', description: null, priceKopecks: 29000, imageUrl: null, isHalal: false, isAvailable: true },
    ],
  },
  {
    id: 'c2', slug: 'sandwiches', name: 'Сэндвичи', iconEmoji: '🥪',
    items: [
      { id: 'i4', name: 'Сэндвич с курицей', description: null, priceKopecks: 21000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i5', name: 'Сэндвич-круассан с лососем', description: null, priceKopecks: 27000, imageUrl: null, isHalal: false, isAvailable: true },
    ],
  },
  {
    id: 'c3', slug: 'hot-snacks', name: 'Пицца, хот-дог, выпечка', iconEmoji: '🍕',
    items: [
      { id: 'i6', name: 'Пицца-мини Маргарита', description: null, priceKopecks: 19000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i7', name: 'Хот-дог классический', description: null, priceKopecks: 15000, imageUrl: null, isHalal: false, isAvailable: true },
    ],
  },
  {
    id: 'c4', slug: 'soups', name: 'Супы', iconEmoji: '🍲',
    items: [
      { id: 'i8', name: 'Борщ', description: null, priceKopecks: 16000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i9', name: 'Грибной крем-суп', description: null, priceKopecks: 18000, imageUrl: null, isHalal: false, isAvailable: true },
    ],
  },
  {
    id: 'c5', slug: 'salads', name: 'Салаты', iconEmoji: '🥗',
    items: [
      { id: 'i10', name: 'Цезарь с курицей', description: null, priceKopecks: 22000, imageUrl: null, isHalal: false, isAvailable: true },
      { id: 'i11', name: 'Греческий', description: null, priceKopecks: 19000, imageUrl: null, isHalal: false, isAvailable: true },
    ],
  },
  {
    id: 'c6', slug: 'halal', name: 'Продукция Халяль', iconEmoji: '🌙',
    items: [
      { id: 'i12', name: 'Шаурма халяль', description: null, priceKopecks: 27000, imageUrl: null, isHalal: true, isAvailable: true },
      { id: 'i13', name: 'Люля-кебаб халяль', description: null, priceKopecks: 33000, imageUrl: null, isHalal: true, isAvailable: true },
    ],
  },
];
