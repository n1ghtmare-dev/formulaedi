import { useState } from 'react';
import { formatKopecks } from '@formulaedi/shared';
import type { useCart } from '../hooks/useCart';
import { CartContents, type Delivery } from './CartContents';
import type { OrderAccepted } from '../features/orders/orderApi';

type Cart = ReturnType<typeof useCart>;

// ——— Десктоп: липкий правый рейл ———
export function DesktopCart({
  cart,
  delivery,
  setDelivery,
  onOrderAccepted,
}: {
  cart: Cart;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  onOrderAccepted: (o: OrderAccepted) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-32 rounded-[var(--radius-xl2)] border border-brand-100 bg-gradient-to-b from-brand-50 to-paper p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-serif text-2xl">Ваш чек</h3>
          {cart.count > 0 && (
            <button
              onClick={cart.clear}
              className="text-xs font-semibold text-ink-soft hover:text-danger"
            >
              очистить
            </button>
          )}
        </div>
        <CartContents
          cart={cart}
          delivery={delivery}
          setDelivery={setDelivery}
          onOrderAccepted={onOrderAccepted}
        />
      </div>
    </aside>
  );
}

// ——— Мобайл: нижняя панель + выезжающая шторка ———
export function MobileCart({
  cart,
  delivery,
  setDelivery,
  onOrderAccepted,
}: {
  cart: Cart;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  onOrderAccepted: (o: OrderAccepted) => void;
}) {
  const [open, setOpen] = useState(false);
  if (cart.count === 0) return null;

  return (
    <div className="lg:hidden">
      {/* нижняя панель */}
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3">
          <button
            onClick={() => setOpen(true)}
            className="mx-auto flex w-full max-w-md items-center gap-3 rounded-full bg-brand-500 px-5 py-3.5 text-white shadow-[var(--shadow-lift)] active:translate-y-px"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-bold tabular-nums">
              {cart.count}
            </span>
            <span className="font-bold">Корзина</span>
            <span className="ml-auto font-serif text-lg">{formatKopecks(cart.total)}</span>
          </button>
        </div>
      )}

      {/* шторка */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-olive-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative max-h-[88vh] overflow-y-auto rounded-t-[var(--radius-xl2)] bg-cream p-5 pb-8 shadow-[var(--shadow-lift)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-serif text-2xl">Ваш чек</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-line"
              >
                Закрыть
              </button>
            </div>
            <CartContents
              cart={cart}
              delivery={delivery}
              setDelivery={setDelivery}
              onOrderAccepted={(o) => {
                setOpen(false);
                onOrderAccepted(o);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
