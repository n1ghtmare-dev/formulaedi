// PM2-конфиг для API. Запуск: pm2 start deploy/ecosystem.config.cjs
// API читает .env из корня репозитория (../../.env относительно apps/api).
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'formulaedi-api',
      cwd: path.join(__dirname, '..', 'apps', 'api'),
      // ВНИМАНИЕ: именно dist/src/main.js, а не dist/main.js.
      // В компиляцию попадает ещё и prisma/seed.ts, поэтому rootDir у tsc
      // растягивается на весь apps/api и вывод получается вложенным:
      //   dist/src/main.js  +  dist/prisma/seed.js
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
    },
  ],
};
