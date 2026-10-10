import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    process.env.NODE_ENV = 'production';
  }
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: false,
        manifestFilename: 'manifest.json',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-512.png',
        ],
        manifest: {
          name: '1TD — One-Tap Diary',
          short_name: '1TD',
          description: 'Log personal activities with a single tap. Build your daily timeline.',
          start_url: '/',
          id: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#101411',
          background_color: '#0b0f0c',
          lang: 'vi',
          dir: 'ltr',
          categories: ['productivity', 'lifestyle'],
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshots/today-view.png',
              sizes: '390x844',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Today view — quick-log tiles and timeline',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globIgnores: ['**/screenshots/**'],
        },
        workbox: {
          skipWaiting: false,
          clientsClaim: false,
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          globIgnores: ['**/screenshots/**'],
          // NOTE: runtimeCaching is inactive in injectManifest mode — see src/sw.ts
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
