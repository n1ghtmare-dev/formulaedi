import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from './jwt.guard';

/** Пропускает только пользователей с ролью ADMIN (проверяет Bearer-токен). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Требуется вход');

    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access',
      });
    } catch {
      throw new UnauthorizedException('Недействительный или истёкший токен');
    }

    if (payload.role !== 'ADMIN') {
      throw new ForbiddenException('Нужны права администратора');
    }
    req.user = { userId: payload.sub, email: payload.email, role: payload.role } as AuthUser;
    return true;
  }
}
