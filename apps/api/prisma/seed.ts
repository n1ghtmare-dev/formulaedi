import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@formulaedi.ru';
// Начальный пароль админа задан хэшем (scrypt, формат salt:hash). Сам пароль в
// репозитории НЕ хранится. Сменить пароль можно в самой админке — сид его НЕ
// перезаписывает, если пароль уже задан (bootstrap-once).
const INITIAL_ADMIN_HASH =
  '89a8042330acacb6e24c7e95a5fe6f55:ab56d130f14547846246a3960e05b4a7770f3d23032494e330b24c6df1c4d16e08ad69e4382e75a1f469dd2a94cc927db8a6fc6b5431447d15452e7ffc9eac97';

// 9 категорий из ТЗ + примеры позиций (цены в копейках).
const CATEGORIES: {
  slug: string;
  name: string;
  icon: string;
  items: { name: string; price: number; halal?: boolean; desc?: string }[];
}[] = [
  {
    slug: 'street-food',
    name: 'Стрит-фуд',
    icon: '🥙',
    items: [
      { name: 'Бургер классический', price: 32000, desc: 'Говяжья котлета, сыр, овощи' },
      { name: 'Шаурма куриная', price: 26000 },
      { name: 'Буррито с говядиной', price: 29000 },
      { name: 'Чиабатта с ветчиной', price: 24000 },
      { name: 'Пита с фалафелем', price: 22000 },
    ],
  },
  {
    slug: 'sandwiches',
    name: 'Сэндвичи',
    icon: '🥪',
    items: [
      { name: 'Сэндвич с курицей', price: 21000 },
      { name: 'Сэндвич-ролл с тунцом', price: 23000 },
      { name: 'Сэндвич-круассан с лососем', price: 27000 },
    ],
  },
  {
    slug: 'hot-snacks',
    name: 'Пицца, хот-дог, выпечка',
    icon: '🍕',
    items: [
      { name: 'Пицца-мини Маргарита', price: 19000 },
      { name: 'Пицца-мини Пепперони', price: 21000 },
      { name: 'Хот-дог классический', price: 15000 },
    ],
  },
  {
    slug: 'main-dishes',
    name: 'Вторые блюда с гарниром',
    icon: '🍛',
    items: [
      { name: 'Куриное филе с рисом', price: 28000 },
      { name: 'Котлета с картофельным пюре', price: 26000 },
      { name: 'Плов с говядиной', price: 30000 },
    ],
  },
  {
    slug: 'soups',
    name: 'Супы',
    icon: '🍲',
    items: [
      { name: 'Борщ', price: 16000 },
      { name: 'Куриный суп с лапшой', price: 15000 },
      { name: 'Грибной крем-суп', price: 18000 },
    ],
  },
  {
    slug: 'salads',
    name: 'Салаты',
    icon: '🥗',
    items: [
      { name: 'Цезарь с курицей', price: 22000 },
      { name: 'Греческий', price: 19000 },
      { name: 'Оливье', price: 17000 },
    ],
  },
  {
    slug: 'halal',
    name: 'Продукция Халяль',
    icon: '🌙',
    items: [
      { name: 'Шаурма халяль', price: 27000, halal: true },
      { name: 'Плов халяль', price: 31000, halal: true },
      { name: 'Люля-кебаб халяль', price: 33000, halal: true },
    ],
  },
  {
    slug: 'desserts',
    name: 'Сдобная выпечка, десерты, кукис',
    icon: '🍪',
    items: [
      { name: 'Кукис шоколадный', price: 12000 },
      { name: 'Круассан с шоколадом', price: 14000 },
      { name: 'Чизкейк', price: 20000 },
    ],
  },
  {
    slug: 'drinks',
    name: 'Напитки',
    icon: '🥤',
    items: [
      { name: 'Кофе латте', price: 16000 },
      { name: 'Чай чёрный', price: 8000 },
      { name: 'Лимонад', price: 12000 },
    ],
  },
];

const SETTINGS: Record<string, string> = {
  work_hours_from: '09:00',
  work_hours_to: '23:00',
  contact_email: 'info@formulaedi.ru',
  cafe_address: 'Кочновский проезд, д.7 к.1, этаж 1',
  formula_earn_percent: '7',
  formula_spend_max_percent: '25',
};

async function main() {
  console.log('🌱 Seeding…');

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const c = CATEGORIES[ci];
    const category = await prisma.menuCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconEmoji: c.icon, sortOrder: ci },
      create: { slug: c.slug, name: c.name, iconEmoji: c.icon, sortOrder: ci },
    });

    for (let ii = 0; ii < c.items.length; ii++) {
      const it = c.items[ii];
      const existing = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: it.name },
      });
      const data = {
        categoryId: category.id,
        name: it.name,
        description: it.desc ?? null,
        priceKopecks: it.price,
        isHalal: it.halal ?? false,
        sortOrder: ii,
      };
      if (existing) await prisma.menuItem.update({ where: { id: existing.id }, data });
      else await prisma.menuItem.create({ data });
    }
  }

  // Админ. Пароль ставим только если его ещё нет — смену в панели не затираем.
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        fullName: 'Администратор',
        role: 'ADMIN',
        emailConfirmed: true,
        passwordHash: INITIAL_ADMIN_HASH,
      },
    });
    console.log(`✅ Админ ${ADMIN_EMAIL} создан с начальным паролем`);
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        role: 'ADMIN',
        emailConfirmed: true,
        passwordHash: admin.passwordHash ?? INITIAL_ADMIN_HASH,
      },
    });
    console.log(
      admin.passwordHash
        ? `✅ Админ ${ADMIN_EMAIL}: пароль сохранён (задан ранее)`
        : `✅ Админу ${ADMIN_EMAIL} выставлен начальный пароль`,
    );
  }

  const cats = await prisma.menuCategory.count();
  const items = await prisma.menuItem.count();
  console.log(`✅ Готово: категорий ${cats}, позиций ${items}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
