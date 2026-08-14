import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PaykeeperService } from './paykeeper.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    private readonly paykeeper: PaykeeperService,
  ) {}

  paykeeperConfigured(): boolean {
    return this.paykeeper.isConfigured();
  }

  /**
   * Выставить счёт в PayKeeper для заказа и вернуть URL страницы оплаты.
   * Если PayKeeper не настроен (локальная разработка) — возвращаем null,
   * и фронт использует dev-подтверждение (mock-confirm).
   */
  async startPayment(orderId: string): Promise<string | null> {
    if (!this.paykeeper.isConfigured()) return null;

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { user: true, payment: true },
    });

    const { invoiceId, invoiceUrl } = await this.paykeeper.createInvoice({
      orderNumber: order.orderNumber,
      amountKopecks: order.totalKopecks,
      clientName: order.user.fullName ?? order.user.email ?? 'Клиент',
      email: order.user.email ?? '',
      phone: order.contactPhone,
      serviceName: `Заказ №${order.orderNumber} — Формула Еды`,
    });

    if (order.payment) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { provider: 'PAYKEEPER', providerPaymentId: invoiceId, confirmationUrl: invoiceUrl },
      });
    }
    return invoiceUrl;
  }

  /**
   * Обработка POST-оповещения PayKeeper. Проверяет подпись, идемпотентно помечает
   * заказ оплаченным и проводит формулы (списание + начисление 7%). Возвращает строку
   * ответа `OK md5(id+secret)` при успехе или null при неверной подписи/ошибке.
   */
  async handleCallback(body: Record<string, string>): Promise<string | null> {
    if (!this.paykeeper.verifyCallback(body)) {
      this.logger.warn('PayKeeper callback: неверная подпись');
      return null;
    }
    const orderNumber = Number(body.orderid);
    if (!Number.isInteger(orderNumber)) {
      this.logger.warn(`PayKeeper callback: некорректный orderid=${body.orderid}`);
      return null;
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });
    if (!order) {
      this.logger.warn(`PayKeeper callback: заказ №${orderNumber} не найден`);
      return null;
    }

    await this.markPaid(order.id, body);
    // Подтверждаем приём — даже если заказ уже был оплачен (дедуп внутри markPaid).
    return this.paykeeper.okResponse(body.id ?? '');
  }

  /**
   * Идемпотентно: платёж SUCCEEDED, заказ PAID, списание/начисление формул.
   * Формулы проводятся ИМЕННО при оплате (не при оформлении).
   */
  async markPaid(orderId: string, rawPayload?: Record<string, string>): Promise<boolean> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payment: true },
    });
    if (order.status === 'PAID' || order.paidAt) return false; // уже оплачен — дедуп

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // повторная проверка внутри транзакции — защита от гонки двойного оповещения
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (fresh.status === 'PAID' || fresh.paidAt) return;

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: now,
            ...(rawPayload ? { rawPayload: rawPayload as object } : {}),
          },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: 'PAID', paidAt: now } });

      await this.loyalty.spend(tx, order.userId, orderId, order.formulasSpent);
      await this.loyalty.accruePending(tx, order.userId, orderId, order.formulasToEarn, now);
    });
    return true;
  }
}
