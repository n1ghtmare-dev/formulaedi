import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { JwtGuard } from '../auth/jwt.guard';

@Module({
  imports: [SettingsModule, PaymentsModule, JwtModule.register({})],
  providers: [OrdersService, JwtGuard],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
