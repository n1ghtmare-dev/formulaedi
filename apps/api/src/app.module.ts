import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';

/**
 * Собранная витрина (apps/web/dist). На проде Nginx настроен как обратный прокси
 * на этот процесс и файлов с диска сам не отдаёт — значит статику раздаём мы.
 *
 * Путь ищем перебором, потому что __dirname отличается:
 *   прод (nest build) → apps/api/dist/src   — три уровня вверх
 *   dev  (nest start) → apps/api/src        — два уровня вверх
 */
const WEB_DIST =
  process.env.WEB_DIST_PATH ??
  [
    join(__dirname, '..', '..', '..', 'web', 'dist'),
    join(__dirname, '..', '..', 'web', 'dist'),
  ].find((p) => existsSync(join(p, 'index.html')));

@Module({
  imports: [
    // .env лежит в корне монорепо
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),

    // Витрину раздаём только если она собрана. В локальной разработке её нет —
    // там фронт поднимает Vite на своём порту, и модуль просто не подключается.
    ...(WEB_DIST
      ? [
          ServeStaticModule.forRoot({
            rootPath: WEB_DIST,
            // Всё под /api — это маршруты Nest, отдавать вместо них index.html нельзя.
            // Синтаксис именованного wildcard — path-to-regexp v8 (Nest 11).
            exclude: ['/api/{*path}'],
          }),
        ]
      : []),

    PrismaModule,
    SettingsModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
