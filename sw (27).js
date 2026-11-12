// Lex Odak - service worker
var SURUM = 'lex-odak-v19';
var MEVZUAT = 'lex-mevzuat-2';  // kanun metinleri sürüm değişse de silinmez
var DOSYALAR = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './gizlilik.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SURUM).then(function (c) { return c.addAll(DOSYALAR); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SURUM && k !== MEVZUAT; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Kanun metinleri: agdan gelen dosya saglamsa onbellegi guncelle; bozuk/bos/eksikse eldeki saglam kopyayi ver
function mevzuatAl(req) {
  return fetch(req).then(function (r) {
    if (!r.ok) throw 0;
    return r.text().then(function (t) {
      var j = JSON.parse(t);
      if (!j || !j.index || !j.index.length || !j.kanunlar) throw 0;
      var cevap = function () { return new Response(t, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }); };
      caches.open(MEVZUAT).then(function (c) { c.put(req, cevap()); });
      return cevap();
    });
  }).catch(function () {
    return caches.open(MEVZUAT).then(function (c) { return c.match(req); }).then(function (r) { return r || new Response('', { status: 503 }); });
  });
}

// Uygulama dosyalari: once agdan dene (guncel kalsin), olmazsa onbellekten ver
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\/mevzuat\.json$/.test(u.pathname)) { e.respondWith(mevzuatAl(e.request)); return; }
  e.respondWith(
    fetch(e.request).then(function (r) {
      var kopya = r.clone();
      if (r.ok) caches.open(SURUM).then(function (c) { c.put(e.request, kopya); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) return cs[i].focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
