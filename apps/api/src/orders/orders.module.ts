import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SettingsModule } from '../settings/settings.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { JwtGuard } from '../auth/jwt.guard';

@Module({
  imports: [SettingsModule, LoyaltyModule, JwtModule.register({})],
  providers: [OrdersService, JwtGuard],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
