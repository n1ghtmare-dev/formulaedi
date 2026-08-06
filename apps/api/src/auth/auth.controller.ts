import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RefreshDto,
  RequestCodeDto,
  UpdateProfileDto,
  VerifyCodeDto,
} from './dto/auth.dto';
import { JwtGuard, type AuthUser } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/request-code — отправить SMS-код
  @Post('request-code')
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.requestCode(dto.phone);
  }

  // POST /api/auth/verify — подтвердить код, получить токены
  @Post('verify')
  verify(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode(dto.phone, dto.code, dto.fullName);
  }

  // POST /api/auth/refresh — обновить сессию по refresh-токену
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // GET /api/auth/me — данные текущего пользователя (кабинет)
  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  // PATCH /api/auth/me — сохранить ФИО (при регистрации)
  @Patch('me')
  @UseGuards(JwtGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.userId, dto.fullName);
  }
}
