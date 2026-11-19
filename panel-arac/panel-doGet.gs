/**
 * LEX ODAK – İSTATİSTİK PANELİ (Apps Script eki)
 * ------------------------------------------------------------------
 * Bu dosya, mevcut sayaç Apps Script projesine EKLENİR. Sır içermez.
 *
 * KURULUM
 *  1) Apps Script projesini aç (sayacın doPost'unun bulunduğu proje).
 *  2) Sol menüde "Proje Ayarları" › "Komut dosyası özellikleri" ›
 *     "Komut dosyası özelliği ekle": ad = PANEL_ANAHTAR, değer = uzun,
 *     tahmin edilmesi zor bir parola (ör. 24+ karakter). Kaydet.
 *     (Anahtar kodda tutulmaz; panelde bir kez yazılır.)
 *  2b) Bu dosyanın içeriğini projeye yeni bir dosya olarak yapıştır
 *     (ör. "panel.gs").
 *  3) "Dağıt" › "Dağıtımları yönet" › kalem simgesi › Sürüm: "Yeni sürüm"
 *     › Dağıt. Erişimi olan kişiler: "Herkes" olmalı (URL değişmez).
 *
 * ÇAKIŞMA UYARISI (doGet)
 *  Projede ZATEN bir doGet varsa iki doGet aynı anda olamaz. O zaman bu
 *  dosyadaki "function doGet(e)" bloğunu SİL, mevcut doGet'in en başına
 *  şu tek satırı ekle:
 *      if (e && e.parameter && e.parameter.islem) return panelGet_(e);
 *  Projede doGet yoksa dosyayı olduğu gibi bırak.
 *
 * KULLANIM (panel.html bunu çağırır)
 *  ?islem=ozet&k=ANAHTAR    → toplu istatistik (ham kimlik dönmez)
 *  ?islem=baslik&k=ANAHTAR  → ilk 3 satır (cihaz kimlikleri maskeli)
 */

var PANEL_SAAT_FARKI_ = 3; // Europe/Istanbul = UTC+3 (sabit)
var PANEL_BILINEN_ = {
  zaman: ['zaman', 'tarih', 'timestamp', 'date', 'zaman damgasi', 'zaman damgası'],
  tip: ['tip', 'type'],
  cihaz: ['cihaz', 'id', 'cihaz id', 'cihazid'],
  platform: ['platform'],
  mod: ['mod', 'acilis', 'acilis bicimi'],
  okul: ['okul', 'universite']
};

function doGet(e) {
  return panelGet_(e);
}

function panelGet_(e) {
  var p = (e && e.parameter) || {};
  var anahtar = PropertiesService.getScriptProperties().getProperty('PANEL_ANAHTAR');
  if (!anahtar || !p.k || String(p.k) !== String(anahtar)) {
    return panelJson_({ hata: 'yetki' });
  }
  try {
    if (p.islem === 'baslik') return panelJson_(panelBaslik_());
    if (p.islem === 'ozet') return panelJson_(panelOzet_());
    return panelJson_({ hata: 'islem' });
  } catch (err) {
    return panelJson_({ hata: 'sunucu', ayrinti: String(err && err.message || err) });
  }
}

function panelJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function panelSayfa_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sayfalar = ss.getSheets();
  var tercih = ['kayitlar', 'kayit', 'sayac', 'log'];
  for (var t = 0; t < tercih.length; t++) {
    for (var i = 0; i < sayfalar.length; i++) {
      if (norm_(sayfalar[i].getName()) === tercih[t]) return sayfalar[i];
    }
  }
  /* adı uymazsa: ilk satırında "cihaz" başlığı olan sayfa */
  for (var j = 0; j < sayfalar.length; j++) {
    var sh = sayfalar[j];
    if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) continue;
    var ilk = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), 20)).getValues()[0];
    for (var k = 0; k < ilk.length; k++) if (norm_(ilk[k]) === 'cihaz') return sh;
  }
  return sayfalar[0];
}

