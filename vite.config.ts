import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { offlinePacks } from './scripts/lib/offline-manifest.mjs';

// the print kits (src/print/, made on the phone by the games hub's PDF button) and the abcjs file their pages load are kept in
// assets/print/, outside the precache: fetched the first time a kit is made, then kept by the assets' runtime cache below
const inPrint = (id: string) => id.includes('/src/print/');
const PRINT_ASSET = /^abcjs-basic-min\./;
// Parts the phone does not download in advance (redesign stage 3 „სიჩქარე“: „ფონზე ნაკლები იწერება“): every game, the churches'
// and the videos' data, the ancestors' texts, the word game's dictionary, the admission and admin pages, the QR reader. They
// come on first opening and are kept from then on (the /assets/ route below). Never a part of the notes page, the program, the
// chant books, the prayers or the calendar — the choir opens those in church without internet.
const LATER = [
  /\/src\/pages\/games\/[A-Za-z]+Game\.tsx$/, /\/src\/data\/(lyricsPool|kartuliQuiz|sitqvaWords|ancestorsBioTexts)\.ts$/,
  /\/src\/data\/(churches|etnoforiVideos)\.json$/, /\/src\/pages\/(ChurchesPage|AdminPanelPage|AbituriPage)\.tsx$/,
  /\/src\/pages\/churches\/PinsMap\.tsx$/, /\/src\/data\/abituriLessons\.ts$/, /\/node_modules\/jsqr\//,
];
const later = (id: string) => LATER.some(r => r.test(id));

// the build's time in Tbilisi, „2026-11-18 10:30“: the error log (utils/errorLog.ts) notes which version broke
const BUILD_STAMP = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tbilisi', dateStyle: 'short', timeStyle: 'short' }).format(new Date());

export default defineConfig(() => {
  return {
    define: { __SG_BUILD__: JSON.stringify(BUILD_STAMP) },
    plugins: [
      react(),
      tailwindcss(),
      offlinePacks(path.resolve(import.meta.dirname || '.', 'public')),
      VitePWA({
        registerType: 'autoUpdate',
        // registered by src/main.tsx itself (with updateViaCache 'none'), so nothing is injected here
        injectRegister: false,
        workbox: {
          // a new version takes over at once. Written out because the plugin turns these on by itself only for
          // injectRegister 'auto': with the old 'inline' they were off, the new version waited until every window of
          // the app was closed (in the Android app — never), and phones showed news only after clearing the storage.
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // the whole app — every page, picture and font — is downloaded in advance, so it opens without internet.
          // The data under public/ (notes, prayers, lives…) is not: the app keeps it in offline packs itself
          // (src/utils/offlineFiles.ts, lists from scripts/lib/offline-manifest.mjs).
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff,woff2}'],
          globIgnores: [
            '**/node_modules/**/*',
            'notes/**', 'hymn/**', 'lives/**', 'prayers/**', 'bible/**', 'mtkmeli/**', 'audio/**', 'offline/**', 'wignebi/**',
            'assets/print/**',
            // opened rarely: downloaded on first opening, then kept (LATER above)
            'assets/later/**',
            // the dress studio's sample photos (utils/kabaArt.ts): only the owner's studio asks for them
            'home/samosi/ref/**',
          ],
          // opens the prayer when a reminder notification is tapped
          importScripts: ['prayer-notify-sw.js'],
          // a shared notes link (/?c=…&v=…) opens the app even without internet
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/notes\//, /^\/hymn\//, /^\/audio\//, /^\/lives\//, /^\/mtkmeli\//, /^\/prayers\//, /^\/bible\//, /^\/offline\//, /^\/wignebi\//, /^\/centre\//, /^\/\.well-known\//, /^\/privacy/],
          runtimeCaching: [
            {
              // notes, hymnography drawings, prayers, the New Testament, მთქმელი texts, the saints' lives and the
              // liturgical books of მედავითნეობა (public/wignebi).
              // A file from an offline pack (marked x-sg-pack) is answered from the device as it is — the app
              // refreshes the packs itself when a new version is published; the app's own pack downloads
              // (?sg=…) skip this route. Anything else is kept once opened (also by "ჩამოწერა",
              // src/utils/offlineNotes.ts) and refreshed in the background.
              urlPattern: ({ url }) => url.origin === self.location.origin && !url.searchParams.has('sg') &&
                /^\/(notes|hymn|lives|prayers|bible|mtkmeli|wignebi|centre)\//.test(url.pathname),
              handler: async ({ request, url, event }) => {
                const name = /^\/(notes|hymn)\//.test(url.pathname) ? 'sagandzuri-notes-v1'
                  : url.pathname.startsWith('/lives/') ? 'sagandzuri-lives-v1'
                  : url.pathname.startsWith('/mtkmeli/') ? 'sagandzuri-mtkmeli-v1'
                  : url.pathname.startsWith('/wignebi/') ? 'sagandzuri-wignebi-v1'
                  : url.pathname.startsWith('/centre/') ? 'sagandzuri-centre-v1'
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
              // the anthology's notes from R2 (src/utils/notesBase.ts): kept with the other notes once opened, so they open
              // offline and in church; fetched with CORS (the Worker allows it), so the kept copy is a readable answer even
              // for a plain <img>, and refreshed in the background
              urlPattern: ({ url }) => url.origin === 'https://sagandzuri-notes.mr-gabunia.workers.dev',
              handler: async ({ request, event }) => {
                const kept = await caches.match(request.url);
                const fresh = fetch(request.url, { mode: 'cors', credentials: 'omit' }).then(async res => {
                  if (res.ok) await (await caches.open('sagandzuri-notes-v1')).put(request.url, res.clone());
                  return res;
                });
                if (!kept) return fresh;
                event.waitUntil(fresh.catch(() => undefined));
                return kept;
              },
            },
            {
              // a chunk of an older version, asked for by a page still open from before an update, or a part not downloaded in
          // advance (assets/later/): kept once opened
              urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.+\.(js|css)$/.test(url.pathname),
              handler: 'CacheFirst',
              // (also every part kept for later — assets/later/ — once opened)
              options: { cacheName: 'sagandzuri-assets-v1', expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 90 } },
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
          // the Android app's „გაზიარება → საგანძური“: a recording or a text into a class chat (public/prayer-notify-sw.js)
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'audio', accept: ['audio/*'] }] },
          },
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
          chunkFileNames: chunk => ((chunk.facadeModuleId ? inPrint(chunk.facadeModuleId) : chunk.moduleIds.length > 0 && chunk.moduleIds.every(inPrint))
            ? 'assets/print/[name]-[hash].js'
            : chunk.facadeModuleId && later(chunk.facadeModuleId) ? 'assets/later/[name]-[hash].js' : 'assets/[name]-[hash].js'),
          assetFileNames: asset => (asset.names.some(n => PRINT_ASSET.test(n)) ? 'assets/print/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]'),
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
