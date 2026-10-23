import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { offlinePacks } from './scripts/lib/offline-manifest.mjs';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      offlinePacks(path.resolve(import.meta.dirname || '.', 'public')),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // the whole app — every page, picture and font — is downloaded in advance, so it opens without internet.
          // The data under public/ (notes, prayers, lives…) is not: the app keeps it in offline packs itself
          // (src/utils/offlineFiles.ts, lists from scripts/lib/offline-manifest.mjs).
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff,woff2}'],
          globIgnores: [
            '**/node_modules/**/*',
            'notes/**', 'hymn/**', 'lives/**', 'prayers/**', 'bible/**', 'mtkmeli/**', 'audio/**', 'offline/**',
          ],
          // opens the prayer when a reminder notification is tapped
          importScripts: ['prayer-notify-sw.js'],
          // a shared notes link (/?c=…&v=…) opens the app even without internet
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/notes\//, /^\/hymn\//, /^\/audio\//, /^\/lives\//, /^\/mtkmeli\//, /^\/prayers\//, /^\/bible\//, /^\/offline\//],
          runtimeCaching: [
            {
              // notes, hymnography drawings, prayers, the New Testament, მთქმელი texts and the saints' lives.
              // A file from an offline pack (marked x-sg-pack) is answered from the device as it is — the app
              // refreshes the packs itself when a new version is published; the app's own pack downloads
              // (?sg=…) skip this route. Anything else is kept once opened (also by "ჩამოწერა",
              // src/utils/offlineNotes.ts) and refreshed in the background.
              urlPattern: ({ url }) => url.origin === self.location.origin && !url.searchParams.has('sg') &&
                /^\/(notes|hymn|lives|prayers|bible|mtkmeli)\//.test(url.pathname),
              handler: async ({ request, url, event }) => {
                const name = /^\/(notes|hymn)\//.test(url.pathname) ? 'sagandzuri-notes-v1'
                  : url.pathname.startsWith('/lives/') ? 'sagandzuri-lives-v1'
                  : url.pathname.startsWith('/mtkmeli/') ? 'sagandzuri-mtkmeli-v1'
                  : 'sagandzuri-prayers-v1';
                const kept = await caches.match(request);
                if (kept && kept.headers.has('x-sg-pack')) return kept;
                const fresh = fetch(request).then(async res => {
                  if (res.ok) await (await caches.open(name)).put(request, res.clone());
                  return res;
                });
                if (!kept) return fresh;
                event.waitUntil(fresh.catch(() => undefined));
                return kept;
              },
            },
            {
              // a chunk of an older version, asked for by a page still open from before an update: kept once opened
              urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.+\.(js|css)$/.test(url.pathname),
              handler: 'CacheFirst',
              options: { cacheName: 'sagandzuri-assets-v1', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 } },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 40 } },
            },
          ],
        },
        includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        devOptions: {
          enabled: false
        },
        manifest: {
          id: '/',
          name: 'საგანძურის სკოლა',
          short_name: 'საგანძური',
          description: 'ქართული გალობისა და სიმღერის სასწავლო აპლიკაცია',
          theme_color: '#fcf9f5',
          background_color: '#fcf9f5',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/tone') || id.includes('node_modules/soundtouchjs')) {
              return 'vendor-audio';
            }
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/canvas-confetti')) {
              return 'vendor-ui';
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
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
