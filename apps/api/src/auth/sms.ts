import { Logger } from '@nestjs/common';

export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  send(phone: string, text: string): Promise<void>;
}

/** Dev-режим: код пишется в лог, реальная отправка не выполняется. */
class DevSmsSender implements SmsSender {
  private readonly logger = new Logger('SMS');
  send(phone: string, text: string): Promise<void> {
    this.logger.warn(`[dev] ${phone}: ${text}`);
    return Promise.resolve();
  }
}

/** Отправка через SMS.ru (нужен SMS_RU_API_ID). */
class SmsRuSender implements SmsSender {
  private readonly logger = new Logger('SMS');
  async send(phone: string, text: string): Promise<void> {
    const apiId = process.env.SMS_RU_API_ID;
    if (!apiId) throw new Error('SMS_RU_API_ID не задан');
    const url =
      `https://sms.ru/sms/send?api_id=${apiId}` +
      `&to=${encodeURIComponent(phone)}&msg=${encodeURIComponent(text)}&json=1`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status?: string;
      status_text?: string;
      sms?: Record<string, { status?: string; status_text?: string }>;
    };
    if (data.status !== 'OK') {
      this.logger.error(`SMS.ru отказал: ${data.status_text ?? 'неизвестно'}`);
      throw new Error('Не удалось отправить SMS');
    }
  }
}

/** Фабрика провайдера по SMS_PROVIDER (dev | smsru). */
export function makeSmsSender(): SmsSender {
  return (process.env.SMS_PROVIDER ?? 'dev') === 'smsru'
    ? new SmsRuSender()
    : new DevSmsSender();
}
