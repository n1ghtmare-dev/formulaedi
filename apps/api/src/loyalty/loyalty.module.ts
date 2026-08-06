import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyScheduler } from './loyalty.scheduler';
import { LoyaltyController } from './loyalty.controller';
import { JwtGuard } from '../auth/jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [LoyaltyService, LoyaltyScheduler, JwtGuard],
  controllers: [LoyaltyController],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
