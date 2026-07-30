import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'VibeFit',
        short_name: 'VibeFit',
        description: 'Tracker quotidien de recomposition corporelle.',
        theme_color: '#0A0B0D',
        background_color: '#0A0B0D',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Les .woff2 sont auto-hébergés (public/fonts) : ils entrent donc dans
        // le précache au build, et non plus dans un runtimeCaching vers un CDN.
        // Les deux règles google-fonts/gstatic ont été retirées avec le <link>
        // correspondant dans index.html — elles ne pouvaient plus rien matcher.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
