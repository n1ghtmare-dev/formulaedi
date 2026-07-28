import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_EARN_PERCENT, DEFAULT_SPEND_MAX_PERCENT } from '@formulaedi/shared';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }

  earnPercent() {
    return this.getNumber('formula_earn_percent', DEFAULT_EARN_PERCENT);
  }
  spendMaxPercent() {
    return this.getNumber('formula_spend_max_percent', DEFAULT_SPEND_MAX_PERCENT);
  }
}
