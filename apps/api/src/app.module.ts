import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // .env лежит в корне монорепо
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    SettingsModule,
    MenuModule,
    OrdersModule,
    AuthModule,
    // TODO: PaymentsModule (ЮKassa), LoyaltyModule (начисление/сгорание через BullMQ)
  ],
  controllers: [AppController],
})
export class AppModule {}
