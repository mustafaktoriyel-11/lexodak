#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""anomali.py - ayikla.py çıktılarını (JSON) şüpheli maddeler açısından tarar.

Kullanım: python3 anomali.py /tmp/mout/5275.json [...]  [-n 6]
Rapor: madde sayısı, ilk/son n, Geçici/Ek sayısı; boş m, kısa (<15) m (Mülga hariç), uzun (>15000) m,
artık dipnot kalıbı, kelimeye yapışık rakam, sayfa numarası artığı, numara boşlukları/sırasızlık.
"""
import argparse, json, re, sys

FN = re.compile(r'tarihli ve [^.]{0,80} sayılı [^.]{0,120}?(?:maddesi(?:yle|ne|nin| ile)|fıkrası(?:yla|na))[^.]{0,200}?'
                r'(değiştirilmiştir|eklenmiştir|yürürlükten kaldırılmıştır|iptal edilmiştir|çıkarılmıştır|kaldırılmıştır)\.'
                r'|(?<!İptal: )(?<!İptal bent: )(?<!İptal ibare: )Anayasa Mahkemesinin [^.()]{0,80}Kararı ile(?! *\))')
GLUE1 = re.compile(r'[A-Za-zÇĞİÖŞÜçğıöşü][0-9]{1,3}(?![0-9/])\b')            # değiştirilmiştir3
GLUE2 = re.compile(r'[a-zçğıöşü][.;,)”"]\d{1,3}(?=\s|$)')                    # kullanılır.8
PAGE = re.compile(r'(?:[.;:)”"]\s+\d{1,3}$)|(?:\bSayfa\s*:?\s*\d+)|(?:^\d{1,3}\s*$)')
MULGA = re.compile(r'Mülga|İptal|Yürürlükten', re.I)


def scan(path, nshow):
    d = json.load(open(path, encoding='utf8'))
    ms = d['maddeler']
    ns = [m['n'] for m in ms]
    gec = sum(1 for n in ns if n.startswith('Geçici'))
    ek = sum(1 for n in ns if n.startswith('Ek'))
    print('=== %s %s: %d madde | ilk %s son %s | Geçici %d, Ek %d (Ek Geçici %d) | y\'li madde %d' % (
        d['no'], d.get('kisa'), len(ms), ns[0], ns[-1], gec, ek, sum(1 for n in ns if n.startswith('Ek Geçici')),
        sum(1 for m in ms if m.get('y'))))
    res = {}

    def add(k, n, extra=''):
        res.setdefault(k, []).append((n, extra))
    for m in ms:
        t = m['m']
        if not t.strip():
            add('boş m', m['n'])
        elif len(t) < 15 and not MULGA.search(t):
            add('kısa m (<15, mülga değil)', m['n'], t)
        if len(t) > 15000:
            add('uzun m (>15000)', m['n'], str(len(t)))
        mm = FN.search(t)
        if mm and 'İptal' in t[max(0, mm.start() - 60):mm.start()]:
            mm = None
        if mm:
            add('dipnot kalıbı', m['n'], mm.group(0)[:90])
        g = GLUE1.search(t) or GLUE2.search(t)
        if g:
            add('yapışık rakam', m['n'], t[max(0, g.start() - 25):g.end() + 15])
        p = PAGE.search(t)
        if p:
            add('sayfa no artığı', m['n'], t[max(0, p.start() - 30):p.end()])
        if len(m.get('b', '')) > 200:
            add('uzun b (>200)', m['n'], m['b'][:80])
        if re.search(r'\d{1,3}$', m.get('b', '')) and not re.search(r'\b\d{4}$', m.get('b', '')):
            add('b rakamla bitiyor', m['n'], m['b'][-40:])
    # numara düzeni
    main = [(i, int(m['n'].split('/')[0])) for i, m in enumerate(ms) if re.fullmatch(r'\d+(/[A-Za-zÇĞİÖŞÜçğıöşü])?', m['n'])]
    seen = set(v for _, v in main)
    miss = [x for x in range(1, max(seen) + 1) if x not in seen] if seen else []
    if miss:
        add('numara boşluğu', ','.join(map(str, miss[:20])), str(len(miss)))
    last = 0
    for i, v in main:
        if v < last:
            add('sırasız madde', ms[i]['n'], 'önceki %d' % last)
        last = max(last, v)
    dup = {n for n in ns if ns.count(n) > 1}
    if dup:
        add('tekrarlı n', ','.join(sorted(dup)))
    if not res:
        print('   anomali yok')
    for k, v in res.items():
        print('   %-26s %3d  %s' % (k, len(v), '; '.join('%s%s' % (n, (' [' + e + ']') if e else '') for n, e in v[:nshow])))
    return res


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('json', nargs='+')
    ap.add_argument('-n', type=int, default=6)
    a = ap.parse_args()
    for p in a.json:
        scan(p, a.n)
