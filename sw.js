// Lex Odak - service worker
var SURUM = 'lex-odak-v159';
var MEVZUAT = 'lex-mevzuat-3';
var MEVZUAT_ESKI = 'lex-mevzuat-2';  // tek dosyalı eski mevzuat.json önbelleği; kanun dosyaları tamamen inene dek silinmez (aşağıda 'message')
var OCR = 'lex-ocr-1';  // taranmış PDF okuma motoru (jsdelivr), bir kez iner  // kanun metinleri sürüm değişse de silinmez
var DOSYALAR = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './gizlilik.html', './kosullar.html', './ozet.js', './veri/mantik.json', './veri/okul.json', './veri/sozler.json', './css/uygulama.css', './js/01-dosya.js', './js/02-sayac-anonim.js', './js/03-cekirdek.js', './js/04-mantik.js', './js/05-olcu.js', './js/06-dersler.js', './js/07-icerik.js', './js/08-mevzuat.js', './js/09-ders-testleri.js', './js/10-bildirim.js', './js/11-yedek.js', './js/12-kutuphane.js', './js/13-kadran.js', './js/14-tablet.js', './js/15-kisayol.js', './js/16-mini-sayac.js', './js/17-sayac-katla.js', './js/18-program-sablon.js', './js/19-ses-paneli.js', './js/20-aslan.js', './js/21-ufuk.js', './lib/jspdf.umd.min.js', './lib/pdf-lib.min.js', './lib/NotoSans-Regular.ttf', './lib/NotoSans-Bold.ttf'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SURUM).then(function (c) { return c.addAll(DOSYALAR.map(function (u) { return new Request(u, { cache: 'reload' }); })); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SURUM && k !== MEVZUAT && k !== MEVZUAT_ESKI && k !== OCR && k !== 'lex-muzik-1'; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Kanun metinleri (mevzuat/index.json ve mevzuat/<no>.json): ag-oncelikli, saglam degilse onbellek.
// Neden ag-oncelikli (stale-while-revalidate degil): kanun metni degisince kullanici bir sonraki acilista
// eski metni gormesin; istek 'no-cache' ile gider, degismediyse sunucu 304 doner (govde inmez), yani ucuzdur.
// Internetsiz ya da yavassa (6 sn) / 404 / bos / bozuk JSON ise onbellekteki son saglam kopya verilir; boylece cevrimdisi hep calisir.
function mevzuatSaglam(yol, j) {
  if (!j) return false;
  if (/\/index\.json$/.test(yol)) return !!(j.index && j.index.length);
  return !!(j.maddeler && j.maddeler.length);
}
function mevzuatAl(req) {
  var yol = new URL(req.url).pathname;
  var cevap = function (t) { return new Response(t, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }); };
  var onbellek = function () {
    return caches.open(MEVZUAT).then(function (c) { return c.match(req); });
  };
  var ag = fetch(req, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw 0;
    return r.text().then(function (t) {
      var j; try { j = JSON.parse(t); } catch (x) { throw 0; }
      if (!mevzuatSaglam(yol, j)) throw 0;
      caches.open(MEVZUAT).then(function (c) { c.put(req, cevap(t)); });
      return cevap(t);
    });
  });
  var yedek = function () { return onbellek().then(function (r) { return r || new Response('', { status: 503 }); }); };
  var sure = new Promise(function (res) {
    setTimeout(function () { onbellek().then(function (r) { if (r) res(r); }); }, 6000);
  });
  return Promise.race([ag, sure]).catch(yedek);
}

// Eski istemciler hala mevzuat.json ister: eski onbellegi (varsa) koruyarak ayni mantikla sun
function mevzuatEskiAl(req) {
  return fetch(req, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw 0;
    return r.text().then(function (t) {
      var j = JSON.parse(t);
      if (!j || !j.index || !j.index.length || !j.kanunlar) throw 0;
      var cevap = function () { return new Response(t, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }); };
      caches.open(MEVZUAT_ESKI).then(function (c) { c.put(req, cevap()); });
      return cevap();
    });
  }).catch(function () {
    return caches.open(MEVZUAT_ESKI).then(function (c) { return c.match(req); }).then(function (r) { return r || new Response('', { status: 503 }); });
  });
}

// Sayfa butun kanun dosyalarini indirdiginde bildirir; ancak o zaman eski tek dosyalik onbellek silinir (gecis guvenli)
self.addEventListener('message', function (e) {
  if (e.data === 'mevzuat-gecis-tamam') e.waitUntil(caches.delete(MEVZUAT_ESKI));
});

// Uygulama dosyalari: once agdan dene (guncel kalsin), olmazsa onbellekten ver
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method === 'GET' && u.hostname === 'cdn.jsdelivr.net' && /^\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data)/.test(u.pathname)) {
    e.respondWith(caches.open(OCR).then(function (c) {
      return c.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (y) { if (y.ok) c.put(e.request, y.clone()); return y; });
      });
    }));
    return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\/mevzuat\/(index|\d+)\.json$/.test(u.pathname)) { e.respondWith(mevzuatAl(e.request)); return; }
  if (/\/mevzuat\.json$/.test(u.pathname)) { e.respondWith(mevzuatEskiAl(e.request)); return; }
  e.respondWith(
    fetch(e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' })).then(function (r) {
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
