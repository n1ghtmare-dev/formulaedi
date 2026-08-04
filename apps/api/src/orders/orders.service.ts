import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import {
  computeOrderTotals,
  formulasToEarn,
  maxSpendableFormulas,
  type OrderSummary,
  type PricedLine,
} from '@formulaedi/shared';
import { PreviewOrderDto } from './dto/preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';

// Текст окна после оформления (из ТЗ).
const ORDER_ACCEPTED_TEXT =
  'Ваш заказ №%N% принят, спешим доставить! Курьер попросит Вас назвать номер телефона, ' +
  'на который оформлен заказ. Если курьер не встретится с Вами по Вашей причине, заказ будет ' +
  'ждать Вас в кафе «Формула Еды» в общежитии МАДИ по адресу: %ADDR%.';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Расчёт корзины без создания заказа (для «живого чека»). */
  async preview(dto: PreviewOrderDto): Promise<OrderSummary> {
    const ids = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: ids }, isAvailable: true },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    let subtotalKopecks = 0;
    for (const line of dto.items) {
      const item = byId.get(line.menuItemId);
      if (!item) throw new BadRequestException(`Позиция ${line.menuItemId} недоступна`);
      subtotalKopecks += item.priceKopecks * line.quantity;
    }

    const [earnPercent, spendMaxPercent] = await Promise.all([
      this.settings.earnPercent(),
      this.settings.spendMaxPercent(),
    ]);

    const balance = dto.formulaBalance ?? 0;
    const requested = dto.spendFormulas ?? 0;
    const allowed = maxSpendableFormulas(subtotalKopecks, balance, spendMaxPercent);
    const formulasSpent = Math.min(requested, allowed);
    const formulaDiscountKopecks = formulasSpent * 100;
    const totalKopecks = Math.max(0, subtotalKopecks - formulaDiscountKopecks);

    return {
      subtotalKopecks,
      formulasSpent,
      formulaDiscountKopecks,
      totalKopecks,
      formulasToEarn: formulasToEarn(totalKopecks, earnPercent),
    };
  }

  /**
   * Создание заказа: пересчёт по ценам БД, списание формул, начисление 7% «завтра».
   * Всё атомарно в транзакции. Оплата пока в статусе PENDING (заглушка mock-confirm
   * до подключения ЮKassa).
   */
  async create(userId: string, dto: CreateOrderDto) {
    // 1. Цены и названия — из БД
    const ids = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: ids }, isAvailable: true },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    const lines: PricedLine[] = dto.items.map((line) => {
      const item = byId.get(line.menuItemId);
      if (!item) throw new BadRequestException(`Позиция ${line.menuItemId} недоступна`);
      return {
        menuItemId: item.id,
        nameSnapshot: item.name,
        priceKopecks: item.priceKopecks,
        quantity: line.quantity,
        lineTotalKopecks: item.priceKopecks * line.quantity,
      };
    });

    // 2. Адрес обязателен для доставки
    if (dto.deliveryType === 'DELIVERY') {
      if (!dto.building || !dto.floor?.trim() || !dto.room?.trim()) {
        throw new BadRequestException('Укажите корпус, этаж и комнату для доставки');
      }
    }

    // 3. Ставки и баланс
    const [earnPercent, spendMaxPercent, user] = await Promise.all([
      this.settings.earnPercent(),
      this.settings.spendMaxPercent(),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);

    // 4. Итоги
    const totals = computeOrderTotals(
      lines,
      dto.spendFormulas ?? 0,
      user.formulaBalance,
      earnPercent,
      spendMaxPercent,
    );

    const now = new Date();

    // 5. Транзакция: заказ + позиции + платёж + леджер
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          contactPhone: dto.contactPhone,
          status: 'AWAITING_PAYMENT',
          deliveryType: dto.deliveryType,
          building: dto.deliveryType === 'DELIVERY' ? dto.building : null,
          floor: dto.deliveryType === 'DELIVERY' ? dto.floor : null,
          room: dto.deliveryType === 'DELIVERY' ? dto.room : null,
          subtotalKopecks: totals.subtotalKopecks,
          cutleryCount: dto.cutleryCount ?? 0,
          formulasSpent: totals.formulasSpent,
          formulaDiscountKopecks: totals.formulaDiscountKopecks,
          totalKopecks: totals.totalKopecks,
          formulasToEarn: totals.formulasToEarn,
          items: {
            create: lines.map((l) => ({
              menuItemId: l.menuItemId,
              nameSnapshot: l.nameSnapshot,
              priceKopecks: l.priceKopecks,
              quantity: l.quantity,
              lineTotalKopecks: l.lineTotalKopecks,
            })),
          },
          payment: {
            create: {
              provider: 'YOOKASSA',
              status: 'PENDING',
              amountKopecks: totals.totalKopecks,
            },
          },
        },
      });

      await this.loyalty.spend(tx, userId, created.id, totals.formulasSpent);
      await this.loyalty.accruePending(tx, userId, created.id, totals.formulasToEarn, now);

      return created;
    });

    return this.toDto(order);
  }

  /** Заказ по id (только владельцу) с позициями. */
  async getById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.userId !== userId) throw new ForbiddenException('Нет доступа к заказу');
    return { ...this.toDto(order), items: order.items };
  }

  /** История заказов пользователя. */
  async listMine(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return orders.map((o) => ({ ...this.toDto(o), items: o.items }));
  }

  /**
   * ЗАГЛУШКА оплаты (до ЮKassa): помечает платёж SUCCEEDED и заказ PAID.
   * Начисленные формулы остаются PENDING и активируются планировщиком «завтра».
   * Возвращает данные для окна «Ваш заказ №___ принят…».
   */
  async mockConfirm(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.userId !== userId) throw new ForbiddenException('Нет доступа к заказу');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'SUCCEEDED', paidAt: now },
        });
      }
      await tx.order.update({ where: { id }, data: { status: 'PAID', paidAt: now } });
    });

    const address = await this.settings
      .getAll()
      .then((s) => s.cafe_address ?? 'Кочновский проезд, д.7 к.1, этаж 1');

    return {
      orderNumber: order.orderNumber,
      status: 'PAID',
      message: ORDER_ACCEPTED_TEXT.replace('%N%', String(order.orderNumber)).replace(
        '%ADDR%',
        address,
      ),
    };
  }

  private toDto(o: {
    id: string;
    orderNumber: number;
    status: string;
    subtotalKopecks: number;
    formulasSpent: number;
    formulaDiscountKopecks: number;
    totalKopecks: number;
    formulasToEarn: number;
    createdAt: Date;
  }) {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      subtotalKopecks: o.subtotalKopecks,
      formulasSpent: o.formulasSpent,
      formulaDiscountKopecks: o.formulaDiscountKopecks,
      totalKopecks: o.totalKopecks,
      formulasToEarn: o.formulasToEarn,
      createdAt: o.createdAt.toISOString(),
    };
  }
}
