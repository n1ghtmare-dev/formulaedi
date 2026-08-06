import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokens, UserDTO } from '@formulaedi/shared';
import { MAILER, type Mailer } from './mailer';

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toDto(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      emailConfirmed: user.emailConfirmed,
      phone: user.phone,
      fullName: user.fullName,
      formulaBalance: user.formulaBalance,
    };
  }

  /** Мгновенный вход по почте: находим или создаём пользователя и сразу выдаём токены. */
  async login(
    rawEmail: string,
    fullName?: string,
  ): Promise<AuthTokens & { user: UserDTO; isNew: boolean }> {
    const email = this.normalizeEmail(rawEmail);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const isNew = !existing;
    const user =
      existing ??
      (await this.prisma.user.create({
        data: { email, fullName: fullName?.trim() || null },
      }));

    const tokens = await this.issueTokens(user.id, email, user.role);
    return { ...tokens, isNew, user: this.toDto(user) };
  }

  /** Данные текущего пользователя для личного кабинета. */
  async me(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toDto(user);
  }

  /** Обновить ФИО. */
  async updateProfile(userId: string, fullName: string): Promise<UserDTO> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: fullName.trim() },
    });
    return this.toDto(user);
  }

  /**
   * Отправить письмо со ссылкой подтверждения почты (через PHP-mailer).
   * В dev возвращает ссылку, чтобы можно было подтвердить без реальной почты.
   */
  async sendConfirmation(userId: string): Promise<{ sent: boolean; devLink?: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.email) throw new BadRequestException('У аккаунта нет почты');
    if (user.emailConfirmed) return { sent: true };

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailTokenHash: this.hash(token),
        emailTokenExp: new Date(Date.now() + CONFIRM_TTL_MS),
      },
    });

    const base = process.env.PUBLIC_URL ?? process.env.WEB_ORIGIN ?? 'https://formulaedi.ru';
    const link = `${base}/api/auth/confirm-email?token=${token}`;
    await this.mailer.send(
      user.email,
      'Подтверждение почты — Формула Еды',
      link,
    );

    const isDev = !process.env.MAILER_URL;
    return { sent: true, ...(isDev ? { devLink: link } : {}) };
  }

  /** Подтвердить почту по токену из письма. */
  async confirmEmail(token: string): Promise<{ ok: boolean }> {
    if (!token) throw new BadRequestException('Нет токена');
    const user = await this.prisma.user.findFirst({
      where: { emailTokenHash: this.hash(token) },
    });
    if (!user || !user.emailTokenExp || user.emailTokenExp < new Date()) {
      throw new BadRequestException('Ссылка недействительна или истекла');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailConfirmed: true, emailTokenHash: null, emailTokenExp: null },
    });
    return { ok: true };
  }

  /** Обновление сессии по refresh-токену (с ротацией). */
  async refresh(rawRefresh: string): Promise<AuthTokens & { user: UserDTO }> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawRefresh) },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Сессия истекла, войдите заново');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(user.id, user.email ?? '', user.role);
    return { ...tokens, user: this.toDto(user) };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access',
      expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as unknown as number,
    });
    const refreshToken = randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}
