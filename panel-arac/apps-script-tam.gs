var PANEL_ANAHTAR = 'BURAYA_PAROLA'; // kendi parolanı yaz (depoya gerçek parola konmaz)
var SAYFA = 'Kayitlar';

/* Uygulamadan gelen sayaç kaydı: günde en çok 1 kez, cihaz başına */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.tip !== 'sayac') return yazi_('yok');
    var sh = sayfa_();
    var temiz = function (x) {
      x = String(x == null ? '' : x).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 80);
      return /^[=+\-@]/.test(x) ? "'" + x : x;
    };
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm:ss'),
      temiz(d.cihaz), temiz(d.platform), temiz(d.mod), temiz(d.okul), temiz(d.sinif)
    ]);
    return yazi_('ok');
  } catch (err) {
    return yazi_('hata');
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function sayfa_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SAYFA);
  if (!sh) {
    sh = ss.insertSheet(SAYFA);
    sh.appendRow(['Zaman', 'Cihaz', 'Platform', 'Açılış', 'Okul', 'Sınıf']);
  } else if (sh.getRange(1, 6).getValue() === '') {
    sh.getRange(1, 6).setValue('Sınıf');
  }
  return sh;
}

/* Panel (lexodak.com/panel.html) için özet */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.k !== PANEL_ANAHTAR) return cevap_({hata: 'yetki'});
  var v = sayfa_().getDataRange().getValues();
  if (p.islem === 'baslik') return cevap_({sayfa: SAYFA, toplamSatir: v.length, satirlar: v.slice(0, 3).map(function (r) { return r.map(String); })});
  var gunAl = function (z) {
    if (!(z instanceof Date)) {
      var m = String(z).match(/(\d+)\.(\d+)\.(\d+)/);
      if (!m) return null;
      return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    }
    return Utilities.formatDate(z, 'Europe/Istanbul', 'yyyy-MM-dd');
  };
  var bugun = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
  var ms = function (g) { return new Date(g + 'T00:00:00Z').getTime(); };
  var gunFark = function (g) { return Math.round((ms(bugun) - ms(g)) / 86400000); };
  var C = {};
  for (var i = 1; i < v.length; i++) {
    var r = v[i], id = String(r[1]).trim(), g = gunAl(r[0]);
    if (!id || !g) continue;
    var c = C[id] || (C[id] = {ilk: g, gun: {}, kur: {}, kurulu: false});
    if (g < c.ilk) c.ilk = g;
    c.gun[g] = 1;
    if (r[3] === 'Kurulu') { c.kurulu = true; c.kur[g] = 1; }
    c.platform = r[2] || c.platform; c.mod = r[3] || c.mod; c.okul = r[4] || c.okul; c.sinif = r[5] || c.sinif;
  }
  var G = {}, liste = [];
  for (var d = 89; d >= 0; d--) {
    var t = Utilities.formatDate(new Date(Date.now() - d * 86400000), 'Europe/Istanbul', 'yyyy-MM-dd');
    G[t] = {g: t, aktif: 0, yeni: 0, kurulu: 0}; liste.push(G[t]);
  }
  var o = {guncel: new Date().toISOString(), toplamKisi: 0, son7Aktif: 0, son30Aktif: 0, bugunAktif: 0, kuruluKisi: 0};
  var ok = {}, pl = {}, md = {}, sn = {};
  var say = function (h, a) { h[a] = (h[a] || 0) + 1; };
  Object.keys(C).forEach(function (id) {
    var c = C[id], g7 = 0, g30 = 0;
    o.toplamKisi++;
    if (c.kurulu) o.kuruluKisi++;
    if (G[c.ilk]) G[c.ilk].yeni++;
    Object.keys(c.gun).forEach(function (g) {
      if (G[g]) { G[g].aktif++; if (c.kur[g]) G[g].kurulu++; }
      var f = gunFark(g);
      if (f < 7) g7 = 1;
      if (f < 30) g30 = 1;
      if (g === bugun) o.bugunAktif++;
    });
    o.son7Aktif += g7; o.son30Aktif += g30;
    say(ok, c.okul || 'Seçilmemiş'); say(pl, c.platform || 'Bilinmiyor'); say(md, c.mod || 'Bilinmiyor'); say(sn, c.sinif || 'Seçilmemiş');
  });
  var sirala = function (h) { return Object.keys(h).map(function (a) { return {ad: a, kisi: h[a]}; }).sort(function (x, y) { return y.kisi - x.kisi; }); };
  /* Dönem özetleri: 1 = bugün, 7 / 30 gün, 0 = tüm zamanlar */
  var pencere = {};
  [1, 7, 30, 0].forEach(function (n) {
    var icinde = function (g) { return n === 0 || gunFark(g) < n; };
    var P = {aktif: 0, yeni: 0, yeniKurulum: 0, kuruluKullanan: 0}, pk = {}, pp = {}, pm = {}, ps = {};
    Object.keys(C).forEach(function (id) {
      var c = C[id];
      if (!Object.keys(c.gun).some(icinde)) return;
      P.aktif++;
      if (icinde(c.ilk)) P.yeni++;
      var kg = Object.keys(c.kur).sort();
      if (kg.some(icinde)) P.kuruluKullanan++;
      if (kg.length && icinde(kg[0])) P.yeniKurulum++;
      say(pk, c.okul || 'Seçilmemiş'); say(pp, c.platform || 'Bilinmiyor'); say(pm, c.mod || 'Bilinmiyor'); say(ps, c.sinif || 'Seçilmemiş');
    });
    P.okullar = sirala(pk); P.platformlar = sirala(pp); P.modlar = sirala(pm); P.siniflar = sirala(ps);
    pencere[n] = P;
  });
  o.pencere = pencere;
  o.gunler = liste; o.okullar = sirala(ok); o.platformlar = sirala(pl); o.modlar = sirala(md); o.siniflar = sirala(sn);
  o.eslesme = {yontem: SAYFA + ': Zaman, Cihaz, Platform, Açılış, Okul, Sınıf'};
  return cevap_(o);
}

function cevap_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function yazi_(s) {
  return ContentService.createTextOutput(s);
}
