#!/usr/bin/env python3
"""mevzuat.json -> mevzuat/index.json + mevzuat/<no>.json (kanun başına bir dosya).

Kullanım: python3 mevzuat-arac/bol.py [kaynak.json] [hedef_klasör]
Çıktı deterministiktir (aynı girdi -> aynı bayt). index.json'daki her kayda
"boy" (dosya boyutu, bayt) ve "h" (dosya içeriğinin kısa özeti) eklenir;
"surum" bütün "h" değerlerinden türetilir.
"""
import hashlib
import json
import os
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def yaz(yol, nesne):
    b = json.dumps(nesne, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with open(yol, 'wb') as f:
        f.write(b)
    return b


def main():
    kaynak = sys.argv[1] if len(sys.argv) > 1 else os.path.join(KOK, 'mevzuat.json')
    hedef = sys.argv[2] if len(sys.argv) > 2 else os.path.join(KOK, 'mevzuat')
    with open(kaynak, encoding='utf-8') as f:
        j = json.load(f)
    os.makedirs(hedef, exist_ok=True)
    yeni = []
    for k in j['index']:
        no = k['no']
        kanun = j['kanunlar'][no]
        b = yaz(os.path.join(hedef, no + '.json'), kanun)
        e = dict(k)
        e['boy'] = len(b)
        e['h'] = hashlib.sha1(b).hexdigest()[:8]
        yeni.append(e)
    surum = hashlib.sha1(''.join(e['no'] + e['h'] for e in yeni).encode()).hexdigest()[:10]
    yaz(os.path.join(hedef, 'index.json'), {'surum': surum, 'index': yeni})
    # kaynakta olmayan eski kanun dosyalarını temizle
    var = set(e['no'] + '.json' for e in yeni) | {'index.json'}
    for ad in os.listdir(hedef):
        if ad.endswith('.json') and ad not in var:
            os.remove(os.path.join(hedef, ad))
    print(len(yeni), 'kanun, surum', surum)


if __name__ == '__main__':
    main()
