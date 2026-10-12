import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Сборка уходит прямо в Laravel: backend/public/app
// Порт сайта PhoneFix — 4381 (см. backend/.env, APP_URL): он не пересекается
// с VINPart (:8000) и CookBook (:4173 / dev-сервер :5173).
const API_TARGET = process.env.VITE_API_PROXY || 'http://127.0.0.1:4381'

export default defineConfig({
  plugins: [react()],
  // Сборка лежит в backend/public/app, поэтому ассеты запрашиваются как /app/assets/*
  base: '/app/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 5173 занят dev-сервером CookBook, поэтому у PhoneFix свой порт.
    port: 5273,
    strictPort: true,
    // Локально API PhoneFix живёт на 4381 (start-site.cmd).
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/storage': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/public/app',
    emptyOutDir: true,
    sourcemap: false,
  },
})
