import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';
import { SMS_SENDER, makeSmsSender } from './sms';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    AuthService,
    JwtGuard,
    { provide: SMS_SENDER, useFactory: makeSmsSender },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
