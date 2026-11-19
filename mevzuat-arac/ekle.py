#!/usr/bin/env python3
"""Ayıklayıcı çıktılarını (ayikla.py) mevzuat/<no>.json olarak ekler ve mevzuat/index.json'u yeniden kurar.

Kullanım: python3 mevzuat-arac/ekle.py <çıktı klasörü> <no> [<no> ...] --kontrol YYYY-AA-GG
- Kısa ad / tam ad mevzuat-arac/kanunlar.json'dan alınır (durum "var" yapılır).
- Aynı madde numarası iki kez geçiyorsa (resmî metindeki mükerrer geçici maddeler) ikincisi "N (2)" olur.
- index.json sırası kanunlar.json sırasıdır; her kayda boy ve h, dizine surum eklenir (bol.py ile aynı biçim).
"""
import hashlib, json, os, sys
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MV = os.path.join(KOK, 'mevzuat')
LISTE = os.path.join(KOK, 'mevzuat-arac', 'kanunlar.json')

def yaz(yol, nesne):
    b = json.dumps(nesne, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    open(yol, 'wb').write(b)
    return b

def main():
    a = sys.argv[1:]
    kontrol = a[a.index('--kontrol') + 1]; a = [x for i, x in enumerate(a) if x != '--kontrol' and (i == 0 or a[i-1] != '--kontrol')]
    kaynak, nolar = a[0], a[1:]
    liste = json.load(open(LISTE, encoding='utf-8'))
    L = {k['no']: k for k in liste}
    for no in nolar:
        k = json.load(open(os.path.join(kaynak, no + '.json'), encoding='utf-8'))
        say = {}
        for m in k['maddeler']:
            n = m['n']; say[n] = say.get(n, 0) + 1
            if say[n] > 1: m['n'] = '%s (%d)' % (n, say[n])
        bilgi = L[no]
        kanun = {'no': no, 'ad': bilgi['ad'], 'kisa': bilgi['kisa'], 'tertip': k.get('tertip') or bilgi.get('tertip') or 5,
                 'kontrol': kontrol, 'maddeler': k['maddeler']}
        yaz(os.path.join(MV, no + '.json'), kanun)
        bilgi['durum'] = 'var'; bilgi['tertip'] = kanun['tertip']
    json.dump(liste, open(LISTE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    idx = []
    for b in liste:
        yol = os.path.join(MV, b['no'] + '.json')
        if b.get('durum') != 'var' or not os.path.exists(yol): continue
        ham = open(yol, 'rb').read(); k = json.loads(ham)
        idx.append({'no': k['no'], 'ad': k['ad'], 'kisa': k['kisa'], 'tertip': k['tertip'], 'kontrol': k['kontrol'],
                    'madde': len(k['maddeler']), 'boy': len(ham), 'h': hashlib.sha1(ham).hexdigest()[:8]})
    surum = hashlib.sha1(''.join(e['no'] + e['h'] for e in idx).encode()).hexdigest()[:10]
    yaz(os.path.join(MV, 'index.json'), {'surum': surum, 'index': idx})
    print(len(idx), 'kanun; sürüm', surum)

if __name__ == '__main__':
    main()
