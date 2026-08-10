import { useEffect, useState } from 'react';
import { Sparkles, Percent } from 'lucide-react';

// Динамический баннер из ТЗ: чередует два сообщения о «формулах».
const MESSAGES = [
  { Icon: Sparkles, text: 'Вернём 7% от заказа бонусами «формулы»' },
  { Icon: Percent, text: 'Оплатите формулами до 25% следующего заказа' },
];

export function PromoBanner() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const { Icon, text } = MESSAGES[i];

  return (
    <div className="border-b border-brand-100 bg-brand-50">
      <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold text-olive-700 sm:px-6">
        <Icon size={15} strokeWidth={2} className="shrink-0 text-brand-500" />
        {/* key меняется на каждом сообщении → перезапуск fade-анимации */}
        <span key={i} className="promo-fade">
          {text}
        </span>
      </div>
    </div>
  );
}
