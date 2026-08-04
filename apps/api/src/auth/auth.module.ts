import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, JwtGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
