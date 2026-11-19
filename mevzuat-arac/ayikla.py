#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ayikla.py - mevzuat.gov.tr resmi kanun PDF'lerini maddelere ayrıştırıp JSON üretir.

Kullanım:
  python3 ayikla.py <pdf> --no 6098 [--ad ... --kisa ... --tertip 5 --kontrol 2026-11-19] -o out.json
  python3 ayikla.py --hepsi [--pdf-dizin /tmp/mpdf] [--cikti-dizin /tmp/mout] [--sadece 6098,5237]
  (ad/kisa/tertip verilmezse kanunlar.json'dan alınır; --aralik-acma: "Madde 53 - 55" aralıklarını açma.)

Yöntem (belirlenimci; yalnızca stdlib + poppler `pdftohtml -xml`, bbox'la aynı konum/punto verisi
+ kalın/italik bilgisi; TMK deneyimi gereği gövde puntosu belgeden öğrenilir, sabit yükseklik yoktur):
  * Parçalar satırlara birleştirilir (alt çizgiye göre); gövde puntosu = en sık normal punto.
  * Dipnot: satır başında küçük (üst simge) rakam ile başlayan blok ve sayfa sonuna kadar devamı;
    işaretsiz devam satırları (italik + küçük punto). Gövdedeki üst simge rakamlar atılır.
  * Atılanlar: sayfa no, künye (Kanun Numarası/Düstur), "İŞLENEMEYEN HÜKÜMLER"/"EK VE DEĞİŞİKLİK
    GETİREN..." ekinden sonrası, son maddeden sonraki cetvel/liste ekleri.
  * Madde başlangıcı: "MADDE n-", "Geçici Madde n-", "Ek Madde n-", "Ek Geçici Madde n-" (n: "Ek Geçici 1"),
    "Mükerrer Madde n-" (n: "Mükerrer 28"), "n/A". Aralıklar ("Madde 53 – 55 –", "MADDE 11 ila 16-")
    her madde için ayrı kayıt olur. PDF yazım hatası "4l7"/"l990" -> 417/1990.
  * Madde öncesi satırlar: tam kalın/italik (ya da bitişik kısa) satırlar kenar başlığı b (sondaki ":"
    atılır, çok düzeyli başlıklar " " ile birleşir); "BİRİNCİ KISIM + ortalı ad" bölüm başlığı y
    ([seviye, "Birinci Kısım · Ad"], Kitap/Bap=1 Kısım=2 Bölüm=3 Ayırım/Fasıl=4).
  * m: girintili paragraf satırları boşlukla birleşir; yalnız "(1)", "a)", "1.", "A)" ile başlayan
    paragraflar "\\n" ile ayrılır (referans kuralı). Satır sonu tire birleştirilir.
Çıktı: {no, ad, kisa, tertip, kontrol, maddeler:[{n,b,[y],m}]}  (maddeler belge sırasındadır)
"""
import argparse, collections, datetime, html, json, os, re, subprocess, sys

# ----------------------------------------------------------------- yardımcılar
TR_UP = str.maketrans('iı', 'İI')
TR_LO = str.maketrans('Iİ', 'ıi')


def tr_lower(s):
    return s.translate(TR_LO).lower()


def tr_upper(s):
    return s.translate(TR_UP).upper()


def tr_title(s):
    """TÜMÜ BÜYÜK başlığı 'Genel Esaslar' biçimine çevirir (ve/ile/veya... küçük)."""
    small = {'ve', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'mi'}
    out = []
    for i, w in enumerate(s.split()):
        lw = tr_lower(w)
        if i > 0 and lw in small:
            out.append(lw)
        else:
            out.append(tr_upper(lw[:1]) + lw[1:])
    return ' '.join(out)


def is_allcaps(s):
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and all(c == tr_upper(c) for c in letters)


ORD = ['', 'Birinci', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı', 'Yedinci', 'Sekizinci',
       'Dokuzuncu', 'Onuncu', 'On Birinci', 'On İkinci', 'On Üçüncü', 'On Dördüncü', 'On Beşinci',
       'On Altıncı', 'On Yedinci', 'On Sekizinci', 'On Dokuzuncu', 'Yirminci']
ORD_UP = {tr_upper(w): w for w in ORD if w}
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
         'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18,
         'XIX': 19, 'XX': 20}

KW = {'KİTAP': ('Kitap', 1), 'BAP': ('Bap', 1), 'KISIM': ('Kısım', 2), 'KESİM': ('Kesim', 2),
      'BÖLÜM': ('Bölüm', 3), 'AYIRIM': ('Ayırım', 4), 'FASIL': ('Fasıl', 4), 'BAŞLIK': ('Başlık', 4)}
KWS = '|'.join(KW)
SEC_RE1 = re.compile(r'^((?:[A-ZÇĞİÖŞÜ]+(?: [A-ZÇĞİÖŞÜ]+)?)|\d+\.?)\s+(%s)\s*$' % KWS)       # BİRİNCİ KISIM
SEC_RE2 = re.compile(r'^(%s)\s*[-:–]\s*([IVX]+|\d+)\.?\s*$' % KWS)         # KISIM - I / BÖLÜM: 1


def sec_parse(t):
    """Bölüm başlığı anahtar satırı ise (seviye, 'Birinci Kısım') döner."""
    t = re.sub(r'\s+', ' ', t.strip())
    u = tr_upper(t)
    m = SEC_RE1.match(u)
    if m:
        o, kw = m.group(1), m.group(2)
        word = ORD[int(o.rstrip('.'))] if o.rstrip('.').isdigit() and int(o.rstrip('.')) < len(ORD) else tr_title(o)
        return KW[kw][1], '%s %s' % (word, KW[kw][0])
    m = SEC_RE2.match(u)
    if m:
        kw, o = m.group(1), m.group(2)
        k = ROMAN.get(o) or (int(o) if o.isdigit() else 0)
        word = ORD[k] if 0 < k < len(ORD) else o
        return KW[kw][1], '%s %s' % (word, KW[kw][0])
    return None


# madde başlangıcı
ART_RE = re.compile(
    r'^\s*(?P<pre>(?:EK|Ek)\s+(?:(?:GEÇİCİ|Geçici)\s+)?|(?:GEÇİCİ|Geçici)\s+|(?:MÜKERRER|Mükerrer)\s+)?(?:MADDE|Madde|madde)\s*'
    r'(?P<num>\d[\dlIO]*|[lIO]\d[\dlIO]*)\s*(?:/\s*(?P<suf>[A-Za-zÇĞİÖŞÜçğıöşü])\s*)?(?:\s+ila\s+(?P<num2>\d+))?\s*\.?\s*[-–—]\s*(?P<rest>.*)$')
NOTE_RE = re.compile(r'^\(\s*(Değişik|Ek|Mülga|İptal|Yeniden|Başlığı|Teselsül|Madde|Bu madde|Ek madde|Metne)', re.I)
IGN_RE = re.compile(r'İŞLENEMEYEN|İŞLENMEYEN|KANUNA\s+EK\s+VE\s+DEĞİŞİKLİK\s+GETİREN')
FN_TAIL = re.compile(r'(değiştirilmiştir|eklenmiştir|yürürlükten kaldırılmıştır|kaldırılmıştır|iptal edilmiştir|'
                     r'çıkarılmıştır|düzeltilmiştir|ibaresi .* şeklinde|olarak değiştirilmiştir)\.?\s*$')


def art_key(m):
    pre = m.group('pre')
    num = m.group('num').translate(str.maketrans('lIO', '110'))   # PDF yazım hatası: 4l7 -> 417
    suf = m.group('suf')
    n = num + ('/' + suf if suf else '')
    if pre:
        p = tr_lower(pre).split()
        words = []
        if 'ek' in p:
            words.append('Ek')
        if 'geçici' in p:
            words.append('Geçici')
        if 'mükerrer' in p:
            words.append('Mükerrer')
        return ' '.join(words) + ' ' + n
    return n


# ---------------------------------------------------------------- PDF okuma
def load_xml(pdf):
    s = subprocess.run(['pdftohtml', '-xml', '-i', '-nodrm', '-q', '-stdout', pdf],
                       capture_output=True, check=True).stdout.decode('utf8', 'replace')
    fs = {}
    for m in re.finditer(r'<fontspec id="(\d+)" size="(\d+)" family="([^"]*)"', s):
        fs[m.group(1)] = int(m.group(2))
    pages = []
    for pm in re.finditer(r'<page number="(\d+)"[^>]*height="(\d+)" width="(\d+)">(.*?)</page>', s, re.S):
        els = []
        for m in re.finditer(r'<text top="(-?\d+)" left="(-?\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)</text>',
                             pm.group(4), re.S):
            raw = m.group(6)
            t = html.unescape(re.sub(r'</?[a-zA-Z]+[^>]*>', '', raw))
            if not t.strip():
                continue
            els.append(dict(top=int(m.group(1)), left=int(m.group(2)), w=int(m.group(3)), h=int(m.group(4)),
                            size=fs.get(m.group(5), 0), b='<b>' in raw, i='<i>' in raw, t=t))
        pages.append(dict(n=int(pm.group(1)), H=int(pm.group(2)), W=int(pm.group(3)), els=els))
    return pages


def body_size(pages):
    c = collections.Counter()
    for pg in pages:
        for e in pg['els']:
            if not e['i'] and not e['b']:
                c[e['size']] += len(e['t'])
    return c.most_common(1)[0][0]


DIGITS_RE = re.compile(r'^[\s\d,.\-–*()\[\]]*$')


def build_lines(pg, body):
    """Sayfa öğelerini satırlara dizer. Üst simge/dipnot işaretleri ayrı işlenir."""
    tiny_lim = body * 0.8
    els = pg['els']
    norm = [e for e in els if e['size'] > tiny_lim]
    tiny = [e for e in els if e['size'] <= tiny_lim]
    norm.sort(key=lambda e: (e['top'] + e['h'], e['left']))
    lines = []
    for e in norm:
        bt = e['top'] + e['h']
        for L in reversed(lines[-3:]):
            if abs(L['bot'] - bt) <= 4:
                L['els'].append(e)
                break
        else:
            lines.append(dict(bot=bt, els=[e]))
    for e in tiny:
        bt = e['top'] + e['h']
        best = None
        for L in lines:
            d = abs(L['bot'] - bt)
            if d <= 11 and (best is None or d < best[0]):
                best = (d, L)
        if best:
            best[1]['els'].append(e)
        else:
            lines.append(dict(bot=bt, els=[e]))
    lines.sort(key=lambda L: L['bot'])
    for L in lines:
        L['els'].sort(key=lambda e: e['left'])
        L['tiny'] = [e for e in L['els'] if e['size'] <= tiny_lim]
        L['main'] = [e for e in L['els'] if e['size'] > tiny_lim]
    return lines


def line_text(els):
    out = ''
    prev = None
    for e in els:
        t = e['t']
        if prev is not None:
            gap = e['left'] - (prev['left'] + prev['w'])
            if gap >= 2 and not out.endswith(' ') and not t.startswith(' '):
                out += ' '
        out += t
        prev = e
    out = re.sub(r'\s+', ' ', out).strip()
    # PDF'deki "l990", "l0 uncu", "4l7" gibi rakam yerine yazılmış küçük L hataları
    return LDIGIT.sub('1', out)


LDIGIT = re.compile(r'(?<![A-Za-zÇĞİÖŞÜçğıöşü0-9])l(?=\d)|(?<=\d)l(?=\d)')


def classify_page(pg, body, dropped=None):
    """Gövde satırlarını döndürür (dipnot, sayfa no, üst simge ayıklanmış)."""
    lines = build_lines(pg, body)
    res = []
    fn_started = False
    for L in lines:
        main = L['main']
        first = L['els'][0]
        # dipnot bloğu başlangıcı: satır başında küçük rakam + gövdeden küçük punto metin
        if not fn_started and first in L['tiny'] and DIGITS_RE.match(first['t']) and len(first['t'].strip()) <= 3 \
                and main and all(e['size'] < body or e['i'] for e in main):
            fn_started = True
        if fn_started:
            if dropped is not None:
                dropped.append(('fn', line_text(L['els'])))
            continue
        if not main:
            continue  # yalnızca üst simge
        # tamamı gövdeden küçük puntolu ve italik satır, sayfa alt yarısında = işaretsiz dipnot devamı
        # (tablolar küçük punto olabilir ama italik değildir; dipnotlar italiktir)
        if all(e['size'] < body for e in main) and all(e['i'] for e in main):
            txt = line_text(main)
            if first in L['tiny'] or L['bot'] > pg['H'] * 0.55 or FN_TAIL.search(txt):
                if dropped is not None:
                    dropped.append(('fn2', txt))
                continue
        txt = line_text(main)
        if not txt:
            continue
        if re.fullmatch(r'\d{1,4}', txt) and (L['bot'] > pg['H'] * 0.9 or L['bot'] < pg['H'] * 0.08):
            continue
        # üst simge elemanlarını at (rakam/işaret ise), harf içeriyorsa sakla
        keep = [e for e in L['els'] if e in main or not DIGITS_RE.match(e['t'])]
        keep.sort(key=lambda e: e['left'])
        main_only = [e for e in keep]
        left = min(e['left'] for e in main)
        right = max(e['left'] + e['w'] for e in main)
        res.append(dict(t=line_text(main_only), left=left, right=right, page=pg['n'], W=pg['W'],
                        bold=all(e['b'] for e in main), ital=all(e['i'] for e in main),
                        bi=all(e['b'] or e['i'] for e in main), firstb=main[0]['b'], bot=L['bot']))
    return res


# ----------------------------------------------------------------- yapılandırma
META_RE = re.compile(r'Yayımlandığı\s+Düstur|Yayımlandığı\s+Resmî\s+Gazete|Kanun\s+Numarası|Kabul\s+Tarihi')
ITEM_RE = re.compile(r'^(?:\(\d{1,3}\)|[a-zçğıöşü]{1,2}\)|\d{1,3}\.|[A-ZÇĞİÖŞÜ]\))')   # referans kuralı: (1) a) 1. A)


# girintisiz ama liste maddesi gibi başlayan satır ("1. Metin", "a) Metin")
HANG_ITEM = re.compile(r'^(?:\d{1,2}\.|[a-zçğıöşü]{1,2}\))\s+\S')


def is_styled(L):
    return L['bold'] or L['ital']


def is_centered(L):
    c = (L['left'] + L['right']) / 2
    return abs(c - L['W'] / 2) <= 40


CTX = {}


def is_title(L, art_left):
    """Ortalı, kalın/italik bölüm başlığı satırı (kenar başlığı madde girintisinde başlar)."""
    return is_styled(L) and is_centered(L) and abs(L['left'] - art_left) > 2 \
        and (L['right'] - L['left']) < 0.8 * (L['W'] - 2 * CTX.get('margin', 100))


def article_start(L):
    m = ART_RE.match(L['t'])
    if m:
        return m
    # tire unutulmuş (PDF hatası): kalın "MADDE 428 Metin"
    if L['firstb']:
        m = ART_NODASH_RE.match(L['t'])
        if m:
            return m
    return None


RANGE_RE = re.compile(r'^(\d+)\s*[-–—]\s*(.*)$')
ART_NODASH_RE = re.compile(
    r'^\s*(?P<pre>(?:EK|Ek)\s+(?:(?:GEÇİCİ|Geçici)\s+)?|(?:GEÇİCİ|Geçici)\s+|(?:MÜKERRER|Mükerrer)\s+)?(?:MADDE|Madde|madde)\s*'
    r'(?P<num>\d+)\s*(?:/\s*(?P<suf>[A-Za-zÇĞİÖŞÜçğıöşü])\s*)?\s(?P<rest>\S.*)$')


def extract(pdf, dropped=None, aralik=True):
    pages = load_xml(pdf)
    body = body_size(pages)
    lines = []
    for pg in pages:
        lines.extend(classify_page(pg, body, dropped))
    # ek (işlenemeyen hükümler) sonrasını at
    for k, L in enumerate(lines):
        if len(L['t']) < 100 and IGN_RE.search(L['t']):
            # başlığın önceki ortalı BÜYÜK HARF satırlarını da kes ("... SAYILI KANUNUNA")
            while k > 0 and is_styled(lines[k - 1]) and is_centered(lines[k - 1]) and is_allcaps(lines[k - 1]['t']) \
                    and 'SAYILI' in lines[k - 1]['t']:
                k -= 1
            lines = lines[:k]
            break
    starts = [k for k, L in enumerate(lines) if article_start(L)]
    if not starts:
        return []
    # son maddeden sonra gelen cetvel/liste ekleri: ortalı kalın başlıkla başlar -> at
    for k in range(starts[-1] + 1, len(lines)):
        if is_styled(lines[k]) and is_centered(lines[k]) and len(lines[k]['t']) < 120 and not NOTE_RE.match(lines[k]['t']):
            lines = lines[:k]
            break
    # ön sayfa (başlık + Kanun Numarası/Düstur künyesi) at
    first = starts[0]
    meta_idx = [k for k in range(first) if META_RE.search(lines[k]['t']) or re.search(r'Tertip\s*:', lines[k]['t'])]
    cut = (max(meta_idx) + 1) if meta_idx else 0
    # sol kenar (girinti ölçüsü) ve satır aralığı
    bypage = collections.defaultdict(list)
    gaps = []
    for k, L in enumerate(lines):
        bypage[L['page']].append(L['left'])
        if k and lines[k - 1]['page'] == L['page']:
            g = L['bot'] - lines[k - 1]['bot']
            if 10 < g < 45:
                gaps.append(g)
    margin = collections.Counter(min(v) for v in bypage.values()).most_common(1)[0][0]
    indent = margin + 20
    CTX['margin'] = margin
    CTX['aralik'] = aralik
    gaps.sort()
    pitch = gaps[len(gaps) // 2] if gaps else 26
    lim = 1.5 * pitch

    blocks = []  # her madde için başlık bloğunun ilk satır indeksi
    prev = -1
    for k in starts:
        j = k
        floor = max(prev, cut - 1)
        while j - 1 > floor:
            P, N = lines[j - 1], lines[j]
            if is_styled(P):
                if not head_styled(P):
                    break
                secish = is_centered(P) or sec_parse(P['t'])
                if not secish and P['page'] == N['page'] and N['bot'] - P['bot'] > 2.6 * pitch:
                    break
            else:
                if P['page'] != N['page'] or not heading_like(P):
                    break
                gap = N['bot'] - P['bot']
                # normal puntolu başlık: bitişik, ya da "c. Başlık" gibi imli kısa satır (arada boş satır olabilir)
                if gap > lim and not (gap <= 2.3 * pitch and len(P['t']) < 90 and HEAD_MARK.match(P['t'])):
                    break
            j -= 1
        blocks.append(j)
        prev = k

    out = []
    for idx, k in enumerate(starts):
        m = article_start(lines[k])
        s = blocks[idx]
        end = blocks[idx + 1] if idx + 1 < len(starts) else len(lines)
        ys, kb = parse_heads(lines[s:k], lines[k]['left'], idx > 0)
        if dropped is not None:
            dropped.extend(('head', L['t']) for L in lines[s:k])
        rest = m.group('rest').strip()
        key = art_key(m)
        rng = [key]
        if CTX.get('aralik', True) and not m.group('suf'):
            # aralık: "MADDE 11 ila 16 -(Mülga...)" veya "Madde 53 – 55 – (Mülga...)"
            endn = m.groupdict().get('num2')
            if not endn:
                rm = RANGE_RE.match(rest)
                if rm:
                    endn, rest2 = rm.group(1), rm.group(2)
            else:
                rest2 = rest
            if endn:
                a0 = int(m.group('num').translate(str.maketrans('lIO', '110')))
                if a0 < int(endn) <= a0 + 200:
                    pre = key[:len(key) - len(str(a0))]
                    rng = [pre + str(x) for x in range(a0, int(endn) + 1)]
                    rest = rest2.strip()
        paras = [rest]
        for L in lines[k + 1:end]:
            if L['left'] >= indent or (HANG_ITEM.match(L['t']) and re.search(r'[;:.,]$', paras[-1])):
                paras.append(L['t'])
            else:
                paras[-1] = join_lines(paras[-1], L['t']) if paras[-1] else L['t']
        txt = ''
        for p in paras:
            p = p.strip()
            if not p:
                continue
            if not txt:
                txt = p
            else:
                txt += ('\n' if ITEM_RE.match(p) else ' ') + p
        for i2, nk in enumerate(rng):
            o = dict(n=nk, b=kb if i2 == 0 else '')
            if ys and i2 == 0:
                o['y'] = ys
            o['m'] = txt
            out.append(o)
    return out


HEAD_MARK = re.compile(r'^(?:[A-ZÇĞİÖŞÜa-zçğıöşü]|[IVX]+|\d{1,2})\s*[.\-–]\s+[A-ZÇĞİÖŞÜ]')


def head_styled(L):
    """Kalın/italik satır başlık sayılabilir mi (not devamı/parantez artığı değil)?"""
    t = L['t']
    if NOTE_RE.match(t) or t.startswith('('):
        return False
    t = re.sub(r'^\(?[A-Za-z0-9ÇĞİÖŞÜçğıöşü]{1,4}\)\s*', '', t)  # "A) " gibi imleri say-ma
    if t.count(')') > t.count('('):
        return False
    return True


def heading_like(L):
    """Normal puntolu satır başlık sayılabilir mi: cümle sonu noktalaması yok, kısa."""
    return len(L['t']) < 120 and not re.search(r'[.;,]\s*$', L['t'])


def join_lines(a, b):
    if a.endswith('-') and b[:1].islower() and len(a) > 1 and a[-2].isalpha():
        return a + b                      # satır sonu tire: eğitim-/öğretim
    if a.endswith('-') and b[:1].isdigit() and len(a) > 1 and a[-2].isdigit():
        return a + b                      # tarih-sayı: 28/3/1985-/3176/16
    return a + ' ' + b


def parse_heads(heads, art_left, keep_orphans=False):
    """Madde öncesi başlık satırlarından (y listesi, kenar başlığı) çıkarır."""
    ys = []
    kenar = []
    i = 0
    while i < len(heads):
        L = heads[i]
        sp = sec_parse(L['t'])
        if sp:
            lvl, name = sp
            title = []
            j = i + 1
            while j < len(heads) and not sec_parse(heads[j]['t']) and is_styled(heads[j]) and is_centered(heads[j]) \
                    and (j == i + 1 or abs(heads[j]['left'] - art_left) > 2):
                title.append(heads[j]['t'])
                j += 1
            ttl = ' '.join(title).strip()
            if ttl and is_allcaps(ttl):
                ttl = tr_title(ttl)
            ys.append([lvl, name + (' · ' + ttl if ttl else '')])
            i = j
            continue
        if keep_orphans or not is_title(L, art_left):
            kenar.append(re.sub(r'\s*:\s*$', '', L['t']))
        i += 1
    if not kenar and not keep_orphans and not ys:
        # ilk madde: ortalı tek başlık varsa (ör. "GİRİŞ / Kanunun Şümulü") sonuncusu kenar başlığıdır
        cent = [L['t'] for L in heads if is_title(L, art_left)]
        if cent:
            kenar.append(re.sub(r'\s*:\s*$', '', cent[-1]))
    kb = ' '.join(kenar).strip()
    return ys, kb


# ------------------------------------------------------------------- ana akış
def kanun_nesnesi(pdf, no, ad, kisa, tertip, kontrol, aralik=True):
    return dict(no=str(no), ad=ad, kisa=kisa, tertip=tertip, kontrol=kontrol, maddeler=extract(pdf, aralik=aralik))


def meta_from(no, args_dir):
    p = os.path.join(args_dir, 'kanunlar.json')
    if os.path.exists(p):
        for k in json.load(open(p, encoding='utf8')):
            if str(k['no']) == str(no):
                return k
    return {}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf', nargs='?')
    ap.add_argument('--no')
    ap.add_argument('--ad')
    ap.add_argument('--kisa')
    ap.add_argument('--tertip', type=int)
    ap.add_argument('--kontrol', default=datetime.date.today().isoformat())
    ap.add_argument('-o', '--cikti')
    ap.add_argument('--hepsi', action='store_true')
    ap.add_argument('--pdf-dizin', default='/tmp/mpdf')
    ap.add_argument('--cikti-dizin', default='/tmp/mout')
    ap.add_argument('--sadece')
    ap.add_argument('--aralik-acma', action='store_true')
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    if a.hepsi:
        os.makedirs(a.cikti_dizin, exist_ok=True)
        only = set(a.sadece.split(',')) if a.sadece else None
        for k in json.load(open(os.path.join(here, 'kanunlar.json'), encoding='utf8')):
            no = str(k['no'])
            if only and no not in only:
                continue
            pdf = os.path.join(a.pdf_dizin, no + '.pdf')
            if not os.path.exists(pdf):
                print('yok:', pdf, file=sys.stderr)
                continue
            obj = kanun_nesnesi(pdf, no, k.get('ad'), k.get('kisa'), k.get('tertip'), a.kontrol, not a.aralik_acma)
            json.dump(obj, open(os.path.join(a.cikti_dizin, no + '.json'), 'w', encoding='utf8'), ensure_ascii=False)
            print(no, len(obj['maddeler']), 'madde')
        return
    if not a.pdf or not a.no:
        ap.error('pdf ve --no gerekli')
    meta = meta_from(a.no, here)
    obj = kanun_nesnesi(a.pdf, a.no, a.ad or meta.get('ad'), a.kisa or meta.get('kisa'),
                        a.tertip if a.tertip is not None else meta.get('tertip'), a.kontrol, not a.aralik_acma)
    s = json.dumps(obj, ensure_ascii=False)
    if a.cikti:
        open(a.cikti, 'w', encoding='utf8').write(s)
    else:
        print(s)


if __name__ == '__main__':
    main()
