import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfNextDay, nextBurnDate } from '@formulaedi/shared';

/**
 * Операции с бонусным леджером «формул». Все методы принимают клиента транзакции (tx),
 * чтобы вызываться внутри prisma.$transaction атомарно с созданием заказа.
 * Баланс пользователя (user.formulaBalance) — денормализованный кэш активных формул.
 */
@Injectable()
export class LoyaltyService {
  /** Списание формул при заказе: запись SPEND и уменьшение баланса. */
  async spend(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    await tx.formulaTransaction.create({
      data: {
        userId,
        orderId,
        type: 'SPEND',
        status: 'SPENT',
        amount: -amount,
        note: 'Списание при оформлении заказа',
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { formulaBalance: { decrement: amount } },
    });
  }

  /**
   * Начисление 7% за заказ: запись EARN со статусом PENDING.
   * Станет доступной «завтра» (availableAt) и сгорит 1-го числа следующего месяца (expiresAt).
   * Баланс НЕ трогаем до активации планировщиком.
   */
  async accruePending(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    amount: number,
    now: Date,
  ): Promise<void> {
    if (amount <= 0) return;
    await tx.formulaTransaction.create({
      data: {
        userId,
        orderId,
        type: 'EARN',
        status: 'PENDING',
        amount,
        availableAt: startOfNextDay(now),
        expiresAt: nextBurnDate(now),
        note: 'Начисление 7% за заказ (станет доступно завтра)',
      },
    });
  }
}
