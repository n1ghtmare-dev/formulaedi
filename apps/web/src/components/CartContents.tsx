import { useState } from 'react';
import { formatKopecks } from '@formulaedi/shared';
import { BUILDING_LABELS } from '@formulaedi/shared';
import { CheckCircle2 } from 'lucide-react';
import type { useCart } from '../hooks/useCart';
import { FoodImage } from './FoodImage';
import { ShoppingBag, Bike, Store } from '../lib/icons';
import { useAuth } from '../features/auth/AuthContext';
import { createOrder, confirmOrder, type OrderAccepted } from '../features/orders/orderApi';

export type Delivery = {
  type: 'DELIVERY' | 'PICKUP';
  building: 'BUILDING_1' | 'BUILDING_2';
  floor: string;
  room: string;
  phone: string;
};

type Cart = ReturnType<typeof useCart>;

export function CartContents({
  cart,
  delivery,
  setDelivery,
  onOrderAccepted,
  accepted,
}: {
  cart: Cart;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  onOrderAccepted: (order: OrderAccepted) => void;
  accepted?: OrderAccepted | null;
}) {
  const { status, refreshUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // По ТЗ: после оплаты текст «Заказ принят» дублируется в зоне чека и держится,
  // пока пользователь не начал новый заказ (не добавил позиции в пустую корзину).
  if (accepted && cart.count === 0) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
          <CheckCircle2 size={32} strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-serif text-lg text-olive-800">
            Заказ №{accepted.orderNumber} принят
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{accepted.message}</p>
        </div>
        <p className="text-xs text-ink-soft">
          Добавьте блюда из меню, чтобы оформить новый заказ.
        </p>
      </div>
    );
  }

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
  const notLoggedIn = status !== 'authed';
  const floorMissing = need && !delivery.floor.trim();
  const roomMissing = need && !delivery.room.trim();
  const phoneDigits = delivery.phone.replace(/\D/g, '').slice(-10);
  const phoneMissing = phoneDigits.length !== 10;
  const contactPhone = `+7${phoneDigits}`;
  const invalid = floorMissing || roomMissing || phoneMissing;

  const onPay = async () => {
    setPayError(null);
    // Гейтинг по ТЗ: без входа, телефона и адреса оформить нельзя
    if (notLoggedIn || invalid) {
      setShowErrors(true);
      setPayError(
        notLoggedIn
          ? 'Войдите в кабинет, чтобы оформить заказ'
          : phoneMissing
            ? 'Укажите телефон для связи'
            : 'Укажите этаж и комнату для доставки',
      );
      return;
    }
    setPaying(true);
    try {
      const order = await createOrder({
        items: cart.lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        cutleryCount: cart.cutlery,
        spendFormulas: cart.spend,
        deliveryType: delivery.type,
        building: need ? delivery.building : undefined,
        floor: need ? delivery.floor : undefined,
        room: need ? delivery.room : undefined,
        contactPhone,
      });
      const accepted = await confirmOrder(order.id);
      await refreshUser();
      onOrderAccepted(accepted);
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

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
        <Field
          placeholder="Телефон для связи"
          value={delivery.phone}
          onChange={(v) => setDelivery({ ...delivery, phone: v })}
          invalid={showErrors && phoneMissing}
        />
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
                invalid={showErrors && floorMissing}
              />
              <Field
                placeholder="Комната"
                value={delivery.room}
                onChange={(v) => setDelivery({ ...delivery, room: v })}
                invalid={showErrors && roomMissing}
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

      <button
        onClick={onPay}
        disabled={paying}
        className="w-full rounded-full bg-brand-500 py-3.5 font-bold text-white shadow-[var(--shadow-soft)] transition hover:bg-olive-600 active:translate-y-px disabled:opacity-60"
      >
        {paying ? 'Оформляем…' : `Оплатить ${formatKopecks(cart.total)} и оформить`}
      </button>

      {payError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-center text-xs font-semibold text-danger">
          {payError}
        </p>
      )}

      <p className="text-center text-xs text-ink-soft">
        {notLoggedIn
          ? 'Войдите в кабинет, чтобы оформить заказ'
          : (
            <>
              Завтра начислится <b className="text-brand-500">{cart.willEarn}</b> формул
            </>
          )}
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
  invalid,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-xl border bg-paper px-3 py-2.5 text-sm outline-none transition placeholder:text-ink-soft/60 ${
        invalid
          ? 'border-danger bg-danger-bg focus:border-danger focus:ring-2 focus:ring-danger/20'
          : 'border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
      }`}
    />
  );
}
