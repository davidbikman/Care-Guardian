import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Zero-egress build: fonts and pdf.js are bundled locally; no runtime caching of any external origin.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inline the service-worker registration as a module script. Vite 7+/8 refuses to bundle the default
      // external <script src="/registerSW.js"> because it lacks type="module"; inlining avoids that tag entirely.
      injectRegister: 'inline',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Care Guardian',
        short_name: 'CareGuard',
        description: 'Privacy-first dementia caregiver app — encrypted, offline-capable, no server required.',
        theme_color: '#457b9d',
        background_color: '#f6f4f0',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['health', 'medical', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 4*1024*1024 },
    }),
  ],
  build: { outDir: 'dist', sourcemap: false },
});
