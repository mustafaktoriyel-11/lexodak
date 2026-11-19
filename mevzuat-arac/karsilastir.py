#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""karsilastir.py - ayikla.py çıktısını referans mevzuat.json ile madde madde karşılaştırır.

Kullanım:
  python3 karsilastir.py [--ref /home/claude/lx/mevzuat.json] [--cikti-dizin /tmp/mout]
                         [--no 6098,5237] [-n 5] [--sadece-ozet]
Her kanun için: madde no kümesi eşit mi (eksik/fazla), sıra aynı mı, gövde (m) eşleşme %
(boşluk/tırnak/tire normalizasyonu sonrası), paragraf-yapısı eşleşme %, başlık (b) ve bölüm (y)
eşleşme %. Ardından ilk N fark (ilk ayrışan karakter bağlamıyla) yazdırılır.
"""
import argparse, json, os, re, sys


def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('´', "'").replace('`', "'")
    s = s.replace('“', '"').replace('”', '"').replace('„', '"')
    s = s.replace('–', '-').replace('—', '-')
    s = re.sub(r'\s*[-]\s*', '-', s)   # tire çevresindeki boşluk farkları (satır sonu birleştirme) yok sayılır
    return re.sub(r'\s+', ' ', s).strip()


def firstdiff(a, b):
    k = 0
    while k < min(len(a), len(b)) and a[k] == b[k]:
        k += 1
    return k


def compare(ref, out, nshow, quiet=False):
    rm = {m['n']: m for m in ref['maddeler']}
    om = {m['n']: m for m in out['maddeler']}
    miss = [n for n in rm if n not in om]
    extra = [n for n in om if n not in rm]
    dup = len(out['maddeler']) - len(om)
    order_ok = [m['n'] for m in ref['maddeler'] if m['n'] in om] == [m['n'] for m in out['maddeler'] if m['n'] in rm]
    common = [n for n in rm if n in om]
    body_ok = para_ok = b_ok = y_ok = 0
    diffs = []
    for n in common:
        r, o = rm[n], om[n]
        bm = norm(r['m']) == norm(o['m'])
        body_ok += bm
        para_ok += (r['m'] == o['m']) or (bm and [norm(x) for x in r['m'].split('\n')] == [norm(x) for x in o['m'].split('\n')])
        bb = norm(r.get('b', '')) == norm(o.get('b', ''))
        b_ok += bb
        yy = r.get('y') == o.get('y')
        y_ok += yy
        if not (bm and bb and yy):
            diffs.append((n, bm, bb, yy))
    c = max(len(common), 1)
    res = dict(no=ref['no'], kisa=ref.get('kisa'), nref=len(rm), nout=len(out['maddeler']), miss=miss, extra=extra, dup=dup,
               nset=(not miss and not extra and not dup), order=order_ok, body=100 * body_ok / c, para=100 * para_ok / c,
               b=100 * b_ok / c, y=100 * y_ok / c)
    if not quiet:
        print('=== %s %s: ref %d / çıktı %d | n-kümesi %s%s | sıra %s | m %.2f%% | paragraf %.2f%% | b %.2f%% | y %.2f%%' % (
            res['no'], res['kisa'], res['nref'], res['nout'], 'EŞİT' if res['nset'] else 'FARKLI',
            '' if res['nset'] else ' (eksik %s, fazla %s, tekrar %d)' % (miss[:12], extra[:12], dup),
            'aynı' if order_ok else 'FARKLI', res['body'], res['para'], res['b'], res['y']))
        shown = 0
        for n, bm, bb, yy in diffs:
            if shown >= nshow:
                break
            shown += 1
            r, o = rm[n], om[n]
            print('  -- m.%s  (m:%s b:%s y:%s)' % (n, 'ok' if bm else 'FARK', 'ok' if bb else 'FARK', 'ok' if yy else 'FARK'))
            if not bm:
                a, b = norm(r['m']), norm(o['m'])
                k = firstdiff(a, b)
                print('     ref: ...%s' % a[max(0, k - 50):k + 90])
                print('     çık: ...%s' % b[max(0, k - 50):k + 90])
            if not bb:
                print('     b ref: %r\n     b çık: %r' % (r.get('b'), o.get('b')))
            if not yy:
                print('     y ref: %r\n     y çık: %r' % (r.get('y'), o.get('y')))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', default='/home/claude/lx/mevzuat.json')
    ap.add_argument('--cikti-dizin', default='/tmp/mout')
    ap.add_argument('--no')
    ap.add_argument('-n', type=int, default=5)
    ap.add_argument('--sadece-ozet', action='store_true')
    a = ap.parse_args()
    ref = json.load(open(a.ref, encoding='utf8'))['kanunlar']
    nos = a.no.split(',') if a.no else list(ref)
    rows = []
    for no in nos:
        p = os.path.join(a.cikti_dizin, no + '.json')
        if no not in ref or not os.path.exists(p):
            print('atlandı:', no, file=sys.stderr)
            continue
        rows.append(compare(ref[no], json.load(open(p, encoding='utf8')), a.n, quiet=a.sadece_ozet))
    print('\nÖZET  no kisa | n-set | sıra | m%% | paragraf%% | b%% | y%%')
    for r in rows:
        print('%6s %-6s | %-5s | %-4s | %6.2f | %6.2f | %6.2f | %6.2f' % (
            r['no'], r['kisa'], 'EŞİT' if r['nset'] else 'FARK', 'aynı' if r['order'] else 'FARK', r['body'], r['para'], r['b'], r['y']))


if __name__ == '__main__':
    main()
