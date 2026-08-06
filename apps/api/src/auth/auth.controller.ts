import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtGuard, type AuthUser } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/login — мгновенный вход/регистрация по почте
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.fullName);
  }

  // POST /api/auth/refresh — обновить сессию
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // GET /api/auth/me — данные пользователя
  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  // PATCH /api/auth/me — сохранить ФИО
  @Patch('me')
  @UseGuards(JwtGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.userId, dto.fullName);
  }

  // POST /api/auth/send-confirmation — отправить письмо со ссылкой подтверждения
  @Post('send-confirmation')
  @UseGuards(JwtGuard)
  sendConfirmation(@CurrentUser() user: AuthUser) {
    return this.auth.sendConfirmation(user.userId);
  }

  // GET /api/auth/confirm-email?token= — подтвердить почту по ссылке из письма
  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string, @Res() res: Response) {
    const base = process.env.PUBLIC_URL ?? process.env.WEB_ORIGIN ?? '/';
    try {
      await this.auth.confirmEmail(token);
      res.redirect(302, `${base}/?email=confirmed`);
    } catch {
      res.redirect(302, `${base}/?email=error`);
    }
  }
}
