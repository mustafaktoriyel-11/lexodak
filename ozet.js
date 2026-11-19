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
  /* CUMLE BOLUCU                                                         */
  /* ------------------------------------------------------------------ */
  var KISALTMA = {};
  (function () {
    var l = ('m md mad vd vb vs bkz bk krs s ss sy hd cd hgk cgk e k t no nolu yarg dan orn or prof doc dr av c cilt ' +
      'f fik fikr par bnd b bs cev ed haz gb yy yuz yrd ogr gor ars uzm st sn tel ibk ibbgk hk tar kn sk ek bsk mah ' +
      'bkn gen org ltd sti dn md. ay ayn tbk tmk hmk cmk iik tck ant a ay').split(' ');
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
        cur.push({ t: tt, h: (typeof o.h === 'number' ? o.h : null), y: (typeof o.y === 'number' ? o.y : null),
          x: (typeof o.x === 'number' ? o.x : null), p: pi + 1, b: bp > 0, bn: bp, gap: gap, hucre: hucre });
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
    return { L: L, sayfaSayisi: np };
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
  function sonNoktalama(t) { return /[.?!:;]["”’»)]*$/.test(t); }
  function cumleSonu(t) { return /[.?!]["”’»)]*$/.test(t); }

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
    var hVar = 0, hler = [];
    for (i = 0; i < N; i++) { if (L[i].h) { hVar++; if (L[i].t.length >= 25) { hler.push(L[i].h); } } }
    var bodyH = (hVar >= 0.5 * N && hler.length) ? medyan(hler) : 0;
    var uzunluklar = [];
    for (i = 0; i < N; i++) { if (L[i].t.length >= 30 && !L[i].gap && !L[i].fn) { uzunluklar.push(L[i].t.length); } }
    var lenRef = yuzdelik(uzunluklar, 0.85) || 80;

    /* sayfa sol kenar (x) */
    var kenar = {};
    var xs = {}, pg;
    for (i = 0; i < N; i++) {
      if (L[i].x !== null && L[i].t.length > 40 && !L[i].fn) { pg = L[i].p; (xs[pg] = xs[pg] || []).push(L[i].x); }
    }
    for (pg in xs) { if (xs.hasOwnProperty(pg)) { kenar[pg] = yuzdelik(xs[pg], 0.2); } }
    var behindThr = 15;

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
      if (hepBuyukMu(L[i].t) && L[i].t.length <= 80 && !L[i].gap) { capsSay[L[i].t] = (capsSay[L[i].t] || 0) + 1; }
    }

    var blocks = [];
    var cur = null;
    var fnCur = null, fnBekle = [];
    var aside = false;
    var lastNum = 0, lastHarf = '';

    function flush() {
      if (cur) { blocks.push(cur); cur = null; }
      if (fnCur) { fnBekle.push(fnCur); fnCur = null; }
      for (var z = 0; z < fnBekle.length; z++) { blocks.push(fnBekle[z]); }
      fnBekle = [];
    }
    function leadMi(b) { return b && b.tur === 'para' && /:$/.test(b.t); }

    function yeniParagrafMi(prev, ln) {
      if (ln.b) { return true; }
      if (prev.h && ln.h && Math.abs(ln.h - prev.h) > 0.12 * prev.h) { return true; }
      if (/^(örneğin|örnek|mesela)\s*[;:,]?$/i.test(prev.t)) { return false; }
      if (/^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ]{4,40}:(\s|$)/.test(ln.t)) { return true; }
      if (prev.y !== null && ln.y !== null && prev.p === ln.p) {
        var md = dyMed[ln.p] || 0;
        var dy = Math.abs(ln.y - prev.y);
        if (md && dy > 1.55 * md && dy > 1.1 * (ln.h || 0)) { return true; }
      }
      if (sonNoktalama(prev.t)) {
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
      var oncekiBitti = !onceki || ln.b || onceki.p !== ln.p || cumleSonu(onceki.t) || onceki.baslik;
      /* roma */
      m = /^([IVX]{1,5})\s*[.)-]\s*(\S.*)$/.exec(t);
      if (m && bykMi(m[2].charAt(0)) && len <= 130 && !/[,;]$/.test(t)) { return { kind: 'roma', lv: 1 }; }
      /* 1.1 / 1.1.1 */
      m = /^(\d{1,2}(?:\.\d{1,2})+)\.?\s+(\S.*)$/.exec(t);
      if (m && bykMi(m[2].charAt(0)) && len <= 130 && !/[,;]$/.test(t) && !/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(t)) {
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
          if (!ln.b && onceki && onceki.p === ln.p && !cumleSonu(onceki.t)) { return null; }
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

      /* dipnot / kucuk punto: ana akistan ayri */
      var kucuk = !!(ln.fn || (bodyH && ln.h && ln.h < bodyH * 0.86));
      if (kucuk) {
        if (fnCur && !ln.fnYeni && !ln.b) { fnCur.t = birlestir(fnCur.t, t); }
        else {
          if (fnCur) { fnBekle.push(fnCur); }
          fnCur = { tur: 'para', t: t, p: ln.p, aside: false, kucuk: true };
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
      if (bt) {
        flush();
        var ht = t, hj = i, hh = ln.h;
        /* cok satirli baslik birlestirme */
        while (hj + 1 < N) {
          var nx = L[hj + 1];
          if (nx.b || nx.gap || nx.fn || qa[hj + 1]) { break; }
          var devam = false;
          var onNoktasiz = !/[.:;?!]$/.test(ht);
          if (bt.kind === 'caps' && hepBuyukMu(nx.t) && nx.t.length <= 170 && !/^(GİRİŞ|SONUÇ|ÖZET|GİRİŞ)$/.test(nx.t) &&
            !(capsSay[nx.t] >= 3 && kelimeSay(nx.t) >= 3) && (ht.length >= 36 || BAGLAC_SON.test(ht) || /[,]$/.test(ht)) && ht.length + nx.t.length < 230 &&
            !/^([IVX]+[.)]|\d+[.)])/.test(nx.t)) { devam = true; }
          if (bt.kind === 'font' && nx.h && hh && Math.abs(nx.h - hh) < 0.08 * hh && ht.length >= 28 && !MADDE_AYIRAC.test(nx.t)) { devam = true; }
          if ((bt.kind === 'roma' || bt.kind === 'sayi' || bt.kind === 'harf' || bt.kind === 'noktali' || bt.kind === 'harfalt') &&
            kckMi(nx.t.charAt(0)) && onNoktasiz && ht.length >= 30 && nx.t.length <= 100) { devam = true; }
          if ((bt.kind === 'harfalt' || bt.kind === 'baslikbicim' || bt.kind === 'caps') && /^\([^)]{2,60}\)$/.test(nx.t) && onNoktasiz) { devam = true; }
          if (!devam && (ht.match(/\(/g) || []).length > (ht.match(/\)/g) || []).length && /^[^()]{1,50}\)$/.test(nx.t)) { devam = true; }
          if (!devam) { break; }
          hj++; ht += ' ' + nx.t;
        }
        i = hj;
        blocks.push({ tur: 'baslik', kind: bt.kind, lv: bt.lv, t: ht, p: ln.p, h: hh, x: ln.x });
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
        var devamEt = !ln.b && !(prevL.h && ln.h && Math.abs(ln.h - prevL.h) > 0.12 * prevL.h) && (asili ||
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

  var RE_GORUS = rx(NB + '(doktrinde|doktrin|öğretide|öğreti|bir görüşe göre|görüşe göre|görüşünde|görüşündedir|görüş|görüşü|görüşler|hâkim görüş|hakim görüş|baskın görüş|ağırlıklı görüş|aksi görüş|karşı görüş|kanaatimizce|kanaatimize|kanımızca|bizce|savunulmaktadır|savunulur|savunmaktadır|savunur|savunan|ileri sürülmektedir|ileri sürmektedir|ileri sürülür|ileri sürmüştür|yazarlara göre|yazara göre|yazarlar|yazarına göre|teze göre|tez)' + NS);
  var RE_GORUS_AKSI = /(aksi görüş|karşı görüş|aksi yönde|karşı oy|aksine|karşı görüştedir|farklı görüş)/;
  var RE_GORUS_HAKIM = /(hâkim görüş|hakim görüş|baskın görüş|ağırlıklı görüş|genel kabul gören|çoğunluk görüşü|çoğunlukla)/;
  var RE_GORUS_KANAAT = /(kanaatimizce|kanaatimize|kanımızca|bizce|görüşündeyiz|düşüncesindeyiz|kanaatindeyiz)/;

  var RE_MAHKEME = new RegExp(NB + '(Yargıtay|YİBK|YHGK|YCGK|İBBGK|İBK|HGK|CGK|AYM|Anayasa Mahkemesi|AİHM|Avrupa İnsan Hakları Mahkemesi|Danıştay|İDDK|Uyuşmazlık Mahkemesi|Bölge Adliye|BAM|Sayıştay|Yüksek Seçim Kurulu|İçtihadı Birleştirme)' + NS);
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
    if (!soruMu && len >= 30 && len <= 520 && bas) {
      var mt = RE_TANIM_GUCLU.exec(lt);
      if (mt) {
        var pos = mt.index + (mt[0].length - mt[1].length);
        var zayifCue = ZAYIF_TANIM_CUE.test(mt[1]);
        var engel = TANIM_ENGEL_BASLA.test(baslayan);
        if (pos >= 10) {
          if (!zayifCue) {
            if (!(engel && /^(ancak|örneğin|mesela|ayrıca|fakat)\b/.test(baslayan))) { tanim = true; }
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
    var mk = RE_MAHKEME.exec(t);
    if (mk) {
      var esas = RE_ESAS_KARAR.test(t);
      if (esas || (RE_KARAR_SOZ.test(t) && (/[“"]/.test(t) || /(HD|CD|HGK|CGK|YİBK|YHGK|Daire|Genel Kurul|AYM|AİHM|karar|içtihat|Anayasa Mahkemesi)/.test(t)))) { kar = true; }
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
    if (RE_GORUS.test(lt)) {
      var dar = /(doktrin|öğreti|görüşe göre|görüş|kanaat|kanımızca|bizce|savun|ileri sür|yazar|teze göre)/.test(lt);
      if (dar) {
        gor = true;
        if (/görüş/.test(lt) && !/(doktrin|öğreti|hâkim görüş|hakim görüş|baskın|ağırlıklı|aksi görüş|karşı görüş|bir görüş|görüşe göre|görüşündedir|görüşü savun|görüşünü|görüşü benimse|görüşe|kanaat|yazar|karşı oy|görüşler)/.test(lt)) { gor = false; }
      }
    }
    f.gorus = gor;
    if (gor) {
      u.gorusTuru = RE_GORUS_KANAAT.test(lt) ? 'kanaat' : (RE_GORUS_AKSI.test(lt) ? 'aksi' : (RE_GORUS_HAKIM.test(lt) ? 'hakim' : 'genel'));
    }

    /* ---- ornek ---- */
    f.ornek = RE_ORNEK.test(lt) && !soruMu;
    f.ornekBas = RE_ORNEK_BAS.test(lt);

    u.atifVar = /(\bm\.\s*\d|\bmd\.\s*\d|sayılı|\d+\.\s*madde|\d+['’]?[a-zçğıöşü]*\s+madde)/.test(t);

    /* meta cumle: notun kendi yapisini anlatan */
    f.meta = /(anlatılacak|anlatılacaktır|açıklanacak|açıklanacaktır|incelenecek|incelenecektir|ele alınacak|ele alınacaktır|değinilecek|değinilecektir|bilgi verilecek|bilgi verilecektir|anlatılmaya çalışılacak|ders notunda|bu bölümde|izleyen başlık|aşağıda incelen|üzerinde durulacak|iyi çalışmalar|sınavda )/.test(lt) ||
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
    var paraNo = 0;

    function baslikEkle(b) {
      heads.push({ t: b.t, sayfa: b.p, kind: b.kind, lv: b.lv, h: b.h || 0, x: b.x });
      sec = heads.length - 1;
    }

    for (i = 0; i < blocks.length; i++) {
      b = blocks[i];
      if (b.tur === 'baslik') { baslikEkle(b); continue; }
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
          var us = { t: sents[k], sayfa: b.p, sec: sec, aside: !!b.aside, kucuk: !!b.kucuk, para: paraNo, ilkPara: k === 0,
            ornekPara: ornekPara, kaynak: 'para' };
          units.push(us);
        }
        continue;
      }
      if (b.tur === 'madde') {
        /* ardisik maddeleri grupla */
        var grup = [b];
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
              ilkPara: false, madde: true, kaynak: 'madde', isaret: grup[k].isaret });
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
    return { units: units, heads: heads, testler: testler };
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

  function ozetle(units, heads, opts, qaModu) {
    var oran = typeof opts.oran === 'number' ? opts.oran : 0.2;
    var cand = [], i, j;
    for (i = 0; i < units.length; i++) {
      var u = units[i];
      u.aday = !(u.test || u.kucuk || u.wc < 4 || (qaModu && u.sec < 0));
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
      if (qaModu && n >= 6) { enAz = 2; }
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
    while (toplam > K * 1.1 + 1 && guard++ < 5000) {
      var en = null, ev = 0;
      for (i = 0; i < anahtarlar.length; i++) {
        var kk2 = anahtarlar[i];
        var minimum = bolumler[kk2].length >= 2 ? (qaModu && bolumler[kk2].length >= 6 ? 2 : 1) : (kota[kk2] ? 1 : 0);
        if (kota[kk2] > minimum && kota[kk2] - ham[kk2] > ev) { ev = kota[kk2] - ham[kk2]; en = kk2; }
      }
      if (en === null) { break; }
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
  /* Seviye atama                                                         */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* ANA GIRIS                                                            */
  /* ------------------------------------------------------------------ */
  function sablon(pages, opts) {
    opts = opts || {};
    var t0 = (typeof Date !== 'undefined') ? new Date().getTime() : 0;
    var hz = hazirla(pages || [], opts);
    var bl = bloklaraAyir(hz.L);
    var bu = birimleriUret(bl.blocks);
    var units = bu.units, heads = bu.heads;
    var i, u;
    seviyeAta(heads);

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
      istatistik: { satir: hz.L.length, cumle: units.length }
    };
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
      if (f.karar && bir('k', tam)) {
        var kd = { t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), mahkeme: u.mahkeme };
        if (u.esas) { kd.esas = u.esas; } if (u.kararNo) { kd.kararNo = u.kararNo; } if (u.tarih) { kd.tarih = u.tarih; }
        R.kararlar.push(kd);
      }
      if (f.gorus && bir('g', tam)) { R.gorusler.push({ t: tam, sayfa: u.sayfa, baslik: baslikAdi(u), tur: u.gorusTuru }); }
      if (f.ornek && bir('o', tam)) {
        var ot = tam;
        if (tam.length < 30 && units[i + 1] && units[i + 1].sec === u.sec) { ot = tam + ' ' + units[i + 1].t; }
        R.ornekler.push({ t: ot, sayfa: u.sayfa, baslik: baslikAdi(u) });
      }
      if (u.atifVar || u.maddeler || /\bmd\./.test(tam)) {
        atifBuf.atif.length = 0;
        atiflariBul(tam + (u.maddeler ? ' ' + u.maddeler.join(' ') : ''), atifBuf, ctx);
        for (var a = 0; a < atifBuf.atif.length; a++) {
          var at = atifBuf.atif[a];
          at.sayfa = u.sayfa;
          R.atiflar.push(at);
        }
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
    for (i = 0; i < R.atiflar.length; i++) {
      var A = R.atiflar[i];
      var kisa = alias[adAnahtar(A.kanun)];
      if (kisa && A.kanun !== kisa) { A.kanunAd = A.kanun; A.kanun = kisa; }
      else if (aliasTers[A.kanun]) { A.kanunAd = aliasTers[A.kanun]; }
      var ky = A.kanun + '|' + A.madde + '|' + A.fikra;
      if (tek[ky]) { tek[ky].adet++; if (tek[ky].sayfalar.indexOf(A.sayfa) < 0) { tek[ky].sayfalar.push(A.sayfa); } continue; }
      A.adet = 1; A.sayfalar = [A.sayfa];
      tek[ky] = A; atl.push(A);
    }
    R.atiflar = atl;

    R.ozet = ozetle(units, heads, opts, bl.qaModu);
    R.istatistik.ozetCumle = R.ozet.length;
    if (opts.debug) { R._birimler = units; }
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
        var o = { t: raw.replace(/\t/g, '    ').replace(/^\s+/, '').replace(/\s+$/, ''), x: m[1].length * 5.5 };
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
      for (j = 0; j < p.length; j++) {
        if (prevEnd !== null && p[j].x - prevEnd > 2.2 * (p[j].h || 8)) { t = t.replace(/\s+$/, '') + '   '; }
        else if (prevEnd !== null && p[j].x - prevEnd > 0.15 * (p[j].h || 8) && !/^\s/.test(p[j].s) && !/\s$/.test(t)) { t += ' '; }
        t += p[j].s;
        prevEnd = p[j].x + p[j].w;
        if (p[j].s.replace(/\s/g, '').length) { hd.push(p[j].h); }
      }
      maxH = hd.length ? medyan(hd) : 0;
      out.push({ t: t, h: maxH, y: satirlar[i].y, x: p[0].x });
    }
    return out;
  }

  return {
    sablon: sablon,
    metindenSayfalar: metindenSayfalar,
    pdfjsSatirlar: pdfjsSatirlar,
    cumleBol: bol,
    turkceKucuk: lc,
    kokler: kokler,
    surum: '0.1'
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = LEXOZET; }
