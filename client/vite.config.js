import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    // Source maps for CSS: DevTools shows the real file + line (e.g. StatCard.css:12) for every rule.
    css: { devSourcemap: true },
    server: {
      port: 5173,
      proxy: { '/api': { target, changeOrigin: true }, '/uploads': { target, changeOrigin: true } },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
