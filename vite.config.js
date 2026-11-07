import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Chemin de publication. `/` par défaut (Netlify, dev) ; le workflow GitHub
// Pages passe `VITE_BASE=/vibefit/` : l'app y est servie sous ce sous-chemin.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'VibeFit',
        short_name: 'VibeFit',
        description: 'Tracker quotidien de recomposition corporelle.',
        theme_color: '#150F1A',
        background_color: '#150F1A',
        display: 'standalone',
        // Relatifs au manifeste : valables sous `/` comme sous `/vibefit/`.
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-icon.svg',
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
