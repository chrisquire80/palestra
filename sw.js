/* Palestra service worker v3.9.1 */
const APP_VERSION = 'v3.9.1';
const CACHE = 'palestra-shell-v3.9.1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './manifest-light.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-16.png',
  './icons/favicon-32.png',
  './favicon.ico',
  './vendor/fonts/outfit-latin-wght.woff2'
];

self.addEventListener('install', function (event) {
  // Activate this version for clients still on v2.4 whose Aggiorna button
  // only reloads and does not send SKIP_WAITING.
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/\/sw\.js$/.test(url.pathname)) return;
  var path = url.pathname;
  var isShell = request.mode === 'navigate' || /\/$|index\.html$|manifest\.webmanifest$/.test(path);
  if (isShell) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      var i;
      for (i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) return clientList[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

self.addEventListener('sync', function (event) {
  if (event.tag !== 'palestra-flush') return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'FLUSH_QUEUE' });
      });
    })
  );
});