function panelBaslik_() {
  var sh = panelSayfa_();
  var n = Math.min(3, sh.getLastRow());
  var c = sh.getLastColumn();
  var satirlar = [];
  if (n > 0 && c > 0) {
    var v = sh.getRange(1, 1, n, c).getValues();
    for (var i = 0; i < v.length; i++) {
      var s = [];
      for (var j = 0; j < v[i].length; j++) s.push(maskele_(v[i][j]));
      satirlar.push(s);
    }
  }
  return { sayfa: sh.getName(), toplamSatir: sh.getLastRow(), satirlar: satirlar };
}

function panelOzet_() {
  var sh = panelSayfa_();
  var son = sh.getLastRow(), c = sh.getLastColumn();
  if (son < 1 || c < 1) return ozetle_([], { yontem: 'bos' });
  var v = sh.getRange(1, 1, son, c).getValues(); // tek sefer okuma
  var cikis = sutunBul_(v);
  var r = ozetle_(cikis.satirlar, cikis.eslesme);
  r.sayfa = sh.getName();
  return r;
}

/* ---------------- Saf fonksiyonlar (SpreadsheetApp'a bağlı değil) ---------------- */

function norm_(s) {
  return String(s == null ? '' : s)
    .replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase()
    .replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/^\s+|\s+$/g, '');
}

function maskele_(h) {
  if (h == null) return '';
  if (h instanceof Date) return h.toISOString();
  return String(h).replace(/L-([A-Za-z0-9])([A-Za-z0-9])[A-Za-z0-9]+/g, function (m, a, b) {
    return 'L-' + a + b + '****';
  });
}

