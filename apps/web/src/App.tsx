import { useEffect, useMemo, useRef, useState } from 'react';
import type { MenuCategoryDTO, MenuItemDTO } from '@formulaedi/shared';
import { fetchMenu, fetchSettings } from './api';
import { useCart } from './hooks/useCart';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { CategoryNav } from './components/CategoryNav';
import { MenuSection } from './components/MenuSection';
import { DesktopCart, MobileCart } from './components/Cart';
import type { Delivery } from './components/CartContents';
import { Footer } from './components/Footer';

const DEMO_BALANCE = 777; // как в ТЗ: «у вас 777 формул»

export function App() {
  const [menu, setMenu] = useState<MenuCategoryDTO[]>([]);
  const [live, setLive] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [active, setActive] = useState('');
  const [delivery, setDelivery] = useState<Delivery>({
    type: 'DELIVERY',
    building: 'BUILDING_1',
    floor: '',
    room: '',
  });

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const visible = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchMenu().then((r) => {
      setMenu(r.menu);
      setLive(r.live);
      setActive(r.menu[0]?.slug ?? '');
    });
    fetchSettings().then(setSettings);
  }, []);

  // Индексы позиций → для корзины
  const { itemsById, slugByItem } = useMemo(() => {
    const byId = new Map<string, MenuItemDTO>();
    const slugById = new Map<string, string>();
    menu.forEach((c) => c.items.forEach((i) => { byId.set(i.id, i); slugById.set(i.id, c.slug); }));
    return { itemsById: byId, slugByItem: slugById };
  }, [menu]);

  const cart = useCart(itemsById, slugByItem, DEMO_BALANCE);

  // Скроллспай: активная категория по положению секций
  useEffect(() => {
    if (menu.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const slug = (e.target as HTMLElement).dataset.section!;
          visible.current.set(slug, e.isIntersecting);
        });
        const firstVisible = menu.find((c) => visible.current.get(c.slug));
        if (firstVisible) setActive(firstVisible.slug);
      },
      { rootMargin: '-150px 0px -55% 0px', threshold: 0 },
    );
    sectionRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [menu]);

  const registerRef = (slug: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(slug, el);
  };

  const scrollTo = (slug: string) => {
    setActive(slug);
    sectionRefs.current.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const workHours =
    settings.work_hours_from && settings.work_hours_to
      ? `${settings.work_hours_from}–${settings.work_hours_to}`
      : 'ежедневно';

  return (
    <div className="min-h-[100dvh] pb-24 lg:pb-0">
      <TopBar balance={DEMO_BALANCE} workHours={workHours} />
      <Hero onBrowse={() => scrollTo(menu[0]?.slug ?? '')} />
      <CategoryNav categories={menu} active={active} onPick={scrollTo} />

      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-14">
          {!live && (
            <p className="rounded-xl border border-wood-500/40 bg-wood-100 px-4 py-3 text-sm text-[#7a5730]">
              Демо-режим: показано примерное меню. Запустите API — данные подтянутся из базы.
            </p>
          )}
          {menu.map((cat) => (
            <MenuSection
              key={cat.id}
              category={cat}
              qtys={cart.qtys}
              onAdd={cart.add}
              onSub={cart.sub}
              registerRef={registerRef}
            />
          ))}
        </div>

        <DesktopCart cart={cart} delivery={delivery} setDelivery={setDelivery} />
      </main>

      <Footer
        email={settings.contact_email ?? 'info@formulaedi.ru'}
        address={settings.cafe_address ?? 'Кочновский проезд, д.7 к.1, этаж 1'}
      />

      <MobileCart cart={cart} delivery={delivery} setDelivery={setDelivery} />
    </div>
  );
}
