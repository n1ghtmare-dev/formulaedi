import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

/** Проверяет Bearer access-токен и кладёт пользователя в request.user. */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Требуется вход');
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access',
      });
      req.user = { userId: payload.sub, email: payload.email, role: payload.role } as AuthUser;
      return true;
    } catch {
      throw new UnauthorizedException('Недействительный или истёкший токен');
    }
  }
}
