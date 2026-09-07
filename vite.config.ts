import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon-64.png', 'icon.svg'],
        manifest: {
          name: 'LegalizaBoard — Gestão Societária',
          short_name: 'LegalizaBoard',
          description: 'Gestão de processos de legalização societária, trâmites JUCESP e prazos de exigências.',
          theme_color: '#d93025',
          background_color: '#F6F8FC',
          display: 'standalone',
          lang: 'pt-BR',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [
            {
              // Supabase REST — apenas GET, NetworkFirst (rede primeiro, cache como fallback offline)
              urlPattern: ({ url, request }) =>
                request.method === 'GET' && /\/rest\/v1\//.test(url.pathname) && /supabase\.co$/.test(url.hostname),
              handler: 'NetworkFirst',
              method: 'GET',
              options: {
                cacheName: 'supabase-rest-get',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
