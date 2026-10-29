const CACHE_NAME = 'defchat-shell-v5';
const BASE_URL = new URL('./', self.location.href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(BASE_URL.href)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('defchat-shell-') || key.startsWith('cinder-shell-')) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/auth/v1/') || url.pathname.includes('/rest/v1/')) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || (await caches.match(BASE_URL.href))));
});


self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || 'You have a new notification.' }; }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some(client => client.visibilityState === 'visible')) {
      for (const client of windows) {
        try { client.postMessage({ type: 'defchat:push-received', data: payload }); } catch {}
      }
      return;
    }
    await self.registration.showNotification(payload.title || 'defchat · Solar community', {
      body: String(payload.body || 'You have a new notification.').slice(0, 180),
      icon: new URL('icons/cinder.svg', self.registration.scope).href,
      badge: new URL('icons/cinder.svg', self.registration.scope).href,
      tag: payload.tag || 'defchat-notification',
      renotify: true,
      data: { url: payload.url || self.registration.scope }
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        try { client.postMessage({ type: 'defchat:notification-click', data: event.notification.data || {} }); } catch {}
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
