import { CheckCircle2 } from 'lucide-react';
import type { OrderAccepted } from './orderApi';

export function OrderAcceptedModal({
  order,
  onClose,
}: {
  order: OrderAccepted;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-olive-900/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[22px] border border-brand-100 bg-paper p-7 text-center shadow-[0_24px_70px_-24px_rgba(90,104,45,0.5)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-500">
          <CheckCircle2 size={40} strokeWidth={1.75} />
        </div>
        <h2 className="mt-4 font-serif text-2xl text-olive-800">
          Заказ №{order.orderNumber} принят
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{order.message}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-brand-500 py-3 font-bold text-white transition hover:bg-olive-600"
        >
          Новый заказ
        </button>
      </div>
    </div>
  );
}
