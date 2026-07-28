export function Footer({ email, address }: { email: string; address: string }) {
  return (
    <footer className="mt-10 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="font-serif text-xl text-olive-800">Формула Еды</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            Свежая еда с доставкой до комнаты в студенческом городке МАДИ. Кэшбэк «формулами» за каждый заказ.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="font-serif text-lg">Бонусы «формулы»</h4>
          <ul className="mt-3 space-y-1.5 text-ink-soft">
            <li>+7% формулами за каждый заказ</li>
            <li>Оплата бонусами до 25% суммы</li>
            <li>Сгорают 1-го числа каждого месяца</li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="font-serif text-lg">Контакты</h4>
          <ul className="mt-3 space-y-1.5 text-ink-soft">
            <li>
              Почта:{' '}
              <a href={`mailto:${email}`} className="text-brand-500 hover:underline">
                {email}
              </a>
            </li>
            <li>Кафе: {address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1240px] px-4 py-4 font-mono text-xs text-ink-soft sm:px-6">
          ИП Богданов Андрей Сергеевич · ИНН 245727420008 · ОГРН 310245714400031
        </p>
      </div>
    </footer>
  );
}
