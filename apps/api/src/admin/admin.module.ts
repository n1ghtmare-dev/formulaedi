import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  imports: [PrismaModule, AuthModule, JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
