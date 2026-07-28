import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  formulasToEarn,
  maxSpendableFormulas,
  type OrderSummary,
} from '@formulaedi/shared';
import { PreviewOrderDto } from './dto/preview.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Считает итог по корзине: сумма позиций, списание формул (≤25% и ≤баланс),
   * итог к оплате и сколько формул начислится (7%). Цены берём из БД —
   * клиенту нельзя доверять цену.
   */
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
    const formulaDiscountKopecks = formulasSpent * 100; // 1 формула = 1 ₽

    const totalKopecks = Math.max(0, subtotalKopecks - formulaDiscountKopecks);
    const toEarn = formulasToEarn(totalKopecks, earnPercent);

    return {
      subtotalKopecks,
      formulasSpent,
      formulaDiscountKopecks,
      totalKopecks,
      formulasToEarn: toEarn,
    };
  }
}
