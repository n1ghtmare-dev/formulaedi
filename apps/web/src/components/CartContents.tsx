import { formatKopecks } from '@formulaedi/shared';
import { BUILDING_LABELS } from '@formulaedi/shared';
import type { useCart } from '../hooks/useCart';
import { FoodImage } from './FoodImage';
import { ShoppingBag, Bike, Store } from '../lib/icons';

export type Delivery = {
  type: 'DELIVERY' | 'PICKUP';
  building: 'BUILDING_1' | 'BUILDING_2';
  floor: string;
  room: string;
};

type Cart = ReturnType<typeof useCart>;

export function CartContents({
  cart,
  delivery,
  setDelivery,
}: {
  cart: Cart;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
}) {
  if (cart.count === 0) {
    return (
      <div className="rounded-2xl bg-brand-50 px-5 py-10 text-center">
        <ShoppingBag size={34} strokeWidth={1.5} className="mx-auto text-brand-400" />
        <p className="mt-3 font-serif text-lg text-olive-800">Корзина пуста</p>
        <p className="mt-1 text-sm text-ink-soft">Выберите блюда из меню слева.</p>
      </div>
    );
  }

  const need = delivery.type === 'DELIVERY';

  return (
    <div className="space-y-5">
      {/* Позиции */}
      <ul className="space-y-3">
        {cart.lines.map(({ item, qty, slug }) => (
          <li key={item.id} className="flex items-center gap-3">
            <FoodImage slug={slug} src={item.imageUrl} iconSize={20} className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-olive-800">{item.name}</div>
              <div className="text-xs text-ink-soft">{formatKopecks(item.priceKopecks)}</div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-brand-50 p-1">
              <button
                onClick={() => cart.sub(item.id)}
                className="grid h-7 w-7 place-items-center rounded-full bg-paper font-bold text-olive-700 shadow-sm active:scale-90"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
              <button
                onClick={() => cart.add(item.id)}
                className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 font-bold text-white shadow-sm active:scale-90"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Приборы + формулы */}
      <div className="space-y-2.5 border-t border-line pt-4">
        <Row label="Приборы">
          <Stepper value={cart.cutlery} onChange={cart.setCutlery} />
        </Row>
        <Row label={`Списать формулы`} hint={`доступно ${cart.maxSpend}`}>
          <div className="flex items-center gap-2">
            <Stepper value={cart.spend} onChange={cart.setSpend} max={cart.maxSpend} />
            {cart.maxSpend > 0 && (
              <button
                onClick={() => cart.setSpend(cart.maxSpend)}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-olive-700"
              >
                макс
              </button>
            )}
          </div>
        </Row>
      </div>

      {/* Доставка */}
      <div className="space-y-3 border-t border-line pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Toggle active={need} onClick={() => setDelivery({ ...delivery, type: 'DELIVERY' })}>
            <Bike size={16} strokeWidth={1.75} /> Доставка
          </Toggle>
          <Toggle active={!need} onClick={() => setDelivery({ ...delivery, type: 'PICKUP' })}>
            <Store size={16} strokeWidth={1.75} /> Самовывоз
          </Toggle>
        </div>
        {need && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(['BUILDING_1', 'BUILDING_2'] as const).map((b) => (
                <Toggle
                  key={b}
                  active={delivery.building === b}
                  onClick={() => setDelivery({ ...delivery, building: b })}
                >
                  {BUILDING_LABELS[b]}
                </Toggle>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                placeholder="Этаж"
                value={delivery.floor}
                onChange={(v) => setDelivery({ ...delivery, floor: v })}
              />
              <Field
                placeholder="Комната"
                value={delivery.room}
                onChange={(v) => setDelivery({ ...delivery, room: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Итоги */}
      <div className="space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-soft">Сумма</span>
          <span>{formatKopecks(cart.subtotal)}</span>
        </div>
        {cart.discount > 0 && (
          <div className="flex justify-between text-brand-500">
            <span>Списано формул</span>
            <b>−{formatKopecks(cart.discount)}</b>
          </div>
        )}
        <div className="flex items-baseline justify-between pt-1 font-serif text-xl text-olive-800">
          <span>Итого</span>
          <span>{formatKopecks(cart.total)}</span>
        </div>
      </div>

      <button className="w-full rounded-full bg-brand-500 py-3.5 font-bold text-white shadow-[var(--shadow-soft)] transition hover:bg-olive-600 active:translate-y-px">
        Оплатить {formatKopecks(cart.total)}
      </button>
      <p className="text-center text-xs text-ink-soft">
        Завтра начислится <b className="text-brand-500">{cart.willEarn}</b> формул
      </p>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        {label}
        {hint && <span className="ml-1 text-xs text-ink-soft">· {hint}</span>}
      </span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  const clamp = (n: number) => Math.max(0, max != null ? Math.min(max, n) : n);
  return (
    <div className="flex items-center gap-1 rounded-full bg-brand-50 p-1">
      <button
        onClick={() => onChange(clamp(value - 1))}
        className="grid h-7 w-7 place-items-center rounded-full bg-paper font-bold text-olive-700 shadow-sm active:scale-90"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(clamp(value + 1))}
        className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 font-bold text-white shadow-sm active:scale-90"
      >
        +
      </button>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-olive-700 text-white shadow-[var(--shadow-soft)]'
          : 'bg-paper text-olive-700 ring-1 ring-line hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition placeholder:text-ink-soft/60 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
    />
  );
}
