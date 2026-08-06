import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const MAILER = Symbol('MAILER');

export interface Mailer {
  send(to: string, subject: string, link: string): Promise<void>;
}

/** Находит deploy/mailer.php относительно рантайма (prod: apps/api/dist/src → корень). */
function findMailerScript(): string | null {
  const candidates = [
    join(__dirname, '..', '..', '..', 'deploy', 'mailer.php'),
    join(process.cwd(), 'deploy', 'mailer.php'),
    join(process.cwd(), '..', '..', 'deploy', 'mailer.php'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Отправка письма локальным PHP-скриптом (deploy/mailer.php через `php` CLI),
 * данные — на stdin. Без URL/секретов: это локальный запуск процесса.
 * В dev (NODE_ENV !== production) или если php/скрипт не найдены — ссылка пишется в лог,
 * а сам запрос не падает (токен уже сохранён, можно повторить).
 */
class DefaultMailer implements Mailer {
  private readonly logger = new Logger('Mailer');

  send(to: string, subject: string, link: string): Promise<void> {
    const script = findMailerScript();
    if (process.env.NODE_ENV !== 'production' || !script) {
      this.logger.warn(`[dev] письмо → ${to} · ${subject}\n${link}`);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const cp = execFile('php', [script], { timeout: 15000 }, (err, _stdout, stderr) => {
        if (err) this.logger.error(`PHP-mailer: ${stderr || err.message}`);
        resolve(); // письмо не должно ронять запрос
      });
      cp.stdin?.write(JSON.stringify({ to, subject, link }));
      cp.stdin?.end();
    });
  }
}

export function makeMailer(): Mailer {
  return new DefaultMailer();
}
