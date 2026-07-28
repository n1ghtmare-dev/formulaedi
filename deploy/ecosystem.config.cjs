// PM2-конфиг для API. Запуск: pm2 start deploy/ecosystem.config.cjs
// API читает .env из корня репозитория (../../.env относительно apps/api).
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'formulaedi-api',
      cwd: path.join(__dirname, '..', 'apps', 'api'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
    },
  ],
};
