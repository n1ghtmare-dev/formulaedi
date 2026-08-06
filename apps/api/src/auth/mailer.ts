import { Logger } from '@nestjs/common';

export const MAILER = Symbol('MAILER');

export interface Mailer {
  send(to: string, subject: string, link: string): Promise<void>;
}

/** Dev-режим: ссылка пишется в лог. */
class DevMailer implements Mailer {
  private readonly logger = new Logger('Mailer');
  send(to: string, subject: string, link: string): Promise<void> {
    this.logger.warn(`[dev] письмо → ${to} · ${subject}\n${link}`);
    return Promise.resolve();
  }
}

/** Отправка через внешний PHP-скрипт (MAILER_URL) — он шлёт письмо через mail(). */
class PhpMailer implements Mailer {
  private readonly logger = new Logger('Mailer');
  async send(to: string, subject: string, link: string): Promise<void> {
    const url = process.env.MAILER_URL;
    if (!url) throw new Error('MAILER_URL не задан');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.MAILER_SECRET ?? '', to, subject, link }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || data.ok === false) {
      this.logger.error(`PHP-mailer отказал: ${data.error ?? res.status}`);
      throw new Error('Не удалось отправить письмо');
    }
  }
}

export function makeMailer(): Mailer {
  return process.env.MAILER_URL ? new PhpMailer() : new DevMailer();
}
