#!/usr/bin/env python3
"""Günlük mevzuat kontrolü (GitHub Actions'ta çalışır).

Kullanım: python3 mevzuat-arac/guncelle.py <pdf klasörü> <rapor.md>
- kanunlar.json'daki her kanun için resmî PDF'i ayikla.py ile ayrıştırır, mevzuat/<no>.json ile madde madde karşılaştırır.
- Güvenlik: madde sayısı %2'den fazla düşen, boş/bozuk çıkan ya da madde kaybeden kanun DEĞİŞTİRİLMEZ, raporda "durduruldu" yazar.
- Değişen kanunların dosyasını yazar (kontrol tarihi bugün), index.json'u yeniden kurar.
- Değişen maddelere atıf yapan soruları (günlük test, ders testleri, klasik sınavlar: "NNNN sayılı … m. X") rapora ekler.
Çıkış kodu: 0 = değişiklik yok, 10 = değişiklik var (rapor yazıldı), 1 = hata.
"""
import datetime, hashlib, json, os, re, subprocess, sys, tempfile
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MV = os.path.join(KOK, 'mevzuat')

def nrm(s): return re.sub(r'\s+', ' ', (s or '').replace('­', '')).strip()

def yaz(yol, nesne):
    b = json.dumps(nesne, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    open(yol, 'wb').write(b); return b

def mukerrer(maddeler):
    say = {}
    for m in maddeler:
        n = m['n']; say[n] = say.get(n, 0) + 1
        if say[n] > 1: m['n'] = '%s (%d)' % (n, say[n])
    return maddeler

def sorular():
    """(kanun no, madde) -> soru kökleri listesi"""
    S = {}
    rx = re.compile(r'(\d{3,4})\s*sayılı[^"]{0,80}?\bm\.\s*(\d+(?:/[A-Za-z])?)')
    def tara(o, yer):
        if isinstance(o, dict):
            k = o.get('k') if isinstance(o.get('k'), str) else None
            if k:
                for no, md in rx.findall(k):
                    S.setdefault((no, md.upper() if '/' in md else md), []).append('%s: %s' % (yer, (o.get('s') or o.get('soru') or '')[:120]))
            for v in o.values(): tara(v, yer)
        elif isinstance(o, list):
            for v in o: tara(v, yer)
    h = open(os.path.join(KOK, 'index.html'), encoding='utf-8').read()
    m = re.search(r'<script type="application/json" id="mantik-veri">(.*?)</script>', h, re.S)
    if m: tara(json.loads(m.group(1)), 'Günlük test')
    for f, ad in (('testler.json', 'Ders testi'), ('klasik.json', 'Klasik sınav')):
        try: tara(json.load(open(os.path.join(KOK, f), encoding='utf-8')), ad)
        except Exception: pass
    return S

def main():
    pdfd, rapor = sys.argv[1], sys.argv[2]
    bugun = datetime.date.today().isoformat()
    liste = json.load(open(os.path.join(KOK, 'mevzuat-arac', 'kanunlar.json'), encoding='utf-8'))
    tmp = tempfile.mkdtemp()
    R, degisen, SOR = [], [], None
    for b in liste:
        if b.get('durum') != 'var': continue
        no = b['no']; pdf = os.path.join(pdfd, no + '.pdf'); eskiy = os.path.join(MV, no + '.json')
        if not os.path.exists(pdf): R.append('- ⚠️ %s %s: PDF inmedi, atlandı' % (no, b['kisa'])); continue
        cik = os.path.join(tmp, no + '.json')
        p = subprocess.run([sys.executable, os.path.join(KOK, 'mevzuat-arac', 'ayikla.py'), pdf, '--no', no, '-o', cik], capture_output=True, text=True)
        if p.returncode != 0 or not os.path.exists(cik): R.append('- ⚠️ %s %s: ayrıştırma hatası, atlandı' % (no, b['kisa'])); continue
        yeni = json.load(open(cik, encoding='utf-8')); YM = mukerrer(yeni['maddeler'])
        eski = json.load(open(eskiy, encoding='utf-8')); EM = eski['maddeler']
        E = {m['n']: m for m in EM}; Y = {m['n']: m for m in YM}
        kayip = [n for n in E if n not in Y]; ek = [n for n in Y if n not in E]
        fark = [n for n in Y if n in E and (nrm(E[n]['m']) != nrm(Y[n]['m']) or nrm(E[n].get('b')) != nrm(Y[n].get('b')))]
        if not kayip and not ek and not fark: continue
        if not YM or len(YM) < len(EM) * 0.98 or kayip:
            R.append('- 🛑 %s %s: DURDURULDU (madde %d → %d, kaybolan: %s) – elle bakılmalı' % (no, b['kisa'], len(EM), len(YM), ', '.join(kayip[:10])))
            continue
        if SOR is None: SOR = sorular()
        R.append('### %s %s (%s)\n- Yeni madde: %s\n- Değişen madde: %s' % (b['kisa'], no, b['ad'], ', '.join(ek) or '—', ', '.join(fark) or '—'))
        for n in fark[:15]:
            R.append('  - **m. %s** eski: «%s…»\n    yeni: «%s…»' % (n, nrm(E[n]['m'])[:220], nrm(Y[n]['m'])[:220]))
            for s in (SOR.get((no, n)) or [])[:5]: R.append('    - ❗ Etkilenen soru → %s' % s)
        k = {'no': no, 'ad': eski['ad'], 'kisa': eski['kisa'], 'tertip': eski['tertip'], 'kontrol': bugun, 'maddeler': YM}
        yaz(eskiy, k); degisen.append(no)
    if degisen:
        idx = []
        for b in liste:
            yol = os.path.join(MV, b['no'] + '.json')
            if b.get('durum') != 'var' or not os.path.exists(yol): continue
            ham = open(yol, 'rb').read(); k = json.loads(ham)
            idx.append({'no': k['no'], 'ad': k['ad'], 'kisa': k['kisa'], 'tertip': k['tertip'], 'kontrol': k['kontrol'],
                        'madde': len(k['maddeler']), 'boy': len(ham), 'h': hashlib.sha1(ham).hexdigest()[:8]})
        s = hashlib.sha1(''.join(e['no'] + e['h'] for e in idx).encode()).hexdigest()[:10]
        yaz(os.path.join(MV, 'index.json'), {'surum': s, 'index': idx})
    bas = '# Mevzuat kontrolü %s\n\n' % bugun
    if degisen: bas += 'Değişen kanunlar: **%s**. Değişiklikler ayrı dalda; uygun görürsen birleştir (merge), yayına girer.\n\n' % ', '.join(degisen)
    open(rapor, 'w', encoding='utf-8').write(bas + '\n'.join(R) + '\n')
    print(bas + '\n'.join(R))
    sys.exit(10 if degisen or any('🛑' in r for r in R) else 0)

if __name__ == '__main__':
    main()
