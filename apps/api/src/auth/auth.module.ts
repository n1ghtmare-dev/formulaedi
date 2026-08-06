import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';
import { MAILER, makeMailer } from './mailer';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    AuthService,
    JwtGuard,
    { provide: MAILER, useFactory: makeMailer },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