// Zamanı Date'e çevirir; olmazsa null.
function zamanCoz_(z) {
  if (z instanceof Date) return isNaN(z.getTime()) ? null : z;
  if (typeof z === 'number') {
    // Excel/Sheets seri numarası (1900 sistemi) ya da ms zaman damgası
    if (z > 1e11) return new Date(z);
    if (z > 30000 && z < 80000) return new Date(Math.round((z - 25569) * 86400000));
    return null;
  }
  var s = String(z == null ? '' : z).replace(/^\s+|\s+$/g, '');
  if (!s) return null;
  var m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    // Türkçe biçim (gg.aa.yyyy) İstanbul saati kabul edilir
    var t = Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return new Date(t - PANEL_SAAT_FARKI_ * 3600000);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function gunAnahtari_(d) {
  var k = new Date(d.getTime() + PANEL_SAAT_FARKI_ * 3600000);
  var y = k.getUTCFullYear(), a = k.getUTCMonth() + 1, g = k.getUTCDate();
  return y + '-' + (a < 10 ? '0' : '') + a + '-' + (g < 10 ? '0' : '') + g;
}

function gunSayisi_(anahtar) { // 'YYYY-AA-GG' → gün numarası
  var p = anahtar.split('-');
  return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
}

function gunAdi_(sayi) {
  var d = new Date(sayi * 86400000);
  var a = d.getUTCMonth() + 1, g = d.getUTCDate();
  return d.getUTCFullYear() + '-' + (a < 10 ? '0' : '') + a + '-' + (g < 10 ? '0' : '') + g;
}

/**
 * Ham tablo (başlık dahil olabilir) → { satirlar, eslesme }.
 * eslesme: { yontem:'baslik'|'icerik'|'varsayilan', sutunlar:{zaman,tip,cihaz,platform,mod,okul} } (-1 = yok)
 */
function sutunBul_(v) {
  var alanlar = ['zaman', 'tip', 'cihaz', 'platform', 'mod', 'okul'];
  var idx = { zaman: -1, tip: -1, cihaz: -1, platform: -1, mod: -1, okul: -1 };
  var ilk = v[0] || [], baslikVar = false, yontem = 'varsayilan';
  var eslesenSayi = 0;
  for (var j = 0; j < ilk.length; j++) {
    var h = norm_(ilk[j]);
    for (var f = 0; f < alanlar.length; f++) {
      var liste = PANEL_BILINEN_[alanlar[f]];
      for (var q = 0; q < liste.length; q++) {
        if (norm_(liste[q]) === h && idx[alanlar[f]] < 0) { idx[alanlar[f]] = j; eslesenSayi++; q = liste.length; f = alanlar.length; }
      }
    }
  }
  if (eslesenSayi >= 2) { baslikVar = true; yontem = 'baslik'; }
  else { idx = { zaman: -1, tip: -1, cihaz: -1, platform: -1, mod: -1, okul: -1 }; }

  var satirlar = baslikVar ? v.slice(1) : v.slice(0);

  // Eksik sütunları içeriğe bakarak tamamla (başlıksızda hepsini)
  var ornek = satirlar.slice(0, 300), ncol = 0, i, k;
  for (i = 0; i < v.length && i < 50; i++) if (v[i].length > ncol) ncol = v[i].length;
  var kullanilan = {};
  alanlar.forEach(function (a) { if (idx[a] >= 0) kullanilan[idx[a]] = true; });
  var sinama = {
    cihaz: function (x) { return /^L-[A-Za-z0-9]{4,}/.test(String(x)); },
    platform: function (x) { return /^(android|iphone|bilgisayar|ios|windows|mac)/.test(norm_(x)); },
    mod: function (x) { var n = norm_(x); return n === 'kurulu' || n === 'tarayici' || n.indexOf('instagram') === 0; },
    tip: function (x) { var n = norm_(x); return n === 'sayac' || n === 'geri bildirim' || n === 'geribildirim'; },
    zaman: function (x) { return x instanceof Date || (typeof x === 'string' && /\d{1,4}[-.\/]\d{1,2}[-.\/]\d{1,4}/.test(x)); },
    okul: function (x) { return /universite|üniversite|fakulte|fakülte|okul/i.test(String(x)); }
  };
  var sirala = ['cihaz', 'platform', 'mod', 'tip', 'zaman', 'okul'];
  var bulunan = 0;
  sirala.forEach(function (a) {
    if (idx[a] >= 0) return;
    var enIyi = -1, enSkor = 0;
    for (var c = 0; c < ncol; c++) {
      if (kullanilan[c]) continue;
      var sk = 0, dolu = 0;
      for (var r = 0; r < ornek.length; r++) {
        var x = ornek[r][c];
        if (x === '' || x == null) continue;
        dolu++;
        if (sinama[a](x)) sk++;
      }
      if (dolu && sk / dolu > 0.6 && sk > enSkor) { enSkor = sk; enIyi = c; }
    }
    if (enIyi >= 0) { idx[a] = enIyi; kullanilan[enIyi] = true; bulunan++; }
  });
  if (!baslikVar && bulunan >= 2) yontem = 'icerik';
  else if (baslikVar && bulunan > 0) yontem = 'baslik+icerik';

  // Hâlâ cihaz yoksa varsayılan sıra: [zaman, tip, cihaz, platform, mod, okul]
  if (idx.cihaz < 0) {
    var tipli = ncol >= 6;
    var sira = tipli ? ['zaman', 'tip', 'cihaz', 'platform', 'mod', 'okul']
                     : ['zaman', 'cihaz', 'platform', 'mod', 'okul'];
    idx = { zaman: -1, tip: -1, cihaz: -1, platform: -1, mod: -1, okul: -1 };
    sira.forEach(function (a, n) { idx[a] = n; });
    yontem = 'varsayilan';
  } else if (idx.zaman < 0 && idx.cihaz > 0) {
    idx.zaman = 0; // zaman çoğunlukla ilk sütundur
    if (yontem === 'icerik') yontem = 'icerik+varsayilan';
  }
  return { satirlar: satirlar, eslesme: { yontem: yontem, baslikVar: baslikVar, sutunlar: idx } };
}

/**
 * Toplama çekirdeği. satirlar: veri satırları (başlıksız, dizi dizisi).
 * eslesme: sutunBul_ çıktısındaki eslesme (ya da { sutunlar:{...} }).
 * simdi: (isteğe bağlı) Date – test için.
 */
function ozetle_(satirlar, eslesme, simdi) {
  eslesme = eslesme || {};
  var s = eslesme.sutunlar || { zaman: 0, tip: 1, cihaz: 2, platform: 3, mod: 4, okul: 5 };
  simdi = simdi || new Date();
  var bugun = gunSayisi_(gunAnahtari_(simdi));
  var cihazlar = {}, atlanan = 0, okunan = 0;

  function al(r, i) { return i >= 0 && i < r.length && r[i] != null ? String(r[i]).replace(/^\s+|\s+$/g, '') : ''; }

  for (var i = 0; i < satirlar.length; i++) {
    var r = satirlar[i];
    if (s.tip >= 0 && norm_(al(r, s.tip)) !== 'sayac') continue;
    var id = al(r, s.cihaz);
    var d = zamanCoz_(s.zaman >= 0 ? r[s.zaman] : null);
    if (!id || !d) { atlanan++; continue; }
    okunan++;
    var gun = gunSayisi_(gunAnahtari_(d));
    var c = cihazlar[id];
    if (!c) c = cihazlar[id] = { ilk: gun, son: -1e12, sonT: -1e18, gunler: {}, kurulu: {}, kuruluVar: false, okul: '', platform: '', mod: '' };
    if (gun < c.ilk) c.ilk = gun;
    c.gunler[gun] = true;
    var mod = al(r, s.mod);
    if (norm_(mod) === 'kurulu') { c.kuruluVar = true; c.kurulu[gun] = true; }
    var t = d.getTime();
    if (t >= c.sonT) {
      c.sonT = t; c.son = gun;
      c.okul = al(r, s.okul); c.platform = al(r, s.platform); c.mod = mod;
    }
  }

  var gunlerDizi = [], gunIdx = {}, g;
  for (g = bugun - 89; g <= bugun; g++) {
    gunIdx[g] = { g: gunAdi_(g), aktif: 0, yeni: 0, kurulu: 0 };
    gunlerDizi.push(gunIdx[g]);
  }
  var toplam = 0, a7 = 0, a30 = 0, ab = 0, kuruluKisi = 0;
  var okul = {}, plat = {}, mods = {};
  function say(h, ad) { h[ad] = (h[ad] || 0) + 1; }

  Object.keys(cihazlar).forEach(function (id) {
    var c = cihazlar[id];
    toplam++;
    if (c.kuruluVar) kuruluKisi++;
    if (c.ilk >= bugun - 89 && c.ilk <= bugun) gunIdx[c.ilk].yeni++;
    var yedi = false, otuz = false, simdiki = false;
    Object.keys(c.gunler).forEach(function (k) {
      k = +k;
      if (k >= bugun - 89 && k <= bugun) {
        gunIdx[k].aktif++;
        if (c.kurulu[k]) gunIdx[k].kurulu++;
      }
      if (k >= bugun - 6 && k <= bugun) yedi = true;
      if (k >= bugun - 29 && k <= bugun) otuz = true;
      if (k === bugun) simdiki = true;
    });
    if (yedi) a7++;
    if (otuz) a30++;
    if (simdiki) ab++;
    say(okul, c.okul || 'Seçilmemiş');
    say(plat, c.platform || 'Bilinmiyor');
    say(mods, c.mod || 'Bilinmiyor');
  });

  function liste(h) {
    return Object.keys(h).map(function (ad) { return { ad: ad, kisi: h[ad] }; })
      .sort(function (x, y) { return y.kisi - x.kisi || (x.ad < y.ad ? -1 : 1); });
  }
  var es = {};
  for (var key in eslesme) es[key] = eslesme[key];
  es.okunanSatir = okunan; es.atlananSatir = atlanan;

  return {
    guncel: simdi.toISOString(),
    toplamKisi: toplam, son7Aktif: a7, son30Aktif: a30, bugunAktif: ab, kuruluKisi: kuruluKisi,
    gunler: gunlerDizi,
    okullar: liste(okul), platformlar: liste(plat), modlar: liste(mods),
    eslesme: es
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ozetle_: ozetle_, sutunBul_: sutunBul_, maskele_: maskele_, norm_: norm_, zamanCoz_: zamanCoz_ };
}
