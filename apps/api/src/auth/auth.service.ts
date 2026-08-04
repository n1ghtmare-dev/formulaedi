import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokens, UserDTO } from '@formulaedi/shared';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Приводит телефон к формату +7XXXXXXXXXX. */
  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const ten = digits.slice(-10);
    return `+7${ten}`;
  }

  /** Данные текущего пользователя для личного кабинета. */
  async me(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      formulaBalance: user.formulaBalance,
    };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Шаг 1: сгенерировать и «отправить» код. */
  async requestCode(rawPhone: string): Promise<{ sent: true; devCode?: string }> {
    const phone = this.normalizePhone(rawPhone);
    const code = String(randomInt(1000, 9999));
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.verificationCode.create({
      data: { phone, codeHash: this.hash(code), expiresAt },
    });

    // TODO: интеграция SMS.ru / SMSC. Пока dev-режим — код в лог.
    const provider = process.env.SMS_PROVIDER ?? 'dev';
    if (provider === 'dev') {
      this.logger.warn(`SMS-код для ${phone}: ${code}`);
      return { sent: true, devCode: code };
    }
    return { sent: true };
  }

  /** Шаг 2: проверить код, создать/найти пользователя, выдать токены. */
  async verifyCode(
    rawPhone: string,
    code: string,
    fullName?: string,
  ): Promise<AuthTokens & { user: UserDTO; isNew: boolean }> {
    const phone = this.normalizePhone(rawPhone);
    const record = await this.prisma.verificationCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('Код не запрашивался');
    if (record.expiresAt < new Date()) throw new BadRequestException('Код истёк');
    if (record.attempts >= MAX_ATTEMPTS)
      throw new BadRequestException('Превышено число попыток');

    if (record.codeHash !== this.hash(code)) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Неверный код');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    const isNew = !existing;
    const user = existing
      ? existing
      : await this.prisma.user.create({ data: { phone, fullName: fullName ?? null } });

    const tokens = await this.issueTokens(user.id, user.phone, user.role);

    return {
      ...tokens,
      isNew,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        formulaBalance: user.formulaBalance,
      },
    };
  }

  private async issueTokens(
    userId: string,
    phone: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, phone, role };
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
