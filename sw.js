const CACHE = 'voltly-v2';
const ASSETS = ['/', '/manifest.json', '/icons/icon.svg', '/icons/icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;

  // App-Shell (HTML): immer frisch vom Netz holen, nur bei Offline auf Cache zurückfallen.
  // So sieht man nie eine veraltete Version, solange Internet da ist.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('/'); });
      })
    );
    return;
  }

  // Statische Assets (Icons, Manifest): Cache-first, da sie sich kaum ändern.
  if (ASSETS.some(function(a){ return req.url.indexOf(a) !== -1; })) {
    e.respondWith(caches.match(req).then(function(r){ return r || fetch(req); }));
    return;
  }

  // Alles andere (Supabase/API-Aufrufe etc.) — unangetastet ans Netz, nie cachen (Live-Daten).
});

// Echte Push-Benachrichtigung, auch wenn die App komplett geschlossen ist.
self.addEventListener('push', function(e){
  var payload = { title: '⚡ Voltly', body: '' };
  try { payload = e.data.json(); } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(payload.title || '⚡ Voltly', {
      body: payload.body || '',
      icon: '/icons/icon-512.png',
      badge: '/icons/icon-512.png'
    })
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function(list){
      for (var i=0;i<list.length;i++) { if ('focus' in list[i]) return list[i].focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
