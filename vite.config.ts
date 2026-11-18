import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const isVercel = Boolean(process.env.VERCEL);
  const base = process.env.VITE_BASE ?? (isVercel ? '/' : command === 'build' ? '/smart-invoice-Billing-/' : '/');

  return {
    base,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3001',
      },
    },
    test: {
      environment: 'node',
    },
  };
});
