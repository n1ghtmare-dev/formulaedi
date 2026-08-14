import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface InvoiceParams {
  orderNumber: number;
  amountKopecks: number;
  clientName: string;
  email: string;
  phone: string;
  serviceName: string;
}

/**
 * Клиент PayKeeper (JSON API).
 *   токен:  GET  {server}/info/settings/token/      (Basic auth)
 *   счёт:   POST {server}/change/invoice/preview/    (form-urlencoded, + token)
 *   callback: POST на наш URL с подписью key = md5(id+sum+clientid+orderid+secret)
 * Все секреты — из окружения (сторонний провайдер, в репозиторий не кладём).
 */
@Injectable()
export class PaykeeperService {
  private readonly logger = new Logger(PaykeeperService.name);
  private readonly server = (process.env.PAYKEEPER_SERVER ?? '').replace(/\/$/, '');
  private readonly user = process.env.PAYKEEPER_USER ?? '';
  private readonly password = process.env.PAYKEEPER_PASSWORD ?? '';
  private readonly secret = process.env.PAYKEEPER_SECRET ?? '';

  private tokenCache: { token: string; at: number } | null = null;

  isConfigured(): boolean {
    return !!(this.server && this.user && this.password && this.secret);
  }

  private rubles(kopecks: number): string {
    return (kopecks / 100).toFixed(2);
  }

  /** Токен безопасности PayKeeper (обновляется раз в сутки — кэшируем на 12ч). */
  private async getToken(): Promise<string> {
    const fresh = this.tokenCache && Date.now() - this.tokenCache.at < 12 * 60 * 60 * 1000;
    if (fresh) return this.tokenCache!.token;

    const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');
    const res = await fetch(`${this.server}/info/settings/token/`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`PayKeeper token: HTTP ${res.status}`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error('PayKeeper token: пустой ответ');
    this.tokenCache = { token: data.token, at: Date.now() };
    return data.token;
  }

  /** Выставить счёт → вернуть { invoiceId, invoiceUrl } для редиректа на оплату. */
  async createInvoice(p: InvoiceParams): Promise<{ invoiceId: string; invoiceUrl: string }> {
    const token = await this.getToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const body = new URLSearchParams({
      pay_amount: this.rubles(p.amountKopecks),
      clientid: p.clientName,
      orderid: String(p.orderNumber),
      service_name: p.serviceName,
      client_email: p.email,
      client_phone: p.phone,
      expiry,
      token,
    });

    const res = await fetch(`${this.server}/change/invoice/preview/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`PayKeeper invoice: HTTP ${res.status}`);
    const data = (await res.json()) as { invoice_id?: string; invoice_url?: string };
    if (!data.invoice_id || !data.invoice_url) {
      throw new Error('PayKeeper invoice: нет invoice_id/invoice_url');
    }
    return { invoiceId: data.invoice_id, invoiceUrl: data.invoice_url };
  }

  /**
   * Проверка подписи POST-оповещения. Поддерживаем обе схемы PayKeeper:
   *   key  = md5(id + sum(2зн) + clientid + orderid + secret)              — по умолчанию
   *   sign = hmac_sha256(значения всех полей, отсортированных по ключу, ';') — новая
   */
  verifyCallback(body: Record<string, string>): boolean {
    if (!this.isConfigured()) return false;

    if (typeof body.key === 'string') {
      const sum = Number(body.sum ?? '').toFixed(2);
      const expected = createHash('md5')
        .update(`${body.id ?? ''}${sum}${body.clientid ?? ''}${body.orderid ?? ''}${this.secret}`)
        .digest('hex');
      return this.safeEqualHex(expected, body.key);
    }

    if (typeof body.sign === 'string') {
      const value = Object.keys(body)
        .filter((k) => k !== 'sign')
        .sort()
        .map((k) => body[k])
        .join(';');
      const expected = createHmac('sha256', this.secret).update(value).digest('hex');
      return this.safeEqualHex(expected, body.sign);
    }

    return false;
  }

  /** Ответ, который PayKeeper ждёт для подтверждения приёма оповещения. */
  okResponse(id: string): string {
    return `OK ${createHash('md5').update(`${id}${this.secret}`).digest('hex')}`;
  }

  private safeEqualHex(a: string, b: string): boolean {
    const ba = Buffer.from(a.toLowerCase(), 'utf8');
    const bb = Buffer.from((b ?? '').toLowerCase(), 'utf8');
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
