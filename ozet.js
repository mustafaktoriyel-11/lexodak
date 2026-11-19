/* LEXOZET - cevrimdisi, yapay zekasiz (ML/ag yok) "hukuk ders notu -> sablon + cikarimsal ozet" motoru.
 * ES5, saf (DOM yok), tarayici + Node. Tek global: LEXOZET.
 *
 * GIRIS : pages = [ [ {t:'satir metni', h:yazi_yuksekligi?, y:?, x:?}, ... ], ... ]
 *         Satir yerine duz string de verilebilir. t:'' bos satir (paragraf ayraci) sayilir.
 *         x: sol kenar (pt), y: dikey konum, h: font yuksekligi - hepsi opsiyonel; verilirse
 *         baslik (buyuk punto), dipnot (kucuk punto), paragraf (girinti/bosluk) tespitinde kullanilir.
 *         Satirda 3+ ardisik bosluk "sutun boslugu" sayilir (tablo hucresi).
 *         Sayfa no = dizideki sira + 1.
 *
 * API   : LEXOZET.sablon(pages, opts) ->
 *   { basliklar:[{t,sayfa,seviye}], tanimlar:[{t,sayfa,baslik,terim?}],
 *     sartlar:[{t,sayfa,baslik,maddeler:[]}], listeler:[{t,sayfa,baslik,maddeler}],
 *     istisnalar:[{t,sayfa,baslik,guc}], atiflar:[{t,kanun,madde,fikra,sayfa,sayfalar,adet,kanunAd?,belirsiz?}],
 *     kanunlar:[{kanun,no,adet,kisaltma?}], kararlar:[{t,sayfa,mahkeme,esas?,kararNo?,tarih?}],
 *     gorusler:[{t,sayfa,tur}], ornekler:[{t,sayfa}], testler:[{t,secenekler,sayfa}],
 *     ozet:[{t,sayfa,baslik,baslikNo,tur,skor}], qa, sayfaSayisi, istatistik }
 *   opts: oran (ozet orani, varsayilan 0.2), baslikBasi (baslik basina azami cumle, opsiyonel)
 *   LEXOZET.metindenSayfalar(metin) : duz metinden (\f = sayfa) test girdisi uretir
 *   LEXOZET.pdfjsSatirlar(items)    : PDF.js textContent.items -> satirlar {t,h,y,x}
 *   LEXOZET.cumleBol(metin)         : Turkce hukuk cumle bolucu
 */
