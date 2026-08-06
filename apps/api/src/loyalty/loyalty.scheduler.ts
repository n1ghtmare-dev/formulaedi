import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

/**
 * Планировщик формул без внешних зависимостей: каждые 30 минут проверяет
 * отложенные начисления (активирует «завтрашние») и сгорание 1-го числа.
 * Обе операции идемпотентны и управляются датами в БД, поэтому частый запуск безопасен.
 * Для одного инстанса API (PM2) этого достаточно.
 */
@Injectable()
export class LoyaltyScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Loyalty');
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly loyalty: LoyaltyService) {}

  onModuleInit() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 30 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    try {
      const now = new Date();
      const activated = await this.loyalty.activateDue(now);
      const burnedUsers = await this.loyalty.burnMonthly(now);
      if (activated || burnedUsers) {
        this.logger.log(
          `Формулы: активировано начислений ${activated}, сгорело у ${burnedUsers} пользователей`,
        );
      }
    } catch (e) {
      this.logger.error('Ошибка планировщика формул', e as Error);
    }
  }
}
