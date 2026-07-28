import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Vite (ESM) читает shared из исходников TS, минуя CJS-сборку
      '@formulaedi/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 6060,
    strictPort: true, // не «уползать» на другой порт, если 6060 занят — падать явно
    proxy: {
      // Проксируем API в дев-режиме, чтобы фронт ходил на /api
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
