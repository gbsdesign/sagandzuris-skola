import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // pages few people open and the heaviest data stay out of the advance download (about 2 MB less for
          // every new phone); they are kept once opened (the assets cache below). All the choir needs in church
          // (notes, the program, church mode, prayers) is still downloaded in advance.
          globIgnores: [
            '**/node_modules/**/*',
            'assets/AdminPanelPage-*', 'assets/ClassesAdmin-*', 'assets/TeacherPage-*',
            'assets/AbituriPage-*', 'assets/abituriLessons-*', 'assets/abcjs-*',
            'assets/AncestorsPage-*', 'assets/ancestorsBioTexts-*',
            'assets/20[0-9][0-9]-*', // the church calendar's years
          ],
          // opens the prayer when a reminder notification is tapped
          importScripts: ['prayer-notify-sw.js'],
          // a shared notes link (/?c=…&v=…) opens the app even without internet
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/notes\//, /^\/hymn\//, /^\/audio\//, /^\/lives\//, /^\/mtkmeli\//, /^\/prayers\//, /^\/bible\//],
          // chant notes and hymnography drawings: kept as they are opened, and by "ჩამოწერა"
          // (src/utils/offlineNotes.ts fills the same cache), so they open in church without internet
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && /^\/(notes|hymn)\//.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'sagandzuri-notes-v1', expiration: { maxEntries: 6000 } },
            },
            {
              // მთქმელი full texts: kept once read
              urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/mtkmeli/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'sagandzuri-mtkmeli-v1', expiration: { maxEntries: 400 } },
            },
            {
              // the saints' lives and their icons (library, calendar): kept once read
              urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/lives/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'sagandzuri-lives-v1', expiration: { maxEntries: 4000 } },
            },
            {
              // prayers and the New Testament: kept once read, so they open without internet
              urlPattern: ({ url }) => url.origin === self.location.origin && /^\/(prayers|bible)\//.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'sagandzuri-prayers-v1', expiration: { maxEntries: 400 } },
            },
            {
              // the app's own files left out of the advance download (globIgnores above): kept once opened
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
