import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type {
  AdjustFormulasDto,
  CreateCategoryDto,
  CreateItemDto,
  UpdateCategoryDto,
  UpdateItemDto,
  UpdateOrderStatusDto,
} from './admin.dto';

// Публичные поля пользователя для админки (без passwordHash и токенов).
const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  formulaBalance: true,
  isBlocked: true,
  emailConfirmed: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // ─────────── Сводка для дашборда ───────────
  async stats() {
    const [users, orders, paidAgg, activeFormulas] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { totalKopecks: true },
        where: { status: { in: ['PAID', 'PREPARING', 'DELIVERING', 'WAITING_AT_CAFE', 'COMPLETED'] } },
      }),
      this.prisma.formulaTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'ACTIVE' },
      }),
    ]);
    return {
      customers: users,
      orders,
      revenueKopecks: paidAgg._sum.totalKopecks ?? 0,
      activeFormulas: activeFormulas._sum.amount ?? 0,
    };
  }

  // ─────────── Меню: категории и позиции ───────────
  /** Полное меню для админки — все категории и позиции, включая скрытые. */
  async fullMenu() {
    return this.prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.menuCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        iconEmoji: dto.iconEmoji ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategory(id);
    return this.prisma.menuCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.ensureCategory(id);
    // Позиции удалятся каскадом (onDelete: Cascade в схеме).
    await this.prisma.menuCategory.delete({ where: { id } });
    return { ok: true };
  }

  async createItem(dto: CreateItemDto) {
    await this.ensureCategory(dto.categoryId);
    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? null,
        priceKopecks: dto.priceKopecks,
        imageUrl: dto.imageUrl ?? null,
        isHalal: dto.isHalal ?? false,
        isAvailable: dto.isAvailable ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Позиция не найдена');
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Позиция не найдена');
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureCategory(id: string) {
    const c = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Категория не найдена');
  }

  // ─────────── Заказы и оплаты ───────────
  async orders(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        items: true,
        payment: true,
        user: { select: { email: true, fullName: true } },
      },
    });
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заказ не найден');
    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status as never },
    });
  }

  // ─────────── Пользователи ───────────
  async users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: USER_SELECT,
    });
  }

  async setBlocked(id: string, isBlocked: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: USER_SELECT,
    });
  }

  // ─────────── Формулы (леджер + ручная правка) ───────────
  async formulaTransactions(userId?: string) {
    return this.prisma.formulaTransaction.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { email: true, fullName: true } } },
    });
  }

  /** Ручная корректировка баланса формул (тип ADJUST). */
  async adjustFormulas(dto: AdjustFormulasDto) {
    if (dto.amount === 0) throw new BadRequestException('Сумма не может быть 0');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('Пользователь не найден');
      const newBalance = Math.max(0, user.formulaBalance + dto.amount);
      await tx.formulaTransaction.create({
        data: {
          userId: user.id,
          type: 'ADJUST',
          status: 'ACTIVE',
          amount: dto.amount,
          balanceAfter: newBalance,
          note: dto.note ?? null,
        },
      });
      return tx.user.update({
        where: { id: user.id },
        data: { formulaBalance: newBalance },
        select: USER_SELECT,
      });
    });
  }

  // ─────────── Смена собственного пароля админа ───────────
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('Пароль не установлен');
    if (!this.auth.verifyPassword(currentPassword, user.passwordHash)) {
      throw new BadRequestException('Текущий пароль неверен');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.auth.hashPassword(newPassword) },
    });
    return { ok: true };
  }
}
