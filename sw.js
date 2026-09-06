/**
 * CompAlumim - Service Worker • בית הספר עלומים חולון
 * Enables PWA installability on Android, Windows, Mac, and iOS.
 * Implements Stale-While-Revalidate for app assets and Network-Only for dynamic cloud sync.
 */

const CACHE_NAME = 'compalumim-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/audio.js',
  './js/holidays.js',
  './js/storage.js',
  './js/admin.js',
  './js/share.js',
  './js/schedule.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png'
];

// Installation: Pre-cache static UI shell and icons
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('CompAlumim SW: Some assets could not be cached during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for Google Apps Script, Cache-First/Stale-While-Revalidate for assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never cache external Google Apps Script or dynamic API requests
  if (url.includes('script.google.com') || url.includes('googleusercontent.com') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails and no cache, fallback to index.html for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
