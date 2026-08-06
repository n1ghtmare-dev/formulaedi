import { Controller, Get, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtGuard, type AuthUser } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  // GET /api/loyalty/summary — баланс + дата сгорания (для баннера)
  @Get('summary')
  @UseGuards(JwtGuard)
  summary(@CurrentUser() user: AuthUser) {
    return this.loyalty.getSummary(user.userId);
  }
}
