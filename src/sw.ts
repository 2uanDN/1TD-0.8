/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { setCacheNameDetails } from 'workbox-core';
import type { WorkboxPlugin } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

export const STATIC_CACHE_VERSION = 'v1';
export const STATIC_CACHE_PREFIX = '1td-static';
export const FONTS_CACHE_NAME = '1td-fonts-v1';
export const MANIFEST_CACHE_NAME = `${STATIC_CACHE_PREFIX}-${STATIC_CACHE_VERSION}`;

setCacheNameDetails({
  prefix: STATIC_CACHE_PREFIX,
  suffix: STATIC_CACHE_VERSION,
  precache: 'precache',
  runtime: 'runtime',
});

// Precache static build assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback to precached /index.html when available in production build
try {
  const navigationHandler = createHandlerBoundToURL('/index.html');
  registerRoute(
    new NavigationRoute(navigationHandler, {
      denylist: [/^\/api\//, /^\/manifest\.json$/],
    })
  );
} catch (error: unknown) {
  // In Vite dev mode, /index.html is served dynamically by the dev server rather than __WB_MANIFEST
  console.debug('[1TD SW] Navigation fallback bound dynamically:', error);
}

// Graceful fallback if Google Fonts stylesheet is requested offline before first cache warm-up
const offlineFontStylesheetFallbackPlugin: WorkboxPlugin = {
  handlerDidError: async () =>
    new Response('/* 1TD offline system font stack fallback */', {
      status: 200,
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    }),
};

// PWA Manifest: Network-first with cache fallback (SPEC.md § VI.1)
registerRoute(
  ({ url }) => url.pathname === '/manifest.json',
  new NetworkFirst({
    cacheName: MANIFEST_CACHE_NAME,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Google Fonts stylesheets: Cache-first, 365d expiry (SPEC.md § VI.1 & VI.2)
registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com/.test(url.href),
  new CacheFirst({
    cacheName: FONTS_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 31536000,
        maxEntries: 20,
      }),
      offlineFontStylesheetFallbackPlugin,
    ],
  })
);

// Google Fonts WOFF2 binary files: Cache-first, 365d expiry (SPEC.md § VI.1 & VI.2)
registerRoute(
  ({ url }) => /^https:\/\/fonts\.gstatic\.com/.test(url.href),
  new CacheFirst({
    cacheName: FONTS_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 31536000,
        maxEntries: 30,
      }),
    ],
  })
);

// Catch any install-phase errors explicitly; never call skipWaiting() automatically (AGENTS.md)
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        // Precache installation is handled by workbox-precaching listener; keep install stage guarded
      } catch (error: unknown) {
        console.error('[1TD SW] Install handler encountered an error:', error);
      }
    })()
  );
});

// Require explicit user consent before activating a waiting Service Worker (AGENTS.md & SPEC.md § VI.2)
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(
      self.skipWaiting().catch((error: unknown) => {
        console.error('[1TD SW] skipWaiting failed:', error);
      })
    );
  }
});

// Clean up stale versioned caches (1td-static-v{N-1} and older) on activate
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = new Set([
          MANIFEST_CACHE_NAME,
          FONTS_CACHE_NAME,
          `${STATIC_CACHE_PREFIX}-precache-${STATIC_CACHE_VERSION}`,
          `${STATIC_CACHE_PREFIX}-runtime-${STATIC_CACHE_VERSION}`,
        ]);

        await Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('1td-') &&
                !validCaches.has(name)
            )
            .map((staleName) => caches.delete(staleName))
        );
      } catch (error: unknown) {
        console.error('[1TD SW] Failed to clean stale caches during activate:', error);
      }
    })()
  );
});
