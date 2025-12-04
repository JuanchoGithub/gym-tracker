
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Fortachon';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png', // A badge for Android notifications
    ...data.options, // Allow passing other options like tag, renotify, etc.
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

const CACHE_NAME = 'fortachon-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // Core Assets
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json',
  // Exercise Animations - Extended list for offline capability
  // Generating list for ex-1 to ex-162
];

// Helper to populate exercise URLs
for (let i = 1; i <= 162; i++) {
    URLS_TO_CACHE.push(`/assets/exercises/animations/svg/ex-${i}.svg`);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Not in cache, fetch it from the network
      return fetch(event.request).then(
        networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache valid http/https requests
              if (event.request.url.startsWith('http')) {
                  cache.put(event.request, responseToCache);
              }
            });

          return networkResponse;
        }
      );
    })
  );
});

let notificationTimeoutId;

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    if (notificationTimeoutId) {
      clearTimeout(notificationTimeoutId);
    }
    const { duration, title, options } = event.data.payload;

    if (duration > 0) {
      notificationTimeoutId = setTimeout(() => {
        self.registration.getNotifications({ tag: options.tag }).then(notifications => {
          notifications.forEach(notification => notification.close());
          self.registration.showNotification(title, options);
        });
        notificationTimeoutId = null;
      }, duration * 1000);
    }
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimeoutId) {
      clearTimeout(notificationTimeoutId);
      notificationTimeoutId = null;
    }
    if (event.data.payload && event.data.payload.tag) {
        self.registration.getNotifications({ tag: event.data.payload.tag }).then(notifications => {
            notifications.forEach(notification => notification.close());
        });
    }
  }
});


self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