var LEXOZET = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Karakter / metin yardimcilari                                       */
  /* ------------------------------------------------------------------ */
  var HARF = 'A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû';
  var BUYUK = 'A-ZÇĞİÖŞÜÂÎÛ';
  var KUCUK = 'a-zçğıöşüâîû';
  var reBuyukTek = new RegExp('^[' + BUYUK + ']$');
  var reKucukTek = new RegExp('^[' + KUCUK + ']$');
  var reHarfTek = new RegExp('^[' + HARF + ']$');

  function bykMi(c) { return !!c && reBuyukTek.test(c); }
  function kckMi(c) { return !!c && reKucukTek.test(c); }
  function harfMi(c) { return !!c && reHarfTek.test(c); }
  function digitMi(c) { return !!c && c >= '0' && c <= '9'; }

  /* Turkce kucuk harf: I->i degil I->ı, İ->i */
  function lc(s) {
    return String(s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  }

  function temizle(s) {
    s = String(s === null || s === undefined ? '' : s);
    if (s.normalize) { try { s = s.normalize('NFC'); } catch (e) { /* yoksay */ } }
    s = s.replace(/[­​‌‍⁠﻿\f\r]/g, '')
      .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
      .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl')
      .replace(/[      \t]/g, ' ');
    return s;
  }
  function bosluk(s) { return s.replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

  function kelimeSay(s) {
    var m = s.match(/\S+/g);
    return m ? m.length : 0;
  }

  /* ------------------------------------------------------------------ */
  /* Turkce buyuk/kucuk harf, bozuk kasa (kucuk-buyuk harf yazi tipleri), baslik gosterimi */
  /* ------------------------------------------------------------------ */
  function ucs(s) { return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); }
  function ilkBuyuk(s) { return s ? ucs(s.charAt(0)) + s.substr(1) : s; }

  var KISALTMA_BUYUK = {};
  (function () {
    var l = ('TCK AYM HMK CMK TBK TMK TTK İİK IIK İYUK KVKK SOME USOM AİHM AİHS BM AB ABD TBMM YİBK HGK CGK HD CD KHK MK AY BK CMUK HUMK TDK TÜİK BDDK BTK EPDK SPK ' +
      'NATO OHAL PDF UYAP SGK YÖK TÜBİTAK TKHK MÖHUK İMK HUAK DMK VUK ÖSYM TRT TV TL USD EUR AVM LGBT DNA ŞİK İHD YSK SSK İŞKUR RTÜK TBB').split(' ');
    for (var i = 0; i < l.length; i++) { KISALTMA_BUYUK[l[i]] = 1; }
  })();
  var KISALTMA_KARISIK = /^(TebK|İşK|AvK|KabK|KTK|KamK|SiberGK|İnfazK|SSGSSK|CGTİK|CGTİHK|KarTK|IoT|AİHM|e-Devlet)$/;
  var LATIN_KELIME = {};
  ('argumentum hominem ad ante contra sensu lato stricto fallacies fallacy pro facto jure lex specialis generalis ratio legis dubio bona fide mala ipso erga omnes inter partes nullum crimen sine lege bis idem tuquoque quoque post hoc ergo propter slippery slope').split(' ').forEach(function (w) { LATIN_KELIME[w] = 1; });
  var KANUN_KISA_HARITA = { 'TEBK': 'TebK', 'TEBY': 'TebY', 'İŞK': 'İşK', 'ISK': 'İşK', 'AVK': 'AvK', 'KABK': 'KabK', 'KAMK': 'KamK', 'SİBERGK': 'SiberGK', 'İNFAZK': 'İnfazK', 'TEBYÖN': 'TebY', 'YÖN': 'Yön' };
  var MADDE_KISA = { 'M': 1, 'MD': 1, 'F': 1, 'B': 1, 'C': 1, 'BKZ': 1, 'VD': 1, 'VS': 1, 'S': 1, 'SA': 1 };
  var BASLIK_KUCUK = { ve: 1, ile: 1, veya: 1, ya: 1, da: 1, de: 1, ki: 1 };

  /* "ÖNyargIlar", "Özelleştİrme", "çIkarma", "otorİteye": kucuk harften sonra I/İ ya da ONyargi tipi */
  function anormalKelime(w) {
    if (w.length < 3) { return false; }
    if (KISALTMA_BUYUK[w] || KISALTMA_KARISIK.test(w)) { return false; }
    if (/[a-zçğıöşüâîû][Iİ]/.test(w)) { return true; }
    if (/^[A-ZÇĞİÖŞÜ]{2,}[a-zçğıöşü]{2,}/.test(w) && !KISALTMA_KARISIK.test(w)) { return true; }
    return false;
  }
  function anormalSatirMi(t) {
    var m = String(t).match(new RegExp('[' + HARF + ']+', 'g')) || [];
    for (var i = 0; i < m.length; i++) { if (anormalKelime(m[i])) { return true; } }
    return false;
  }
  function cumleBasiMi(str, off) {
    var on = str.substr(0, off).replace(/[«“"‘(\s]+$/, '');
    return on === '' || /[.?!:;]["”’»)]*$/.test(on);
  }
  /* govde metni: bozuk kasali kelimeleri duzelt (kucuk harf; cumle basinda ilk harf buyuk) */
  function govdeDuzelt(s) {
    if (!s || !/[a-zçğıöşü]/.test(s) || !/[A-ZÇĞİÖŞÜ]/.test(s)) { return s; }
    return s.replace(new RegExp('[' + HARF + ']+', 'g'), function (w, off, str) {
      if (!anormalKelime(w)) { return w; }
      var kck = lc(w);
      var onc = off > 0 ? str.charAt(off - 1) : '';
      if (onc === '’' || onc === '\'') { return kck; }
      if (cumleBasiMi(str, off) && bykMi(w.charAt(0))) { return ilkBuyuk(kck); }
      return kck;
    });
  }
  /* baslik: TAMAMEN BUYUK ya da bozuk kasaliysa duzgun Basliklar Gibi (Title Case) yaz; aksi halde oldugu gibi */
  function baslikBicim(t, zorla) {
    t = String(t).replace(/\s+/g, ' ').replace(/^ | $/g, '');
    if (!t) { return t; }
    var harfler = t.replace(new RegExp('[^' + HARF + ']', 'g'), '');
    if (harfler.length < 2) { return t; }
    var buy = (harfler.match(/[A-ZÇĞİÖŞÜÂÎÛ]/g) || []).length;
    var hepBuy = harfler.length >= 3 && buy / harfler.length >= 0.8;
    if (!zorla && !hepBuy && !anormalSatirMi(t)) { return t; }
    return baslikHarfle(t);
  }
  function baslikHarfle(t) {
    var say = 0;
    return t.replace(new RegExp('[' + HARF + ']+', 'g'), function (w, off, str) {
      var ilk = say++ === 0;
      var sonra = str.charAt(off + w.length), onc = off > 0 ? str.charAt(off - 1) : '';
      if (/^[IVXLCivxlc]+$/.test(w) && sonra === '.' && (ilk || /[\s(]/.test(onc))) { return w; }
      if (KANUN_KISA_HARITA[ucs(w)]) { return KANUN_KISA_HARITA[ucs(w)]; }
      if (MADDE_KISA[ucs(w)] && sonra === '.' && /^\.\s*\d/.test(str.substr(off + w.length, 4)) && !ilk) { return lc(w); }
      if (KISALTMA_BUYUK[w] || KISALTMA_KARISIK.test(w)) { return w; }
      if (w.length <= 4 && /^[A-ZÇĞİÖŞÜ]+$/.test(w) && !/[AEIİOÖUÜ]/.test(w)) { return w; }
      if (onc === '’' || onc === '\'') { return lc(w); }
      var k = lc(w);
      if (LATIN_KELIME[w.toLowerCase()]) { return ilkBuyuk(w.toLowerCase()); }
      if (!ilk && BASLIK_KUCUK[k]) { return k; }
      return ilkBuyuk(k);
    }).replace(/(^|[\s(])”(?=[A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1“');
  }
  /* terim: cumle bicimi (ilk harf buyuk, kisaltmalar korunur) */
  function terimBicim(t) {
    var say = 0;
    t = baslikBicim(t, true);
    return t.replace(new RegExp('[' + HARF + ']+', 'g'), function (w, off, str) {
      var ilk = say++ === 0;
      if (KISALTMA_BUYUK[w] || KISALTMA_KARISIK.test(w)) { return w; }
      if (/^[IVXLC]+$/.test(w) && str.charAt(off + w.length) === '.') { return w; }
      if (ilk) { return w; }
      return lc(w);
    });
  }

  function terimAdi(t) {
    t = String(t || '').replace(/^\s*(?:[IVXLC]+|[ivxlc]+|\d{1,2})\s*[.)]\s*/, '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
    if (!t || t.split(' ').length > 8 || /[.?!]$/.test(t)) { return ''; }
    return terimBicim(t);
  }

  /* cikti metni son temizligi: PUA/ligatur, kesme isareti, bosluk, yapisik cumle, bozuk kasa */
  function sonTemizle(s) {
    if (typeof s !== 'string' || !s) { return s; }
    s = s.replace(/^[\uE000-\uF8FF]+\s*/, '• ').replace(/[\uE000-\uF8FF]+/g, ' ')
      .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl')
      .replace(/\*\*/g, '')
      .replace(/\s*(?:-|–|—)>\s*/g, ' → ')
      .replace(/,\s+(ifade eder|ifade etmektedir|ifade edilir|ifade edilmektedir|denir|denilir|adı verilir|adı verilmektedir|olarak adlandırılır|anlamına gelir)(?=[.;)]|$)/gi, ' $1')
      .replace(new RegExp('([' + HARF + '])[\u2018\u0060\u00b4]([' + KUCUK + '])', 'g'), '$1’$2')
      .replace(/(\S)\s+•\s+/g, '$1; ')
      .replace(/\s+([!?;,])(?=\s|$)/g, '$1')
      .replace(/([a-zçğıöşü]*(?:tır|tir|tur|tür|dır|dir|dur|dür|ıdır|yor|yorlar|ecek|acak|ecektir|acaktır|maktadır|mektedir|mıştır|miştir|muştur|müştür|dı|di|du|dü|tı|ti|tu|tü|lar|ler))\s+\d{1,3}\.(?=\s*(?:\(s\.|$))/g, '$1.')
      .replace(new RegExp('([' + KUCUK + ']{2,})\\.([A-ZÇĞİÖŞÜ][' + KUCUK + ']{2,})', 'g'), '$1. $2')
      .replace(/(\S) {2,}/g, '$1 ');
    return govdeDuzelt(s);
  }

  var DOSYA_DUZELT = { 'calısma': 'çalışma', 'calisma': 'çalışma', 'çalisma': 'çalışma', 'çalısma': 'çalışma', 'notlari': 'notları', 'notlarım': 'notlarım',
    'guvenlik': 'güvenlik', 'guvenligi': 'güvenliği', 'ozet': 'özet', 'ozeti': 'özeti', 'hukukun': 'hukukun', 'tebligat': 'tebligat', 'mantik': 'mantık', 'hatalari': 'hataları',
    'sunum': 'sunum', 'ders': 'ders', 'cözümlü': 'çözümlü', 'cozumlu': 'çözümlü', 'sinav': 'sınav', 'sorulari': 'soruları', 'uygulama': 'uygulama', 'kanunu': 'kanunu', 'ceza': 'ceza', 'idare': 'idare', 'borclar': 'borçlar', 'medeni': 'medeni', 'usul': 'usul', 'hukuku': 'hukuku' };
  /* dosya adi -> sade baslik: uzanti ve zaman damgasi/sayac kuyrugunu at */
  function dosyaBasligi(ad) {
    var s = String(ad === null || ad === undefined ? '' : ad).replace(/[\\\/]+/g, ' ').replace(/^\s+|\s+$/g, '');
    var onceki, n = 0;
    do {
      onceki = s; n++;
      s = s.replace(/[\s_.\-]*\(\d{1,2}\)\s*$/, '')
        .replace(/[_\-\s]+\d{8}[_\-]?\d{6}([_\-]\d{1,4})?\s*$/, '')
        .replace(/[_\-\s]+\d{4}[_\-]\d{2}[_\-]\d{2}[_\-\s]+\d{2}[_\-.]\d{2}([_\-.]\d{2})?\s*$/, '')
        .replace(/[_\-\s]+\d{10,14}\s*$/, '')
        .replace(/\.(pptx?|pdf|docx?|odt|odp|key|rtf|txt|png|jpe?g)\s*$/i, '')
        .replace(/[_\-]\d{1,2}\s*$/, function (m, off, str) { return /[A-Za-zÇĞİÖŞÜçğıöşü]$/.test(str.substr(0, off)) && off >= 4 ? '' : m; })
        .replace(/^\s+|\s+$/g, '');
    } while (s !== onceki && n < 8);
    if (s.indexOf(' ') < 0 && /_/.test(s)) { s = s.replace(/_+/g, ' '); }
    s = s.replace(/\s{2,}/g, ' ').replace(/^[\s_\-.]+|[\s_\-.]+$/g, '');
    s = s.replace(new RegExp('(^|\\s)([' + HARF + ']+)(?=\\s|$)', 'g'), function (m0, a0, w) {
      var d = DOSYA_DUZELT[lc(w)];
      if (!d) { return m0; }
      return a0 + (bykMi(w.charAt(0)) ? ilkBuyuk(d) : d);
    });
    return s || String(ad || '').replace(/^\s+|\s+$/g, '');
  }

  /* ------------------------------------------------------------------ */
  /* CUMLE BOLUCU                                                         */
  /* ------------------------------------------------------------------ */
  var KISALTMA = {};
  (function () {
    var l = ('m md mad vd vb vs bkz bk krs s ss sy hd cd hgk cgk e k t no nolu yarg dan orn or prof doc dr av c cilt ' +
      'f fik fikr par bnd b bs cev ed haz gb yy yuz yrd ogr gor ars uzm st sn tel ibk ibbgk hk tar kn sk ek bsk mah ' +
      'bkn gen org ltd sti dn md. ay ayn tbk tmk hmk cmk iik tck ant a ay sa rg yön krş fık bnd').split(' ');
    var i;
    for (i = 0; i < l.length; i++) { KISALTMA[l[i]] = 1; }
    /* Turkce karakterli yazimlar */
    var t = ['krş', 'örn', 'ör', 'doç', 'fık', 'fıkr', 'çev', 'yüz', 'öğr', 'gör', 'arş', 'şti', 'bşk', 'ş', 'ç', 'ğ', 'ö', 'ü', 'ı'];
    for (i = 0; i < t.length; i++) { KISALTMA[t[i]] = 1; }
    /* ay: Anayasa kisaltmasi degil cumle sonu olabilir, cikar */
    delete KISALTMA.ay; delete KISALTMA.ayn; delete KISALTMA.ant; delete KISALTMA.tbk;
    delete KISALTMA.tmk; delete KISALTMA.hmk; delete KISALTMA.cmk; delete KISALTMA.iik; delete KISALTMA.tck;
    delete KISALTMA.a; delete KISALTMA.b; delete KISALTMA.c; delete KISALTMA.e; delete KISALTMA.k; delete KISALTMA.t;
  })();
  /* cumle sonunda da gelebilen "yumusak" kisaltmalar */
  var YUMUSAK = { vb: 1, vs: 1, vd: 1, gb: 1, yy: 1 };
  /* "4. HD", "21. Yuzyil" gibi sira sayisindan sonra gelen kelimeler */
  var SIRA_TAKIP = {};
  (function () {
    var l = ('hd cd hgk cgk hukuk ceza daire dairesi daireleri asliye sulh icra iş is ağır agir bölge bolge genel kurul kurulu ' +
      'yüzyıl yuzyil yüzyılda madde maddesi fıkra bent sınıf dönem bölüm kısım ticaret idare vergi anayasa ' +
      'dava ahvali medeni').split(' ');
    for (var i = 0; i < l.length; i++) { SIRA_TAKIP[l[i]] = 1; }
  })();

  /* metni cumlelere ayirir */
  function bol(text) {
    var out = [];
    var n = text.length;
    var bas = 0;
    var i, c;
    var qd = 0, gd = 0, pd = 0, sq = 0;
    var reTerm = /[.?!…]/;
    var reKapa = /["”»’')\]]/;
    var reAc = /["“«(\[‘]/;
    for (i = 0; i < n; i++) {
      c = text.charAt(i);
      if (c === '“') { qd++; } else if (c === '”') { if (qd > 0) { qd--; } }
      else if (c === '«') { gd++; } else if (c === '»') { if (gd > 0) { gd--; } }
      else if (c === '(') { pd++; } else if (c === ')') { if (pd > 0) { pd--; } }
      else if (c === '"') { sq = sq ? 0 : 1; }
      if (!reTerm.test(c)) { continue; }
      /* terminator dizisi */
      var j = i;
      while (j + 1 < n && reTerm.test(text.charAt(j + 1))) { j++; }
      var run = j - i + 1;
      var k = j + 1;
      /* kapanislari tuket (derinlikleri guncelle) */
      var qd2 = qd, gd2 = gd, pd2 = pd, sq2 = sq;
      while (k < n && reKapa.test(text.charAt(k))) {
        var ck = text.charAt(k);
        if (ck === '”') { if (qd2 > 0) { qd2--; } }
        else if (ck === '»') { if (gd2 > 0) { gd2--; } }
        else if (ck === ')') { if (pd2 > 0) { pd2--; } }
        else if (ck === '"') { sq2 = sq2 ? 0 : 1; }
        k++;
      }
      if (k < n && text.charAt(k) !== ' ') { i = j; continue; }  /* 2.3.2005, m.5 */
      var m = k;
      while (m < n && text.charAt(m) === ' ') { m++; }
      if (m >= n) { i = n; break; }
      /* acik tirnak/parantez icindeyse bolme (cok uzun degilse) */
      if ((qd2 || gd2 || pd2 || sq2) && (k - bas) < 700) { i = j; continue; }
      var r = m;
      while (r < n && reAc.test(text.charAt(r))) { r++; }
      var rc = text.charAt(r);
      var sonraBuyuk = bykMi(rc) || digitMi(rc);
      var sonraKucuk = kckMi(rc);
      var bol_ = false;
      var term = text.charAt(i);
      if (sonraKucuk) {
        bol_ = false;
      } else if (term !== '.' || run > 1) {
        bol_ = sonraBuyuk || (!harfMi(rc) && !digitMi(rc) && r < n && false);
      } else {
        /* tek nokta: onceki sozcuge bak */
        var ws = i - 1;
        while (ws >= bas && text.charAt(ws) !== ' ' && text.charAt(ws) !== '(' && text.charAt(ws) !== '“' && text.charAt(ws) !== '"' && text.charAt(ws) !== '«') { ws--; }
        var tok = text.substring(ws + 1, i);
        var tokL = lc(tok).replace(/[^a-zçğıöşü0-9.]/g, '');
        if (!sonraBuyuk) {
          bol_ = false;
        } else if (tokL.length === 0) {
          bol_ = false;
        } else if (/^[a-zçğıöşü]$/.test(tokL)) {
          bol_ = false;                                   /* tek harf: E. K. T. s. m. A. */
        } else if (/^([a-zçğıöşü]{1,3}\.)+[a-zçğıöşü]{1,3}$/.test(tokL) && tokL.indexOf('.') > 0) {
          bol_ = false;                                   /* T.C. A.S. a.g.e. */
        } else if (/^\d{1,3}$/.test(tokL)) {
          /* sira sayisi mi, basvuru numarasi mi? */
          var w2e = ws - 1;
          while (w2e >= bas && text.charAt(w2e) === ' ') { w2e--; }
          var w2s = w2e;
          while (w2s >= bas && text.charAt(w2s) !== ' ') { w2s--; }
          var onc = lc(text.substring(w2s + 1, w2e + 1)).replace(/[^a-zçğıöşü.]/g, '').replace(/\.$/, '');
          if (KISALTMA[onc] && onc !== 'e' && onc !== 'k' && onc !== 't') { bol_ = true; }
          else if (onc === 'e' || onc === 'k' || onc === 't') { bol_ = false; }
          else { bol_ = false; }
        } else if (/^\d+$/.test(tokL)) {
          bol_ = true;                                    /* yil / buyuk sayi */
        } else if (KISALTMA[tokL]) {
          bol_ = YUMUSAK[tokL] ? true : false;
        } else {
          bol_ = true;
        }
      }
      if (bol_) {
        var s = text.substring(bas, k).replace(/^\s+|\s+$/g, '');
        if (s) { out.push(s); }
        bas = m;
      }
      qd = qd2; gd = gd2; pd = pd2; sq = sq2;
      i = k - 1;
    }
    var son = text.substring(bas).replace(/^\s+|\s+$/g, '');
    if (son) { out.push(son); }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Durak sozcukler + kok (F5)                                          */
  /* ------------------------------------------------------------------ */
  var DURAK = {};
  (function () {
    var l = ('acaba ama ancak artık aslında az bana bazı belki ben benden beni benim beri bile bir birçok biri birkaç ' +
      'birkez biz bize bizi bizim bu buna bunda bundan bunlar bunları bunların bunu bunun burada çok çünkü da daha dahi de ' +
      'defa diye değil eğer en gibi hem hep hepsi her hiç için ile ise kez ki kim mı mi mu mü nasıl ne neden nerde nerede ' +
      'nereye niçin niye o olarak olan olduğu olması olursa olup oldu olmak olmuştur olur olabilir olmayan ona ondan onlar ' +
      'onları onların onu onun öyle pek rağmen sanki şey siz şu şuna şunu tüm ve veya veyahut ya yani yoksa yine zaten ' +
      'ayrıca bununla birlikte dolayı sonra önce göre kadar üzere ait ilgili yer hâlde halde halinde hâlinde durumunda söz ' +
      'konusu bakımından açısından nedenle sebeple sebebiyle itibaren tarafından ' +
      'madde maddesi maddenin fıkra fıkrası bent belirtilen yukarıda aşağıda şeklinde şekilde hususu husus durum ' +
      'bulunmaktadır bulunur bulunan edilir edilmektedir yapılır yapılmaktadır söylenebilir gerekir gerekmektedir ' +
      'mümkündür mümkün olduğunu olduğundan bulunması bulunmamaktadır gerekli gerektiği gerektiğinde şüphesiz ' +
      'bakımdan yönünden hâl hal özellikle genel genellikle yalnızca sadece ' +
      'üzerinde üzerine üzerinden arasında içinde içerisinde dışında ayrı diğer başka birinci ikinci üçüncü ' +
      'tek ise dır dir dur dür tır tir tur tür olarak ' +
      'sözkonusu kapsamında çerçevesinde nitelikte niteliğinde yani örneğin mesela ' +
      'şu bu o ise hangi hangisi şöyle böyle öyle nitekim zira çünkü yüzden dolayısıyla bu nedenle ' +
      'olması olmaması olabilmesi yapılması yapılabilmesi yapılan yapılacak yapılmış edilen edilecek edilmiş ' +
      'etmek etmesi eder eden etmiş yapmak yapar yapan yapmış vardır yoktur var yok ' +
      'olmuş olacak olabilir olmalıdır olmalı gerekmez').split(' ');
    for (var i = 0; i < l.length; i++) { DURAK[l[i]] = 1; }
  })();
  var DURAK_KOK = {};
  (function () {
    var l = ['olduğ', 'olmas', 'olmay', 'olara', 'olmuş', 'olabi', 'bulun', 'edilm', 'edile', 'yapıl', 'gerek', 'mümkü',
      'söyle', 'görül', 'olmam', 'olmal', 'olaca', 'ederl', 'yapma', 'yapar', 'etmek', 'etmes', 'denil', 'dahil', 'dâhil'];
    for (var i = 0; i < l.length; i++) { DURAK_KOK[l[i]] = 1; }
  })();

  function kok(w) { return w.length > 5 ? w.substr(0, 5) : w; }

  var reKelime = /[a-zçğıöşüâîû0-9]+/g;
  function kokler(s) {
    var low = lc(s);
    var m = low.match(reKelime);
    var out = [];
    if (!m) { return out; }
    for (var i = 0; i < m.length; i++) {
      var w = m[i];
      if (w.length < 3) { continue; }
      if (DURAK[w]) { continue; }
      var k = kok(w);
      if (DURAK_KOK[k]) { continue; }
      out.push(k);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Girdi hazirlama: temizleme, ust/alt bilgi, icindekiler, birlestirme  */
  /* ------------------------------------------------------------------ */
  function sayfaNoMu(t) {
    return /^[-–—\s]*\d{1,4}[-–—\s]*$/.test(t) ||
      /^(sayfa|sf\.?|page|s\.)\s*\d+(\s*(\/|of|\/)\s*\d+)?$/i.test(t) ||
      /^\d+\s*\/\s*\d+$/.test(t) ||
      /^[-–—]\s*\d+\s*[-–—]$/.test(t);
  }
  function ustKey(t) {
    return lc(t).replace(/\d+/g, '#').replace(/[^a-zçğıöşü#]+/g, '');
  }

  /* ------------------------------------------------------------------ */
  /* Kapak, sinav bolumu, vurgulu kutu, tablo ayiklama                    */
  /* ------------------------------------------------------------------ */
  var PHT = 'Tablo ........................ .';

  function govdeIst(L) {
    var N = L.length, i, hVar = 0, hler = [], uz = [], oranlar = [];
    for (i = 0; i < N; i++) {
      if (L[i].ph) { continue; }
      if (L[i].h) { hVar++; if (L[i].t.length >= 25) { hler.push(L[i].h); } }
    }
    var bodyH = (hVar >= 0.5 * N && hler.length) ? medyan(hler) : 0;
    for (i = 0; i < N; i++) { if (!L[i].ph && L[i].t.length >= 30 && !L[i].gap && !L[i].fn) { uz.push(L[i].t.length); } }
    for (i = 1; i < N; i++) {
      var a = L[i - 1], b = L[i];
      if (!a.ph && !b.ph && a.p === b.p && a.y !== null && b.y !== null && b.h && a.h) {
        var dd = Math.abs(a.y - b.y) / b.h;
        if (dd > 0.9 && dd < 2.0) { oranlar.push(dd); }
      }
    }
    return { bodyH: bodyH, lenRef: yuzdelik(uz, 0.85) || 80, rho: oranlar.length >= 8 ? medyan(oranlar) : 1.45 };
  }

  /* ---- kapak ---- */
  var RE_KAPAK_META = /(ders\s+kodu|kaynak\s*:|hazırlayan|hazırlanan|yazar\s*:|dönem|akademik\s+yıl|üniversites|fakültes|(^|[^a-zçğıöşü])(prof|doç|dr|arş|öğr)\.\s|öğretim\s+(üyesi|görevlisi)|sürüm|versiyon|tarih\s*:|danışman|çalışma\s+notu)/;
  function kapakAyikla(L, bodyH) {
    var lim = Math.min(L.length, 14), i, son = -1, meta = 0, oncekiMeta = false, baslik = '';
    for (i = 0; i < lim; i++) {
      var ln = L[i];
      if (ln.p !== 1 || ln.fn) { break; }
      var t = ln.t, lt = lc(t);
      var baslikMi = i === 0 && t.length <= 90 && !/[.:;?!]$/.test(t) && (hepBuyukMu(t) || (bodyH && ln.h && ln.h >= 1.3 * bodyH));
      var altMi = i <= 2 && t.length <= 130 && / [·|•] | \+ /.test(t) && !/[.?!]$/.test(t);
      var metaMi = RE_KAPAK_META.test(lt) && t.length <= 170 && !/[?!]$/.test(t);
      var devamMi = oncekiMeta && !/[.?!,]["”)]*$/.test(L[i - 1].t) && t.length <= 60 && !/,$/.test(t) && (kckMi(t.charAt(0)) || /[”")]\s*(\(\d+\s*s\.\))?$/.test(t));
      if (baslikMi) { baslik = t; son = i; oncekiMeta = false; continue; }
      if (altMi || metaMi || devamMi) { son = i; if (!devamMi) { meta++; } oncekiMeta = metaMi || altMi || devamMi; continue; }
      break;
    }
    if (son < 0 || !meta || son + 1 >= L.length) { return { L: L, kapak: null }; }
    var satirlar = [];
    for (i = 0; i <= son; i++) { satirlar.push(L[i].t); }
    return { L: L.slice(son + 1), kapak: { baslik: baslik, satirlar: satirlar } };
  }

  /* ---- deneme sinavi / cevap anahtari bolumleri ---- */
  var RE_SINAV_BASLA = /^(?:(?:bölüm|kısım|ek)\s+[a-zçğıöşü0-9]+\s*[–—:.\-]\s*)?(?:deneme\s+sınav|deneme\s+test|örnek\s+sınav|çıkmış\s+soru|soru\s+bankası|alıştırma\s+soru|tekrar\s+soru|cevap\s+anahtar|sınav\s+soruları)/;
  var RE_BOLUM = /^(?:bölüm|kısım)\s+[a-zçğıöşü0-9]+\s*[–—:.\-]/;
  function sinavBaslaMi(ln) {
    var t = ln.t;
    return t.length <= 90 && !/[.?!,;]$/.test(t) && kelimeSay(t) <= 9 && RE_SINAV_BASLA.test(lc(t));
  }
  function sinavBolgeleriniAyir(L, bodyH) {
    var out = [], reg = [], i = 0, N = L.length;
    while (i < N) {
      if (sinavBaslaMi(L[i])) {
        var j = i;
        while (j < N) {
          var ln = L[j];
          if (j > i && !sinavBaslaMi(ln)) {
            var lt = lc(ln.t);
            var yeniBolum = RE_BOLUM.test(lt) ||
              (ln.t.length >= 10 && ln.t.length <= 90 && hepBuyukMu(ln.t) && kelimeSay(ln.t) >= 2 && !/^([a-zçğıöşü]|\d{1,2})\s*[.)]/.test(lt) && !/^(klasik|test|deneme|cevap|not)/.test(lt)) ||
              (bodyH && ln.h && ln.h >= 1.12 * bodyH && ln.t.length <= 90 && !/[.?!]$/.test(ln.t) && !/^(klasik|test|deneme|cevap|soru|k\d)/.test(lt));
            if (yeniBolum) { break; }
          }
          reg.push(ln); j++;
        }
        i = j;
        continue;
      }
      out.push(L[i]); i++;
    }
    return { L: out, bolge: reg };
  }

  function sinavCozumle(R) {
    var testler = [], klasik = [], i;
    var mode = '', deneme = 0, anahtarD = 0, q = null, sonG = null, sonK = null;
    var key = {}, gerekce = {}, kcevap = {};
    function kapat() {
      if (!q) { return; }
      if (q.tur === 'k') { klasik.push({ t: q.t, no: q.no, puan: q.puan, deneme: q.deneme, sayfa: q.sayfa }); }
      else if (q.sec.length >= 2) {
        testler.push({ t: q.t, secenekler: q.sec, sayfa: q.sayfa, no: q.no, deneme: q.deneme });
      }
      q = null;
    }
    for (i = 0; i < R.length; i++) {
      var t = R[i].t, lt = lc(t), m;
      if ((m = /^deneme\s+sınav[ıi]\s*[:\-]?\s*(\d+)/.exec(lt))) { kapat(); deneme = parseInt(m[1], 10); mode = ''; sonG = null; sonK = null; continue; }
      if ((m = /^deneme\s*(\d+)\s*$/.exec(lt))) { kapat(); anahtarD = parseInt(m[1], 10); mode = 'anahtar'; sonG = null; sonK = null; continue; }
      if (/^((bölüm|kısım)\s+\S+\s*[–—:\-]\s*)?cevap\s+anahtar/.test(lt)) { kapat(); mode = 'anahtar'; continue; }
      if (/^klasik\s+sorular/.test(lt)) { kapat(); mode = 'klasik'; continue; }
      if (/^test\s+soruları/.test(lt)) { kapat(); mode = 'test'; continue; }
      if (/^klasik\s+cevap\s+noktaları/.test(lt)) { kapat(); mode = 'kcevap'; sonK = null; continue; }
      if (mode === 'klasik') {
        m = /^(K|S|Soru)\s?(\d{1,2})\s*(?:\(\s*(\d+)\s*(?:p|puan)\s*\))?\s*[.):\-]\s*(.*)$/.exec(t);
        if (m) { kapat(); q = { tur: 'k', no: 'K' + m[2], puan: m[3] ? parseInt(m[3], 10) : 0, t: m[4], deneme: deneme, sayfa: R[i].p }; }
        else if (q) { q.t = birlestir(q.t, t); }
      } else if (mode === 'test') {
        m = /^([A-E])\s*[.)]\s*(\S.*)$/.exec(t);
        if (m && q && q.tur === 't') { q.sec.push(m[1] + ') ' + m[2]); continue; }
        m = /^(\d{1,2})\s*[.)]\s+(\S.*)$/.exec(t);
        if (m && (!q || q.sec.length >= 2)) { kapat(); q = { tur: 't', no: parseInt(m[1], 10), t: m[2], sec: [], deneme: deneme, sayfa: R[i].p }; }
        else if (q) {
          if (q.sec.length) { q.sec[q.sec.length - 1] = birlestir(q.sec[q.sec.length - 1], t); } else { q.t = birlestir(q.t, t); }
        }
      } else if (mode === 'anahtar') {
        if (!key[anahtarD]) { key[anahtarD] = {}; gerekce[anahtarD] = {}; }
        m = /^test\s*:\s*(.*)$/i.exec(t);
        if (m) {
          var rg = /(\d{1,2})\s*[-–:.)]\s*([A-E])(?![A-Za-zÇĞİÖŞÜçğıöşü])/g, pm;
          while ((pm = rg.exec(m[1]))) { key[anahtarD][parseInt(pm[1], 10)] = pm[2]; }
          sonG = null; continue;
        }
        if (/^no\s+(cvp|cevap)/.test(lt)) { continue; }
        m = /^(\d{1,2})\s+([A-E])\s+(\S.*)$/.exec(t);
        if (m) { var no = parseInt(m[1], 10); key[anahtarD][no] = m[2]; gerekce[anahtarD][no] = m[3]; sonG = { d: anahtarD, n: no }; }
        else if (sonG) { gerekce[sonG.d][sonG.n] = birlestir(gerekce[sonG.d][sonG.n], t); }
      } else if (mode === 'kcevap') {
        if (!kcevap[anahtarD]) { kcevap[anahtarD] = {}; }
        m = /^(K\d{1,2})\s*[:.]\s*(.*)$/.exec(t);
        if (m) { kcevap[anahtarD][m[1]] = m[2]; sonK = m[1]; }
        else if (sonK) { kcevap[anahtarD][sonK] = birlestir(kcevap[anahtarD][sonK], t); }
      }
    }
    kapat();
    for (i = 0; i < testler.length; i++) {
      var tq = testler[i], kk = key[tq.deneme];
      if (kk && kk[tq.no]) { tq.cevap = kk[tq.no]; }
      if (gerekce[tq.deneme] && gerekce[tq.deneme][tq.no]) { tq.aciklama = gerekce[tq.deneme][tq.no]; }
    }
    for (i = 0; i < klasik.length; i++) {
      var kq = klasik[i];
      if (kcevap[kq.deneme] && kcevap[kq.deneme][kq.no]) { kq.cevapNoktalari = kcevap[kq.deneme][kq.no]; }
    }
    return { testler: testler, klasik: klasik };
  }

  /* ---- vurgulu kutular ---- */
  var RE_YZ1 = /^GEM[İI]N[İI]\s+NOTU(?:\s+EKLED[İI])?\s*[:：\-–—]?\s*(.*)$/i;
  var RE_YZ2 = /^(?:YZ|Yapay\s+zek[âa]|AI)\s*(?:eki|notu|ilavesi|katkısı)\s*[:：]\s*(.*)$/i;
  var RE_EK = /^EK\s+B[İI]LG[İI](?:\s*\(([^)]*)\))?\s*[:：]?\s*(.*)$/;
  var RE_SINAV_CAPS = /^(SINAVDA\s+ÇIKAR|SINAVDA\s+ÇIKABİLİR|SINAVDA\s+SORULUR|SINAVDA\s+DİKKAT|SINAV\s+İPUCU|SINAV\s+NOTU|SINAV\s+UYARISI|HOCANIN\s+NOTU|HOCANIN\s+İPUCU|HOCANIN\s+UYARISI|HOCA\s+NOTU|ÇOK\s+ÖNEMLİ|ÖNEMLİ|DİKKAT|UYARI|İPUCU|MUTLAKA\s+BİL|AKILDA\s+TUTUN)\s*([:：!]?)\s*(.*)$/;
  var RE_SINAV_ETIKET = /^(Önemli|Dikkat|Uyarı|İpucu|Not|Hocanın\s+notu|Hoca\s+notu|Hocanın\s+uyarısı|Sınav\s+notu|Sınavda\s+çıkar|Sınavda)\s*[:：]\s*(\S.*)$/;
  function kutuIsareti(t, parBasi) {
    var s = t, sim = false, m;
    var m0 = /^[★☆✦✧⭐✱●◆▶►■□✔⚠❗‼]+\s*/.exec(s);
    if (m0) { s = s.substr(m0[0].length); sim = true; }
    if ((m = RE_YZ1.exec(s))) { return { tip: 'yz', etiket: 'Gemini notu', ic: m[1] }; }
    if ((m = RE_YZ2.exec(s))) { return { tip: 'yz', etiket: 'YZ eki', ic: m[1] }; }
    if ((m = RE_EK.exec(s)) && (sim || s.length <= 90)) { return { tip: 'yz', etiket: 'Ek bilgi', ic: m[2], ad: m[1] || '' }; }
    if ((m = RE_SINAV_CAPS.exec(s))) {
      var kalan = m[3];
      if (!kalan || m[2] || kckMi(kalan.charAt(0))) { return { tip: 'sinav', etiket: m[1].replace(/\s+/g, ' '), ic: kalan }; }
      if (!hepBuyukMu(kalan) && sim) { return { tip: 'sinav', etiket: m[1].replace(/\s+/g, ' '), ic: kalan }; }
    }
    if (sim && /^(sınavda çıkar|önemli|dikkat|uyarı|ipucu|ipucu)/.test(lc(s)) && s.length <= 40) {
      return { tip: 'sinav', etiket: s.replace(/[:：!\s]+$/, ''), ic: '' };
    }
    if ((m = RE_SINAV_ETIKET.exec(s))) { return { tip: 'sinav', etiket: m[1], ic: m[2] }; }
    if (parBasi && /^Sınavda\s+\S/.test(s)) { return { tip: 'sinav', etiket: 'Sınavda', ic: s }; }
    return null;
  }

  var RE_BUL = /^(?:([•●▪■◦·]|[-–—*])\s+|(\d{1,2})[.)]\s+|\(([a-zçğıöşü\d])\)\s+|([a-zçğıöşü])\)\s+|(→)\s*)(\S.*)$/;
  function kutuCozumle(satirlar) {
    var W = 0, i, items = [], cur = null;
    for (i = 0; i < satirlar.length; i++) { if (satirlar[i].t.length > W) { W = satirlar[i].t.length; } }
    for (i = 0; i < satirlar.length; i++) {
      var l = satirlar[i], t = l.t, m = RE_BUL.exec(t), yeni = false;
      if (!cur) { yeni = true; }
      else if (m) { yeni = true; }
      else {
        var pv = cur.son, pt = pv.t;
        var kapali = /[.:;!?)”"]$/.test(pt);
        var dolu = pt.length >= 0.85 * W;
        var kucukB = kckMi(t.charAt(0));
        var inDown = l.x !== null && pv.x !== null && pv.x - l.x >= 8;
        if (kucukB) { yeni = false; }
        else if (/:$/.test(pt)) { yeni = true; }
        else if (inDown) { yeni = true; }
        else if (!dolu) { yeni = true; }
        else { yeni = false; }
        if (!yeni && !kapali && !dolu) { yeni = false; }
      }
      if (yeni) {
        cur = { t: m ? m[6] : t, son: l, ok: m && m[5] ? '→ ' : '' };
        items.push(cur);
      } else { cur.t = birlestir(cur.t, t); cur.son = l; }
    }
    var out = [];
    for (i = 0; i < items.length; i++) { out.push(bosluk(items[i].ok + items[i].t)); }
    return out;
  }

  function kutulariAyikla(L, bodyH, lenRefK) {
    var out = [], i = 0, N = L.length;
    while (i < N) {
      var ln = L[i];
      var parBasi = i === 0 || ln.b || ln.p !== L[i - 1].p || /[.!?:]["”)]?$/.test(L[i - 1].t);
      var mk = (ln.fn || ln.ph) ? null : kutuIsareti(ln.t, parBasi);
      if (!mk) { out.push(ln); i++; continue; }
      var bx = ln.x, sat = [], j = i + 1, icerikSay = 0, standalone = !mk.ic || (hepBuyukMu(mk.ic) && !/[.:;?!]$/.test(mk.ic) && mk.ic.length <= 60), icH = null;
      if (mk.ic) { sat.push({ t: bosluk(mk.ic), x: ln.x, h: ln.h }); icH = ln.h; }
      var maxS = standalone ? 60 : 8;
      while (j < N && sat.length < maxS) {
        var nx = L[j], pv = L[j - 1];
        if (nx.fn || nx.ph) { break; }
        if (kutuIsareti(nx.t, false)) { break; }
        if (nx.b && !(standalone && icerikSay === 0)) { break; }
        if (standalone && bx !== null && nx.x !== null && nx.x < bx - 4) { break; }
        if (bodyH && nx.h && nx.h >= bodyH * 1.12) { break; }
        if (/^\d{1,2}(?:\.\d{1,2})+\.?\s+[A-ZÇĞİÖŞÜ]/.test(nx.t) && nx.t.length <= 100 && !/[.:;,]$/.test(nx.t)) { break; }
        if (hepBuyukMu(nx.t) && nx.t.length >= 6 && nx.t.length <= 90 && !/^[•\-–]/.test(nx.t)) { break; }
        if (icH === null && sat.length === 0 && !standalone) { icH = ln.h; }
        if (!standalone && sat.length && /[.!?]["”)]*$/.test(pv.t) && (RE_BUL.test(nx.t) || /^\d{1,3}\s*[-–]\s*\S/.test(nx.t) || pv.t.length < 0.75 * lenRefK)) { break; }
        if (sat.length && nx.h && sat[0].h && Math.abs(nx.h - sat[0].h) > 0.14 * sat[0].h) { break; }
        if (!standalone && nx.h && ln.h && Math.abs(nx.h - ln.h) > 0.1 * ln.h) { break; }
        sat.push({ t: bosluk(nx.t), x: nx.x, h: nx.h, p: nx.p }); icerikSay++; j++;
      }
      var items = kutuCozumle(sat);
      var ad = mk.ad || '';
      if (items.length && hepBuyukMu(items[0]) && items[0].length <= 60 && !/[.:;?!]$/.test(items[0])) { ad = ad ? ad + ' · ' + items[0] : items[0]; items.shift(); }
      if (items.length) {
        var kt = items[0], km = items.slice(1), ci;
        for (ci = 0; ci < km.length - 1; ci++) {
          if (/:$/.test(km[ci]) && ci + 1 < km.length) {
            kt = [kt].concat(km.slice(0, ci + 1)).join(' '); km = km.slice(ci + 1); break;
          }
        }
        var kutu = { tip: mk.tip, etiket: mk.etiket, ad: ad, sayfa: ln.p, t: kt, maddeler: km };
        /* "IPUCU:" kutusu uzun/aciklayici ise sinav notu degil, siradan govde metnidir */
        var tumKutu = kt + ' ' + km.join(' ');
        if (mk.tip === 'sinav' && /^[İI]PUCU$/i.test(mk.etiket) && kelimeSay(tumKutu) > 40 && !/(sınav|mutlaka|önemli|dikkat|karıştır|unutma|soru)/.test(lc(tumKutu))) {
          if (mk.ic) { var kopya = {}, ky0; for (ky0 in ln) { if (ln.hasOwnProperty(ky0)) { kopya[ky0] = ln[ky0]; } } kopya.t = mk.ic; out.push(kopya); }
          for (var bk = i + 1; bk < j; bk++) { out.push(L[bk]); }
          i = j;
          continue;
        }
        out.push({ t: PHT, ph: true, kutu: kutu, p: ln.p, x: ln.x, y: ln.y, h: ln.h, b: true, bn: 1, gap: 0 });
      }
      i = j;
    }
    return out;
  }

  /* ---- tablolar ---- */
  var RE_OK = /^[➜→⇒▶►➔➡⟶»>]+$/;
  function tabloTohumu(ln, lenRef) {
    var c = ln.c;
    if (!c || c.length < 2 || ln.ph || ln.fn) { return false; }
    if (c.length >= 5 && ln.t.length >= 0.6 * lenRef && !hepBuyukMu(ln.t)) {
      var tek = 0, k;
      for (k = 0; k < c.length; k++) { if (c[k].t.indexOf(' ') < 0) { tek++; } }
      if (tek >= 0.7 * c.length) { return false; }
    }
    return true;
  }
  function bantBul(c, bantlar) {
    var bi = -1, bo = 0, k, ox;
    for (k = 0; k < bantlar.length; k++) {
      ox = Math.min(c.x2, bantlar[k].x2) - Math.max(c.x, bantlar[k].x);
      if (ox > bo) { bo = ox; bi = k; }
    }
    if (bi >= 0) {
      var gen = Math.min(c.x2 - c.x, bantlar[bi].x2 - bantlar[bi].x);
      if (bo >= 0.5 * gen || bo >= 6) { return bi; }
    }
    /* en yakin bant (merkez) */
    var cm = (c.x + c.x2) / 2, bd = 1e9;
    for (k = 0; k < bantlar.length; k++) {
      var d = Math.abs(cm - (bantlar[k].x + bantlar[k].x2) / 2);
      if (d < bd) { bd = d; bi = k; }
    }
    return bi;
  }
  function hucreOlarak(ln) {
    if (ln.c) { return ln.c; }
    return [{ x: ln.x === null ? 0 : ln.x, x2: ln.x2 !== null && ln.x2 !== undefined ? ln.x2 : (ln.x || 0) + ln.t.length * 5.5, t: ln.t }];
  }
  function tabloParcaMi(nx, bantlar) {
    if (nx.c) { return false; }
    var hc = hucreOlarak(nx)[0], k, ust = 0, hz = -1;
    for (k = 0; k < bantlar.length; k++) {
      var ox = Math.min(hc.x2, bantlar[k].x2) - Math.max(hc.x, bantlar[k].x);
      if (ox > 0) { ust++; hz = k; }
    }
    if (ust !== 1) { return false; }
    var b = bantlar[hz], solHizali = Math.abs(hc.x - b.x) <= 3.5, orta = Math.abs((hc.x + hc.x2) / 2 - (b.x + b.x2) / 2) <= 6;
    if (!solHizali && !orta) { return false; }
    /* paragraf satiri: sutundan cok genis olamaz (son sutun haric) */
    if (hz < bantlar.length - 1 && hc.x2 > bantlar[hz + 1].x - 1) { return false; }
    return true;
  }

  function tabloKur(reg, rho) {
    var best = null, i, k;
    for (i = 0; i < reg.length; i++) { if (reg[i].c && (!best || reg[i].c.length > best.c.length)) { best = reg[i]; } }
    if (!best) { return null; }
    var bantlar = [];
    for (k = 0; k < best.c.length; k++) { bantlar.push({ x: best.c[k].x, x2: best.c[k].x2 }); }
    var K = bantlar.length, hucreler = [], ok = false, hs = [];
    for (i = 0; i < reg.length; i++) {
      var cs = hucreOlarak(reg[i]);
      for (k = 0; k < cs.length; k++) {
        if (RE_OK.test(cs[k].t)) { ok = true; continue; }
        hucreler.push({ x: cs[k].x, x2: cs[k].x2, t: cs[k].t, y: reg[i].y, h: reg[i].h, sira: hucreler.length, ln: reg[i], col: bantBul(cs[k], bantlar) });
      }
      if (reg[i].h) { hs.push(reg[i].h); }
    }
    var yVar = true;
    for (i = 0; i < reg.length; i++) { if (reg[i].y === null) { yVar = false; } }
    var rows = [];
    function satirAc() { var r = []; for (var z = 0; z < K; z++) { r.push([]); } rows.push(r); return r; }
    if (yVar) {
      var hm = medyan(hs) || 10, lineH = rho * hm;
      var srt = hucreler.slice().sort(function (a, b) { return (b.y - a.y) || (a.sira - b.sira); });
      var dilimler = [];
      for (i = 0; i < srt.length; i++) {
        var d = dilimler.length ? dilimler[dilimler.length - 1] : null;
        if (d && Math.abs(d.y - srt[i].y) <= Math.max(1.5, 0.4 * hm)) { d.h.push(srt[i]); } else { dilimler.push({ y: srt[i].y, h: [srt[i]] }); }
      }
      var cur = null;
      for (i = 0; i < dilimler.length; i++) {
        var dl = dilimler[i], yeni = !cur;
        if (cur) {
          var gap = dilimler[i - 1].y - dl.y, col0 = false;
          for (k = 0; k < dl.h.length; k++) { if (dl.h[k].col === 0) { col0 = true; } }
          yeni = gap > lineH * 1.25 && !(!col0 && gap < lineH * 1.6);
        }
        if (yeni) { cur = satirAc(); }
        for (k = 0; k < dl.h.length; k++) { cur[dl.h[k].col].push(dl.h[k].t); }
      }
    } else {
      var bos = 0;
      for (i = 0; i < reg.length; i++) { if (reg[i].b && i > 0) { bos++; } }
      var cur2 = null, sonLn = null;
      for (i = 0; i < hucreler.length; i++) {
        var hc = hucreler[i], yeni2 = !cur2;
        if (cur2 && hc.ln !== sonLn) {
          if (bos > 0) { yeni2 = !!hc.ln.b; }
          else { yeni2 = hc.col === 0 && !kckMi(hc.t.charAt(0)) && hc.ln.c; }
        }
        if (yeni2) { cur2 = satirAc(); }
        cur2[hc.col].push(hc.t); sonLn = hc.ln;
      }
    }
    var out = [];
    for (i = 0; i < rows.length; i++) {
      var r = [];
      for (k = 0; k < K; k++) {
        var tx = '';
        for (var z = 0; z < rows[i][k].length; z++) { tx = tx ? birlestir(tx, rows[i][k][z]) : rows[i][k][z]; }
        r.push(bosluk(tx));
      }
      out.push(r);
    }
    return { rows: out, K: K, sema: ok };
  }

  function tablolariAyikla(L, ist) {
    var out = [], i = 0, N = L.length;
    while (i < N) {
      var ln = L[i];
      if (!tabloTohumu(ln, ist.lenRef)) { out.push(ln); i++; continue; }
      var reg = [ln], j = i + 1, seeds = 1, bant, lineH = ist.rho * (ln.h || 10);
      /* geri cekme: tohumdan once gelen, ayni sutuna oturan kisa parcalar */
      var enC = ln.c, la;
      for (la = i + 1; la < N && la <= i + 14 && L[la].p === ln.p; la++) {
        if (tabloTohumu(L[la], ist.lenRef) && L[la].c.length > enC.length) { enC = L[la].c; }
      }
      var bn0 = []; enC.forEach(function (c) { bn0.push({ x: c.x, x2: c.x2 }); });
      var geri = [], k = out.length - 1;
      while (k >= 0 && geri.length < 4 && out[k].p === ln.p && !out[k].ph && !out[k].c && out[k].y !== null && ln.y !== null &&
        Math.abs(out[k].y - ln.y) <= 2.6 * (ln.h || 10) && out[k].t.length <= 40 && tabloParcaMi(out[k], bn0)) { geri.unshift(out[k]); k--; }
      if (geri.length) { out.length -= geri.length; reg = geri.concat(reg); }
      var minY = ln.y, maxY = ln.y;
      while (j < N) {
        var nx = L[j];
        if (nx.p !== ln.p || nx.ph || nx.fn) { break; }
        if (nx.y === null && nx.bn >= 3) { break; }
        if (nx.y !== null && minY !== null && (nx.y < minY - 3.4 * lineH || nx.y > maxY + 3.4 * lineH)) { break; }
        if (tabloTohumu(nx, ist.lenRef)) { reg.push(nx); seeds++; j++; if (nx.y !== null) { minY = Math.min(minY, nx.y); maxY = Math.max(maxY, nx.y); } continue; }
        bant = bn0;
        var z;
        if (tabloParcaMi(nx, bant)) { reg.push(nx); j++; if (nx.y !== null) { minY = Math.min(minY, nx.y); maxY = Math.max(maxY, nx.y); } continue; }
        break;
      }
      var T = seeds >= 2 ? tabloKur(reg, ist.rho) : null;
      var gecerli = false;
      if (T && T.rows.length >= 2 && T.K >= 2) {
        var dolu = 0, tum = 0, r, c;
        for (r = 0; r < T.rows.length; r++) { for (c = 0; c < T.K; c++) { tum++; if (T.rows[r][c]) { dolu++; } } }
        gecerli = dolu >= 0.5 * tum;
      }
      if (!gecerli) {
        for (z = 0; z < reg.length; z++) { out.push(reg[z]); }
        i = j; continue;
      }
      T.sayfa = ln.p; T.sema = T.sema || false;
      out.push({ t: PHT, ph: true, tablo: T, p: ln.p, x: reg[0].x, y: reg[0].y, h: reg[0].h, b: true, bn: 1, gap: 0 });
      i = j;
    }
    /* sayfa sonundan devam eden tablolar */
    var son = [];
    for (i = 0; i < out.length; i++) {
      var o = out[i], pv = son.length ? son[son.length - 1] : null;
      if (o.tablo && pv && pv.tablo && o.p === pv.p + 1 && o.tablo.K === pv.tablo.K) {
        var r0 = o.tablo.rows[0], prs = pv.tablo.rows, devam = !r0[0] || kckMi(r0[0].charAt(0));
        var ayni = true, q;
        for (q = 0; q < r0.length; q++) { if (r0[q] !== prs[0][q]) { ayni = false; } }
        if (ayni) { prs.push.apply(prs, o.tablo.rows.slice(1)); }
        else if (devam) {
          var sr = prs[prs.length - 1];
          for (q = 0; q < r0.length; q++) { if (r0[q]) { sr[q] = sr[q] ? birlestir(sr[q], r0[q]) : r0[q]; } }
          prs.push.apply(prs, o.tablo.rows.slice(1));
        } else { prs.push.apply(prs, o.tablo.rows); }
        pv.tablo.sema = pv.tablo.sema || o.tablo.sema;
        continue;
      }
      son.push(o);
    }
    return son;
  }


  /* ---- sutun sutun dizilmis semalar (akis semasi / kutu zinciri) ---- */
  function diyagramAyikla(L, ist) {
    var N = L.length, i, marj = {}, pg;
    for (i = 0; i < N; i++) {
      var l0 = L[i];
      if (l0.ph || l0.x === null || l0.t.length < 25) { continue; }
      if (marj[l0.p] === undefined || l0.x < marj[l0.p]) { marj[l0.p] = l0.x; }
    }
    var lh = function (ln) { return ist.rho * (ln.h || 10); };
    function atlama(k) {
      var a = L[k - 1], b = L[k];
      return k > 0 && !a.ph && !b.ph && a.p === b.p && a.y !== null && b.y !== null && b.y > a.y + 2.2 * lh(b);
    }
    function dar(ln) {
      return !ln.ph && ln.x !== null && marj[ln.p] !== undefined && ln.x >= marj[ln.p] + 5 && ln.t.length <= 60;
    }
    var bolgeler = [], k = 1;
    while (k < N) {
      if (!atlama(k)) { k++; continue; }
      var s = k;
      while (s - 1 >= 0 && dar(L[s - 1]) && L[s - 1].p === L[k].p && (s - 1 === k - 1 || (L[s - 1].y !== null && L[s].y !== null && Math.abs(L[s - 1].y - L[s].y) <= 2.2 * lh(L[s])))) { s--; }
      var e = k, jumps = 1, m;
      for (m = k + 1; m < N; m++) {
        var ln2 = L[m];
        if (ln2.ph || ln2.p !== L[k].p) { break; }
        if (atlama(m)) { jumps++; e = m; continue; }
        if (ln2.x !== null && marj[ln2.p] !== undefined && ln2.x <= marj[ln2.p] + 4) { break; }
        if (ln2.t.length > 70 && !ln2.c) { break; }
        e = m;
      }
      var cokH = false, q2;
      for (q2 = k; q2 <= e; q2++) { if (L[q2].c && L[q2].c.length >= 3) { cokH = true; } }
      if ((jumps >= 2 || cokH) && k - s >= 2) { bolgeler.push([s, e]); k = e + 1; } else { k++; }
    }
    if (!bolgeler.length) { return L; }
    var out = [], bi = 0;
    for (i = 0; i < N; i++) {
      if (bi < bolgeler.length && i === bolgeler[bi][0]) {
        var reg = L.slice(bolgeler[bi][0], bolgeler[bi][1] + 1), hc = [], z, y;
        for (z = 0; z < reg.length; z++) {
          var cs = hucreOlarak(reg[z]);
          for (y = 0; y < cs.length; y++) {
            if (RE_OK.test(cs[y].t)) { continue; }
            hc.push({ m: (cs[y].x + cs[y].x2) / 2, y: reg[z].y, t: cs[y].t, sira: hc.length });
          }
        }
        hc.sort(function (a, b) { return a.m - b.m; });
        var kol = [], cur = null;
        for (z = 0; z < hc.length; z++) {
          if (cur && hc[z].m - cur.ort <= 40) { cur.h.push(hc[z]); cur.ort = (cur.ort * (cur.h.length - 1) + hc[z].m) / cur.h.length; }
          else { cur = { ort: hc[z].m, h: [hc[z]] }; kol.push(cur); }
        }
        var baslik = [], govde = [];
        for (z = 0; z < kol.length; z++) {
          kol[z].h.sort(function (a, b) { return (b.y - a.y) || (a.sira - b.sira); });
          var tx = '';
          for (y = 1; y < kol[z].h.length; y++) { tx = tx ? birlestir(tx, kol[z].h[y].t) : kol[z].h[y].t; }
          baslik.push(bosluk(kol[z].h[0].t.replace(/\s*[➜→⇒➔➡]+\s*$/, ''))); govde.push(bosluk(tx.replace(/\s*[➜→⇒➔➡]+(\s|$)/g, ' ')));
        }
        if (kol.length >= 3) {
          out.push({ t: PHT, ph: true, tablo: { rows: [baslik, govde], K: kol.length, sema: true, sayfa: reg[0].p }, p: reg[0].p, x: reg[0].x, y: reg[0].y, h: reg[0].h, b: true, bn: 1, gap: 0 });
        } else { for (z = 0; z < reg.length; z++) { out.push(reg[z]); } }
        i = bolgeler[bi][1]; bi++;
        continue;
      }
      out.push(L[i]);
    }
    return out;
  }

  function hazirla(pages, opts) {
    var P = [];
    var pi, li, raw, o, txt, bp;
    for (pi = 0; pi < pages.length; pi++) {
      var arr = pages[pi] || [];
      var cur = [];
      bp = 0;
      for (li = 0; li < arr.length; li++) {
        raw = arr[li];
        o = (raw !== null && typeof raw === 'object') ? raw : { t: raw };
        txt = temizle(o.t);
        var tt = bosluk(txt);
        var gap = (/\S {3,}\S/.test(txt.replace(/^\s+/, '')) && !hepBuyukMu(tt)) ? 1 : 0;
        var hucre = gap ? txt.replace(/^\s+|\s+$/g, '').split(/ {3,}/) : null;
        if (!tt) { bp++; continue; }
        var cc = o.c || null;
        if (!cc && gap) {
          cc = [];
          var rg0 = /\S+(?: {1,2}\S+)*/g, mc0, d0s = txt;
          while ((mc0 = rg0.exec(d0s))) { cc.push({ x: mc0.index * 5.5, x2: (mc0.index + mc0[0].length) * 5.5, t: mc0[0] }); }
          if (cc.length < 2) { cc = null; }
        }
        var xx = typeof o.x === 'number' ? o.x : null, xx2 = typeof o.x2 === 'number' ? o.x2 : null;
        if (xx === null && typeof o.t === 'string' && /^ +\S/.test(o.t)) { xx = /^ */.exec(o.t)[0].length * 5.5; xx2 = xx + tt.length * 5.5; }
        cur.push({ t: tt, h: (typeof o.h === 'number' ? o.h : null), y: (typeof o.y === 'number' ? o.y : null),
          x: xx, x2: xx2, c: cc,
          p: pi + 1, b: bp > 0, bn: bp, gap: gap, hucre: hucre });
        bp = 0;
      }
      P.push(cur);
    }
    var np = P.length;

    /* y koordinati verilmisse satirlar arasindaki buyuk bosluklar bos satir sayilir */
    for (pi = 0; pi < np; pi++) {
      var cy = P[pi], dd = [];
      for (li = 1; li < cy.length; li++) {
        if (cy[li].y !== null && cy[li - 1].y !== null) { dd.push(Math.abs(cy[li].y - cy[li - 1].y)); }
      }
      if (dd.length >= 3) {
        var md0 = medyan(dd);
        for (li = 1; li < cy.length; li++) {
          if (cy[li].y !== null && cy[li - 1].y !== null && md0 > 0) {
            var d0 = Math.abs(cy[li].y - cy[li - 1].y);
            if (d0 > 1.5 * md0 && d0 > 1.05 * (cy[li].h || 0)) { cy[li].b = true; cy[li].bn = Math.max(cy[li].bn || 0, Math.round(d0 / md0) - 1 > 1 ? 2 : 1); }
          }
        }
      }
    }

    /* tekrarlayan ust/alt bilgi */
    var say = {};
    for (pi = 0; pi < np; pi++) {
      var seen = {};
      var cp = P[pi];
      for (li = 0; li < cp.length; li++) {
        if (li < 3 || li >= cp.length - 3) {
          var key = ustKey(cp[li].t);
          if (key && !seen[key]) { seen[key] = 1; say[key] = (say[key] || 0) + 1; }
        }
      }
    }
    var esik = Math.max(3, Math.ceil(0.3 * np));
    for (pi = 0; pi < np; pi++) {
      var cp2 = P[pi], yeni = [];
      for (li = 0; li < cp2.length; li++) {
        var edge = (li < 3 || li >= cp2.length - 3);
        var edge2 = (li < 2 || li >= cp2.length - 2);
        var k2 = ustKey(cp2[li].t);
        if (edge && np >= 3 && k2 && say[k2] >= esik) { continue; }
        if (edge2 && sayfaNoMu(cp2[li].t)) { continue; }
        yeni.push(cp2[li]);
      }
      P[pi] = yeni;
    }

    /* icindekiler sayfalari */
    var tocMod = false;
    for (pi = 0; pi < np; pi++) {
      var cp3 = P[pi], yeni3 = [], inToc = false;
      var bitenSayi = 0;
      for (li = 0; li < cp3.length; li++) { if (/\s\d{1,4}$/.test(cp3[li].t) || /\.{3,}/.test(cp3[li].t)) { bitenSayi++; } }
      if (tocMod && cp3.length && bitenSayi / cp3.length >= 0.5) { P[pi] = []; continue; }
      tocMod = false;
      for (li = 0; li < cp3.length; li++) {
        var lt = lc(cp3[li].t);
        if (!inToc && /^(i̇?çindekiler|içindekiler|fihrist|konu başlıkları|table of contents|contents)$/.test(lt)) {
          inToc = true; tocMod = true; continue;
        }
        if (inToc) { continue; }
        if (/\.{4,}\s*\d{1,4}\s*$/.test(cp3[li].t) || /(\. ){4,}\s*\d{1,4}\s*$/.test(cp3[li].t)) { continue; }
        yeni3.push(cp3[li]);
      }
      P[pi] = yeni3;
    }

    /* dipnot bolgesi: sayfa altinda tek basina rakam / [n] ile baslayan satirlar */
    for (pi = 0; pi < np; pi++) {
      var cpf = P[pi];
      var fi = -1;
      for (li = Math.floor(cpf.length * 0.3); li < cpf.length - 1; li++) {
        if (/^\d{1,2}$/.test(cpf[li].t) || /^\[\d{1,2}\]\s/.test(cpf[li].t)) { fi = li; break; }
      }
      if (fi >= 0) {
        var yenif = [];
        for (li = 0; li < cpf.length; li++) {
          if (li < fi) { yenif.push(cpf[li]); continue; }
          var ff = cpf[li];
          ff.fn = true;
          if (/^\d{1,2}$/.test(ff.t)) { if (li + 1 < cpf.length) { cpf[li + 1].fnYeni = true; } continue; }
          if (/^\[\d{1,2}\]\s/.test(ff.t)) { ff.t = ff.t.replace(/^\[\d{1,2}\]\s*/, ''); ff.fnYeni = true; }
          yenif.push(ff);
        }
        P[pi] = yenif;
      }
    }

    /* numarasiz dipnot: cumle ortasinda kesilen sayfada, 2+ bos satirdan sonra gelen metin */
    for (pi = 0; pi + 1 < np; pi++) {
      var cpg = P[pi], nxt = P[pi + 1];
      if (!cpg.length || !nxt.length || !kckMi(nxt[0].t.charAt(0))) { continue; }
      var gi = -1;
      for (li = Math.floor(cpg.length * 0.4); li < cpg.length; li++) {
        if (cpg[li].bn >= 2 && li > 0 && !/[.?!:;]["\u201d)]*$/.test(cpg[li - 1].t) && !cpg[li].fn) { gi = li; }
      }
      if (gi > 0) {
        var ilkFn = true;
        for (li = gi; li < cpg.length; li++) { cpg[li].fn = true; if (ilkFn) { cpg[li].fnYeni = true; ilkFn = false; } }
      }
    }

    /* kapak sayfasi */
    if (np > 1 && P[0].length && P[0].length <= 12) {
      var cumleli = false;
      for (li = 0; li < P[0].length; li++) {
        if (kelimeSay(P[0][li].t) >= 10 && /[.?!]$/.test(P[0][li].t)) { cumleli = true; }
      }
      if (!cumleli) { P[0] = []; }
    }

    var L = [];
    for (pi = 0; pi < np; pi++) {
      for (li = 0; li < P[pi].length; li++) { L.push(P[pi][li]); }
    }
    var ist = govdeIst(L);
    var kp = kapakAyikla(L, ist.bodyH);
    L = kp.L;
    var sb = sinavBolgeleriniAyir(L, ist.bodyH);
    L = sb.L;
    L = kutulariAyikla(L, ist.bodyH, ist.lenRef);
    L = tablolariAyikla(L, ist);
    L = diyagramAyikla(L, ist);
    return { L: L, sayfaSayisi: np, kapak: kp.kapak, sinavBolge: sb.bolge };
  }

  /* ------------------------------------------------------------------ */
  /* Satir siniflama yardimcilari                                        */
  /* ------------------------------------------------------------------ */
  function medyan(a) {
    if (!a.length) { return 0; }
    var b = a.slice().sort(function (x, y) { return x - y; });
    return b[Math.floor(b.length / 2)];
  }
  function yuzdelik(a, p) {
    if (!a.length) { return 0; }
    var b = a.slice().sort(function (x, y) { return x - y; });
    var i = Math.min(b.length - 1, Math.floor(b.length * p));
    return b[i];
  }

  function hepBuyukMu(t) {
    var buy = 0, tum = 0, rakam = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (bykMi(c)) { buy++; tum++; } else if (kckMi(c)) { tum++; } else if (digitMi(c)) { rakam++; }
    }
    return tum >= 4 && buy / tum >= 0.92 && rakam <= tum;
  }
  function baslikHarfOrani(t) {
    var w = t.split(' '), n = 0, b = 0;
    for (var i = 0; i < w.length; i++) {
      var s = w[i].replace(new RegExp('[^' + HARF + ']', 'g'), '');
      if (s.length >= 4) { n++; if (bykMi(s.charAt(0))) { b++; } }
    }
    return n ? b / n : 0;
  }
  /* satir sonundaki kisaltma ("m.", "sa.", "bkz.") cumle sonu degildir; yeni satir rakamla basliyorsa vd./vs. de degildir */
  var RE_KISALTMA_SON = /(^|[\s(,;])(m|md|mad|sa|bkz|bk|s|ss|sy|hd|cd|e|k|t|no|yön|par|fık|krş|bnd)\.$/i;
  var RE_KISALTMA_SON2 = /(^|[\s(,;])(vd|vs|vb|yön)\.$/i;
  function kisaltmaSonu(t, sonraki) {
    if (RE_KISALTMA_SON.test(t)) { return true; }
    return !!(sonraki && RE_KISALTMA_SON2.test(t) && /^[\d,;)]/.test(sonraki));
  }
  function sonNoktalama(t, sonraki) { return /[.?!:;]["”’»)]*$/.test(t) && !kisaltmaSonu(t, sonraki); }
  function cumleSonu(t, sonraki) { return /[.?!]["”’»)]*$/.test(t) && !kisaltmaSonu(t, sonraki); }

  var BAGLAC_SON = /\s(ve|ile|veya|için|ya da|ile ilgili|de|da)$/i;

  function asideEtiketi(t) {
    return /^[✦★☆●◆▶►■□✔✅⚠💡📌📝]/.test(t) || /GEM[İI]N[İI] NOTU/.test(t);
  }

  var MADDE_AYIRAC = /^([-–—•●▪■◦·*])\s+(\S.*)$/;
  var RE_SAYI_LISTE = /^\(?(\d{1,2})[.)]\s*(\S.*)$/;
  var RE_HARF_LISTE = new RegExp('^\\(?([' + KUCUK + 'A-E])[.)]\\s+(\\S.*)$');

  /* ------------------------------------------------------------------ */
  /* Ana akis: satirlar -> bloklar (baslik / paragraf / madde)           */
  /* ------------------------------------------------------------------ */
  function bloklaraAyir(L) {
    var N = L.length;
    var i;
    /* istatistikler */
    var ist0 = govdeIst(L);
    var bodyH = ist0.bodyH, lenRef = ist0.lenRef;

    /* sayfa sol kenar (x) */
    var kenar = {};
    var xs = {}, pg;
    for (i = 0; i < N; i++) {
      if (L[i].x !== null && L[i].t.length > 40 && !L[i].fn) { pg = L[i].p; (xs[pg] = xs[pg] || []).push(L[i].x); }
    }
    for (pg in xs) { if (xs.hasOwnProperty(pg)) { kenar[pg] = yuzdelik(xs[pg], 0.2); } }
    var behindThr = 15;
    var sagKenar = {}, x2s = {};
    for (i = 0; i < N; i++) {
      if (!L[i].ph && L[i].x2 !== null && L[i].x2 !== undefined && L[i].t.length > 40 && !L[i].fn) { pg = L[i].p; (x2s[pg] = x2s[pg] || []).push(L[i].x2); }
    }
    for (pg in x2s) { if (x2s.hasOwnProperty(pg) && x2s[pg].length >= 5) { sagKenar[pg] = yuzdelik(x2s[pg], 0.9); } }

    /* y bosluk medyani (sayfa basina) */
    var dyMed = {};
    var dys = {};
    for (i = 1; i < N; i++) {
      if (L[i].y !== null && L[i - 1].y !== null && L[i].p === L[i - 1].p) {
        (dys[L[i].p] = dys[L[i].p] || []).push(Math.abs(L[i].y - L[i - 1].y));
      }
    }
    for (pg in dys) { if (dys.hasOwnProperty(pg)) { dyMed[pg] = medyan(dys[pg]); } }

    /* Soru-cevap zinciri: 1- 2- 3- ... */
    var qa = {};
    var beklenen = 1, zincir = [];
    for (i = 0; i < N; i++) {
      var mq = /^(\d{1,3})\s*[-–—]\s*(\S.*)$/.exec(L[i].t);
      if (mq && !L[i].gap && !L[i].fn) {
        var no = parseInt(mq[1], 10);
        var ilk = mq[2].charAt(0);
        if ((no === beklenen || no === beklenen + 1) && (bykMi(ilk) || digitMi(ilk) || ilk === '"' || ilk === '“')) {
          zincir.push(i); beklenen = no + 1;
        }
      }
    }
    var qaModu = zincir.length >= 3;
    if (qaModu) { for (i = 0; i < zincir.length; i++) { qa[zincir[i]] = 1; } }

    /* tekrar eden ALL CAPS basliklar = kutu etiketi (aside) */
    var capsSay = {};
    for (i = 0; i < N; i++) {
      if (!L[i].ph && hepBuyukMu(L[i].t) && L[i].t.length <= 80 && !L[i].gap) { capsSay[L[i].t] = (capsSay[L[i].t] || 0) + 1; }
    }

    var blocks = [];
    var cur = null;
    var fnCur = null, fnBekle = [];
    var aside = false;
    var lastNum = 0, lastHarf = '';
    var sonNo = [];

    function numParcalar(t) {
      var m = /^(\d{1,2}(?:\.\d{1,2})*)\.?\s+\S/.exec(t);
      if (!m) { return null; }
      return m[1].split('.').map(function (x) { return parseInt(x, 10); });
    }
    /* numarali baslik, belgenin numaralandirma sirasina uyuyor mu? (9 -> 9.1 -> 9.2 -> 10) */
    function hiyerarsiUygun(P) {
      if (!sonNo.length) { return true; }
      var k, n = Math.min(P.length, sonNo.length);
      for (k = 0; k < n; k++) {
        if (P[k] === sonNo[k]) { continue; }
        return P[k] > sonNo[k] && P[k] <= sonNo[k] + 2;
      }
      if (P.length > sonNo.length) { return P[sonNo.length] <= 2; }
      return false;
    }

    function flush() {
      if (cur) { blocks.push(cur); cur = null; }
      if (fnCur) { fnBekle.push(fnCur); fnCur = null; }
      for (var z = 0; z < fnBekle.length; z++) { blocks.push(fnBekle[z]); }
      fnBekle = [];
    }
    function leadMi(b) { return b && b.tur === 'para' && /:$/.test(b.t); }

    function yeniParagrafMi(prev, ln) {
      /* sayfa sonunda kesilen cumle: ayni paragrafin devami */
      if (prev.p !== ln.p && (kckMi(ln.t.charAt(0)) || !sonNoktalama(prev.t, ln.t))) { return false; }
      if (ln.b) { return true; }
      if (prev.h && ln.h && Math.abs(ln.h - prev.h) > 0.12 * prev.h) { return true; }
      if (/^(örneğin|örnek|mesela)\s*[;:,]?$/i.test(prev.t)) { return false; }
      if (/^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ]{4,40}:(\s|$)/.test(ln.t)) { return true; }
      if (prev.y !== null && ln.y !== null && prev.p === ln.p) {
        var md = dyMed[ln.p] || 0;
        var dy = Math.abs(ln.y - prev.y);
        if (md && dy > 1.55 * md && dy > 1.1 * (ln.h || 0)) { return true; }
      }
      var kisaSatir = (prev.x2 !== null && prev.x2 !== undefined && sagKenar[prev.p] !== undefined) ? (sagKenar[prev.p] - prev.x2 > 4.5 * (prev.h || 10)) : (prev.t.length < 0.8 * lenRef);
      if (!sonNoktalama(prev.t, ln.t) && prev.p === ln.p && kisaSatir && prev.t.length >= 12 && bykMi(ln.t.charAt(0)) &&
        !BAGLAC_SON.test(prev.t) && !/[,(]$/.test(prev.t) && prev.x !== null && ln.x !== null && Math.abs(prev.x - ln.x) < 4) { return true; }
      if (sonNoktalama(prev.t, ln.t)) {
        var kisa = prev.t.length < 0.62 * lenRef;
        var kn = kenar[ln.p];
        var girinti = (ln.x !== null && kn !== undefined && (ln.x - kn) > behindThr && prev.p === ln.p && (prev.x === null || (ln.x - prev.x) > behindThr));
        if (kisa || girinti) { return true; }
        return false;
      }
      return false;
    }

    function baslikTuru(i) {
      var ln = L[i], t = ln.t, len = t.length, m;
      if (ln.gap || len > 170) { return null; }
      if (bodyH && ln.h >= bodyH * 1.15 && len <= 160) { return { kind: 'font', lv: 0 }; }
      var onceki = i > 0 ? L[i - 1] : null;
      var sonraki = i + 1 < N ? L[i + 1] : null;
      var oncekiBitti = !onceki || ln.b || onceki.p !== ln.p || cumleSonu(onceki.t, ln.t) || onceki.baslik;
      /* roma */
      m = /^([IVX]{1,5})\s*[.)-]\s*(\S.*)$/.exec(t);
      if (m && bykMi(m[2].charAt(0)) && len <= 130 && !/[,;]$/.test(t)) { return { kind: 'roma', lv: 1 }; }
      /* 1.1 / 1.1.1 */
      m = /^(\d{1,2}(?:\.\d{1,2})+)\.?\s+(\S.*)$/.exec(t);
      if (m && (bykMi(m[2].charAt(0)) || (digitMi(m[2].charAt(0)) && sonNo.length && hiyerarsiUygun(numParcalar(t) || [0]))) && len <= 130 && !/[,;]$/.test(t) && !/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(t)) {
        return { kind: 'noktali', lv: 2 + m[1].split('.').length - 1 };
      }
      /* A. Baslik */
      m = new RegExp('^([' + BUYUK + '])\\s*\\.\\s+([' + BUYUK + '].*)$').exec(t);
      if (m && len <= 110 && !/[.,;:]$/.test(t) && oncekiBitti && baslikHarfOrani(t) >= 0.4) { return { kind: 'harf', lv: 2 }; }
      /* 1. Baslik */
      m = /^(\d{1,2})\s*\.\s+([A-ZÇĞİÖŞÜ].*)$/.exec(t);
      if (m && len <= 95 && !/[.,;:?!]$/.test(t) && t.indexOf(':') < 0 && oncekiBitti && kelimeSay(t) <= 11) {
        var nn = parseInt(m[1], 10);
        var sonrakiListe = sonraki && /^\(?(\d{1,2})[.)]\s*\S/.test(sonraki.t) && parseInt(RegExp.$1, 10) === nn + 1;
        var oncekiLead = onceki && /:$/.test(onceki.t);
        if (!sonrakiListe && !oncekiLead) { return { kind: 'sayi', lv: 3 }; }
      }
      /* a) Alt baslik (bos satirdan sonra, noktalamasiz) */
      m = /^([a-zçğıöşü])\)\s+([A-ZÇĞİÖŞÜ].*)$/.exec(t);
      var parAc = (t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length && sonraki && /^[^()]{1,50}\)$/.test(sonraki.t);
      if (m && len <= 130 && (!/[.,;:?!]$/.test(t) || parAc) && (ln.b || !onceki || onceki.p !== ln.p) && kelimeSay(t) <= 16) {
        var sn2 = sonraki && /^[a-zçğıöşü]\)\s/.test(sonraki.t);
        if (!sn2 || (sonraki && sonraki.t.length > 60)) { return { kind: 'harfalt', lv: 5 }; }
      }
      /* TAMAMI BUYUK */
      if (hepBuyukMu(t) && len >= 4 && len <= 170 && !/[.:]$/.test(t) && kelimeSay(t) <= 26) {
        return { kind: 'caps', lv: 0 };
      }
      /* Baslik Bicimli kisa satir */
      if (!qaModu && len <= 95 && kelimeSay(t) <= 12 && bykMi(t.charAt(0)) && !/[.,;:?!]$/.test(t) && oncekiBitti &&
        sonraki && sonraki.t.length >= 25 && sonraki.p >= ln.p && !MADDE_AYIRAC.test(t) && !/^\(?\d{1,2}[.)]/.test(t)) {
        /* parantez dengesi: "(...)" ile bitebilir */
        var acik = (t.match(/\(/g) || []).length, kapa = (t.match(/\)/g) || []).length;
        var acikDevam = (acik === kapa + 1 && /^[^()]{1,50}\)$/.test(sonraki.t));
        if (acik !== kapa && !acikDevam) { return null; }
        if (/\)$/.test(t) && acik === 0) { return null; }
        var sonKelime = t.replace(/\s*\([^()]*\)?\s*$/, '').split(' ').pop();
        if (!bykMi(sonKelime.replace(/^[("\u201c]+/, '').charAt(0)) && !digitMi(sonKelime.charAt(0))) { return null; }
        var oran = baslikHarfOrani(t);
        var sk = kelimeSay(t);
        if ((sk >= 2 && oran >= 0.6) || (sk === 1 && len >= 4 && oran === 1 && (bykMi(sonraki.t.charAt(0))))) {
          if (!ln.b && onceki && onceki.p === ln.p && !cumleSonu(onceki.t, ln.t)) { return null; }
          return { kind: 'baslikbicim', lv: 4 };
        }
      }
      return null;
    }

    function etiketSatiri(t) {
      return /^[A-ZÇĞİÖŞÜ][^:.;?!]{1,45}:\s+\S/.test(t) || /^[A-ZÇĞİÖŞÜ][^:.;?!]{1,45}:$/.test(t);
    }

    for (i = 0; i < N; i++) {
      var ln = L[i];
      var t = ln.t;

      /* kutu / tablo yer tutucusu */
      if (ln.ph) {
        flush(); aside = false;
        blocks.push(ln.kutu ? { tur: 'kutu', kutu: ln.kutu, p: ln.p } : { tur: 'tablo2', tablo: ln.tablo, p: ln.p });
        continue;
      }

      /* dipnot / kucuk punto: ana akistan ayri */
      var kucuk = !!(ln.fn || (bodyH && ln.h && ln.h < bodyH * 0.86));
      if (kucuk) {
        if (fnCur && !ln.fnYeni && !ln.b) { fnCur.t = birlestir(fnCur.t, t); }
        else {
          if (fnCur) { fnBekle.push(fnCur); }
          fnCur = { tur: 'para', t: t, p: ln.p, aside: false, kucuk: true, dipnot: !!ln.fn };
        }
        continue;
      }
      if (fnCur) { fnBekle.push(fnCur); fnCur = null; }

      var pI = i - 1;
      while (pI > 0 && (L[pI].fn || (bodyH && L[pI].h && L[pI].h < bodyH * 0.86) || L[pI].baslik)) { pI--; }
      var oncekiGovde = pI >= 0 ? L[pI] : L[0];

      /* kutu etiketi */
      if (asideEtiketi(t) || (hepBuyukMu(t) && (capsSay[t] || 0) >= 3 && t.length <= 80 && kelimeSay(t) >= 3)) {
        flush(); aside = true; continue;
      }

      /* soru basligi */
      if (qa[i]) {
        flush();
        var qt = t, qj = i;
        while (!/[?.:!]["”]?$/.test(qt) && qj + 1 < N && qj - i < 5 && !qa[qj + 1] && !L[qj + 1].b) {
          qj++; qt += ' ' + L[qj].t;
        }
        blocks.push({ tur: 'baslik', kind: 'qa', lv: 1, t: qt, p: ln.p });
        i = qj; aside = false; lastNum = 0; lastHarf = '';
        continue;
      }
      /* soru-cevap modunda alt baslik: "1-Baslik" */
      if (qaModu && /^\d{1,2}\s*[-–—]\s*[A-ZÇĞİÖŞÜ]/.test(t) && t.length <= 100 && !/[.,;:?]$/.test(t) && baslikHarfOrani(t) >= 0.6) {
        flush();
        blocks.push({ tur: 'baslik', kind: 'qaalt', lv: 2, t: t, p: ln.p });
        aside = false; continue;
      }

      /* baslik? */
      var bt = baslikTuru(i);
      if (bt && (bt.kind === 'sayi' || bt.kind === 'noktali')) {
        var NP = numParcalar(t);
        if (NP && !hiyerarsiUygun(NP)) { bt = null; }
        else if (NP && bt.kind === 'sayi' && !sonNo.length && lastNum > 0 && NP[0] === lastNum + 1) { bt = null; }
      }
      if (bt) {
        flush();
        var ht = t, hj = i, hh = ln.h;
        /* cok satirli baslik birlestirme */
        while (hj + 1 < N) {
          var nx = L[hj + 1];
          if (nx.b || nx.gap || nx.fn || nx.ph || qa[hj + 1]) { break; }
          if (/^\d{1,2}(\.\d{1,2})+\.?\s+[A-ZÇĞİÖŞÜ]/.test(nx.t)) { break; }
          var devam = false;
          var onNoktasiz = !/[.:;?!]$/.test(ht);
          if (bt.kind === 'caps' && hepBuyukMu(nx.t) && nx.t.length <= 170 && !/^(GİRİŞ|SONUÇ|ÖZET|GİRİŞ)$/.test(nx.t) &&
            !(capsSay[nx.t] >= 3 && kelimeSay(nx.t) >= 3) && (ht.length >= 36 || BAGLAC_SON.test(ht) || /[,]$/.test(ht)) && ht.length + nx.t.length < 230 &&
            !/^([IVX]+[.)]|\d+[.)])/.test(nx.t)) { devam = true; }
          if (bt.kind === 'font' && nx.h && hh && Math.abs(nx.h - hh) < 0.08 * hh && ht.length >= 28 && !MADDE_AYIRAC.test(nx.t)) { devam = true; }
          if ((bt.kind === 'roma' || bt.kind === 'sayi' || bt.kind === 'harf' || bt.kind === 'noktali' || bt.kind === 'harfalt') &&
            kckMi(nx.t.charAt(0)) && onNoktasiz && ht.length >= 30 && nx.t.length <= 100) { devam = true; }
          if ((bt.kind === 'harfalt' || bt.kind === 'baslikbicim' || bt.kind === 'caps') && /^\([^)]{2,60}\)$/.test(nx.t) && onNoktasiz) { devam = true; }
          if (!devam && (ht.match(/\(/g) || []).length > (ht.match(/\)/g) || []).length && /^[^()]{1,70}\)[.,;]?$/.test(nx.t)) { devam = true; }
          if (!devam && (ht.match(/\(/g) || []).length > (ht.match(/\)/g) || []).length && /^\d/.test(nx.t) && nx.t.length <= 90 && nx.t.indexOf('(') < 0) { devam = true; }
          if (!devam && kisaltmaSonu(ht, nx.t) && /^\d/.test(nx.t) && nx.t.length <= 80) { devam = true; }
          if (!devam) { break; }
          hj++; ht += ' ' + nx.t;
        }
        i = hj;
        /* yapisik baslik: "Kanunu 6.2 7545'e gore yapisi" -> iki baslik */
        var gl = /^(.*?\S)\s+(\d{1,2}(?:\.\d{1,2})+)\s+([A-ZÇĞİÖŞÜ0-9].+)$/.exec(ht);
        if (gl && gl[1].length >= 5) {
          var GP = numParcalar(gl[2] + ' x');
          if (GP && hiyerarsiUygun(GP)) {
            blocks.push({ tur: 'baslik', kind: bt.kind, lv: bt.lv, t: gl[1], p: ln.p, h: hh, x: ln.x });
            ht = gl[2] + ' ' + gl[3]; bt = { kind: 'noktali', lv: 2 + GP.length - 1 };
          }
        }
        blocks.push({ tur: 'baslik', kind: bt.kind, lv: bt.lv, t: ht, p: ln.p, h: hh, x: ln.x });
        var NP2 = numParcalar(ht);
        if (NP2) { sonNo = NP2; } else if (bt.kind === 'font' || bt.kind === 'caps') { sonNo = []; }
        aside = false; lastNum = 0; lastHarf = '';
        L[i].baslik = true;
        continue;
      }

      /* madde (liste) ogesi? */
      var mad = null, mm;
      var sonBlok = cur || (blocks.length ? blocks[blocks.length - 1] : null);
      if ((mm = MADDE_AYIRAC.exec(t))) { mad = { isaret: mm[1], metin: mm[2], tur: 'tire' }; }
      else if ((mm = RE_SAYI_LISTE.exec(t))) {
        var sn = parseInt(mm[1], 10);
        if ((sn === 1 || sn === lastNum + 1) && (bykMi(mm[2].charAt(0)) || digitMi(mm[2].charAt(0)) || /^["“(]/.test(mm[2]) || (lastNum > 0 && sn === lastNum + 1))
          && !/^\d{1,2}\.\d/.test(t) && !(bykMi(mm[2].charAt(0)) && sn > 1 && lastNum === 0)) {
          mad = { isaret: mm[1], metin: mm[2], tur: 'sayi', no: sn }; lastNum = sn;
        }
      }
      if (!mad && (mm = RE_HARF_LISTE.exec(t))) {
        var hf = mm[1];
        var up = bykMi(hf);
        var lh = lc(hf);
        var fark = lastHarf ? (lh.charCodeAt(0) - lastHarf.charCodeAt(0)) : (lh === 'a' ? 1 : 99);
        if (fark === 1 || fark === 2) {
          mad = { isaret: hf, metin: mm[2], tur: up ? 'secenek' : 'harf' };
          lastHarf = lh;
        }
      }
      /* "Etiket: aciklama" satirlari iki nokta ile biten bir giristen sonra liste ogesidir */
      if (!mad && !ln.gap && etiketSatiri(t) && ((leadMi(cur) && !cur.liste) || (cur && cur.tur === 'madde' && cur.isaret === '') ||
        (!cur && sonBlok && sonBlok.tur === 'madde' && sonBlok.isaret === ''))) {
        mad = { isaret: '', metin: t, tur: 'etiket' };
      }
      if (mad) {
        flush();
        cur = { tur: 'madde', isaret: mad.isaret, t: mad.metin, p: ln.p, aside: aside, kucuk: false, secenek: mad.tur === 'secenek' };
        continue;
      }

      /* tablo satiri */
      if (ln.gap) {
        flush();
        blocks.push({ tur: 'tablo', t: t, p: ln.p, hucre: ln.hucre });
        continue;
      }

      /* govde satiri: birlestir veya yeni paragraf */
      if (cur && cur.tur === 'madde') {
        var prevL = oncekiGovde;
        var tamam = /[.;:!?]["”]?$/.test(cur.t);
        var oncekiSatirUzun = prevL && prevL.t.length >= 0.8 * lenRef;
        var asili = ln.x !== null && prevL.x !== null && Math.abs(ln.x - prevL.x) < 4 && (ln.x - (kenar[ln.p] || 0)) > behindThr && prevL.t.length >= 0.55 * lenRef && prevL.p === ln.p;
        var devamEt = (!ln.b || (prevL.p !== ln.p && kckMi(t.charAt(0)))) && !(prevL.h && ln.h && Math.abs(ln.h - prevL.h) > 0.12 * prevL.h) && (asili ||
          ((!tamam && (kckMi(t.charAt(0)) || oncekiSatirUzun || !bykMi(t.charAt(0)) || BAGLAC_SON.test(cur.t))) || (tamam && kckMi(t.charAt(0)))));
        if (devamEt && !(cur.isaret === '' && etiketSatiri(t))) { cur.t = birlestir(cur.t, t); continue; }
        flush();
      }
      if (cur && cur.tur === 'para' && !cur.kucuk) {
        var pl = oncekiGovde;
        if (!yeniParagrafMi(pl, ln)) { cur.t = birlestir(cur.t, t); continue; }
        flush();
      } else if (cur) { flush(); }
      cur = { tur: 'para', t: t, p: ln.p, aside: aside, kucuk: false };
    }
    flush();
    return { blocks: blocks, qaModu: qaModu };
  }

  function birlestir(a, b) {
    if (/[A-Za-zçğıöşüÇĞİÖŞÜ]-$/.test(a) && kckMi(b.charAt(0))) {
      /* "e-" gibi tek harf + tire korunur */
      if (/(^|[\s“"(])[A-Za-z]-$/.test(a)) { return a + b; }
      return a.substr(0, a.length - 1) + b;
    }
    return a + ' ' + b;
  }

  /* ------------------------------------------------------------------ */
  /* Kalip tanimlari (desen cikarimi)                                    */
  /* ------------------------------------------------------------------ */
  var NB = '(?:^|[^' + HARF + '0-9])';
  var NS = '(?![' + HARF + '])';
  function rx(src, fl) { return new RegExp(src, fl || ''); }

  var RE_TANIM_GUCLU = rx(NB + '(denir|denilir|denilmektedir|denmektedir|denmiştir|denilmiştir|adı verilir|adı verilmektedir|adı verilmiştir|adını alır|' +
    'adlandırılır|adlandırılmaktadır|adlandırılmıştır|tanımlanır|tanımlanmaktadır|tanımlanmıştır|tanımlanabilir|tanımlamaktadır|' +
    'ifade eder|ifade etmektedir|ifade edilir|ifade edilmektedir|demektir|anlamına gelir|anlamına gelmektedir|anlamındadır|' +
    'anlaşılır|anlaşılmaktadır|olarak bilinir|olarak anılır|kastedilir|kastedilmektedir)' + NS);
  var RE_TANIM_ZAYIF_ISIM = rx('(tanımı|tanımlaması|kavramı|terimi|kavramından|tanımına göre|tanım olarak)' + NS);
  var RE_COPULA_SON = /(d[ıiuü]r|t[ıiuü]r)(\s*\))?[.]?["”]?$/;

  var RE_SART_G1 = rx(NB + '(şartları|şartlar|şartı|şart|koşulları|koşullar|koşulu|koşul|unsurları|unsurlar|unsuru|unsurlarından|unsurundan|unsur|öğeleri|öğeler|ögeleri|ölçütleri|ölçütler|kriterleri|kriterler|aşamaları|aşamalardan|aşamalar|şartlarından|koşullarından)' + NS);
  var RE_SART_SAYI = /(^|[^a-zçğıöşü])(iki|üç|dört|beş|altı|yedi|sekiz|\d+)\s+(farklı\s+|temel\s+|ana\s+)?(unsur|şart|koşul|öğe|ögesi|aşama|ölçüt|kriter)/;
  var RE_SART_FIIL = /(şunlardır|şöyledir|şu şekildedir|şu şekilde sıralanabilir|aranır|aranmaktadır|aranmıştır|bulunmalıdır|gerekir|gereklidir|gerekmektedir|zorunludur|sayılabilir|sıralanabilir|sıralayabiliriz)/;
  var RE_SART_GEREK = /(^|\s)için\s[^.]{3,}?\s(gerekir|gereklidir|gerekmektedir|şarttır|şart koşulmuştur|zorunludur|aranır|aranmaktadır|aranmıştır|bulunmalıdır|gerekli görülmüştür|gerekli olup|koşuldur|koşulmuştur|gerekli ve zorunludur)/;

  var RE_ISTISNA_GUCLU = rx(NB + '(istisna|istisnası|istisnaları|istisnai|müstesna|uygulanmaz|uygulanmayacağı|uygulanmayacaktır|uygulanmamaktadır|uygulanamaz|saklıdır|saklı tutulmuştur|saklı kalmak|hariçtir|hariç|haricindedir|kapsam dışındadır|kapsamı dışında|kapsamında değildir|kapsamaz|şu kadar ki)' + NS);
  var RE_ISTISNA_ZAYIF = /^(bununla birlikte|bununla beraber|buna karşılık|ancak|fakat)\b/;
  var RE_ISTISNA_ANCAK = /(^|[;,]\s*|\.\s+)(ancak|fakat|bununla beraber)\s*,?\s/i;
  var RE_ISTISNA_DISINDA = /(dışında|hâller dışında|haller dışında|dışındaki)/;

  var RE_ORNEK = rx(NB + '(örneğin|örnek olarak|örnek vermek gerekirse|mesela|örnek gösterilebilir|örnek verilebilir)' + NS, 'i');
  var RE_ORNEK_BAS = /^\(?(örneğin|örnek|mesela)(\s|[:;,]|$)/i;
  var RE_ORNEK_ETIKET = /^\(?(örnek|örneğin|mesela)\s*\d{0,2}\s*[:.)]/i;
  var RE_KURGUSAL = /\((?:dersten\s+)?kurgusal\s+örnek[^)]*\)/i;
  /* tirnak/guillemet icinde verilmis alinti (cogunlukla ornek cumlesi) */
  function alintiOrani(t) {
    var top = 0, m, rg = /«[^»]*»|“[^”]*”|"[^"]*"/g;
    while ((m = rg.exec(t))) { top += m[0].length; }
    return t.length ? top / t.length : 0;
  }

  /* gercek doktrin/gorus isaretleri: genel "gorus", "yazar", "savun" kelimeleri tek basina yetmez */
  var RE_GORUS = rx(NB + '(doktrinde|doktrindeki|doktrin(?:in)?\\s+(?:bir\\s+kısmı|çoğunluğu|ağırlıklı)|öğretide|öğretideki|' +
    '(?:bir|diğer\\s+bir|başka\\s+bir|ikinci|birinci)\\s+görüşe\\s+göre|görüşe\\s+göre|hâkim\\s+görüş|hakim\\s+görüş|baskın\\s+görüş|ağırlıklı\\s+görüş|aksi\\s+görüş|karşı\\s+görüş|' +
    'azınlık\\s+görüşü|çoğunluk\\s+görüşü|farklı\\s+görüş|görüşündedir|görüşündedirler|görüşünde|görüşüne\\s+katılıyoruz|görüşünü\\s+benimsemekteyiz|' +
    'kanaatimizce|kanımızca|görüşündeyiz|kanaatindeyiz|yazara\\s+göre|yazarlara\\s+göre|yazarına\\s+göre|teze\\s+göre|' +
    '(?:yazarlar|doktrin|öğreti)\\s+[^.]{0,40}(?:savun|ileri\\s+sür|kabul\\s+et|benimse))' + NS);
  var RE_GORUS_AKSI = /(aksi görüş|karşı görüş|aksi yönde|karşı oy|aksine|karşı görüştedir|farklı görüş)/;
  var RE_GORUS_HAKIM = /(hâkim görüş|hakim görüş|baskın görüş|ağırlıklı görüş|genel kabul gören|çoğunluk görüşü|çoğunlukla)/;
  var RE_GORUS_KANAAT = /(kanaatimizce|kanaatimize|kanımızca|bizce|görüşündeyiz|düşüncesindeyiz|kanaatindeyiz)/;

  var MAHKEME_ADLARI = 'Yargıtay|YİBK|YHGK|YCGK|İBBGK|İBK|HGK|CGK|AYM|Anayasa Mahkemesi|AİHM|Avrupa İnsan Hakları Mahkemesi|Danıştay|İDDK|Uyuşmazlık Mahkemesi|Bölge Adliye|BAM|Sayıştay|Yüksek Seçim Kurulu|İçtihadı Birleştirme';
  var RE_MAHKEME = new RegExp(NB + '(' + MAHKEME_ADLARI + ')' + NS);
  var RE_ESAS_KARAR = /(?:\bE\.\s*\d{2,4}\s*\/\s*\d+|\bK\.\s*\d{2,4}\s*\/\s*\d+|\d{2,4}\s*\/\s*\d+\s*E\.|\d{2,4}\s*\/\s*\d+\s*K\.)/;
  var RE_KARAR_SOZ = rx('(karar|kararı|kararında|kararına|içtihat|içtihad|bozma|bozdu|onama|onadı|kabul et|hükmet|verdiği|sonuca var|belirt|vurgula|değerlendir|görüşü|uygulama|yaklaşım|içtihatlar|başvuru|ihlal)', 'i');

  var RE_YASA_KISA = new RegExp('(^|[^' + HARF + '0-9])([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]{1,9})\\s*(?:m|md|mad)\\.\\s*(\\d{1,4}(?:\\/[a-zçğıöşü](?![a-zçğıöşü]))?)(?:\\s*\\/\\s*(\\d{1,2})(?!\\d))?(?:\\s*,\\s*(\\d{1,2})(?![\\d.]|\\s*(?:,|ve\\s|ile\\s)))?', 'g');
  var RE_YASA_ADLI = new RegExp('((?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\\s+){0,4}(?:Kanun|Anayasa|Yönetmelik|Tüzük|Kararname|Sözleşme|Tebliğ)[a-zçğıöşü]*)[’\']?[a-zçğıöşü]*\\s*,?\\s+(\\d{1,4})\\s*\\.\\s*(?:madde[a-zçğıöşü]*|md)', 'g');
  var RE_SAYILI = /(\d{3,5})\s+sayılı\s+/g;
  var YASA_SON = /^(Kanun|Kanunu|Kanunun|Kanuna|Kanunda|Kanundan|Kanunla|Kanunumuz|KHK|Yönetmelik|Yönetmeliği|Yönetmeliğin|Tüzük|Tüzüğü|Sözleşme|Sözleşmesi|Kararname|Kararnamesi|Tebliğ|Tebliği|Anayasa)/;

  /* ------------------------------------------------------------------ */
  /* Birim analizi                                                       */
  /* ------------------------------------------------------------------ */
  var TANIM_ENGEL_BASLA = /^(hiçbir|hiç|sadece|yalnızca|çünkü|zira|bu|şu|o|burada|bunun|bunlar|bunları|yani|dolayısıyla|nitekim|ayrıca|ancak|ise|öncelikle|sonuç|böylece|bunu|oysa|aksi|ayrıca|fakat|örneğin|mesela|özellikle|maalesef|tüm|hem|ne|her|bazı|çünkü|şayet|eğer|gerçekten|aslında|elbette|kısacası|nihayet|son olarak|daha|buna|bununla|bunların|şüphesiz|görüldüğü|ayrıca|tanımdan|yukarıda|aşağıda|burada)(?![a-zçğıöşü])/;
  var TERIM_ENGEL_SON = /(yerine|yönünden|bakımından|açısından|hâlinde|halinde|sırasında|ında|inde|unda|ünde|ğında|ğinde|sa|se|ken|ınca|ince|arak|erek|dan|den|tan|ten|ıp|ip|up|üp|ne|na|ya|ye|da|de|ta|te|dığı zaman|diği zaman|ğı zaman|ği zaman)$/;
  var FIIL_COPULA = /(maktadır|mektedir|mıştır|miştir|muştur|müştür|acaktır|ecektir|malıdır|melidir|lardır|lerdir)$/;
  var KURAL_SON = /(değil|sınırlı|gerekli|zorunlu|mümkün|şart|yeterli|önemli|mecburi|olmalı|gerek|geçerli|geçersiz|usulsüz|uygun|yasak|serbest|caiz|hatalı|doğru|yanlış|açık)\w*$/;
  var ZAYIF_TANIM_CUE = /^(anlaşılır|anlaşılmaktadır|ifade edilir|ifade edilmektedir|ifade eder|ifade etmektedir|tanımlanabilir|olarak bilinir|olarak anılır|tanımlanır|tanımlanmaktadır|tanımlanmıştır)$/;
  var QA_TANIM_BASLIK = /(nedir|nelerdir|tanımlanmıştır|tanımlanmakta|tanımlayınız|tanımı|ne demektir|ne anlama|kavramı|kavramını|açıklayınız|ifade eder)/;

  function analiz(u) {
    var t = u.t;
    var lt = lc(t);
    var f = {};
    var len = t.length;
    var wc = u.maddeler ? kelimeSay(t + ' ' + u.maddeler.join(' ')) : kelimeSay(t);
    u.wc = wc;
    var soruMu = /\?["”]?$/.test(t);
    var bas = bykMi(t.charAt(0)) || digitMi(t.charAt(0)) || /^["“(«\[]/.test(t);
    var baslayan = lt.replace(/^["“(«\[\s]+/, '');

    /* ---- tanim ---- */
    var tanim = false;
    var tanimOn = /^Tanım\s*:\s*\S/.test(t);
    var ornekEt = RE_ORNEK_ETIKET.test(t) || RE_KURGUSAL.test(t);
    var alintiBas = /^[«“"]/.test(t) && alintiOrani(t) >= 0.6;
    u.alinti = alintiBas || RE_KURGUSAL.test(t);
    if (tanimOn && !soruMu && len >= 20) {
      tanim = true; u.tanimOn = true;
    } else if (!soruMu && len >= 30 && len <= 520 && bas && !ornekEt && !u.alinti) {
      var mt = RE_TANIM_GUCLU.exec(lt);
      if (mt) {
        var pos = mt.index + (mt[0].length - mt[1].length);
        var zayifCue = ZAYIF_TANIM_CUE.test(mt[1]);
        var engel = TANIM_ENGEL_BASLA.test(baslayan);
        if (pos >= 10) {
          if (!zayifCue) {
            if (!(engel && /^(ancak|örneğin|mesela|ayrıca|fakat)\b/.test(baslayan))) { tanim = true; }
            /* "...sahipsiniz demektir." : zamir ozneli / sartli (-sa) cumle sonu "demektir" bir tanim degildir */
            if (tanim && /^(demektir|anlamına gelir|anlamına gelmektedir)$/.test(mt[1]) &&
              (/^(o|bu|şu|bunlar|onlar|bunun|onun|şunlar|bunu|onu|burada|orada)(\s|$)/.test(baslayan) ||
                /^[^,;:]{0,80}?[a-zçğıöşü]+(seniz|sanız|sak|sek|ysa|yse|[^a-zçğıöşü]sa|[^a-zçğıöşü]se)(\s|,)/.test(' ' + baslayan.substr(0, 90)) ||
                /(seniz|sanız|siniz|sınız|sin|sın|sun|sün|yorsun|yorsunuz|iz|ız|uz|üz)\s+(demektir|anlamına)/.test(lt))) { tanim = false; }
          } else if (!engel && wc <= 45 && (/[“"«]/.test(t) || RE_TANIM_ZAYIF_ISIM.test(lt) || pos < 120)) {
            tanim = true;
          }
          if (tanim && zayifCue && /(gerekir|zorundadır|yapılamaz)/.test(lt)) { tanim = false; }
        }
      }
      /* zayif: "X'in tanimi, ... -dir." */
      if (!tanim) {
        var mz = RE_TANIM_ZAYIF_ISIM.exec(lt);
        if (mz && mz.index < 70 && RE_COPULA_SON.test(lt) && lt.indexOf(',', mz.index) > 0 && wc <= 60 && wc >= 6 && !/^(bu|şu)\s/.test(lt)) {
          tanim = true;
        }
      }
      /* nominal: "Terim, ... -dir." */
      if (!tanim && wc >= 6 && wc <= 32 && RE_COPULA_SON.test(lt)) {
        var mn = /^["\u201c]?([A-ZÇĞİÖŞÜ][^,.;:()?]{2,40}?)["\u201d]?,\s+(.{15,})$/.exec(t);
        if (mn) {
          var term = lc(mn[1]);
          var tw = term.split(' ');
          var lastW = lt.replace(/[.)"\u201d]+$/, '').split(' ').pop();
          if (!TANIM_ENGEL_BASLA.test(term) && tw.length <= 3 && !TERIM_ENGEL_SON.test(term) && !KURAL_SON.test(lastW) &&
            !FIIL_COPULA.test(lastW) && !/(ta|te|da|de|dan|den|tan|ten|ya|ye|na|ne|la|le|ca|ce|ça|çe)$/.test(tw[0]) &&
            !/^(ancak|fakat|ise|ki)(?![a-zçğıöşü])/.test(lc(mn[2])) && mn[2].indexOf(';') < 0 && (mn[2].match(/,/g) || []).length <= 1) { tanim = true; }
        }
      }
    }
    f.tanim = tanim;
    if (tanim) {
      var q = /[“"«]([^”"»]{2,60})[”"»]/.exec(t);
      if (q) { u.terim = q[1]; }
    }

    /* ---- sart / unsur ---- */
    var sart = false;
    if (!soruMu && len <= 700) {
      var lead = /:$/.test(t);
      var g1 = RE_SART_G1.test(lt);
      var listeVar = !!u.maddeler;
      if (g1 && (lead || listeVar || RE_SART_FIIL.test(lt))) { sart = true; }
      if (!sart && RE_SART_SAYI.test(lt) && wc <= 60) { sart = true; }
      if (!sart && RE_SART_GEREK.test(lt) && wc <= 50 && wc >= 6) { sart = true; }
      if (!sart && listeVar && /(gerek|şart|koşul|olmalı|aranır|zorunlu)/.test(lt)) { sart = true; }
    }
    f.sart = sart;

    /* ---- istisna ---- */
    var ist = 0;
    if (!soruMu) {
      if (RE_ISTISNA_GUCLU.test(lt)) { ist = 2; }
      else if (RE_ISTISNA_ZAYIF.test(baslayan) && wc >= 6) { ist = 1; }
      else if (RE_ISTISNA_ANCAK.test(lt) && wc >= 6) { ist = 1; }
      else if (RE_ISTISNA_DISINDA.test(lt) && /(hâller|haller|durumlar|hâl\b)/.test(lt) && wc >= 6) { ist = 1; }
    }
    f.istisna = ist > 0;
    u.istisnaGuc = ist;

    /* ---- karar ---- */
    var kar = false;
    var tpar = t.replace(/\([^)]*\)/g, ' ');
    var mk = RE_MAHKEME.exec(tpar);
    if (mk && !tanimOn && !ornekEt) {
      var esas = RE_ESAS_KARAR.test(t);
      var ozne = new RegExp('(?:' + MAHKEME_ADLARI + ')[^;]{0,200}?(karar\\s+ver|kabul\\s+et|hükmet|benimse|bozdu|bozmuş|onadı|onamış|içtihat|belirtmiş|vurgulamış|değerlendir|sonuca\\s+var|yer\\s+ver|kararında|karara\\s+bağla|reddet|iptal\\s+et|ihlal|saptamış|tespit\\s+et|görüşündedir|yönündedir|yönünde|uygulamaktadır|uygulamıştır|gerektiğini|gerektiği)', 'i').test(tpar) ||
        new RegExp('(?:' + MAHKEME_ADLARI + ')[^;]{0,40}[,:]\\s*[“"«]').test(tpar);
      var kunye = /\b(B\.?\s*No|K\.?T\.|Başvuru\s+No|Karar\s+Tarihi)\s*:?\s*\d/i.test(t);
      var icerik = kelimeSay(tpar.replace(/\b[EKT]\.\s*[\d\/.\-]+|\bR\.?G\.?|\bsa\.|\bbkz\.|\bsayılı|\d+/gi, ' ').replace(/[^A-Za-zÇĞİÖŞÜçğıöşü\s]/g, ' ').replace(/\b\S{1,2}\b/g, ' '));
      if (esas || kunye || (ozne && icerik >= 8)) { kar = true; }
      if (kar && !esas && !kunye && icerik < 8) { kar = false; }
      /* "... sayili IBK icin bkz. RG ..." kunye gonderme cumlesi karar degildir */
      if (kar && /\bbkz\.?(?=\s|$)/i.test(t) && !/(karar\s+ver|hükmet|kabul\s+et|benimse|bozdu|bozmuş|onadı|onamış|reddet|iptal\s+et|ihlal|sonuca\s+var)/i.test(tpar)) { kar = false; }
      if (kar) {
        u.mahkeme = mk[1];
        var me = /\bE\.\s*(\d{2,4}\s*\/\s*\d+)/.exec(t) || /(\d{2,4}\s*\/\s*\d+)\s*E\./.exec(t);
        var mkk = /\bK\.\s*(\d{2,4}\s*\/\s*\d+)/.exec(t) || /(\d{2,4}\s*\/\s*\d+)\s*K\./.exec(t);
        var mtar = /\bT\.\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/.exec(t);
        if (me) { u.esas = me[1].replace(/\s/g, ''); }
        if (mkk) { u.kararNo = mkk[1].replace(/\s/g, ''); }
        if (mtar) { u.tarih = mtar[1]; }
      }
    }
    f.karar = kar;

    /* ---- gorus ---- */
    var gor = false;
    if (!tanimOn && !ornekEt && !u.alinti && !soruMu && RE_GORUS.test(lt)) { gor = true; }
    f.gorus = gor;
    if (gor) {
      u.gorusTuru = RE_GORUS_KANAAT.test(lt) ? 'kanaat' : (RE_GORUS_AKSI.test(lt) ? 'aksi' : (RE_GORUS_HAKIM.test(lt) ? 'hakim' : 'genel'));
    }

    /* ---- ornek ---- */
    f.ornek = (RE_ORNEK.test(lt.replace(/\([^)]*\)/g, ' ')) && !soruMu) || ornekEt;
    f.geri = /(yukarıda|yukarıdaki|aşağıda\s+(?:açıklan|belirt|ele al|incelen)|belirtmiştik|belirttik|bahsetmiştik|bahsettik|değinmiştik|değindik|açıklamıştık|görmüştük|ele almıştık|anlatmıştık)/.test(lt) ||
      /^(maalesef|yani,)\s/.test(baslayan);
    f.baglam = /^(bu durumda|bu sebeple|bu nedenle|bununla birlikte|buna karşılık|yani\b|tüm bunlar|bütün bunlar|bu hükümde|görüldüğü üzere|bu itibarla|bunun üzerine|bu çerçevede|bu bağlamda|bunlara ek olarak)/.test(lt.replace(/^["“«(\s]+/, ''));
    f.ornekBas = RE_ORNEK_BAS.test(lt);

    u.atifVar = /(\bm\.\s*\d|\bmd\.\s*\d|sayılı|\d+\.\s*madde|\d+['’]?[a-zçğıöşü]*\s+madde)/.test(t);

    /* meta cumle: notun kendi yapisini anlatan */
    f.meta = /(anlatılacak|anlatılacaktır|açıklanacak|açıklanacaktır|incelenecek|incelenecektir|ele alınacak|ele alınacaktır|değinilecek|değinilecektir|bilgi verilecek|bilgi verilecektir|anlatılmaya çalışılacak|ders notunda|bu bölümde|izleyen başlık|aşağıda incelen|üzerinde durulacak|iyi çalışmalar|sınavda |yapay zek[âa] ek|notu derleyen)/.test(lt) ||
      /^(yukarıda|aşağıda|daha önce|bu bölümde|burada)\s.*(açıklandı|açıklanmıştır|belirtildi|belirtilmiştir|anlatıldı|incelendi|değinildi|açıklanacaktır|ele alınacaktır)/.test(lt);

    u.f = f;
    return f;
  }

  /* ------------------------------------------------------------------ */
  /* Birim (cumle) uretimi                                                */
  /* ------------------------------------------------------------------ */
  function maddeTemizle(s) {
    return s.replace(/^\s+|\s+$/g, '').replace(/[,;]\s*$/, '').replace(/\s+(ve|veya)$/i, '');
  }

  function birimleriUret(blocks) {
    var units = [];
    var heads = [];
    var sec = -1;
    var i, b, k;
    var testler = [];
    var paraNo = 0, grupNo = 0;
    var kutular = [], tablolar = [];

    function baslikEkle(b) {
      heads.push({ t: b.t, sayfa: b.p, kind: b.kind, lv: b.lv, h: b.h || 0, x: b.x });
      sec = heads.length - 1;
    }

    for (i = 0; i < blocks.length; i++) {
      b = blocks[i];
      if (b.tur === 'baslik') { baslikEkle(b); continue; }
      if (b.tur === 'kutu') { kutular.push({ kutu: b.kutu, sec: sec }); continue; }
      if (b.tur === 'tablo2') { tablolar.push({ tablo: b.tablo, sec: sec }); continue; }
      if (b.tur === 'tablo') {
        /* iki nokta ile biten giristen sonra gelen tablo hucreleri liste ogesidir */
        var on = units.length ? units[units.length - 1] : null;
        if (on && on.sec === sec && on.kaynak === 'para' && (/:$/.test(on.t) || on.tabloListe) && b.hucre) {
          on.maddeler = on.maddeler || [];
          on.tabloListe = true; on.liste = true;
          for (k = 0; k < b.hucre.length; k++) { if (b.hucre[k].length > 1) { on.maddeler.push(bosluk(b.hucre[k])); } }
        }
        continue;
      }
      if (b.tur === 'para') {
        paraNo++;
        var ptxt = b.t.replace(new RegExp('([' + KUCUK + '\\)])(\\d{1,2})(?=[.,;:]|\\s|$)', 'g'), function (m0, a0, d0, off, str) {
          /* "m. 21, 3)3." gibi dipnot imi: harf/parantezden hemen sonra gelen 1-2 haneli sayi */
          return a0;
        });
        var sents = bol(ptxt);
        var ornekPara = RE_ORNEK_BAS.test(lc(b.t));
        for (k = 0; k < sents.length; k++) {
          var us = { t: sents[k], sayfa: b.p, sec: sec, aside: !!b.aside, kucuk: !!b.kucuk, dipnot: !!b.dipnot, para: paraNo, ilkPara: k === 0,
            ornekPara: ornekPara, kaynak: 'para' };
          units.push(us);
        }
        continue;
      }
      if (b.tur === 'madde') {
        /* ardisik maddeleri grupla */
        var grup = [b];
        grupNo++;
        while (i + 1 < blocks.length && blocks[i + 1].tur === 'madde' && !!blocks[i + 1].secenek === !!b.secenek) { grup.push(blocks[++i]); }
        var onceki = units.length ? units[units.length - 1] : null;
        if (b.secenek) {
          /* test sorusu: oncesindeki paragraf kok */
          var kokU = [];
          if (onceki && onceki.sec === sec) {
            var pn = onceki.para, z = units.length - 1;
            while (z >= 0 && units[z].para === pn) { kokU.unshift(units[z]); units[z].test = true; z--; }
          }
          var tsec = [];
          for (k = 0; k < grup.length; k++) { tsec.push(grup[k].isaret + ') ' + grup[k].t); }
          testler.push({ t: kokU.map(function (x) { return x.t; }).join(' '), secenekler: tsec, sayfa: grup[0].p });
          continue;
        }
        var leadVar = onceki && onceki.sec === sec && onceki.kaynak === 'para' && onceki.para === paraNo &&
          (/[:;]$/.test(onceki.t) || /(şunlardır|aşağıdaki|şu şekilde|şöyledir|şu hâllerde|şu hallerde)/.test(lc(onceki.t)) || /[^.?!;]$/.test(onceki.t) === false && false);
        if (leadVar) {
          var items = [];
          for (k = 0; k < grup.length; k++) { items.push(maddeTemizle(grup[k].t)); }
          onceki.maddeler = items;
          onceki.liste = true;
          onceki.maddeSayfa = grup[0].p;
        } else {
          for (k = 0; k < grup.length; k++) {
            paraNo++;
            units.push({ t: grup[k].t, sayfa: grup[k].p, sec: sec, aside: !!grup[k].aside, kucuk: !!grup[k].kucuk, para: paraNo,
              ilkPara: false, madde: true, kaynak: 'madde', isaret: grup[k].isaret, grup: grupNo });
          }
        }
        paraNo++;
        continue;
      }
    }
    /* "...:" ile biten ve listesi olmayan giris cumlesi, hemen ardindaki cumleyle birlestirilir */
    var yeniU = [];
    for (i = 0; i < units.length; i++) {
      var cu = units[i];
      if (/:$/.test(cu.t) && !cu.maddeler && cu.kaynak === 'para' && i + 1 < units.length && units[i + 1].sec === cu.sec &&
        units[i + 1].kaynak === 'para' && !units[i + 1].kucuk && !cu.kucuk && cu.t.length + units[i + 1].t.length <= 700 && /^[A-ZÇĞİÖŞÜ0-9"\u201c]/.test(units[i + 1].t)) {
        cu.t = cu.t + ' ' + units[i + 1].t;
        cu.sayfaSon = units[i + 1].sayfa;
        i++;
      }
      yeniU.push(cu);
    }
    units = yeniU;
    return { units: units, heads: heads, testler: testler, kutular: kutular, tablolar: tablolar };
  }

  /* ------------------------------------------------------------------ */
  /* Atif cikarimi                                                       */
  /* ------------------------------------------------------------------ */
  function kanunAdiTemizle(s) {
    return bosluk(s.replace(/[’'‘]\s*[a-zçğıöşü]*$/i, ''));
  }
  function kanunNorm(s) {
    if (/^Anayasa/.test(s)) { return 'AY'; }
    return s;
  }
  function yasaKanon(core, oncekiSay) {
    if (/^Kanun/.test(core)) { return oncekiSay > 0 ? 'Kanunu' : 'Kanun'; }
    if (/^Yönetmeli/.test(core)) { return 'Yönetmelik'; }
    if (/^Kararname/.test(core)) { return 'Kararname'; }
    if (/^Sözleşme/.test(core)) { return 'Sözleşme'; }
    if (/^Tüzü/.test(core)) { return 'Tüzük'; }
    if (/^Tebli/.test(core)) { return 'Tebliğ'; }
    return core;
  }
  var RE_MADDE_ARA2 = new RegExp('^\\s*,?\\s*\\(?\\s*(?:(?:m|md)\\.\\s*(\\d{1,4}(?:\\/[' + KUCUK + '](?![' + KUCUK + ']))?)(?:\\s*\\/\\s*(\\d{1,2}))?|(\\d{1,4})\\s*\\.\\s*madde[' + KUCUK + ']*|(\\d{1,4})[’\']?(?:inci|ıncı|uncu|üncü|nci|ncı)\\s+madde)');
  var RE_MD_BAGLAM = new RegExp('(^|[^' + HARF + '])(?:md|mad)\\.\\s*(\\d{1,4})(?:\\s*\\/\\s*(\\d{1,2}))?(?:\\s*-\\s*([' + KUCUK + '])(?![' + KUCUK + ']))?', 'g');

  /* mulga (eski) kanun baglami: "765 sayili", "eski TCK", 1988 tarihli karar ... */
  var YURURLUK = { tck: 2005, cmk: 2005, tbk: 2012, hmk: 2011, ttk: 2012, tmk: 2002 };
  var ESKI_NO = { '765': 'tck', '1412': 'cmk', '818': 'tbk', '1086': 'hmk', '6762': 'ttk', '743': 'tmk' };
  var AILE_AD = '(tck|türk ceza (?:kanunu|yasası)|ceza kanunu|cmk|ceza muhakemesi|ceza usul|tbk|borçlar kanunu|hmk|hukuk muhakemeleri|hukuk usulü|ttk|ticaret kanunu|tmk|medeni kanun)';
  function kanunAile(k) {
    var l = lc(k || '');
    if (/(^|\s)cmk(\s|$)|ceza muhakemesi|^1412\b|1412 sayılı/.test(l)) { return 'cmk'; }
    if (/(^|\s)tck(\s|$)|türk ceza (kanunu|yasası)|^ceza kanunu|5237 sayılı|765 sayılı/.test(l)) { return 'tck'; }
    if (/(^|\s)tbk(\s|$)|borçlar kanunu|6098 sayılı/.test(l)) { return 'tbk'; }
    if (/(^|\s)hmk(\s|$)|hukuk muhakemeleri|6100 sayılı/.test(l)) { return 'hmk'; }
    if (/(^|\s)ttk(\s|$)|türk ticaret kanunu|6102 sayılı/.test(l)) { return 'ttk'; }
    if (/(^|\s)tmk(\s|$)|medeni kanun|4721 sayılı/.test(l)) { return 'tmk'; }
    return '';
  }
  function baglamMetni(units, i) {
    var s = '', pg = units[i].sayfa, z, son = Math.min(units.length - 1, i + 40);
    for (z = Math.max(0, i - 40); z <= son; z++) { if (units[z].sayfa === pg) { s += ' ' + units[z].t; } }
    return s;
  }
  /* atif bu baglamda mulga kanuna mi gonderiyor? */
  function mulgaMi(kanun, baglam) {
    var aile = kanunAile(kanun);
    if (!aile) { return false; }
    var l = lc(baglam), m, rg = /(\d{3,4})\s+sayılı/g;
    while ((m = rg.exec(l))) { if (ESKI_NO[m[1]] === aile) { return true; } }
    if (new RegExp('(eski|mülga|yürürlükten kaldırılan|yürürlükten kalkan)\\s+' + AILE_AD).test(l)) {
      var mm = new RegExp('(eski|mülga|yürürlükten kaldırılan|yürürlükten kalkan)\\s+' + AILE_AD).exec(l);
      if (kanunAile(mm[2]) === aile) { return true; }
    }
    if (/(5237|6098|6100|6102|4721|5271)\s+sayılı/.test(l)) { return false; }
    /* karar yili kanunun yururluk yilindan once */
    var yil = 0, ry = /\b[EK]\.\s*(19\d\d|20\d\d)\s*\/|\bT\.\s*\d{1,2}[./]\d{1,2}[./](19\d\d|20\d\d)|\b(19\d\d|20\d\d)\s*\/\s*\d+\s*[EK]\./g, my;
    var enBuyuk = 0, bulundu = false;
    while ((my = ry.exec(baglam))) { yil = parseInt(my[1] || my[2] || my[3], 10); bulundu = true; if (yil > enBuyuk) { enBuyuk = yil; } }
    if (bulundu && enBuyuk < YURURLUK[aile]) { return true; }
    return false;
  }
  /* atiflari kontrol et: kanun numarasi biliniyorsa madde var mi? opts.kanunNo(ad)->no, opts.kanunMadde{no:adet}, opts.maddeVar(no,madde)->bool */
  function atifKontrol(atiflar, opts) {
    opts = opts || {};
    for (var i = 0; i < atiflar.length; i++) {
      var a = atiflar[i];
      if (a.mulga) { continue; }
      var no = a.no || (/(\d{3,5})\s+sayılı/.exec(a.kanun || '') || [])[1] || '';
      if (!no && typeof opts.kanunNo === 'function') {
        try { no = opts.kanunNo(a.kanunAd || a.kanun, a) || ''; } catch (e) { no = ''; }
      }
      if (!no) { continue; }
      a.no = String(no);
      var n = parseInt(a.madde, 10), top = opts.kanunMadde ? opts.kanunMadde[a.no] : 0;
      var yok = false;
      if (top && n > top) { yok = true; }
      if (!yok && typeof opts.maddeVar === 'function') {
        try { if (opts.maddeVar(a.no, a.madde) === false) { yok = true; } } catch (e2) { /* yoksay */ }
      }
      if (yok) { a.yok = true; a.belirsiz = true; } else if (a.yok) { delete a.yok; }
    }
    return atiflar;
  }

  var CUMLE_BASI = {};
  (function () {
    var l = 'ancak ayrıca bununla bu şu zira yani ise fakat özellikle nitekim oysa çünkü şayet örneğin mesela buna burada ve de da ile her bazı tüm aynı ilgili diğer sonuç böylece dolayısıyla kanun'.split(' ');
    for (var i = 0; i < l.length; i++) { CUMLE_BASI[l[i]] = 1; }
  })();
  function atiflariBul(t, out, ctx) {
    var m, spans = [];
    function bos(a, b) {
      for (var i = 0; i < spans.length; i++) { if (a < spans[i][1] && b > spans[i][0]) { return false; } }
      return true;
    }
    /* N sayili ... Kanun [m. N] */
    RE_SAYILI.lastIndex = 0;
    while ((m = RE_SAYILI.exec(t))) {
      var basi = m.index;
      var rest = t.substr(m.index + m[0].length, 160);
      var ws = /\S+/g, mw, names = [], endIdx = 0, found = false, cnt = 0;
      while ((mw = ws.exec(rest)) && cnt < 9) {
        cnt++;
        var w = mw[0];
        var w0 = w.replace(/^[(“"]+/, '');
        var core = w0.replace(/[’'‘]\S*$/, '').replace(/[,;.)]+$/, '');
        if (YASA_SON.test(core)) { names.push(yasaKanon(core, names.length)); endIdx = mw.index + w.length; found = true; break; }
        if (bykMi(w0.charAt(0)) || /^(ve|ile)$/.test(w0)) { names.push(core); } else { break; }
        if (/[,;]$/.test(w)) { break; }
      }
      if (!found) { continue; }
      var kalan = rest.substr(endIdx);
      var mm2 = RE_MADDE_ARA2.exec(kalan);
      var madde = '', fikra = '';
      if (mm2) { madde = mm2[1] || mm2[3] || mm2[4] || ''; fikra = mm2[2] || ''; }
      var kanunTam = m[1] + ' sayılı ' + names.join(' ');
      var endPos = m.index + m[0].length + endIdx + (mm2 ? mm2[0].length : 0);
      if (bos(basi, endPos)) {
        spans.push([basi, endPos]);
        out.kanunlar.push({ kanun: kanunTam, no: m[1] });
        if (ctx) { ctx.sonKanun = kanunTam; }
        if (madde) { out.atif.push({ t: bosluk(t.substring(basi, endPos)), kanun: kanunTam, madde: madde, fikra: fikra }); }
      }
    }
    /* ABBR m. N */
    RE_YASA_KISA.lastIndex = 0;
    while ((m = RE_YASA_KISA.exec(t))) {
      var ab = m[2];
      var ust = ab.replace(new RegExp('[^' + BUYUK + ']', 'g'), '').length;
      if (ust < 2) { continue; }
      var s0 = m.index + m[1].length;
      var e0 = m.index + m[0].length;
      if (!bos(s0, e0)) { continue; }
      spans.push([s0, e0]);
      out.atif.push({ t: bosluk(t.substring(s0, e0)), kanun: kanunNorm(ab), madde: m[3], fikra: m[4] || m[5] || '' });
    }
    /* Kanunun N. maddesi / Anayasa'nin 36. maddesi */
    RE_YASA_ADLI.lastIndex = 0;
    while ((m = RE_YASA_ADLI.exec(t))) {
      var a1 = m.index, e1 = m.index + m[0].length;
      if (!bos(a1, e1)) { continue; }
      spans.push([a1, e1]);
      var ka = kanunAdiTemizle(m[1]);
      var kw = ka.split(' ');
      while (kw.length > 1 && CUMLE_BASI[lc(kw[0])]) { kw.shift(); }
      ka = kw.join(' ');
      var belirsiz = /^(Kanun|Yönetmelik|Tüzük|Kararname|Sözleşme)[a-zçğıöşü]*$/.test(ka);
      var kk = kanunNorm(ka);
      if (belirsiz && ctx && ctx.sonKanun) { kk = ctx.sonKanun; }
      out.atif.push({ t: bosluk(m[0]), kanun: kk, madde: m[2], fikra: '', belirsiz: belirsiz });
    }
    /* baglamdaki kanuna gonderme: "(md.3/1-d)" */
    RE_MD_BAGLAM.lastIndex = 0;
    while ((m = RE_MD_BAGLAM.exec(t))) {
      var a2 = m.index + m[1].length, e2 = m.index + m[0].length;
      if (!bos(a2, e2)) { continue; }
      spans.push([a2, e2]);
      out.atif.push({ t: bosluk(t.substring(a2, e2)), kanun: (ctx && ctx.sonKanun) || '', madde: m[2], fikra: (m[3] || '') + (m[4] ? '-' + m[4] : ''), belirsiz: true });
    }
  }

  /* iki kelime arasi duzenleme mesafesi <= 1 mi (ekleme/silme/degistirme) */
  function levBir(a, b) {
    if (a === b) { return true; }
    if (Math.abs(a.length - b.length) > 1) { return false; }
    var i = 0, j = 0, fark = 0;
    while (i < a.length && j < b.length) {
      if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
      if (++fark > 1) { return false; }
      if (a.length > b.length) { i++; } else if (b.length > a.length) { j++; } else { i++; j++; }
    }
    return fark + (a.length - i) + (b.length - j) <= 1;
  }
  /* "Tebligat Kanunu (TebK)" tipi kisaltma tanimlari */
  var RE_ALIAS = new RegExp('((?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\\s+){1,6}(?:Kanunu?|Yönetmeli[kğ]i?|Kararnamesi?|Sözleşmesi?|Tüzü[kğ]ü?))[’\']?[a-zçğıöşü]*\\s*\\(([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]{1,9})\\)', 'g');
  function adAnahtar(ad) {
    var w = lc(ad).replace(/^\d+\s+sayılı\s+/, '').split(/\s+/);
    if (w.length < 2) { return lc(ad); }
    var son = w[w.length - 1];
    var tip = /^kanun/.test(son) ? 'kanun' : (/^yönetmeli/.test(son) ? 'yönet' : (/^kararname/.test(son) ? 'karar' : son.substr(0, 5)));
    return w[0].substr(0, 5) + ' ' + (w.length > 2 ? w[1].substr(0, 4) + ' ' : '') + tip;
  }

  /* ------------------------------------------------------------------ */
  /* Ozet: TF-IDF + TextRank                                             */
  /* ------------------------------------------------------------------ */
  function vektorYap(units, idxs) {
    var df = {}, i, j;
    var N = idxs.length;
    var termIds = {}, nt = 0;
    for (i = 0; i < N; i++) {
      var u = units[idxs[i]];
      var ks = kokler(u.t + (u.maddeler ? ' ' + u.maddeler.join(' ') : ''));
      var tf = {};
      for (j = 0; j < ks.length; j++) { tf[ks[j]] = (tf[ks[j]] || 0) + 1; }
      u.tf = tf;
      u.nterm = ks.length;
      for (var kk in tf) { if (tf.hasOwnProperty(kk)) { df[kk] = (df[kk] || 0) + 1; if (termIds[kk] === undefined) { termIds[kk] = nt++; } } }
    }
    var cap = Math.max(30, Math.floor(0.08 * N));
    var post = new Array(nt);
    for (i = 0; i < nt; i++) { post[i] = []; }
    var idfMap = {};
    for (i = 0; i < N; i++) {
      var uu = units[idxs[i]];
      var ids = [], ws = [], norm = 0;
      for (var k2 in uu.tf) {
        if (!uu.tf.hasOwnProperty(k2)) { continue; }
        var idf = Math.log((N + 1) / (df[k2] + 0.5));
        if (idf < 0.05) { idf = 0.05; }
        idfMap[k2] = idf;
        var w = (1 + Math.log(uu.tf[k2])) * idf;
        ids.push(termIds[k2]); ws.push(w); norm += w * w;
      }
      norm = Math.sqrt(norm) || 1;
      /* terim kimliklerine gore sirala */
      var ord = ids.map(function (_, q) { return q; });
      ord.sort(function (a, b) { return ids[a] - ids[b]; });
      var sid = [], sw = [];
      for (j = 0; j < ord.length; j++) { sid.push(ids[ord[j]]); sw.push(ws[ord[j]] / norm); }
      uu.vid = sid; uu.vw = sw; uu.norm = norm;
      uu.rawIdfSum = 0;
      for (var k3 in uu.tf) { if (uu.tf.hasOwnProperty(k3)) { uu.rawIdfSum += idfMap[k3]; } }
      for (j = 0; j < sid.length; j++) { if (df[Object.keys(termIds)[0]] !== undefined) { break; } }
    }
    /* postings (yalnizca nadir terimler) */
    var dfById = new Array(nt);
    for (var kt in termIds) { if (termIds.hasOwnProperty(kt)) { dfById[termIds[kt]] = df[kt]; } }
    for (i = 0; i < N; i++) {
      var u3 = units[idxs[i]];
      for (j = 0; j < u3.vid.length; j++) {
        if (dfById[u3.vid[j]] <= cap) { post[u3.vid[j]].push([i, u3.vw[j]]); }
      }
    }
    return { post: post, N: N, nt: nt };
  }

  function kosinus(a, b) {
    var i = 0, j = 0, s = 0;
    var av = a.vid, bv = b.vid;
    while (i < av.length && j < bv.length) {
      if (av[i] === bv[j]) { s += a.vw[i] * b.vw[j]; i++; j++; }
      else if (av[i] < bv[j]) { i++; } else { j++; }
    }
    return s;
  }

  function textRank(units, idxs, V) {
    var N = V.N, i, j, k;
    var adj = new Array(N), wt = new Array(N);
    for (i = 0; i < N; i++) { adj[i] = []; wt[i] = []; }
    /* komsu listesi: her terim icin postings ciftleri */
    var acc = new Float64Array(N);
    var dokunuldu = [];
    var inc = new Uint8Array(N);
    /* birimden terime erisim icin ters liste */
    var uPost = new Array(N);
    for (i = 0; i < N; i++) { uPost[i] = []; }
    for (i = 0; i < V.post.length; i++) {
      for (j = 0; j < V.post[i].length; j++) { uPost[V.post[i][j][0]].push(i); }
    }
    for (i = 0; i < N; i++) {
      var ui = units[idxs[i]];
      dokunuldu.length = 0;
      for (j = 0; j < uPost[i].length; j++) {
        var tid = uPost[i][j];
        var pl = V.post[tid];
        var wi = 0;
        for (k = 0; k < pl.length; k++) { if (pl[k][0] === i) { wi = pl[k][1]; break; } }
        for (k = 0; k < pl.length; k++) {
          var b = pl[k][0];
          if (b <= i) { continue; }
          if (!inc[b]) { inc[b] = 1; dokunuldu.push(b); }
          acc[b] += wi * pl[k][1];
        }
      }
      for (j = 0; j < dokunuldu.length; j++) {
        var bb = dokunuldu[j];
        var s = acc[bb];
        acc[bb] = 0; inc[bb] = 0;
        if (s >= 0.05) {
          adj[i].push(bb); wt[i].push(s);
          adj[bb].push(i); wt[bb].push(s);
        }
      }
    }
    var outSum = new Float64Array(N);
    for (i = 0; i < N; i++) { var t = 0; for (j = 0; j < wt[i].length; j++) { t += wt[i][j]; } outSum[i] = t; }
    var pr = new Float64Array(N), np = new Float64Array(N);
    for (i = 0; i < N; i++) { pr[i] = 1 / N; }
    var d = 0.85;
    for (var it = 0; it < 20; it++) {
      for (i = 0; i < N; i++) { np[i] = (1 - d) / N; }
      for (i = 0; i < N; i++) {
        if (!outSum[i]) { continue; }
        var share = d * pr[i] / outSum[i];
        for (j = 0; j < adj[i].length; j++) { np[adj[i][j]] += share * wt[i][j]; }
      }
      var tmp = pr; pr = np; np = tmp;
    }
    return pr;
  }

  /* ":" ile biten ya da liste girisi kesilmis ("...sektorleri sunlardir: Dijital Altyapilar") cumle */
  function yarimListeMi(t) {
    var tt = bosluk(String(t));
    if (/:["”)]*$/.test(tt)) { return true; }
    var m = /:\s+([^.?!]*)$/.exec(tt);
    return !!(m && kelimeSay(m[1]) <= 5 && !/[.?!]["”)]*$/.test(tt));
  }
  /* tirnak icindeki en uzun metnin kelime sayisi */
  function enUzunAlinti(t) {
    var re = /[“«"]([^”»"]{10,})[”»"]/g, m, mx = 0;
    while ((m = re.exec(t))) { var k = kelimeSay(m[1]); if (k > mx) { mx = k; } }
    return mx;
  }
  /* uzunluga gore ust sinir (cumle sayisi): Kisa ~28, Orta ~58, Uzun ~110 */
  function ozetTavan(oran) {
    if (oran <= 0.1) { return 26; }
    if (oran <= 0.2) { return Math.round(26 + (oran - 0.1) * 280); }
    if (oran <= 0.3) { return Math.round(54 + (oran - 0.2) * 480); }
    return 102 + Math.round((oran - 0.3) * 400);
  }
  function ozetle(units, heads, opts, qaModu) {
    var oran = typeof opts.oran === 'number' ? opts.oran : 0.2;
    var cand = [], i, j;
    for (i = 0; i < units.length; i++) {
      var u = units[i];
      u.aday = !(u.test || u.kucuk || u.wc < 4 || (qaModu && u.sec < 0));
      if (u.aday && oran < 0.25 && u.f.baglam && !u.f.tanim && !u.f.karar) { u.aday = false; }
      if (u.aday && oran < 0.3 && !u.f.tanim && !u.f.karar && enUzunAlinti(u.t) >= 12) { u.aday = false; }
      if (u.aday && ((u.wc > 100 && !u.f.tanim) || (u.wc >= 45 && alintiOrani(u.t) >= 0.5) || (!u.maddeler && yarimListeMi(u.t)))) { u.aday = false; }
      if (u.aday) { cand.push(i); }
    }
    var N = cand.length;
    if (!N) { return []; }
    var V = vektorYap(units, cand);
    var pr = textRank(units, cand, V);
    var prMax = 0;
    for (i = 0; i < N; i++) { if (pr[i] > prMax) { prMax = pr[i]; } }
    var tis = [];
    for (i = 0; i < N; i++) {
      var uu = units[cand[i]];
      uu.tis = uu.rawIdfSum / Math.sqrt(Object.keys(uu.tf).length + 3);
      tis.push(uu.tis);
    }
    var tiRef = yuzdelik(tis, 0.95) || 1;

    /* baslik kok kumeleri */
    var hKok = [];
    for (i = 0; i < heads.length; i++) {
      var hk = kokler(heads[i].t), hm = {};
      for (j = 0; j < hk.length; j++) { hm[hk[j]] = 1; }
      hKok.push(hm);
    }

    /* ilk cumle takibi: baslik sonrasi ilk (aday) birim */
    var secIlk = {};
    for (i = 0; i < cand.length; i++) {
      var us = units[cand[i]];
      if (secIlk[us.sec] === undefined && !us.aside && !us.ornekPara && us.kaynak === 'para') { secIlk[us.sec] = cand[i]; }
    }

    for (i = 0; i < N; i++) {
      var x = units[cand[i]];
      var f = x.f;
      var sc = 0.55 * (pr[i] / prMax) + 0.25 * Math.min(1, x.tis / tiRef);
      var tur = [];
      if (f.tanim) { sc += 0.45; tur.push('tanim'); }
      if (f.sart) { sc += 0.30; tur.push('sart'); }
      if (f.istisna) { sc += (x.istisnaGuc === 2 ? 0.15 : 0.05); tur.push('istisna'); }
      if (f.karar) { sc += 0.20; tur.push('karar'); }
      if (f.gorus) { sc += 0.10; tur.push('gorus'); }
      if (x.atifVar) { sc += 0.06; }
      if (secIlk[x.sec] === cand[i]) { sc += 0.25; tur.push('ilk'); }
      if (x.sec >= 0) {
        var hm2 = hKok[x.sec], hit = 0, hn = 0, kk;
        for (kk in hm2) { if (hm2.hasOwnProperty(kk)) { hn++; if (x.tf[kk]) { hit++; } } }
        if (hn) { sc += 0.12 * (hit / hn); }
      }
      var wc = x.wc;
      if (wc < 6) { sc -= 0.45; } else if (wc < 9) { sc -= 0.12; }
      if (wc > 110) { sc -= 0.45; } else if (wc > 70) { sc -= 0.2; } else if (wc > 55) { sc -= 0.08; }
      if (oran < 0.3) { if (wc > 60) { sc -= 0.2; } else if (wc > 45) { sc -= 0.1; } }
      if (f.geri) { sc -= 0.4; }
      if (f.baglam) { sc -= oran <= 0.15 ? 0.9 : (oran < 0.3 ? 0.6 : 0.25); }
      if (x.liste) { if (wc > 120) { sc -= 0.1; } if (wc < 9) { sc += 0.1; } }
      if (f.ornekBas || x.ornekPara) { sc -= 0.30; } else if (f.ornek) { sc -= 0.05; }
      if (x.aside) { sc -= 0.08; }
      if (f.meta) { sc -= 0.35; }
      if (!bykMi(x.t.charAt(0)) && !digitMi(x.t.charAt(0)) && !/^["“(«]/.test(x.t)) { sc -= 0.25; }
      if (/:$/.test(x.t) && !x.maddeler) { sc -= 0.2; }
      if (/\?["”]?$/.test(x.t)) { sc -= 0.2; }
      if (x.madde && wc < 8) { sc -= 0.1; }
      x.skor = sc;
      x.tur = tur;
    }

    /* bolumlere gore kota */
    var bolumler = {};
    for (i = 0; i < N; i++) {
      var s = units[cand[i]].sec;
      (bolumler[s] = bolumler[s] || []).push(cand[i]);
    }
    var K = Math.max(1, Math.round(oran * N));
    K = Math.min(K, ozetTavan(oran));
    var anahtarlar = Object.keys(bolumler);
    var kota = {}, toplam = 0, minK = 0;
    var bb = typeof opts.baslikBasi === 'number' && opts.baslikBasi > 0 ? opts.baslikBasi : 0;
    var ham = {};
    for (i = 0; i < anahtarlar.length; i++) {
      var key = anahtarlar[i], arr = bolumler[key];
      var n = arr.length, q;
      ham[key] = oran * n;
      q = Math.floor(ham[key]);
      var enAz = n >= 2 ? 1 : 0;
      if (qaModu && n >= 6 && oran >= 0.3) { enAz = 2; }
      if (oran <= 0.15 && n >= 2) { enAz = 0; }
      if (n === 1) {
        /* tek cumle: yalnizca kendi basina anlamliysa */
        var tu = units[arr[0]];
        enAz = (tu.wc >= 9 && (tu.f.tanim || tu.f.sart || tu.f.karar || tu.skor > 0.35)) ? 1 : 0;
      }
      if (q < enAz) { q = enAz; }
      if (bb && q > bb) { q = bb; }
      kota[key] = q; toplam += q; minK += enAz;
    }
    /* toplami hedefe yaklastir */
    var guard = 0;
    var bolumTepe = {};
    for (i = 0; i < anahtarlar.length; i++) {
      var tp = -1e9, ar0 = bolumler[anahtarlar[i]];
      for (j = 0; j < ar0.length; j++) { if (units[ar0[j]].skor > tp) { tp = units[ar0[j]].skor; } }
      bolumTepe[anahtarlar[i]] = tp;
    }
    while (toplam > K * 1.1 + 1 && guard++ < 5000) {
      var en = null, ev = 0;
      if (oran <= 0.15) {
        /* kisa ozet: butce asiliyorsa en zayif bolumlerin payi sifirlanir */
        var dusuk = 1e9;
        for (i = 0; i < anahtarlar.length; i++) {
          var kk3 = anahtarlar[i];
          if (kota[kk3] > 0 && bolumTepe[kk3] < dusuk) { dusuk = bolumTepe[kk3]; en = kk3; }
        }
        if (en === null) { break; }
        toplam -= kota[en]; kota[en] = 0; bolumTepe[en] = 1e9;
        continue;
      }
      for (i = 0; i < anahtarlar.length; i++) {
        var kk2 = anahtarlar[i];
        var minimum = bolumler[kk2].length >= 2 ? (qaModu && bolumler[kk2].length >= 6 && oran >= 0.3 ? 2 : 1) : (kota[kk2] ? 1 : 0);
        if (kota[kk2] > minimum && kota[kk2] - ham[kk2] > ev) { ev = kota[kk2] - ham[kk2]; en = kk2; }
      }
      if (en === null) {
        /* her bolum zaten en az 1: butce asiliyorsa en zayif bolumlerin payi sifirlanir */
        var dus2 = 1e9;
        for (i = 0; i < anahtarlar.length; i++) {
          var kk5 = anahtarlar[i];
          if (kota[kk5] > 0 && bolumTepe[kk5] < dus2) { dus2 = bolumTepe[kk5]; en = kk5; }
        }
        if (en === null) { break; }
        toplam -= kota[en]; kota[en] = 0; bolumTepe[en] = 1e9;
        continue;
      }
      kota[en]--; toplam--;
    }
    guard = 0;
    while (toplam < K * 0.9 && guard++ < 5000) {
      var en2 = null, ev2 = -1;
      for (i = 0; i < anahtarlar.length; i++) {
        var k4 = anahtarlar[i];
        if (bb && kota[k4] >= bb) { continue; }
        if (kota[k4] >= bolumler[k4].length) { continue; }
        var fark = ham[k4] - kota[k4];
        if (fark > ev2) { ev2 = fark; en2 = k4; }
      }
      if (en2 === null) { break; }
      kota[en2]++; toplam++;
    }

    /* secim: bolum icinde MMR benzeri, genel yakin-tekrar esigi 0.8 */
    var secilen = [];
    var secildiMi = {};
    var vecOf = {};
    for (i = 0; i < N; i++) { vecOf[cand[i]] = units[cand[i]]; }
    function enYuksekBenzerlik(u) {
      var m = 0;
      for (var z = 0; z < secilen.length; z++) {
        var c = kosinus(u, units[secilen[z]]);
        if (c > m) { m = c; }
      }
      return m;
    }
    for (i = 0; i < anahtarlar.length; i++) {
      var ky = anahtarlar[i], adaylar = bolumler[ky].slice();
      var kq = kota[ky];
      var segilen = 0;
      var kullanildi = {};
      while (segilen < kq) {
        var best = -1, bestSc = -1e9;
        for (j = 0; j < adaylar.length; j++) {
          if (kullanildi[adaylar[j]]) { continue; }
          var cu = units[adaylar[j]];
          if (cu.f.meta && !cu.f.tanim) { kullanildi[adaylar[j]] = 1; continue; }
          var sim = enYuksekBenzerlik(cu);
          if (sim > 0.8) { kullanildi[adaylar[j]] = 1; continue; }
          var eff = cu.skor - 0.35 * Math.max(0, sim - 0.3);
          if (eff > bestSc) { bestSc = eff; best = adaylar[j]; }
        }
        if (best < 0) { break; }
        kullanildi[best] = 1;
        secilen.push(best); secildiMi[best] = 1; segilen++;
      }
    }
    secilen.sort(function (a, b) { return a - b; });
    var out = [];
    for (i = 0; i < secilen.length; i++) {
      var su = units[secilen[i]];
      var metin = su.t;
      if (su.maddeler && su.maddeler.length) {
        var parcalar = [];
        for (j = 0; j < su.maddeler.length && j < 6; j++) {
          var mt = su.maddeler[j];
          parcalar.push(mt.length > 170 ? mt.substr(0, 167).replace(/\s+\S*$/, '') + '...' : mt);
        }
        metin = su.t + ' ' + parcalar.join('; ') + (su.maddeler.length > 6 ? '; ...' : '.');
      }
      out.push({ t: metin, sayfa: su.sayfa, baslik: su.sec >= 0 ? heads[su.sec].t : '', baslikNo: su.sec, tur: su.tur, skor: Math.round(su.skor * 1000) / 1000 });
    }
    return out;
  }



  /* ------------------------------------------------------------------ */
  /* Iskelet ozeti: zaten ozet olan notta baslik altindaki ana icerik     */
  /* ------------------------------------------------------------------ */
  var RE_YZ_LEAD = /(yapay zek[âa]\s+ek|yz\s+ek|derleyen|notu derleyen)/;
  function iskeletOzet(units, heads, opts, R) {
    var oran = typeof opts.oran === 'number' ? opts.oran : 0.2;
    var capG = oran <= 0.15 ? 4 : (oran >= 0.3 ? 16 : 8);
    var capM = oran <= 0.15 ? 3 : (oran >= 0.3 ? 12 : 6);
    var capP = oran <= 0.15 ? 0 : (oran >= 0.3 ? 600 : 260);
    var out = [], i, j, gorulen = {};
    var grupSec = {}, secSira = [];
    for (i = 0; i < units.length; i++) {
      var u0 = units[i];
      if (u0.test || u0.dipnot) { continue; }
      if (!grupSec.hasOwnProperty(u0.sec)) { grupSec[u0.sec] = []; secSira.push(u0.sec); }
      grupSec[u0.sec].push(u0);
    }
    function girisEkle(arr, u, t, tur, maddeler, oncelik) {
      var key = t + '|' + (maddeler ? maddeler.join('|') : '');
      if (gorulen[key]) { return; }
      gorulen[key] = 1;
      var g = { t: t, sayfa: u.sayfa, baslik: u.sec >= 0 ? heads[u.sec].t : '', baslikNo: u.sec, tur: tur, skor: 0, _o: oncelik };
      if (maddeler && maddeler.length) {
        g.maddeler = maddeler.slice(0, capM);
        if (maddeler.length > capM) { g.daha = maddeler.length - capM; }
      }
      arr.push(g);
    }
    for (var si = 0; si < secSira.length; si++) {
      var us = grupSec[secSira[si]], ent = [], sonGrup = -1, grupItems = null, grupU = null;
      function grupBitir() {
        if (grupItems && grupItems.length) { girisEkle(ent, grupU, '', ['liste'], grupItems, 2); }
        grupItems = null; grupU = null; sonGrup = -1;
      }
      for (j = 0; j < us.length; j++) {
        var u = us[j], f = u.f || {};
        if (u.kaynak === 'madde') {
          if (u.grup !== sonGrup) { grupBitir(); sonGrup = u.grup; grupItems = []; grupU = u; }
          grupItems.push(maddeTemizle(u.t));
          continue;
        }
        grupBitir();
        if (u.maddeler && u.maddeler.length && RE_YZ_LEAD.test(lc(u.t))) {
          R.ekBilgi.push({ t: u.t, sayfa: u.sayfa, baslik: u.sec >= 0 ? heads[u.sec].t : '', maddeler: u.maddeler.slice(), yz: true, etiket: 'YZ eki' });
          continue;
        }
        if (f.meta && !f.tanim) { continue; }
        if (u.maddeler && u.maddeler.length) {
          girisEkle(ent, u, u.t, u.tur || [], u.maddeler, 2);
          continue;
        }
        if (RE_YZ_LEAD.test(lc(u.t)) && /:$/.test(u.t)) { continue; }
        if (/\?["”]?$/.test(u.t) && j + 1 < us.length && us[j + 1].para === u.para && us[j + 1].kaynak === 'para') {
          girisEkle(ent, u, u.t + ' ' + us[j + 1].t, ['soru'], null, 2);
          j++; continue;
        }
        var al = false, onc = 0;
        if (u.ilkPara && !u.ornekPara) {
          al = true; onc = 1;
          /* kisa paragraf: butun cumleler (yogun notlarda ikinci cumle de bilgi tasir) */
          var pj = j, topl = u.t.length;
          while (pj + 1 < us.length && us[pj + 1].para === u.para && us[pj + 1].kaynak === 'para' && !us[pj + 1].maddeler) { pj++; topl += us[pj].t.length + 1; }
          if (pj > j && topl <= capP && !/:$/.test(u.t)) {
            var bt2 = u.t, pz;
            for (pz = j + 1; pz <= pj; pz++) { bt2 += ' ' + us[pz].t; }
            girisEkle(ent, u, bt2, u.tur || [], null, 1);
            j = pj; continue;
          }
        }
        if (f.tanim) { al = true; onc = 3; }
        if (f.sart && u.ilkPara) { onc = Math.max(onc, 2); }
        if (!al && RE_ETIKET_SATIR.test(u.t) && !/\?$/.test(u.t) && u.t.length >= 25) { al = true; onc = 1; }
        if (u.ilkPara && /:$/.test(u.t) && !u.maddeler) { al = false; }
        if (al) { girisEkle(ent, u, u.t, u.tur || [], null, onc); }
      }
      grupBitir();
      if (ent.length > capG) {
        var sirali = ent.map(function (e, ix) { return { e: e, ix: ix }; }).sort(function (a, b) { return (b.e._o - a.e._o) || (a.ix - b.ix); }).slice(0, capG);
        sirali.sort(function (a, b) { return a.ix - b.ix; });
        ent = sirali.map(function (x) { return x.e; });
      }
      for (j = 0; j < ent.length; j++) { delete ent[j]._o; out.push(ent[j]); }
    }
    return out;
  }
  /* ------------------------------------------------------------------ */
  /* Not turu: normal (ozet) / zaten ozet niteliginde (iskelet)           */
  /* ------------------------------------------------------------------ */
  var RE_ETIKET_SATIR = /^[A-ZÇĞİÖŞÜ][^:.;?!]{1,45}:(\s+\S|$)/;
  function notSinyalleri(L, units, heads, sayfa, R, ist) {
    var i, n = 0, liste = 0, kisa = 0, lenRef = ist.lenRef, toplamC = 0, sayC = 0;
    for (i = 0; i < L.length; i++) {
      var ln = L[i];
      if (ln.ph || ln.fn) { continue; }
      n++;
      if (RE_BUL.test(ln.t) || RE_ETIKET_SATIR.test(ln.t) || /^[→•]/.test(ln.t)) { liste++; }
      if (ln.t.length < 0.5 * lenRef) { kisa++; }
    }
    for (i = 0; i < units.length; i++) {
      if (units[i].kaynak === 'para' && !units[i].kucuk) { toplamC += kelimeSay(units[i].t); sayC++; }
    }
    var kutuS = R.sinavNotlari.length + R.ekBilgi.length;
    return {
      listeOrani: n ? Math.round(1000 * liste / n) / 1000 : 0,
      ortCumleKelime: sayC ? Math.round(10 * toplamC / sayC) / 10 : 0,
      kisaSatirOrani: n ? Math.round(1000 * kisa / n) / 1000 : 0,
      baslikYogunlugu: sayfa ? Math.round(100 * heads.length / sayfa) / 100 : 0,
      kutuSayisi: kutuS, tabloSayfaBasi: sayfa ? Math.round(100 * R.tablolar.length / sayfa) / 100 : 0
    };
  }
  function modKarar(g) {
    /* her sinyal 0..1 puan; esik 0.5 */
    var p = 0, a = 0;
    function ekle(deger, alt, ust, agirlik) { var v = (deger - alt) / (ust - alt); v = v < 0 ? 0 : v > 1 ? 1 : v; p += v * agirlik; a += agirlik; }
    ekle(g.listeOrani, 0.08, 0.30, 2);
    ekle(g.kisaSatirOrani, 0.10, 0.35, 1);
    ekle(g.baslikYogunlugu, 1.5, 4, 2);
    ekle(-g.ortCumleKelime, -34, -20, 1);
    var kutu = g.kutuSayisi > 0 ? 1 : 0;
    p += kutu * 1.5; a += 1.5;
    ekle(g.tabloSayfaBasi, 0.1, 0.5, 1);
    g.puan = Math.round(1000 * p / a) / 1000;
    return g.puan >= 0.5 ? 'iskelet' : 'ozet';
  }
  /* ------------------------------------------------------------------ */
  /* Seviye atama                                                         */
  /* ------------------------------------------------------------------ */
  /* tekrar eden "GIRIS" basliklari: ust bolum adiyla "Bolum > Giris" yapilir */
  function girisBaslikDuzelt(heads) {
    var i, j, n = 0;
    for (i = 0; i < heads.length; i++) { if (lc(heads[i].t) === 'giriş') { n++; } }
    if (n < 2) { return; }
    for (i = 0; i < heads.length; i++) {
      if (lc(heads[i].t) !== 'giriş') { continue; }
      for (j = i - 1; j >= 0; j--) {
        if (heads[j].seviye < heads[i].seviye && lc(heads[j].t) !== 'giriş') {
          var pt = bosluk(heads[j].t);
          if (pt.length > 70) { pt = pt.substr(0, 70).replace(/\s+\S*$/, '') + '…'; }
          heads[i].t = pt + ' › ' + heads[i].t;
          break;
        }
      }
    }
  }
  function seviyeAta(heads) {
    var i;
    var hVar = false;
    for (i = 0; i < heads.length; i++) { if (heads[i].kind === 'font') { hVar = true; } }
    /* font yukseklige gore rank */
    if (hVar) {
      var yuks = [];
      for (i = 0; i < heads.length; i++) {
        if (heads[i].kind === 'font') {
          var h = Math.round(heads[i].h * 10) / 10, bul = false;
          for (var q = 0; q < yuks.length; q++) { if (Math.abs(yuks[q] - h) < 0.06 * h) { bul = true; break; } }
          if (!bul) { yuks.push(h); }
        }
      }
      yuks.sort(function (a, b) { return b - a; });
      for (i = 0; i < heads.length; i++) {
        if (heads[i].kind === 'font') {
          for (var r = 0; r < yuks.length; r++) { if (Math.abs(yuks[r] - heads[i].h) < 0.06 * yuks[r]) { heads[i].lv = r + 1; break; } }
        }
      }
      var maxF = yuks.length;
      for (i = 0; i < heads.length; i++) { if (heads[i].kind !== 'font') { heads[i].lv = Math.max(maxF + 1, heads[i].lv || 0); } }
    } else {
      /* caps: GIRIS ile devam eden veya cok satirli = ust bolum */
      for (i = 0; i < heads.length; i++) {
        if (heads[i].kind === 'caps') {
          var sonraki = heads[i + 1];
          var buyukBolum = !!(sonraki && /^G.R.{1,2}$/.test(sonraki.t) && sonraki.t.length === 5 && heads[i].t.length > 5);
          heads[i].lv = buyukBolum ? 1 : 2;
        }
      }
    }
    /* yogun siralama */
    var set = {};
    for (i = 0; i < heads.length; i++) { set[heads[i].lv] = 1; }
    var lvs = Object.keys(set).map(function (x) { return parseInt(x, 10); }).sort(function (a, b) { return a - b; });
    for (i = 0; i < heads.length; i++) { heads[i].seviye = lvs.indexOf(heads[i].lv) + 1; }
  }

  /* ek bolumler: icerigi bos ":" cumleleri at, bolumler arasi tekrari kaldir, her ogeye kalite puani ver */
  function benzAnahtar(t) { return lc(String(t)).replace(/[^a-zçğıöşü0-9]+/g, ' ').replace(/^ | $/g, '').substr(0, 90); }
  function ekPuan(tur, x) {
    var wc = kelimeSay(x.t || ''), p = 0;
    if (/^["“«(\s]*(bu durumda|bu sebeple|bu nedenle|bununla birlikte|buna karşılık|yani\b|tüm bunlar|bütün bunlar|bu hükümde|görüldüğü üzere|bu itibarla)/.test(lc(x.t || ''))) { p -= 3; x.baglam = true; }
    if (wc >= 8 && wc <= 40) { p += 1; } else if (wc > 60) { p -= 1; } else if (wc < 6) { p -= 1; }
    if (tur === 'tanim') { if (x.terim) { p += 2; } p += 1; }
    else if (tur === 'karar') { if (x.esas || x.kararNo) { p += 2; } if (x.tarih) { p += 1; } }
    else if (tur === 'ornek') { if (/^(Örnek|Örneğin)/i.test(x.t)) { p += 1; } }
    else if (tur === 'sart') { if (x.maddeler && x.maddeler.length >= 2) { p += 2; } }
    else if (tur === 'istisna') { p += (x.guc || 0); }
    else if (tur === 'gorus') { if (x.tur === 'hakim' || x.tur === 'aksi') { p += 1; } }
    return p;
  }
  /* alt madde ana cumlenin icinde zaten geciyorsa tekrar etme */
  function altTekrarSil(ana, alt) {
    var a = lc(String(ana || '')).replace(/[^a-zçğıöşü0-9]+/g, ' ');
    return alt.filter(function (m) {
      var k = lc(String(m)).replace(/[^a-zçğıöşü0-9]+/g, ' ').replace(/^ | $/g, '');
      return !(k.length >= 6 && a.indexOf(k) >= 0);
    });
  }
  function ekBolumDuzenle(R) {
    var sira = R.mod === 'sunum' ? [['tanimlar', 'tanim'], ['kararlar', 'karar'], ['ornekler', 'ornek'], ['gorusler', 'gorus'], ['sartlar', 'sart'], ['istisnalar', 'istisna']] :
      [['tanimlar', 'tanim'], ['kararlar', 'karar'], ['gorusler', 'gorus'], ['sartlar', 'sart'], ['istisnalar', 'istisna'], ['ornekler', 'ornek']];
    var gorulen = {}, a, i;
    for (a = 0; a < sira.length; a++) {
      var arr = R[sira[a][0]], yeni = [];
      for (i = 0; i < arr.length; i++) {
        var x = arr[i], mad = x.maddeler && x.maddeler.length;
        if (mad) { x.maddeler = altTekrarSil(x.t, x.maddeler); if (!x.maddeler.length) { delete x.maddeler; mad = 0; } }
        if (!mad && yarimListeMi(x.t)) { continue; }
        var k = benzAnahtar(x.t);
        if (gorulen[k]) { continue; }
        gorulen[k] = 1;
        x.p = ekPuan(sira[a][1], x);
        if (x._para !== undefined) { delete x._para; }
        yeni.push(x);
      }
      R[sira[a][0]] = yeni;
    }
    (R.ozet || []).forEach(function (x) {
      if (x.maddeler && x.t) { x.maddeler = altTekrarSil(x.t, x.maddeler); if (!x.maddeler.length) { delete x.maddeler; } }
    });
  }

  /* ------------------------------------------------------------------ */
  /* SUNUM (slayt) modu: Canva/PowerPoint'ten PDF'e cevrilmis ders sunumlari */
  /* ------------------------------------------------------------------ */
  function sayfaBoyutu(pages, opts, i) {
    var a = pages[i];
    if (a && typeof a.w === 'number' && typeof a.h === 'number' && a.w > 0 && a.h > 0) { return { w: a.w, h: a.h }; }
    var d = opts && opts.sayfaBoyutlari ? opts.sayfaBoyutlari[i] : null;
    if (d && d.w > 0 && d.h > 0) { return { w: d.w, h: d.h }; }
    return null;
  }
  var RE_PAR_BAS = /^(?:(?:Tanım|Örnek|ÖRNEK|Örneğin|ÖRNEĞİN|Türleri|Not|NOT)\s*\d{0,2}\s*[:.)]|[-–—•·*]\s*\S|\(?\d{1,2}[.)]\s*\S|[ivxlc]{1,5}\.\s*\S|[IVXLC]{1,5}\.\s*\S)/;
  var RE_LISTE_ISARET = /^(?:[-–—•·*]\s*|\(?\d{1,2}[.)]\s*|[ivxlc]{1,5}\.\s*|[IVXLC]{1,5}\.\s*)(\S.*)$/;

  function sunumSatirlar(arr) {
    var out = [], i, o, t, hep = true;
    for (i = 0; i < (arr || []).length; i++) {
      o = (arr[i] !== null && typeof arr[i] === 'object') ? arr[i] : { t: arr[i] };
      t = bosluk(temizle(o.t).replace(/[-]+/g, '• '));
      if (!t || /^\d{1,3}$/.test(t)) { continue; }
      var ln = { t: t, h: typeof o.h === 'number' ? o.h : 0, y: typeof o.y === 'number' ? o.y : null, x: typeof o.x === 'number' ? o.x : null, x2: typeof o.x2 === 'number' ? o.x2 : null, i: i };
      if (ln.y === null) { hep = false; }
      var cc = o.c;
      if (cc && cc.length >= 2 && /:$/.test(bosluk(cc[0].t)) && kelimeSay(cc[0].t) <= 4 && !RE_PAR_BAS.test(bosluk(cc[0].t))) {
        var rest = [];
        for (var z = 1; z < cc.length; z++) { rest.push(bosluk(cc[z].t)); }
        out.push({ t: bosluk(cc[0].t), h: ln.h, y: ln.y, x: ln.x, i: i });
        ln = { t: bosluk(rest.join(' ')), h: ln.h * 0.85, y: ln.y !== null ? ln.y - 0.01 : null, x: cc[1].x, x2: ln.x2, i: i + 0.5 };
      }
      out.push(ln);
    }
    if (hep && out.length > 1) { out.sort(function (a, b) { return (b.y - a.y) || (a.i - b.i); }); }
    /* satir araligi ve sag kenar (dogal satir sonu / paragraf sonu ayrimi icin) */
    var adim = [], sag = [];
    for (i = 1; i < out.length; i++) { if (out[i].y !== null && out[i - 1].y !== null) { adim.push(out[i - 1].y - out[i].y); } }
    var am = adim.length >= 3 ? medyan(adim) : 0;
    for (i = 1; i < out.length; i++) {
      if (am > 0 && out[i].y !== null && out[i - 1].y !== null && out[i - 1].y - out[i].y > 1.45 * am) { out[i].aralik = true; }
    }
    for (i = 0; i < out.length; i++) { if (out[i].x2 !== null && out[i].t.length >= 25) { sag.push(out[i].x2); } }
    out.sagKenar = sag.length >= 3 ? yuzdelik(sag, 0.9) : 0;
    return out;
  }
  function sunumBaslikAdayi(t) {
    return kelimeSay(t) <= 12 && t.length <= 90 && !/[.?!;,]["”’»)]*$/.test(t) && !/^(Tanım|Örnek|ÖRNEK|Örneğin)\s*\d*\s*[:.]/.test(t) &&
      !/^[-–—•·*]\s/.test(t) && alintiOrani(t) < 0.9 && !(/^[«“"]/.test(t) && !/[»”"]/.test(t));
  }
  function sunumBaslikAyir(sat) {
    if (!sat.length) { return { n: 0, t: '' }; }
    var l0 = sat[0];
    if (!sunumBaslikAdayi(l0.t) || (/:$/.test(l0.t) && sat.length < 2)) { return { n: 0, t: '' }; }
    var n = 1, rest = [], z;
    for (z = 1; z < sat.length; z++) { if (sat[z].h && (!l0.h || sat[z].h < 0.97 * l0.h)) { rest.push(sat[z].h); } }
    var rm = rest.length ? medyan(rest) : 0;
    if (rm && l0.h && Math.abs(l0.h - rm) <= 0.1 * rm && sat[1] && kckMi(sat[1].t.charAt(0)) && !RE_LISTE_ISARET.test(sat[1].t)) { return { n: 0, t: '' }; }
    while (n < sat.length && n < 3 && l0.h && Math.abs(sat[n].h - l0.h) <= 0.03 * l0.h && (!rm || l0.h > 1.1 * rm) &&
      kelimeSay(sat[n].t) <= 6 && sunumBaslikAdayi(sat[n].t) && !RE_LISTE_ISARET.test(sat[n].t)) { n++; }
    var t = [];
    for (z = 0; z < n; z++) { t.push(sat[z].t); }
    return { n: n, t: bosluk(t.join(' ')).replace(/:$/, '') };
  }
  function sunumParagraflar(sat) {
    var pars = [], cur = null, prev = null, sag = sat.sagKenar || 0;
    for (var i = 0; i < sat.length; i++) {
      var l = sat[i], t = l.t, yeni = false;
      var etiketli = cur && /^(?:Tanım|Örnek|ÖRNEK|Örneğin|ÖRNEĞİN)\s*\d{0,2}\s*[:.)]/.test(cur.t);
      if (!cur) { yeni = true; }
      else if (/^\(.{1,40}\)$/.test(t) && kelimeSay(t) <= 6) { yeni = false; }
      else if (/^[«“"]/.test(t) && cumleSonu(cur.t, t)) { yeni = true; }
      else if (RE_PAR_BAS.test(t)) { yeni = true; }
      else if (l.aralik) { yeni = true; }
      else if (/:$/.test(cur.t) && /^[«“"]/.test(t)) { yeni = true; }
      else if (prev && prev.h && l.h && Math.abs(l.h - prev.h) > 0.12 * prev.h) { yeni = true; }
      else if (cumleSonu(cur.t, t) && /^[A-ZÇĞİÖŞÜ0-9«“"‘(]/.test(t) && sag && prev && prev.x2 !== null && prev.x2 !== undefined) {
        /* satir sag kenara varmadan bitmisse (sonraki kelime sigmayacak kadar bosluk) paragraf sonudur */
        var kalanGen = sag - prev.x2, ilkK = /^\S+/.exec(t)[0].length * 0.5 * (l.h || 20) + 0.4 * (l.h || 20);
        if (kalanGen > ilkK * 1.05) { yeni = true; }
      }
      if (yeni) { cur = { t: t, h: l.h }; pars.push(cur); }
      else { cur.t = birlestir(cur.t, t); }
      prev = l;
    }
    /* paragraf ici "Ornek:" / "Ornegin:" gecisleri ayri paragraf */
    var out = [];
    pars.forEach(function (p) {
      var parca = p.t.split(/\s+(?=(?:Örnek\s*\d{0,2}|Örneğin|ÖRNEK\s*\d{0,2})\s*:\s)/);
      parca.forEach(function (x) { if (x) { out.push({ t: x, h: p.h }); } });
    });
    return out;
  }
  function sunumAnahtar(t) {
    var k = lc(String(t).replace(/^\s*(?:[IVXLCivxlc]+|\d{1,2})\s*[.)]\s*/, '')).replace(/[“”"«»‘’'()]/g, '').replace(/\s+/g, ' ');
    k = k.replace(/\s+(mantık\s+)?hata(sı|ları|lar)?$/, '').replace(/[.:…\s]+$/, '');
    return k;
  }
  function sunumOrtukTanim(par, baslik) {
    var cs = bol(par);
    if (!cs.length) { return false; }
    var c0 = cs[0], l0 = lc(c0), wc = kelimeSay(c0);
    if (wc < 5 || wc > 45 || /\?["”]?$/.test(c0)) { return false; }
    if (TANIM_ENGEL_BASLA.test(l0.replace(/^["“(«\s]+/, ''))) { return false; }
    if (kelimeSay(baslik) > 6 || /(adım|örnek)/i.test(baslik)) { return false; }
    var son = l0.replace(/[.)"”]+$/, '').split(' ').pop();
    if (KURAL_SON.test(son)) { return false; }
    return RE_COPULA_SON.test(l0) || (RE_TANIM_GUCLU.exec(l0) !== null && RE_TANIM_GUCLU.exec(l0).index >= 8 && !/^(o|bu|şu)\s/.test(l0));
  }
  function sunumTespit(pages, opts) {
    var np = pages.length;
    if (opts && opts.mod === 'sunum') { return { zorla: true }; }
    if (np < 6) { return null; }
    var kel = [], yatay = 0, boyutlu = 0, baslikli = 0, metinli = 0, rel = [], i;
    for (i = 0; i < np; i++) {
      var sat = sunumSatirlar(pages[i]);
      if (!sat.length) { continue; }
      metinli++;
      var w = 0, hh = [];
      sat.forEach(function (l) { w += kelimeSay(l.t); if (l.h) { hh.push(l.h); } });
      kel.push(w);
      var d = sayfaBoyutu(pages, opts, i);
      if (d) { boyutlu++; if (d.w / d.h >= 1.3) { yatay++; } if (hh.length) { rel.push(medyan(hh) / d.h); } }
      else if (hh.length) { rel.push(medyan(hh) / 600); }
      if (sunumBaslikAyir(sat).n > 0) { baslikli++; }
    }
    if (metinli < 6) { return null; }
    var kmed = medyan(kel), kmax = 0;
    kel.forEach(function (x) { if (x > kmax) { kmax = x; } });
    var land = boyutlu >= 0.6 * np ? (yatay / boyutlu >= 0.7 ? 1 : (yatay / boyutlu <= 0.2 ? -1 : 0)) : 0;
    var kv = kmed <= 70 ? 1 : (kmed <= 110 ? 0.5 : (kmed <= 160 ? 0 : -1));
    var bv = baslikli / metinli;
    var rb = rel.length ? medyan(rel) : 0;
    var buyuk = rb >= 0.035 ? 1 : (rb >= 0.025 ? 0.5 : 0);
    var sinyal = { yatay: land, kelimeMedyan: kmed, baslikOrani: Math.round(bv * 100) / 100, yaziBoyu: Math.round(rb * 1000) / 1000 };
    var ok = (land === 1 && kv >= 0.5 && bv >= 0.5) || (land === 0 && boyutlu === 0 && kv === 1 && buyuk >= 0.5 && bv >= 0.6 && metinli >= 8);
    return ok ? { sinyal: sinyal } : null;
  }

  /* slaytlari kavramlara (ayni baslikli slaytlar birlesir) ve bloklara cevir */
  function sunumKur(pages, opts) {
    var np = pages.length, kav = [], kapak = null, kaynakca = false, i, z, satirSay = 0, sonKav = null, ilkMetin = true;
    for (i = 0; i < np; i++) {
      var sat = sunumSatirlar(pages[i]);
      if (!sat.length) { continue; }
      satirSay += sat.length;
      /* dipnot: alttaki daha kucuk puntolu "5 AYM, E.1988/4 ..." satiri */
      var fn = '', hs = [];
      sat.forEach(function (l) { if (l.h) { hs.push(l.h); } });
      var gm = hs.length ? medyan(hs) : 0;
      if (sat.length >= 4) {
        for (z = sat.length - 1; z >= 1; z--) {
          var lz = sat[z];
          if (gm && lz.h && lz.h <= 0.8 * gm && (/^\d{1,2}\s+\S/.test(lz.t) || RE_ESAS_KARAR.test(lz.t))) {
            fn = lz.t.replace(new RegExp('^\\d{1,3}\\s+(?=' + MAHKEME_ADLARI + ')'), ''); sat.splice(z, 1);
          }
        }
      }
      var bs = sunumBaslikAyir(sat), baslik = bs.t, kalan = sat.slice(bs.n);
      kalan.sagKenar = sat.sagKenar;
      /* kapak: ilk sayfada baslik + (varsa) alt baslik, cumle yok */
      if (ilkMetin) {
        ilkMetin = false;
        var cumleli = false;
        kalan.forEach(function (l) { if (kelimeSay(l.t) >= 10 && /[.?!]$/.test(l.t)) { cumleli = true; } });
        if (bs.n > 0 && !cumleli && kalan.length <= 2) {
          kapak = { baslik: baslikBicim(baslik, true), alt: kalan.length ? bosluk(kalan.map(function (l) { return l.t; }).join(' ')) : '' };
          continue;
        }
      }
      if (baslik && /^(kaynak|yararlan|bibliyografya|referans|kaynakça)/.test(lc(baslik))) { kaynakca = true; sonKav = null; continue; }
      var altBaslik = '';
      if (kalan.length >= 2 && /^[A-ZÇĞİÖŞÜ\s’'“”".\-/]{3,40}$/.test(kalan[0].t) && kelimeSay(kalan[0].t) <= 5 && kalan[0].t !== lc(kalan[0].t)) {
        altBaslik = kalan[0].t; kalan = kalan.slice(1);
      }
      var key = baslik ? sunumAnahtar(baslik) : '';
      var c = null;
      var kararBasligi = (/\b(AYM|Yargıtay|Danıştay|AİHM|Mahkeme)/i.test(baslik) && /karar/i.test(baslik)) || /karar\s+inceleme/i.test(baslik);
      if (key) {
        for (z = kav.length - 1; z >= 0 && z >= kav.length - 4; z--) { if (kav[z].key === key) { c = kav[z]; break; } }
        if (!c && kararBasligi && kav.length && kav[kav.length - 1].kararMi) { c = kav[kav.length - 1]; }
        if (!c) {
          c = { key: key, baslik: baslikBicim(baslik, true), ham: baslik, sayfa: i + 1, sayfalar: [], tanim: [], metin: [], liste: [], ornek: [], sorular: [], par: [], karar: '', kararSay: 0, kararMi: (/\b(AYM|Yargıtay|Danıştay|AİHM|Mahkeme)/i.test(baslik) && /karar/i.test(baslik)) || /karar\s+inceleme/i.test(baslik), ornekSlayt: /örnek/i.test(baslik), tanimVardi: false };
          kav.push(c);
        }
      } else if (sonKav) { c = sonKav; }
      else { continue; }
      sonKav = c;
      if (altBaslik && !c.alt) { c.alt = baslikBicim(altBaslik, true); }
      if (c.sayfalar.indexOf(i + 1) < 0) { c.sayfalar.push(i + 1); }
      var pars = sunumParagraflar(kalan);
      var tanimOnce = c.tanim.length > 0, isaretli = false, k;
      pars.forEach(function (p) { if (RE_ORNEK_ETIKET.test(p.t) || /^[«“"]/.test(p.t) || RE_KURGUSAL.test(p.t)) { isaretli = true; } });
      var yeniKav = c.par.length === 0;
      var soruSay = 0;
      pars.forEach(function (p) { if (/\?["”]?$/.test(p.t) || /^\d+\.\s*Adım/i.test(baslik)) { soruSay++; } });
      var soruSlayt = pars.length > 0 && soruSay * 2 >= pars.length;
      for (k = 0; k < pars.length; k++) {
        var pt = pars[k].t, sn = i + 1, tur;
        if (/^Tanım\s*:/i.test(pt)) { tur = 'tanim'; pt = pt.replace(/^Tanım\s*:\s*/i, ''); }
        else if (RE_ORNEK_ETIKET.test(pt) || RE_KURGUSAL.test(pt) || /^[«“"]/.test(pt)) { tur = 'ornek'; }
        else if (c.ornekSlayt) { tur = 'ornek'; }
        else if (/:$/.test(pt) && k + 1 < pars.length && /^[«“"]/.test(pars[k + 1].t)) { tur = 'ornek'; }
        else if (RE_LISTE_ISARET.test(pt) && !/^[IVXLC]{1,5}\.\s/.test(pt) || (/^[ivxlc]{1,5}\.\s*\S/.test(pt))) { tur = 'madde'; }
        else if (tanimOnce && isaretli) { tur = 'ornek'; }
        else if (soruSlayt) { tur = 'soru'; }
        else { tur = 'metin'; }
        if (c.kararMi) { c.par.push({ t: pt, tur: 'karar', sayfa: sn }); continue; }
        if (tur === 'metin' && yeniKav && !c.tanim.length && !c.par.length && sunumOrtukTanim(pt, c.baslik)) { tur = 'tanim'; pars[k].ortuk = true; }
        c.par.push({ t: pt, tur: tur, sayfa: sn, ortuk: !!pars[k].ortuk });
        yeniKav = false;
        if (tur === 'tanim') { c.tanim.push({ t: pt, sayfa: sn, ortuk: !!pars[k].ortuk }); }
      }
      if (fn) { c.karar = fn; c.kararMi = true; c.kararSay = i + 1; }
    }
    /* liste maddelerini grupla */
    kav.forEach(function (c) {
      var g = null;
      c.par.forEach(function (p, idx) {
        if (p.tur === 'madde') {
          if (!g) {
            g = { items: [], sayfa: p.sayfa, lead: '' };
            var onc = idx > 0 ? c.par[idx - 1] : null;
            if (onc && onc.tur === 'metin' && /:$/.test(onc.t)) { g.lead = onc.t; onc.lead = true; }
            c.liste.push(g);
          }
          var m = RE_LISTE_ISARET.exec(p.t);
          g.items.push(sunumMaddeTemizle(m ? m[1] : p.t));
        } else {
          g = null;
          if (p.tur === 'metin' && !p.lead) { c.metin.push({ t: p.t, sayfa: p.sayfa }); }
          if (p.tur === 'ornek') {
            var son = c.ornek.length ? c.ornek[c.ornek.length - 1] : null;
            if (son && /:$/.test(son.t) && son.sayfa === p.sayfa) { son.t += ' ' + p.t; } else { c.ornek.push({ t: p.t, sayfa: p.sayfa }); }
          }
          if (p.tur === 'soru') { c.sorular.push({ t: p.t, sayfa: p.sayfa }); }
        }
      });
      /* metin paragraflari icinde liste girisi olanlar (lead) yeniden metin degil */
      c.metin = c.metin.filter(function (m) { return !(c.liste.some(function (g) { return g.lead === m.t; })); });
    });
    /* "1.Kisisel Duygular" tipi numarali kisa baslik satirlari: madde olarak yakalandi; tek satirlik "i.ORNEK" icin buyuk harf */
    var bloklar = [];
    kav.forEach(function (c) {
      var lv = /^[IVXLC]+\.\s/.test(c.ham) ? 1 : 2;
      bloklar.push({ tur: 'baslik', kind: 'font', lv: 0, t: c.baslik, p: c.sayfa, h: lv === 1 ? 90 : 60, x: 0 });
      c.par.forEach(function (p) {
        if (p.tur === 'karar') { return; }
        bloklar.push({ tur: 'para', t: p.t, p: p.sayfa, aside: false, kucuk: false });
      });
      if (c.karar) { bloklar.push({ tur: 'para', t: c.karar, p: c.kararSay || c.sayfa, aside: false, kucuk: true }); }
    });
    return { kav: kav, kapak: kapak, kaynakca: kaynakca, bloklar: bloklar, satirSay: satirSay };
  }
  function sunumMaddeTemizle(t) {
    t = bosluk(t);
    if (/[A-ZÇĞİÖŞÜ]/.test(t) && hepBuyukMu(t)) { t = baslikBicim(t, true); }
    t = t.replace(/^”(?=\S)/, '“');
    /* slayttan kesik gelen uzun madde: sonuna belirgin kesme isareti */
    if (kelimeSay(t) >= 7 && !/[.?!:;)”"…]$/.test(t)) { t += ' …'; }
    return t;
  }
  function sunumKirp(t, n) {
    t = bosluk(t);
    if (t.length <= n) { return t; }
    var cs = bol(t), o = '';
    for (var i = 0; i < cs.length; i++) { if ((o + ' ' + cs[i]).length > n && o) { break; } o = o ? o + ' ' + cs[i] : cs[i]; }
    if (o.length > n) { o = o.substr(0, n).replace(/\s+\S*$/, ''); }
    return o + (o.length < t.length ? ' …' : '');
  }
  function sunumCumleler(par, n) {
    var cs = bol(par), out = [];
    for (var i = 0; i < cs.length && out.length < n; i++) { if (kelimeSay(cs[i]) >= 3 || out.length === 0) { out.push(cs[i]); } }
    return out;
  }
  function sunumUygula(R, S, units, heads, oran) {
    var sev = oran <= 0.15 ? 1 : (oran >= 0.3 ? 3 : 2), kav = S.kav;
    var ozet = [], tanimlar = [], ornekler = [], kararlar = [], basliklar = [], bi = 0;
    var gorulen = {}, oncekiOrnek = false;
    kav.forEach(function (c) {
      var bNo = bi++;
      var gb = c.baslik + (c.alt ? ' (' + c.alt + ')' : '');
      c._i0 = ozet.length;
      /* ornek slaydindan hemen sonra gelen, daha once gecmis bir baslikla ayni slayt ornegin devamidir */
      var bk = lc(c.baslik).replace(/^[ivxlc]+\.\s*/, '');
      var devam = oncekiOrnek && gorulen[bk] && !c.tanim.length;
      oncekiOrnek = /örne[kğ]/.test(lc(c.baslik)) || (devam && oncekiOrnek);
      if (!gorulen[bk]) { gorulen[bk] = 1; }
      if (devam) {
        var yt = [];
        c.metin.forEach(function (m) { yt.push(m.t); });
        c.liste.forEach(function (g) { g.items.forEach(function (it) { yt.push(it); }); });
        if (yt.length) { ornekler.push({ t: sunumKirp(c.baslik + ': ' + yt.join(' '), 420), sayfa: c.sayfa, baslik: gb }); }
        return;
      }
      basliklar.push({ t: gb, sayfa: c.sayfa, seviye: /^[IVXLC]+\.\s/.test(c.ham) ? 1 : 2 });
      var terim = terimAdi(c.baslik);
      /* tanimlar */
      c.tanim.forEach(function (d, di) {
        var cs = sunumCumleler(d.t, 3), tx = cs[0] || d.t;
        if (cs.length > 1 && kelimeSay(cs[0]) < 7) { tx = cs[0] + ' ' + cs[1]; }
        var o = { t: tx, sayfa: d.sayfa, baslik: gb };
        if (terim) { o.terim = terim; }
        tanimlar.push(o);
      });
      c.ornek.forEach(function (o) {
        var t = o.t.replace(/^ÖRNEK(\s*\d*\s*[:.)])/, 'Örnek$1').replace(/^ÖRNEĞİN/, 'Örneğin');
        ornekler.push({ t: sunumKirp(t, 420), sayfa: o.sayfa, baslik: gb });
      });
      if (c.kararMi && c.par.length) {
        var gv = c.par[0].t;
        kararlar.push({ t: (c.karar ? c.karar + ': ' : c.baslik + ': ') + sunumKirp(gv, 260), sayfa: c.kararSay || c.sayfa, baslik: gb, mahkeme: (RE_MAHKEME.exec(c.karar || c.baslik) || [0, 'AYM'])[1] });
      }
      /* ozet maddeleri */
      var items = [];
      function ekle(t, sayfa, tur, maddeler) {
        var it = { t: t, sayfa: sayfa, baslik: gb, baslikNo: bNo, tur: tur || [], skor: 0 };
        if (maddeler && maddeler.length) { it.maddeler = maddeler; }
        ozet.push(it);
      }
      if (c.tanim.length) {
        var d0 = c.tanim[0], n = sev === 1 ? 1 : (sev === 2 ? 2 : 4);
        var cs0 = sunumCumleler(d0.t, n);
        if (sev === 1 && cs0.length === 1 && kelimeSay(cs0[0]) < 7) { cs0 = sunumCumleler(d0.t, 2); }
        ekle((d0.ortuk ? '' : 'Tanım: ') + cs0.join(' '), d0.sayfa, ['tanim']);
        for (var dj = 1; dj < c.tanim.length && sev === 3; dj++) { ekle(sunumCumleler(c.tanim[dj].t, 2).join(' '), c.tanim[dj].sayfa, ['tanim']); }
      }
      var metinler = c.metin;
      var kM = sev === 1 ? (c.tanim.length ? 0 : 1) : (sev === 2 ? (c.tanim.length ? 1 : 2) : 4);
      for (var mi = 0; mi < metinler.length && mi < kM; mi++) {
        var cm = sunumCumleler(metinler[mi].t, sev === 3 ? 2 : 1);
        if (cm.length) { ekle(cm.join(' '), metinler[mi].sayfa, []); }
      }
      c.liste.forEach(function (g) {
        var cap = sev === 1 ? 8 : (sev === 2 ? 12 : 20), mm = g.items.slice(0, cap);
        var it = { t: g.lead ? sunumKirp(g.lead, 200) : '', sayfa: g.sayfa, baslik: gb, baslikNo: bNo, tur: ['liste'], skor: 0, maddeler: mm };
        if (g.items.length > cap) { it.daha = g.items.length - cap; }
        ozet.push(it);
      });
      if (sev === 3) {
        c.sorular.slice(0, 4).forEach(function (m) { ekle(m.t, m.sayfa, ['soru']); });
      }
    });
    /* Kisa: tavan asiliyorsa dusuk puanli alt basliklari at; ust bolum (romen rakamli) ve tanimli kavramlar kalir */
    var tv = ozetTavan(oran), top = 0;
    kav.forEach(function (c) { if (c._i0 !== undefined) { c._n = 0; } });
    if (sev === 1 && ozet.length > tv) {
      var kk = kav.filter(function (c) { return c._i0 !== undefined; });
      kk.forEach(function (c, i) { c._i1 = i + 1 < kk.length ? kk[i + 1]._i0 : ozet.length; c._pri = (/^[IVXLC]+\.\s/.test(c.ham) ? 3 : 0) + (c.tanim.length ? 2 : 0) + (c.liste.length ? 1 : 0); });
      var atilan = {}, say = ozet.length;
      for (var pr = 0; pr <= 3 && say > tv; pr++) {
        for (var ki = kk.length - 1; ki >= 0 && say > tv; ki--) {
          var cc = kk[ki];
          if (cc._pri === pr && !atilan[ki] && cc._i1 > cc._i0) { atilan[ki] = 1; say -= cc._i1 - cc._i0; }
        }
      }
      var yeni = [];
      kk.forEach(function (c, i) { if (!atilan[i]) { for (var z = c._i0; z < c._i1; z++) { yeni.push(ozet[z]); } } });
      ozet = yeni;
    }
    R.ozet = ozet; R.tanimlar = tanimlar; R.ornekler = ornekler; R.basliklar = basliklar;
    if (kararlar.length) { R.kararlar = kararlar; }
    if (S.kapak) { R.baslik = S.kapak.baslik; if (S.kapak.alt) { R.altBaslik = S.kapak.alt; } }
    R.sunum = { kavram: kav.length, kaynakca: !!S.kaynakca };
  }

  /* cikti: baslik gosterimi (Title Case) ve tum metinlerde son temizlik */
  function cikisDuzelt(R) {
    var bgm = {};
    function bg(t) { if (!t) { return t; } if (bgm[t] === undefined) { bgm[t] = sonTemizle(baslikBicim(t)); } return bgm[t]; }
    var K = ['ozet', 'tanimlar', 'sartlar', 'listeler', 'istisnalar', 'kararlar', 'gorusler', 'ornekler', 'sinavNotlari', 'ekBilgi'];
    var i, j, x;
    for (i = 0; i < K.length; i++) {
      for (j = 0; j < R[K[i]].length; j++) {
        x = R[K[i]][j];
        if (x.baslik) { x.baslik = bg(x.baslik); }
        if (x.t) { x.t = sonTemizle(x.t); }
        if (x.terim) { x.terim = sonTemizle(x.terim); }
        if (x.etiket) { x.etiket = sonTemizle(x.etiket); }
        if (x.maddeler) { x.maddeler = x.maddeler.map(sonTemizle); }
      }
    }
    for (i = 0; i < R.basliklar.length; i++) { R.basliklar[i].t = bg(R.basliklar[i].t); }
    for (i = 0; i < R.atiflar.length; i++) { if (R.atiflar[i].t) { R.atiflar[i].t = sonTemizle(R.atiflar[i].t); } }
    for (i = 0; i < R.tablolar.length; i++) {
      x = R.tablolar[i];
      x.baslik = bg(x.baslik);
      x.sutunlar = x.sutunlar.map(sonTemizle);
      x.satirlar = x.satirlar.map(function (r) { return r.map(sonTemizle); });
    }
    for (i = 0; i < R.testler.length; i++) { x = R.testler[i]; x.t = sonTemizle(x.t); x.secenekler = x.secenekler.map(sonTemizle); }
    for (i = 0; i < R.klasikSorular.length; i++) { R.klasikSorular[i].t = sonTemizle(R.klasikSorular[i].t); }
    if (R.kapak) { R.kapak.satirlar = R.kapak.satirlar.map(sonTemizle); }
  }

  /* ------------------------------------------------------------------ */
  /* ANA GIRIS                                                            */
  /* ------------------------------------------------------------------ */
  function sablon(pages, opts) {
    opts = opts || {};
    var t0 = (typeof Date !== 'undefined') ? new Date().getTime() : 0;
    pages = pages || [];
    var sun = (opts.mod === 'ozet' || opts.mod === 'iskelet') ? null : sunumTespit(pages, opts), SK = null, hz, bl;
    if (sun) {
      SK = sunumKur(pages, opts);
      if (!SK.kav.length) { sun = null; SK = null; }
    }
    if (sun) {
      hz = { L: [], sayfaSayisi: pages.length, kapak: null, sinavBolge: null };
      bl = { blocks: SK.bloklar, qaModu: false };
    } else {
      hz = hazirla(pages, opts);
      bl = bloklaraAyir(hz.L);
    }
    var bu = birimleriUret(bl.blocks);
    var units = bu.units, heads = bu.heads;
    var i, u;
    seviyeAta(heads);
    girisBaslikDuzelt(heads);

    for (i = 0; i < units.length; i++) { analiz(units[i]); }

    /* soru-cevap notlarinda "X nedir?" sorusunun ilk cevap cumlesi tanimdir */
    if (bl.qaModu) {
      var qaIlk = {};
      for (i = 0; i < units.length; i++) {
        u = units[i];
        if (u.sec < 0 || heads[u.sec].kind !== 'qa' || qaIlk[u.sec] || u.aside || u.kucuk) { continue; }
        qaIlk[u.sec] = 1;
        if (QA_TANIM_BASLIK.test(lc(heads[u.sec].t)) && u.wc >= 5 && !u.f.ornekBas && !u.ornekPara && !/\?$/.test(u.t) &&
          /(nedir|tanımlanmıştır|tanımlayınız|tanımı|ne demektir|kavramı)/.test(lc(heads[u.sec].t))) {
          u.f.tanim = true; u.qaTanim = true;
        }
      }
    }

    var R = {
      basliklar: [], tanimlar: [], sartlar: [], istisnalar: [], atiflar: [], kararlar: [], gorusler: [], ornekler: [],
      listeler: [], kanunlar: [], testler: bu.testler, ozet: [], qa: bl.qaModu, sayfaSayisi: hz.sayfaSayisi,
      istatistik: { satir: sun ? SK.satirSay : hz.L.length, cumle: units.length },
      mod: 'ozet', sinavNotlari: [], ekBilgi: [], tablolar: [], klasikSorular: [], kapak: hz.kapak || null
    };
    /* kutular */
    function bslk(sec) { return sec >= 0 ? heads[sec].t : ''; }
    for (i = 0; i < bu.kutular.length; i++) {
      var kb0 = bu.kutular[i], ku = kb0.kutu;
      var kit = { t: ku.t, sayfa: ku.sayfa, baslik: bslk(kb0.sec) };
      if (ku.maddeler && ku.maddeler.length) { kit.maddeler = ku.maddeler; }
      if (ku.etiket) { kit.etiket = ku.etiket; }
      if (ku.tip === 'yz') { kit.yz = true; if (ku.ad) { kit.ad = ku.ad; } R.ekBilgi.push(kit); }
      else { R.sinavNotlari.push(kit); }
    }
    /* tablolar */
    for (i = 0; i < bu.tablolar.length; i++) {
      var tb0 = bu.tablolar[i], tt0 = tb0.tablo;
      if (tt0.rows.length < 2) { continue; }
      var tk = { baslik: bslk(tb0.sec), sayfa: tt0.sayfa, sutunlar: tt0.rows[0], satirlar: tt0.rows.slice(1) };
      if (tt0.sema) { tk.sema = true; }
      R.tablolar.push(tk);
    }
    /* deneme sinavlari */
    if (hz.sinavBolge && hz.sinavBolge.length) {
      var sc0 = sinavCozumle(hz.sinavBolge);
      R.testler = R.testler.concat(sc0.testler);
      R.klasikSorular = sc0.klasik;
    }
    for (i = 0; i < heads.length; i++) {
      R.basliklar.push({ t: heads[i].t, sayfa: heads[i].sayfa, seviye: heads[i].seviye });
    }
    function baslikAdi(u) { return u.sec >= 0 ? heads[u.sec].t : ''; }

    /* kisaltma tanimlari: "Tebligat Kanunu (TebK)" */
    var alias = {}, aliasTers = {}, am;
    for (i = 0; i < units.length; i++) {
      RE_ALIAS.lastIndex = 0;
      while ((am = RE_ALIAS.exec(units[i].t))) {
        var ak = adAnahtar(am[1]);
        if (!alias[ak]) { alias[ak] = am[2]; aliasTers[am[2]] = bosluk(am[1]); }
      }
    }

    var atifBuf = { atif: [], kanunlar: [] };
    var ctx = { sonKanun: '' };
    var gorulen = {};
    function bir(kat, t) { var k = kat + '|' + t; if (gorulen[k]) { return false; } gorulen[k] = 1; return true; }
    var sonSec = -2;

    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.sec !== sonSec) {
        sonSec = u.sec;
        if (sonSec >= 0) {
          var hm = /(\d{3,5})\s+sayılı\s+((?:[A-ZÇĞİÖŞÜ][^\s]*\s+){0,7}?(?:Kanun|Kararname|Yönetmelik)[a-zçğıöşü]*)/.exec(heads[sonSec].t);
          if (hm) {
            var hw = hm[2].split(' '), hl = hw.pop();
            ctx.sonKanun = hm[1] + ' sayılı ' + hw.concat([yasaKanon(hl, hw.length)]).join(' ');
          }
        }
      }
      if (u.test) { continue; }
      var f = u.f;
      var tam = u.t;
      if (f.tanim && bir('t', tam)) {
        var td = { t: tam, sayfa: u.sayfa, baslik: baslikAdi(u) };
        if (u.terim) { td.terim = u.terim; }
        if (u.tanimOn) {
          td.t = tam.replace(/^Tanım\s*:\s*/, '');
          var tb = u.sec >= 0 ? heads[u.sec].t : '';
          tb = terimAdi(tb);
          if (tb) { td.terim = tb; }
        }
        R.tanimlar.push(td);
      }
      if (f.sart && bir('s', tam)) {
        var md = u.maddeler ? u.maddeler.slice() : [];
        if (!md.length) {
          var ci = tam.indexOf(':');
          if (ci > 0 && ci < tam.length - 8) {
            var ar = tam.substr(ci + 1).replace(/[.]\s*$/, '').split(/\s*;\s*/);
            if (ar.length < 2) { ar = tam.substr(ci + 1).replace(/[.]\s*$/, '').split(/\s*,\s*/); if (ar.length > 8) { ar = []; } }
            for (var z = 0; z < ar.length; z++) { if (ar[z].length >= 3) { md.push(bosluk(ar[z])); } }
          }
        }
        R.sartlar.push({ t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), maddeler: md });
      } else if (u.maddeler && bir('l', tam)) {
        R.listeler.push({ t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), maddeler: u.maddeler.slice() });
      }
      if (f.istisna && bir('i', tam)) { R.istisnalar.push({ t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), guc: u.istisnaGuc }); }
      if (f.karar) {
        /* dipnot numarasi yapisik gelmis: "5 AYM, E.1988/4 ..." */
        var ktam = tam.replace(new RegExp('^\\d{1,3}\\s+(?=' + MAHKEME_ADLARI + ')'), '');
        var kunsur = RE_ESAS_KARAR.test(ktam) || /\b[TK]\.\s*\d{1,2}[./]\d{1,2}[./]\d{4}/.test(ktam) || /\bsayılı\b/i.test(ktam) || /\b\d{1,2}[./]\d{1,2}[./](19|20)\d{2}\b/.test(ktam) || /\bSayı\s*:/i.test(ktam);
        if ((kunsur || ktam.length >= 40) && bir('k', ktam)) {
          var kd = { t: ktam, sayfa: u.sayfa, baslik: baslikAdi(u), mahkeme: u.mahkeme };
          if (u.esas) { kd.esas = u.esas; } if (u.kararNo) { kd.kararNo = u.kararNo; } if (u.tarih) { kd.tarih = u.tarih; }
          R.kararlar.push(kd);
        }
      }
      if (f.gorus && bir('g', tam)) { R.gorusler.push({ t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), tur: u.gorusTuru }); }
      if (u.ornekPara && !f.ornek && !u.ilkPara && R.ornekler.length && R.ornekler[R.ornekler.length - 1]._para === u.para) {
        R.ornekler[R.ornekler.length - 1].t += ' ' + tam;
      } else if ((f.ornek || (u.ornekPara && u.ilkPara)) && bir('o', tam)) {
        var ot = tam;
        if (tam.length < 30 && units[i + 1] && units[i + 1].sec === u.sec && !u.ornekPara) { ot = tam + ' ' + units[i + 1].t; }
        R.ornekler.push({ t: ot, sayfa: u.sayfa, baslik: baslikAdi(u), _para: u.ornekPara ? u.para : -1 });
      }
      if (u.atifVar || u.maddeler || /\bmd\./.test(tam)) {
        atifBuf.atif.length = 0;
        atiflariBul(tam + (u.maddeler ? ' ' + u.maddeler.join(' ') : ''), atifBuf, ctx);
        for (var a = 0; a < atifBuf.atif.length; a++) {
          var at = atifBuf.atif[a];
          at.sayfa = u.sayfa;
          if (mulgaMi(at.kanun, baglamMetni(units, i))) { at.mulga = true; at.belirsiz = false; }
          R.atiflar.push(at);
        }
      }
    }

    /* tablo satirlari ve sinav kutularindaki atiflar */
    var ekMetin = [], em;
    for (i = 0; i < R.tablolar.length; i++) {
      for (em = 0; em < R.tablolar[i].satirlar.length; em++) { ekMetin.push([R.tablolar[i].satirlar[em].join(' ; '), R.tablolar[i].sayfa]); }
    }
    for (i = 0; i < R.sinavNotlari.length; i++) { ekMetin.push([R.sinavNotlari[i].t + ' ' + (R.sinavNotlari[i].maddeler || []).join(' '), R.sinavNotlari[i].sayfa]); }
    for (i = 0; i < ekMetin.length; i++) {
      if (!/(\bm\.\s*\d|\bmd\.\s*\d|sayılı|\d+\.\s*madde)/.test(ekMetin[i][0])) { continue; }
      atifBuf.atif.length = 0;
      atiflariBul(ekMetin[i][0], atifBuf, { sonKanun: '' });
      for (var ea = 0; ea < atifBuf.atif.length; ea++) {
        if (atifBuf.atif[ea].belirsiz || !atifBuf.atif[ea].kanun) { continue; }
        atifBuf.atif[ea].sayfa = ekMetin[i][1]; R.atiflar.push(atifBuf.atif[ea]);
      }
    }

    /* kanun listesi tekillestir */
    var kb = atifBuf.kanunlar, kvis = {};
    for (i = 0; i < kb.length; i++) {
      var kmd = kb[i].no;
      if (!kvis[kmd]) {
        kvis[kmd] = { kanun: kb[i].kanun, no: kmd, adet: 0 };
        var kab = alias[adAnahtar(kb[i].kanun)];
        if (kab) { kvis[kmd].kisaltma = kab; }
        R.kanunlar.push(kvis[kmd]);
      }
      kvis[kmd].adet++;
    }
    /* atiflari tekillestir: (kanun,madde,fikra); tam adli olanlari kisaltmaya esle */
    var tek = {}, atl = [];
    /* kopuk ad parcalari ve yazim hatali kisaltmalar: bilinen kisaltmaya esle, eslesmezse at */
    var yeniAt = [];
    for (i = 0; i < R.atiflar.length; i++) {
      var A0 = R.atiflar[i], k0 = A0.kanun || '';
      if (/^(Uygulanmasına|Dair|Hakkında|İlişkin|Ait|Esaslar|Usul)(\s|$)/.test(k0)) {
        var bul0 = '';
        for (var ab0 in aliasTers) { if (aliasTers.hasOwnProperty(ab0) && lc(aliasTers[ab0]).indexOf(lc(k0)) >= 0) { bul0 = ab0; break; } }
        if (!bul0) { continue; }
        A0.kanun = bul0;
      } else if (/^[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]{3,9}$/.test(k0) && !aliasTers[k0]) {
        for (var ab1 in aliasTers) {
          if (aliasTers.hasOwnProperty(ab1) && ab1.length >= 4 && Math.abs(ab1.length - k0.length) <= 1 && levBir(lc(ab1), lc(k0))) { A0.kanun = ab1; break; }
        }
      }
      yeniAt.push(A0);
    }
    R.atiflar = yeniAt;
    for (i = 0; i < R.atiflar.length; i++) {
      var A = R.atiflar[i];
      var kisa = alias[adAnahtar(A.kanun)];
      if (kisa && A.kanun !== kisa) { A.kanunAd = A.kanun; A.kanun = kisa; }
      else if (aliasTers[A.kanun]) { A.kanunAd = aliasTers[A.kanun]; }
      var ky = A.kanun + '|' + A.madde + '|' + A.fikra + (A.mulga ? '|mulga' : '');
      if (tek[ky]) { tek[ky].adet++; if (tek[ky].sayfalar.indexOf(A.sayfa) < 0) { tek[ky].sayfalar.push(A.sayfa); } continue; }
      A.adet = 1; A.sayfalar = [A.sayfa];
      tek[ky] = A; atl.push(A);
    }
    R.atiflar = atl;
    for (i = 0; i < R.atiflar.length; i++) {
      if (R.atiflar[i].mulga) { R.atiflar[i].kanunAd = (R.atiflar[i].kanunAd || R.atiflar[i].kanun) + ' (mülga kanun)'; }
    }
    atifKontrol(R.atiflar, opts);

    ekBolumDuzenle(R);
    var sg0 = sun ? (sun.sinyal || {}) : notSinyalleri(hz.L, units, heads, hz.sayfaSayisi, R, govdeIst(hz.L));
    R.mod = sun ? 'sunum' : (opts.mod === 'ozet' || opts.mod === 'iskelet' ? opts.mod : modKarar(sg0));
    if (sun) { R.ozet = []; sunumUygula(R, SK, units, heads, typeof opts.oran === 'number' ? opts.oran : 0.2); ekBolumDuzenle(R); }
    else { R.ozet = R.mod === 'iskelet' ? iskeletOzet(units, heads, opts, R) : ozetle(units, heads, opts, bl.qaModu); }
    cikisDuzelt(R);
    var sg = sg0;
    R.istatistik.sinyal = sg;
    R.istatistik.ozetCumle = R.ozet.length;
    var om = 0; for (i = 0; i < R.ozet.length; i++) { om += 1 + (R.ozet[i].maddeler ? R.ozet[i].maddeler.length : 0); }
    R.istatistik.ozetMadde = om;
    if (opts.debug) { R._birimler = units; R._bolge = hz.sinavBolge; R._L = hz.L; }
    R.istatistik.sureMs = (typeof Date !== 'undefined') ? (new Date().getTime() - t0) : 0;
    return R;
  }

  /* ------------------------------------------------------------------ */
  /* Yardimcilar: duz metinden sayfa, PDF.js ogelerinden satir            */
  /* ------------------------------------------------------------------ */
  function metindenSayfalar(metin, opts) {
    opts = opts || {};
    var pgs = String(metin).split('\f');
    var out = [];
    for (var i = 0; i < pgs.length; i++) {
      var ls = pgs[i].split(/\r?\n/);
      var page = [];
      for (var j = 0; j < ls.length; j++) {
        var raw = ls[j];
        var m = /^( *)/.exec(raw.replace(/\t/g, '    '));
        var t = raw.replace(/^\s+/, '').replace(/\s+$/, '');
        if (!t) { page.push({ t: '' }); continue; }
        var duz = raw.replace(/\t/g, '    ');
        var o = { t: duz.replace(/^\s+/, '').replace(/\s+$/, ''), x: m[1].length * 5.5 };
        o.x2 = (m[1].length + o.t.length) * 5.5;
        var rg = /\S+(?: {1,2}\S+)*/g, mc, cs = [];
        while ((mc = rg.exec(duz))) { cs.push({ x: mc.index * 5.5, x2: (mc.index + mc[0].length) * 5.5, t: mc[0] }); }
        if (cs.length >= 2) { o.c = cs; }
        page.push(o);
      }
      if (i === pgs.length - 1 && page.every(function (l) { return !l.t; })) { continue; }
      out.push(page);
    }
    return out;
  }

  /* PDF.js textContent.items -> satirlar. items: [{str, transform:[a,b,c,d,x,y], height}] */
  function pdfjsSatirlar(items) {
    var arr = [], i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.str === undefined || it.str === null) { continue; }
      var h = it.height || Math.abs(it.transform ? it.transform[3] : 0) || 0;
      arr.push({ s: it.str, x: it.transform[4], y: it.transform[5], h: h, w: it.width || 0 });
    }
    var satirlar = [];
    for (i = 0; i < arr.length; i++) {
      var a = arr[i];
      var last = satirlar.length ? satirlar[satirlar.length - 1] : null;
      var tol = Math.max(1.5, 0.4 * (a.h || 8));
      var hedef = null;
      for (var z = satirlar.length - 1; z >= 0 && z >= satirlar.length - 4; z--) {
        if (Math.abs(satirlar[z].y - a.y) <= tol) { hedef = satirlar[z]; break; }
      }
      if (hedef) { hedef.parcalar.push(a); } else { satirlar.push({ y: a.y, parcalar: [a] }); }
    }
    var out = [];
    for (i = 0; i < satirlar.length; i++) {
      var p = satirlar[i].parcalar.slice().sort(function (m, n) { return m.x - n.x; });
      var t = '', maxH = 0, prevEnd = null, j;
      var hd = [];
      var hucreler = [], hc = null;
      for (j = 0; j < p.length; j++) {
        if (!/\S/.test(p[j].s)) {
          /* bosluk ogesi: genisligi sutunlari kapsayabilir; konuma katilmaz */
          if (prevEnd !== null && p[j].s.length && !/\s$/.test(t)) { t += ' '; if (hc) { hc.t += ' '; } }
          continue;
        }
        var bosKolon = prevEnd !== null && p[j].x - prevEnd > 2.2 * (p[j].h || 8);
        if (bosKolon) { t = t.replace(/\s+$/, '') + '   '; }
        else if (prevEnd !== null && p[j].x - prevEnd > 0.15 * (p[j].h || 8) && !/^\s/.test(p[j].s) && !/\s$/.test(t)) { t += ' '; }
        var bosHucre = prevEnd !== null && p[j].x - prevEnd > 0.9 * (p[j].h || 8);
        if (hc === null || bosHucre) {
          if (hc !== null && hc.t.replace(/\s+/g, '')) { hucreler.push(hc); }
          hc = { x: p[j].x, x2: p[j].x + p[j].w, t: '' };
        }
        t += p[j].s;
        hc.t += p[j].s; hc.x2 = p[j].x + p[j].w;
        prevEnd = p[j].x + p[j].w;
        if (p[j].s.replace(/\s/g, '').length) { hd.push(p[j].h); }
      }
      if (hc !== null && hc.t.replace(/\s+/g, '')) { hucreler.push(hc); }
      maxH = hd.length ? medyan(hd) : 0;
      var ol = { t: t, h: maxH, y: satirlar[i].y, x: p[0].x, x2: prevEnd };
      if (hucreler.length >= 2) {
        for (j = 0; j < hucreler.length; j++) { hucreler[j].t = hucreler[j].t.replace(/\s+/g, ' ').replace(/^ | $/g, ''); }
        ol.c = hucreler;
      }
      out.push(ol);
    }
    return out;
  }

  return {
    sablon: sablon,
    metindenSayfalar: metindenSayfalar,
    pdfjsSatirlar: pdfjsSatirlar,
    cumleBol: bol,
    atifKontrol: atifKontrol,
    dosyaBasligi: dosyaBasligi,
    baslikBicim: baslikBicim,
    turkceKucuk: lc,
    kokler: kokler,
    surum: '0.1'
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = LEXOZET; }
