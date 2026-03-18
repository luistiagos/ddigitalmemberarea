import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // Se o site estiver em sub-path (ex: username.github.io/repo-name/),
  // defina VITE_BASE_PATH=/repo-name/ no ambiente de build.
  // Para domínio customizado (digitalstoregames.com.br), deixe vazio.
  base: process.env.VITE_BASE_PATH || '/',

  build: {
    outDir: 'docs', // GitHub Pages aceita apenas / (root) ou /docs como fonte
  },

  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      // Permite imports como: import api from '@/services/api'
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  envPrefix: 'VITE_',
  server: {
    proxy: {
      // Proxy todas as chamadas de API para o backend em dev (evita CORS)
      '/auth': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/customer': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/list_catalog_by_user': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/createMLlink': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/notification': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/area-cliente': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
      '/list_store_catalog': {
        target: 'https://digitalstoregames.pythonanywhere.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});