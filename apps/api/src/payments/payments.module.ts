import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PaymentsService } from './payments.service';
import { PaykeeperService } from './paykeeper.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [PrismaModule, LoyaltyModule],
  providers: [PaymentsService, PaykeeperService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
