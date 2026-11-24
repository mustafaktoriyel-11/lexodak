// Lex Odak - service worker
var SURUM = 'lex-odak-v191';
var MEVZUAT = 'lex-mevzuat-3';
var MEVZUAT_ESKI = 'lex-mevzuat-2';  // tek dosyalı eski mevzuat.json önbelleği; kanun dosyaları tamamen inene dek silinmez (aşağıda 'message')
var MUZIK = 'lex-muzik-2';  // Ufuk yolculuk müziği (ses/ufuk/*.m4a: yol-ezgi, tapinak, toren; ~3 MB): ilk çalışta iner, sonra önbellekten; SURUM değişince silinmez
var MUZIK_ESKI = 'lex-muzik-1';  // Debussy parçaları (03-cekirdek.js) bu önbellekte kalır; yalnız eski ses/ufuk/ dosyaları silinir (activate)
var OCR = 'lex-ocr-1';  // taranmış PDF okuma motoru (jsdelivr), bir kez iner  // kanun metinleri sürüm değişse de silinmez
var DOSYALAR = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png', './gizlilik.html', './kosullar.html', './ozet.js', './veri/mantik.json', './veri/okul.json', './veri/sozler.json', './veri/ufuk.json', './veri/tapinak.json', './img/tapinak/t01-ana-salon.webp', './img/tapinak/t02-xii-levha.webp', './img/tapinak/t02-xii-levha-detay.svg', './img/tapinak/t03-praetor.webp', './img/tapinak/t03-praetor-detay.svg', './img/tapinak/t04-kutuphane.webp', './img/tapinak/t04-kutuphane-detay.svg', './img/tapinak/t05-iustinianus.webp', './img/tapinak/t06-miras.webp', './img/tapinak/t07-sinav.webp', './img/tapinak/salon/katman-0-arka.webp', './img/tapinak/salon/katman-1-uzak.webp', './img/tapinak/salon/katman-2-orta.webp', './img/tapinak/salon/katman-3-yakin.webp', './img/tapinak/salon/katman-4-on.webp', './img/tapinak/salon/isik.webp', './img/ufuk-duz.webp', './img/ufuk-gece.webp', './img/ufuk-ic.webp', './css/uygulama.css', './js/01-dosya.js', './js/02-sayac-anonim.js', './js/03-cekirdek.js', './js/04-mantik.js', './js/05-olcu.js', './js/06-dersler.js', './js/07-icerik.js', './js/08-mevzuat.js', './js/09-ders-testleri.js', './js/10-bildirim.js', './js/11-yedek.js', './js/12-kutuphane.js', './js/13-kadran.js', './js/14-tablet.js', './js/15-kisayol.js', './js/16-mini-sayac.js', './js/17-sayac-katla.js', './js/18-program-sablon.js', './js/19-ses-paneli.js', './js/20-aslan.js', './js/21-ufuk.js', './js/22-ufuk-sahne.js', './js/23-secim.js', './js/24-tapinak.js', './js/25-muzik.js', './lib/jspdf.umd.min.js', './lib/pdf-lib.min.js', './lib/NotoSans-Regular.ttf', './lib/NotoSans-Bold.ttf'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SURUM).then(function (c) { return c.addAll(DOSYALAR.map(function (u) { return new Request(u, { cache: 'reload' }); })); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.open(MUZIK_ESKI).then(function (c) {
    return c.keys().then(function (rs) { return Promise.all(rs.filter(function (r) { return /\/ses\/ufuk\//.test(r.url); }).map(function (r) { return c.delete(r); })); });
  }).catch(function () {}).then(function () { return caches.keys(); }).then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SURUM && k !== MEVZUAT && k !== MEVZUAT_ESKI && k !== OCR && k !== MUZIK && k !== MUZIK_ESKI; }).map(function (k) { return caches.delete(k); }));
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
  // Ufuk müziği: önbellek-öncelikli (dosyalar sürümsüz, değişmez); ilk seferde ağdan gelir ve saklanır. Tam yanıt (200) saklanır, Range istekleri doğrudan ağa gider.
  if (/\/ses\/ufuk\/[\w-]+\.m4a$/.test(u.pathname) && !e.request.headers.has('range')) {
    e.respondWith(caches.open(MUZIK).then(function (c) {
      return c.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (y) { if (y.ok && y.status === 200) c.put(e.request, y.clone()); return y; });
      });
    }));
    return;
  }
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
