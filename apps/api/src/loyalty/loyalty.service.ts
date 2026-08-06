import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfNextDay, nextBurnDate } from '@formulaedi/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Операции с бонусным леджером «формул». Методы spend/accruePending принимают клиента
 * транзакции (tx) — вызываются внутри создания заказа. Методы планировщика (activateDue,
 * burnMonthly) работают самостоятельно. Баланс user.formulaBalance — денормализованный кэш.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}
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

  /** Активировать отложенные начисления, у которых наступил availableAt («завтра»). */
  async activateDue(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.formulaTransaction.findMany({
      where: { type: 'EARN', status: 'PENDING', availableAt: { lte: now } },
    });
    for (const t of due) {
      await this.prisma.$transaction(async (tx) => {
        await tx.formulaTransaction.update({ where: { id: t.id }, data: { status: 'ACTIVE' } });
        await tx.user.update({
          where: { id: t.userId },
          data: { formulaBalance: { increment: t.amount } },
        });
      });
    }
    return due.length;
  }

  /**
   * Сгорание 1-го числа: весь неиспользованный баланс обнуляется (по ТЗ). Идемпотентно —
   * не более одного раза в календарный месяц (отметка в settings.last_burn_month),
   * и только 1–2 числа.
   */
  async burnMonthly(now: Date = new Date()): Promise<number> {
    if (now.getDate() > 2) return 0;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const last = await this.prisma.setting.findUnique({ where: { key: 'last_burn_month' } });
    if (last?.value === monthKey) return 0;

    const users = await this.prisma.user.findMany({ where: { formulaBalance: { gt: 0 } } });
    for (const u of users) {
      await this.prisma.$transaction(async (tx) => {
        await tx.formulaTransaction.create({
          data: {
            userId: u.id,
            type: 'BURN',
            status: 'BURNED',
            amount: -u.formulaBalance,
            note: 'Сгорание неиспользованных формул (1-е число)',
          },
        });
        await tx.formulaTransaction.updateMany({
          where: { userId: u.id, status: 'ACTIVE' },
          data: { status: 'BURNED' },
        });
        await tx.user.update({ where: { id: u.id }, data: { formulaBalance: 0 } });
      });
    }
    await this.prisma.setting.upsert({
      where: { key: 'last_burn_month' },
      update: { value: monthKey },
      create: { key: 'last_burn_month', value: monthKey },
    });
    return users.length;
  }

  /** Сводка для баннера: баланс и дата ближайшего сгорания. */
  async getSummary(userId: string): Promise<{ balance: number; burnAt: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { balance: user.formulaBalance, burnAt: nextBurnDate().toISOString() };
  }
}
