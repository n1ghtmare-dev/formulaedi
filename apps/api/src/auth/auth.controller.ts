import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AdminLoginDto, LoginDto, RefreshDto, UpdateProfileDto } from './dto/auth.dto';
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

  // POST /api/auth/admin-login — вход в админку (почта + пароль, роль ADMIN)
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
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
  sendConfirmation(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.auth.sendConfirmation(user.userId, baseUrl(req));
  }

  // GET /api/auth/confirm-email?token= — подтвердить почту по ссылке из письма
  @Get('confirm-email')
  async confirmEmail(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const base = baseUrl(req);
    try {
      await this.auth.confirmEmail(token);
      res.redirect(302, `${base}/?email=confirmed`);
    } catch {
      res.redirect(302, `${base}/?email=error`);
    }
  }
}

/** Базовый URL из запроса (учитывает Nginx X-Forwarded-Proto). */
function baseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  return `${proto}://${req.get('host')}`;
}
