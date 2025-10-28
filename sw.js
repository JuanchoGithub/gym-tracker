const CACHE_NAME = 'gym-tracker-pro-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // The fetch handler will cache other assets like JS bundles and CSS on the fly.
];

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
              cache.put(event.request, responseToCache);
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