
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

const CACHE_NAME = 'fortachon-cache-v5';
const APP_SHELL = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching app shell');
      return cache.addAll(APP_SHELL);
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
  const url = new URL(event.request.url);
  
  // Specific strategy for exercise animations: Cache First, fallback to Network
  // This ensures they are cached lazily as the user views them
  if (url.pathname.includes('/assets/exercises/animations/')) {
     event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
           return cache.match(event.request).then(response => {
              return response || fetch(event.request).then(networkResponse => {
                 // Only cache valid responses
                 if(networkResponse && networkResponse.status === 200) {
                     cache.put(event.request, networkResponse.clone());
                 }
                 return networkResponse;
              });
           });
        })
     );
     return;
  }

  // Default strategy: Stale-While-Revalidate for app shell/other assets
  // This provides instant load while updating in background for next time
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
        }
        
        // Clone and cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
            if (event.request.url.startsWith('http')) {
                cache.put(event.request, responseToCache);
            }
        });
        return networkResponse;
      }).catch(err => {
          // Network failure - nothing to do if we don't have cache
          console.warn('Fetch failed:', err);
      });

      return cachedResponse || fetchPromise;
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
      // Create a promise that keeps the SW alive until the timeout fires
      // Note: Browsers may still kill the SW if it takes too long (e.g. > 30s)
      const notificationPromise = new Promise((resolve) => {
          notificationTimeoutId = setTimeout(() => {
            self.registration.getNotifications({ tag: options.tag }).then(notifications => {
              notifications.forEach(notification => notification.close());
              self.registration.showNotification(title, options);
              resolve();
            });
            notificationTimeoutId = null;
          }, duration * 1000);
      });
      
      event.waitUntil(notificationPromise);
    }
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimeoutId) {
      clearTimeout(notificationTimeoutId);
      notificationTimeoutId = null;
    }
    if (event.data.payload && event.data.payload.tag) {
        event.waitUntil(
            self.registration.getNotifications({ tag: event.data.payload.tag }).then(notifications => {
                notifications.forEach(notification => notification.close());
            })
        );
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
