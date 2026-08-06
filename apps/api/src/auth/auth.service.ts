import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokens, UserDTO } from '@formulaedi/shared';
import { SMS_SENDER, type SmsSender } from './sms';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
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

    await this.sms.send(phone, `Ваш код для входа в «Формула Еды»: ${code}`);

    // В dev-режиме возвращаем код, чтобы показать его в интерфейсе.
    const isDev = (process.env.SMS_PROVIDER ?? 'dev') !== 'smsru';
    return { sent: true, ...(isDev ? { devCode: code } : {}) };
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

  /** Обновить ФИО пользователя (ввод при регистрации). */
  async updateProfile(userId: string, fullName: string): Promise<UserDTO> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: fullName.trim() },
    });
    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      formulaBalance: user.formulaBalance,
    };
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
    const tokens = await this.issueTokens(user.id, user.phone, user.role);
    return {
      ...tokens,
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
