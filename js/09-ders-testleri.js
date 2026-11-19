// ================= DERS TESTLERİ (külliyat) =================
(function(){
  var $=function(id){return document.getElementById(id);};
  if(!$('dt-liste'))return;
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function oku(k,v){try{var x=localStorage.getItem(k);return x?JSON.parse(x):v;}catch(e){return v;}}
  function yaz(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  // es: öğrencinin ders listesindeki hangi adlar bu testle eşleşir (seçtiyse üstte gösterilir)
  var DERSLER=[
    {kod:'borclar-genel',ad:'Borçlar Genel',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7.5L18 7v13.5H7z"/><path d="M14.5 3.5V7H18M9.5 10.5h6M9.5 13.5h6M9.5 17.5c1-1.2 1.6-1.2 2.2 0s1.3 1.2 2.3-.4"/></svg>',es:['Borçlar Genel','Borçlar Hukuku']},
    {kod:'borclar-ozel',ad:'Borçlar Özel',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15.5" r="4"/><path d="M10.9 12.6 19.5 4M16.5 7l2.4 2.4M14.2 9.3l1.8 1.8"/></svg>',es:['Borçlar Özel','Borçlar Hukuku']},
    {kod:'ceza-genel',ad:'Ceza Genel',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7.5 20h9M5 7.5h14M12 4.6l-7 2.9M12 4.6l7 2.9"/><path d="M5 7.5 2.6 13a2.4 2.4 0 0 0 4.8 0zM19 7.5 16.6 13a2.4 2.4 0 0 0 4.8 0z"/></svg>',es:['Ceza Genel','Ceza Hukuku']},
    {kod:'ceza-ozel',ad:'Ceza Özel',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 18.5c-1-1.8-1.6-3.9-1.6-6.2a7.4 7.4 0 0 1 12.6-5.2"/><path d="M19.2 10.4c.2.6.3 1.2.3 1.9 0 2.1-.3 4.2-1 6"/><path d="M8.6 20.2C7.7 18 7.3 15.4 7.3 12.6a4.7 4.7 0 0 1 9.4 0c0 2.6-.3 5-1 7"/><path d="M11.8 20.6c-.9-2.4-1.4-5-1.4-7.8a1.6 1.6 0 0 1 3.2 0c0 1.8-.1 3.4-.4 4.9"/></svg>',es:['Ceza Özel','Ceza Hukuku']},
    {kod:'icra-iflas',ad:'İcra ve İflas',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.8" y="6.5" width="18.4" height="11" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',es:['İcra ve İflas']},
    {kod:'is',ad:'İş Hukuku',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5V11.2l5 3.1v-3.1l5 3.1V8.4h2.8V4h3V20.5z"/><path d="M2 20.5h20M6.5 17.3h1.6M10.8 17.3h1.6M15 17.3h1.6"/></svg>',es:['İş Hukuku']},
    {kod:'ticaret',ad:'Ticaret Hukuku',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3 12.5h18M12 11.5v2"/></svg>',es:['Ticaret Hukuku']},
    {kod:'esya',ad:'Eşya Hukuku',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.8 9.5v10h12.4v-10"/><path d="M10 19.5v-5h4v5"/></svg>',es:['Eşya Hukuku']},
    {kod:'medeni',ad:'Medeni Hukuk',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7.5" r="2.6"/><circle cx="16" cy="7.5" r="2.6"/><circle cx="12" cy="13.3" r="1.9"/><path d="M3.5 19.5c0-3.2 2-5.2 4.5-5.2M20.5 19.5c0-3.2-2-5.2-4.5-5.2M9 20c0-2.2 1.3-3.6 3-3.6s3 1.4 3 3.6"/></svg>',es:['Medeni Hukuk']},
    {kod:'anayasa',ad:'Anayasa Hukuku',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M4 9l8-5 8 5"/><path d="M6 9v9M10 9v9M14 9v9M18 9v9M3.5 18h17M2.5 20.5h19"/></svg>',es:['Anayasa Hukuku']},
    {kod:'mohuk',ad:'Milletlerarası Özel Hukuk',ik:'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z"/></svg>',es:['MÖHUK','Milletlerarası Özel Hukuk']}
  ];
  var TUR={bilgi:'Bilgi',olay:'Olay',sure:'Süre'},NT=10;
  var K='lex-ders-test',AK='lex-dt-aktif',VERI=null,soz=null,aktif=oku(AK,null),mod=null,acik=null;
  function veri(){if(VERI)return Promise.resolve(VERI);if(soz)return soz;
    soz=(window.LEX_ICERIK?LEX_ICERIK('testler.json'):fetch('testler.json').then(function(r){if(!r.ok)throw 0;return r.json();})).then(function(j){VERI={};(j.dersler||[]).forEach(function(d){VERI[d.kod]=d.sorular||[];});return VERI;}).catch(function(){soz=null;return {};});return soz;}
  var KSV=null,ksSoz=null,KSK='lex-klasik';
  function ksVeri(){if(KSV)return Promise.resolve(KSV);if(ksSoz)return ksSoz;
    ksSoz=(window.LEX_ICERIK?LEX_ICERIK('klasik.json'):fetch('klasik.json').then(function(r){if(!r.ok)throw 0;return r.json();})).then(function(j){KSV={};(j.dersler||[]).forEach(function(d){KSV[d.kod]=d.sinavlar||[];});return KSV;}).catch(function(){ksSoz=null;return {};});return ksSoz;}
  function par(x){return String(x).split(/\n{2,}/).map(function(p){return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';}).join('');}
  function mdBtn(ks){return (ks||[]).map(function(k){var m=/^(\d{4}) sayılı (.+?) m\. ?(.+)$/.exec(k);if(!m)return '';return '<button type="button" class="ks-md" data-no="'+m[1]+'" data-n="'+esc(m[3])+'"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.5v13"/></svg>'+esc(m[2])+' m. '+esc(m[3])+' ›</button>';}).join('');}
  var TURAD={vize:'Vize',final:'Final'};
  function dersOf(kod){for(var i=0;i<DERSLER.length;i++)if(DERSLER[i].kod===kod)return DERSLER[i];return {ad:kod};}
  function secili(d){var l=oku('lex-dersler',null);if(!l||!l.length)return false;return d.es.some(function(x){return l.indexOf(x)>=0;});}
  // ---------- liste ----------
  function liste(){
    Promise.all([veri(),ksVeri()]).then(function(VV){var V=VV[0],KS=VV[1];
      var kay=oku(K,{}),sec=[],dig=[];DERSLER.forEach(function(d){(secili(d)?sec:dig).push(d);});
      function kart(d){
        var S=V[d.kod]||[],nt=Math.floor(S.length/NT),k=kay[d.kod]||{},bit=0,t,ks=KS[d.kod]||[],var_=nt||ks.length;for(t=1;t<=nt;t++)if(k[t])bit++;
        var ac=!!(acik===d.kod&&var_),o='<div class="dt-d'+(var_?'':' yok')+'"><button type="button" class="dt-b" data-kod="'+d.kod+'"'+(var_?' aria-expanded="'+ac+'"':' disabled')+'><i>'+d.ik+'</i><span><b>'+esc(d.ad)+'</b><small>'+(var_?(nt?nt+' test · '+(nt*NT)+' soru':'')+(ks.length?(nt?' · ':'')+'vize + final':'')+(bit?' · '+bit+'/'+nt+' çözüldü':''):'Hazırlanıyor')+'</small></span><em>'+(var_?(ac?'▾':'›'):'')+'</em></button>';
        if(ac){o+='<div class="dt-t">';for(t=1;t<=nt;t++){var r=k[t];o+='<button type="button" data-kod="'+d.kod+'" data-t="'+t+'"'+(r?' class="cz"':'')+'><span>Test '+t+'</span><small>'+(r?'En iyi '+r.d+'/'+NT:NT+' soru')+'</small><b>'+(r?'Tekrar':'Başla')+' ›</b></button>';}
          var kk=oku(KSK,{})[d.kod]||{};ks.forEach(function(s,j){var g=kk[s.tur];o+='<button type="button" class="ks'+(g?' cz':'')+'" data-kod="'+d.kod+'" data-ks="'+j+'"><span>'+(TURAD[s.tur]||s.tur)+'</span><small>'+(g?'✓ İncelendi':'Klasik sınav · IRAC çözümlü')+'</small><b>Aç ›</b></button>';});o+='</div>';}
        return o+'</div>';
      }
      $('dt-liste').innerHTML='<div class="mt-kart"><p class="mt-bas"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="4" height="15" rx="1"/><rect x="8.5" y="3.5" width="4" height="16.5" rx="1"/><path d="m13.6 6.2 3.8-1 3.9 14.4-3.8 1z"/><path d="M3.5 8.5h4M8.5 7h4M3.5 16.5h4M8.5 16.5h4"/></svg>Ders testleri</p><p class="pm-kucuk" style="margin:0 0 4px">Her derste '+NT+' soruluk testler ve çözümlü örnek vize-final sınavları.</p><button type="button" class="dt-irac" id="dt-irac"><span><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7.5 20h9M5 7.5h14M12 4.6l-7 2.9M12 4.6l7 2.9"/><path d="M5 7.5 2.6 13a2.4 2.4 0 0 0 4.8 0zM19 7.5 16.6 13a2.4 2.4 0 0 0 4.8 0z"/></svg>IRAC: olay sorusu nasıl çözülür?</span><em>›</em></button>'+
        (sec.length?'<p class="dt-etk">Derslerin</p>'+sec.map(kart).join(''):'')+(dig.length?'<p class="dt-etk">'+(sec.length?'Diğer dersler':'Dersler')+'</p>'+dig.map(kart).join(''):'')+'</div>';
      [].forEach.call(document.querySelectorAll('#dt-liste .dt-b'),function(b){b.addEventListener('click',function(){acik=acik===b.dataset.kod?null:b.dataset.kod;liste();});});
      [].forEach.call(document.querySelectorAll('#dt-liste .dt-t button'),function(b){b.addEventListener('click',function(){if(b.dataset.ks!==undefined)ksAc(b.dataset.kod,+b.dataset.ks);else basla(b.dataset.kod,+b.dataset.t);});});
      $('dt-irac').addEventListener('click',rehber);
    });
  }
  // ---------- test ----------
  function goster(){$('mt-giris').hidden=true;$('mt-test').hidden=true;$('mt-sonuc').hidden=true;$('dt-calis').hidden=false;}
  function dtGir(){if(window.LEX_GERI&&LEX_GERI.ust()!=='dt'&&LEX_GERI.ust()!=='dtr')LEX_GERI.ekle('dt',dtGeri);}
  function dtGeri(){if(mod==='test'&&aktif&&aktif.cev.some(function(x){return x!==null;})&&!confirm('Testten çıkılsın mı? Bu denemedeki cevapların silinir.')){LEX_GERI.ekle('dt',dtGeri);return;}if(mod==='test'){aktif=null;kaydet();}kapat();}
  function kapat(){if(window.LEX_GERI)LEX_GERI.dus('dt');mod=null;$('dt-calis').hidden=true;$('dt-calis').innerHTML='';if(eskiMT)eskiMT();liste();window.scrollTo(0,0);}
  function kaydet(){if(aktif)yaz(AK,aktif);else{try{localStorage.removeItem(AK);}catch(e){}}}
  function sorular(){return VERI[aktif.kod].slice((aktif.t-1)*NT,aktif.t*NT);}
  function basla(kod,t){if(!VERI||!VERI[kod]||VERI[kod].length<t*NT)return;aktif={kod:kod,t:t,i:0,cev:[]};for(var i=0;i<NT;i++)aktif.cev.push(null);mod='test';kaydet();dtGir();goster();soru();window.scrollTo(0,0);}
  function kaynakBagla(kap){if(window.LEX_MV_VAR)window.LEX_MV_VAR(function(set){[].forEach.call(kap.querySelectorAll('.mt-kaynak[data-k]'),function(e){var m=/(\d{3,4}) sayılı[^\n]*? m\. ?(\d+)/.exec(e.dataset.k);if(!m||!set[m[1]])return;
    var b=document.createElement('button');b.type='button';b.className='mt-kaynak git';b.textContent=e.textContent+' · maddeyi aç ›';b.addEventListener('click',function(){window.LEX_MV_AC(m[1],m[2]);});e.replaceWith(b);});});}
  function kaynak(q){return q.k?'<small class="mt-kaynak" data-k="'+esc(q.k)+'"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.5v13"/></svg>'+esc(q.k)+'</small>':'';}
  function soru(){
    var S=sorular(),i=aktif.i,q=S[i],c=aktif.cev[i],cev=c!==null&&c!==undefined,d=dersOf(aktif.kod),dolu=aktif.cev.filter(function(x){return x!==null;}).length,o='';
    o+='<div class="mt-ust"><div class="mt-ust-s"><span>'+esc(d.ad)+' · Test '+aktif.t+' · '+(i+1)+' / '+NT+'</span><button type="button" class="dt-cik" id="dt-cik">Çık</button></div><div class="mt-ilerle"><i style="width:'+Math.round(dolu*100/NT)+'%"></i></div></div>';
    o+='<div class="mt-kart"><span class="mt-tip">'+(TUR[q.tur]||'Bilgi')+' · '+(q.z==='orta'?'Orta':'Temel')+'</span><p class="mt-soru">'+esc(q.s)+'</p>';
    o+='<div class="mt-sec">'+q.o.map(function(x,j){return '<button type="button" data-j="'+j+'" class="'+(cev?(j===q.c?'dogru':(j===c?'yanlis':'')):'')+'"'+(cev?' disabled':'')+'><i>'+'ABCDE'[j]+'</i><span>'+esc(x)+'</span></button>';}).join('')+'</div>';
    if(cev)o+='<div class="dt-acik '+(c===q.c?'ok':'no')+'"><b>'+(c===q.c?'<svg class="lx-d ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7 5.5-5.5"/></svg> Doğru':'<svg class="lx-d no" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg> Yanlış · Doğru cevap: '+'ABCDE'[q.c])+'</b><p>'+esc(q.a)+'</p>'+kaynak(q)+'</div>';
    o+='<div class="mt-alt"><button type="button" class="geri" id="dt-geri"'+(i===0?' disabled':'')+'>‹ Önceki</button>'+(i<NT-1?'<button type="button" class="ileri" id="dt-ileri"'+(cev?'':' disabled')+'>Sonraki ›</button>':'<button type="button" class="bitir" id="dt-bitir"'+(cev?'':' disabled')+'>Sonucu gör</button>')+'</div></div>';
    var kap=$('dt-calis');kap.innerHTML=o;kaynakBagla(kap);
    [].forEach.call(kap.querySelectorAll('.mt-sec button'),function(b){b.addEventListener('click',function(){if(aktif.cev[i]!==null)return;aktif.cev[i]=+b.dataset.j;kaydet();soru();
      var a=kap.querySelector('.dt-acik');if(a&&a.scrollIntoView)a.scrollIntoView({block:'nearest'});});});
    $('dt-geri').addEventListener('click',function(){if(aktif.i>0){aktif.i--;kaydet();soru();window.scrollTo(0,0);}});
    var il=$('dt-ileri');if(il)il.addEventListener('click',function(){aktif.i++;kaydet();soru();window.scrollTo(0,0);});
    var bt=$('dt-bitir');if(bt)bt.addEventListener('click',bitir);
    $('dt-cik').addEventListener('click',function(){if(dolu&&!confirm('Testten çıkarsan bu denemedeki cevapların silinir. Çıkılsın mı?'))return;aktif=null;kaydet();kapat();});
  }
  function bitir(){
    var S=sorular(),d=0,cev=aktif.cev,kod=aktif.kod,t=aktif.t;S.forEach(function(q,j){if(cev[j]===q.c)d++;});
    var kay=oku(K,{}),k=kay[kod]||(kay[kod]={}),e=k[t],rekor=!!e&&d>e.d;k[t]={d:Math.max(d,e?e.d:0),son:d,n:(e?e.n:0)+1,t:Date.now()};yaz(K,kay);
    aktif=null;kaydet();mod='sonuc';
    var ders=dersOf(kod),nt=Math.floor(VERI[kod].length/NT),em=d===NT?'🏆':d>=8?'⚖️':d>=6?'🚀':d>=4?'📈':'🌱';
    var o='<div class="mt-hero mt-seviye"><div class="e">'+LXE(em)+'</div><h2>'+d+' / '+NT+' doğru</h2><div class="puan">'+esc(ders.ad)+' · Test '+t+'</div>'+(rekor?'<span class="fark"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>Yeni en iyi sonucun!</span>':(e&&e.d>d?'<span class="fark">En iyi sonucun: '+e.d+'/'+NT+'</span>':''))+'</div>';
    if(t<nt)o+='<button type="button" class="mt-btn" id="dt-sonraki" style="margin-bottom:10px">Test '+(t+1)+'’e geç ›</button>';
    o+='<button type="button" class="mt-btn2" id="dt-tekrar"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7"/></svg>Bu testi tekrar çöz</button>';
    o+='<div class="mt-kart mt-coz" style="margin-top:14px"><p class="mt-bas">Çözümler</p>'+S.map(function(q,j){var c=cev[j],ok=c===q.c;
      return '<details'+(ok?'':' open')+'><summary><em>'+(ok?'<svg class="lx-d ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7 5.5-5.5"/></svg>':'<svg class="lx-d no" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>')+'</em>'+(j+1)+'. '+(TUR[q.tur]||'Bilgi')+'</summary><p class="mt-soru" style="margin-top:10px">'+esc(q.s)+'</p><div class="mt-sec">'+q.o.map(function(x,n){return '<button type="button" disabled class="'+(n===q.c?'dogru':(n===c?'yanlis':''))+'"><i>'+'ABCDE'[n]+'</i><span>'+esc(x)+'</span></button>';}).join('')+'</div><div class="acik"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5h6M10 20.5h4"/><path d="M8.5 14.5a6 6 0 1 1 7 0c-.8.6-1.2 1.4-1.2 2.4v.6H9.7v-.6c0-1-.4-1.8-1.2-2.4z"/></svg>'+esc(q.a)+kaynak(q)+'</div></details>';}).join('')+'</div>';
    o+='<p class="pm-kucuk" style="text-align:center;margin:-4px 0 14px">Sorular eğitim amaçlıdır. Mevzuat değişebilir; esas olan yürürlükteki kanun metnidir.</p><button type="button" class="mt-btn2" id="dt-don" style="margin-bottom:16px">‹ Ders testlerine dön</button>';
    var kap=$('dt-calis');kap.innerHTML=o;kaynakBagla(kap);goster();window.scrollTo(0,0);acik=kod;
    var sn=$('dt-sonraki');if(sn)sn.addEventListener('click',function(){basla(kod,t+1);});
    $('dt-tekrar').addEventListener('click',function(){basla(kod,t);});
    $('dt-don').addEventListener('click',kapat);
  }
  // ---------- klasik sınav ----------
  function ksAc(kod,j){
    var s=(KSV[kod]||[])[j];if(!s)return;ksSon=[kod,j];dtGir();mod='klasik';var d=dersOf(kod),tt=TURAD[s.tur]||s.tur,o='';
    o+='<div class="mt-ust"><div class="mt-ust-s"><span>'+esc(d.ad)+' · '+tt+' sınavı</span><button type="button" class="dt-cik" id="dt-cik">Kapat</button></div></div>';
    o+='<div class="ks-bilgi"><b><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z"/><path d="m13 7 4 4"/></svg>'+esc(d.ad)+' · Örnek '+tt+'</b>Süre '+s.sure+' dk · '+esc(s.konu)+'<p>Önce soruları kâğıda kendin çöz, sonra çözümü aç. Çözümler <button type="button" class="dt-cik" id="ks-irac">IRAC yöntemiyle</button> yazıldı.</p></div>';
    s.sorular.forEach(function(q,i){
      o+='<div class="mt-kart ks-s"><span class="mt-tip">Soru '+(i+1)+' · '+(q.tip==='olay'?'Olay':'Teorik')+' · '+q.puan+' puan</span><div class="ks-metin">'+par(q.s)+'</div>';
      o+='<button type="button" class="mt-btn2 ks-ac" data-i="'+i+'">'+(q.tip==='olay'?'Çözümü göster':'Cevabı göster')+'</button><div class="ks-coz" id="ks-c'+i+'" hidden>';
      if(q.tip==='olay')q.cozum.forEach(function(b){
        o+='<div class="ks-b"><div class="ks-bb"><small>I · SORUN</small>'+esc(b.sorun)+'</div>'+
          '<div class="ks-r r"><i>K</i><div><b>Kural</b>'+par(b.kural)+mdBtn(b.k)+'</div></div>'+
          '<div class="ks-r a"><i>U</i><div><b>Uygulama</b>'+par(b.uygulama)+'</div></div>'+
          '<div class="ks-r c"><i>S</i><div><b>Sonuç</b>'+par(b.sonuc)+'</div></div></div>';});
      else o+='<div class="ks-cev">'+par(q.cevap)+mdBtn(q.k)+'</div>';
      o+='</div></div>';});
    o+='<p class="ks-not">Örnek çözümdür; kabul gören görüşe göre yazılmıştır. Hocanın değerlendirmesi farklı olabilir; esas olan yürürlükteki kanun metnidir.</p>';
    var dg=(KSV[kod]||[])[1-j];if(dg)o+='<button type="button" class="mt-btn" id="ks-dig" style="margin-bottom:10px">'+(TURAD[dg.tur]||dg.tur)+' sınavına geç ›</button>';
    o+='<button type="button" class="mt-btn2" id="ks-don" style="margin-bottom:16px">‹ Ders testlerine dön</button>';
    var kap=$('dt-calis');kap.innerHTML=o;goster();window.scrollTo(0,0);acik=kod;
    [].forEach.call(kap.querySelectorAll('.ks-ac'),function(b){b.addEventListener('click',function(){var c=$('ks-c'+b.dataset.i),ac_=c.hidden;c.hidden=!ac_;
      b.textContent=ac_?'Çözümü gizle':(s.sorular[+b.dataset.i].tip==='olay'?'Çözümü göster':'Cevabı göster');
      if(ac_){var kk=oku(KSK,{});(kk[kod]||(kk[kod]={}))[s.tur]=Date.now();yaz(KSK,kk);}});});
    [].forEach.call(kap.querySelectorAll('.ks-md'),function(b){b.addEventListener('click',function(){if(window.LEX_MV_AC)window.LEX_MV_AC(b.dataset.no,b.dataset.n);});});
    $('dt-cik').addEventListener('click',kapat);$('ks-don').addEventListener('click',kapat);$('ks-irac').addEventListener('click',rehber);
    var dd=$('ks-dig');if(dd)dd.addEventListener('click',function(){ksAc(kod,1-j);});
  }
  // ---------- IRAC rehberi ----------
  function rehber(){
    var geri=mod==='klasik'?$('dt-calis').innerHTML:null,gy=window.scrollY;if(window.LEX_GERI){if(geri)LEX_GERI.ekle('dtr',function(){ksAc(ksSon[0],ksSon[1]);setTimeout(function(){window.scrollTo(0,gy);},30);});else dtGir();}mod='rehber';
    var A=[['I','Sorun','#8A3B47','Olayda çözülmesi gereken hukuki soruyu tek cümleyle belirle. Birden fazla sorun varsa her birini ayrı başlıkta ele al.'],
      ['K','Kural','#762B37','Soruyu çözen kanun maddesini numarasıyla yaz ve kuralın unsurlarını sırala. Madde metnini ezbere kopyalamak değil, unsurları doğru çıkarmak önemli.'],
      ['U','Uygulama','#C9962B','Olaydaki olguları kuralın unsurlarına tek tek bağla: “…davranışı şu unsuru karşılar, çünkü…”. Notun çoğu buradan gelir.'],
      ['S','Sonuç','#2F8A5F','Kısa ve net bir hüküm kur: kim, hangi maddeye göre, ne olur. Sorulan neyse ona cevap ver.']];
    var o='<div class="mt-ust"><div class="mt-ust-s"><span>IRAC yöntemi</span><button type="button" class="dt-cik" id="dt-cik">Kapat</button></div></div>';
    o+='<div class="ks-bilgi"><b><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7.5 20h9M5 7.5h14M12 4.6l-7 2.9M12 4.6l7 2.9"/><path d="M5 7.5 2.6 13a2.4 2.4 0 0 0 4.8 0zM19 7.5 16.6 13a2.4 2.4 0 0 0 4.8 0z"/></svg>IRAC nedir?</b>Olay sorularını düzenli çözmek için kullanılan dört adımlı yöntem: Issue (Sorun), Rule (Kural), Application (Uygulama), Conclusion (Sonuç). Okuyan kişi her adımda neyi neden söylediğini görür.</div>';
    o+='<div class="mt-kart">'+A.map(function(x){return '<div class="ir-adim"><i style="background:'+x[2]+'">'+x[0]+'</i><div><b>'+x[1]+'</b><p>'+x[3]+'</p></div></div>';}).join('')+'</div>';
    o+='<div class="mt-kart"><p class="mt-bas">Kısa örnek</p><div class="ks-metin"><p>Can, durakta kendisine sebepsiz yere hakaret eden Efe’ye tokat atar. Doktor raporuna göre yaralanma basit bir tıbbi müdahaleyle giderilebilecek ölçüde hafiftir. Efe şikâyetçi olur. Can’ın ceza sorumluluğunu değerlendiriniz.</p></div>'+
      '<div class="ks-b"><div class="ks-bb">Can’ın kasten yaralama suçundan sorumluluğu ve cezası</div>'+
      '<div class="ks-r r"><i>K</i><div><b>Kural</b><p>TCK m. 86/1’e göre kasten başkasının vücuduna acı veren kişi kasten yaralama suçunu işler. Etki basit bir tıbbi müdahaleyle giderilebilecek kadar hafifse m. 86/2 uygulanır: suç şikâyete bağlıdır, ceza altı aydan bir yıl altı aya kadar hapis veya adlî para cezasıdır. Haksız bir fiilin yarattığı hiddet altında suç işleyenin cezası m. 29’a göre dörtte birden dörtte üçe kadar indirilir.</p>'+mdBtn(['5237 sayılı TCK m. 86','5237 sayılı TCK m. 29'])+'</div></div>'+
      '<div class="ks-r a"><i>U</i><div><b>Uygulama</b><p>Can tokadı bilerek ve isteyerek atmış, Efe’nin vücuduna acı vermiştir; kasten yaralama oluşur. Rapora göre etki basit tıbbi müdahaleyle giderilebilecek kadar hafiftir ve Efe şikâyetçidir; bu nedenle m. 86/2 uygulanır. Efe’nin sebepsiz hakareti haksız bir fiildir ve Can bunun yarattığı hiddetle hareket etmiştir; m. 29’un şartları da gerçekleşmiştir.</p></div></div>'+
      '<div class="ks-r c"><i>S</i><div><b>Sonuç</b><p>Can, TCK m. 86/2’ye göre cezalandırılır; belirlenen cezadan m. 29 uyarınca haksız tahrik indirimi yapılır.</p></div></div></div></div>';
    o+='<div class="mt-kart"><p class="mt-bas">Sınavda puan kazandıran ipuçları</p><ul class="ir-ipucu"><li>Her alt soruyu (a, b, c…) ayrı başlıkla cevapla.</li><li>Madde numarası yaz; fıkra biliyorsan ekle (m. 86/2).</li><li>Olaydaki her ayrıntı bir şey için verilmiştir; kullanmadığın olgu kalmasın.</li><li>Sonuç olayın sorusuna cevap vermeli: “sorumludur / değildir”, “geçerlidir / geçersizdir”.</li><li>Bir unsur olayda belirsizse iki ihtimali de kısaca çöz: “…ise…, değilse…”.</li></ul></div>';
    o+='<button type="button" class="mt-btn2" id="ir-don" style="margin-bottom:16px">‹ '+(geri?'Sınava dön':'Ders testlerine dön')+'</button>';
    var kap=$('dt-calis');kap.innerHTML=o;goster();window.scrollTo(0,0);
    [].forEach.call(kap.querySelectorAll('.ks-md'),function(b){b.addEventListener('click',function(){if(window.LEX_MV_AC)window.LEX_MV_AC(b.dataset.no,b.dataset.n);});});
    function don(){if(geri&&ksSon){if(window.LEX_GERI&&LEX_GERI.ust()==='dtr'){history.back();return;}ksAc(ksSon[0],ksSon[1]);}else kapat();}
    $('dt-cik').addEventListener('click',don);$('ir-don').addEventListener('click',don);
  }
  var ksSon=null;
  // Test sekmesi açılışı: ders testi sürüyorsa onu göster, değilse günlük test + ders listesi
  var eskiMT=window.MF_MT;
  window.MF_MT=function(){
    if(mod){goster();return;}
    if(aktif){veri().then(function(V){
      if(aktif&&V[aktif.kod]&&V[aktif.kod].length>=aktif.t*NT&&aktif.cev&&aktif.cev.length===NT){mod='test';goster();soru();}
      else{aktif=null;kaydet();if(eskiMT)eskiMT();liste();}});return;}
    if(eskiMT)eskiMT();liste();
  };
  if(document.body.classList.contains('s-mantik'))window.MF_MT();
})();
