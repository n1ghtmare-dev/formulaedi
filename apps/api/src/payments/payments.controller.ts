import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * POST-оповещение PayKeeper об оплате (публичный, server-to-server).
   * Тело — application/x-www-form-urlencoded. При успехе отвечаем строкой
   * `OK md5(id+secret)`, которую ждёт PayKeeper. При неверной подписи — 400.
   */
  @Post('paykeeper/callback')
  @HttpCode(200)
  async paykeeperCallback(@Body() body: Record<string, string>): Promise<string> {
    const ok = await this.payments.handleCallback(body);
    if (!ok) throw new BadRequestException('Invalid signature or order');
    return ok;
  }
}
