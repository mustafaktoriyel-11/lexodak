// ================= MEVZUAT =================
(function(){
  var $=function(id){return document.getElementById(id);};
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function norm(x){return String(x).toLocaleLowerCase('tr').replace(/[ıİ]/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[âà]/g,'a').replace(/î/g,'i').replace(/û/g,'u');}
  var AYK=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  function tarih(iso){if(!iso)return '';var p=iso.split('-');return (+p[2])+' '+AYK[(+p[1])-1]+' '+p[0];}
  // Türkçe arama: kelime kelime (hepsi geçmeli); sonu p/ç/t/k ile biten kelimede yumuşamış hâli de aranır (temerrüt → temerrüdü)
  var YUM={p:'b',c:'c',t:'d',k:'g'};
  function sorgu(q){return norm(q).split(/\s+/).filter(function(w){return w.length>=2;}).map(function(w){
    var v=[w],s=w.slice(-1);if(w.length>=4&&YUM[s]&&YUM[s]!==s)v.push(w.slice(0,-1)+YUM[s]);if(w.length>=5&&s==='k')v.push(w.slice(0,-1));return v;});}
  function eslesir(t,S){for(var i=0;i<S.length;i++){var ok=false;for(var j=0;j<S[i].length;j++)if(t.indexOf(S[i][j])>=0){ok=true;break;}if(!ok)return false;}return S.length>0;}
  function al(u){return window.LEX_ICERIK?LEX_ICERIK(u):fetch(u).then(function(r){if(!r.ok)throw 0;return r.json();});}
  var IDX=null,KAN={},KSOZ={},BSLK={},idxSoz=null,hepSoz=null,akt=null,goster=[],bas=0,sinir=0,PARCA=40,filtreli=false;
  // kanunlar kanun başına ayrı dosyada (mevzuat/<no>.json) + küçük bir dizin (mevzuat/index.json);
  // bir kanun/madde açmak için yalnız dizin + o kanun iner. Hepsi arka planda sessizce önbelleğe alınır (internetsiz açılsın diye).
  function indeksYukle(){if(IDX)return Promise.resolve();if(idxSoz)return idxSoz;
    idxSoz=al('mevzuat/index.json').then(function(j){if(!j||!j.index||!j.index.length)throw 0;IDX=j.index;}).catch(function(){idxSoz=null;IDX=null;throw 0;});return idxSoz;}
  function kanun(no){no=String(no);if(KAN[no])return Promise.resolve(KAN[no]);if(KSOZ[no])return KSOZ[no];
    KSOZ[no]=indeksYukle().then(function(){if(!IDX.some(function(k){return k.no===no;}))throw 0;return al('mevzuat/'+no+'.json');}).then(function(kk){
      if(!kk||!kk.maddeler||!kk.maddeler.length)throw 0;kk.maddeler.forEach(function(m,i){m.i=i;});KAN[no]=kk;return kk;}).catch(function(){delete KSOZ[no];throw 0;});return KSOZ[no];}
  function indeks(){return indeksYukle().then(function(){return IDX;}).catch(function(){return [];});}
  // bütün kanunlar (tam metin araması, başlık araması); tek tek başarısız olan kanun atlanır
  function hepsi(){if(hepSoz)return hepSoz;
    hepSoz=indeksYukle().then(function(){return Promise.all(IDX.map(function(k){return kanun(k.no).catch(function(){return null;});}));}).then(function(){if(!IDX.every(function(k){return KAN[k.no];}))hepSoz=null;}).catch(function(){hepSoz=null;});return hepSoz;}
  function basliklar(){var B=[];IDX.forEach(function(k){var kk=KAN[k.no];if(!kk)return;
    if(!BSLK[k.no]){var L=[],on=norm(k.kisa+' '+k.no)+' ';
      kk.maddeler.forEach(function(m){(m.y||[]).forEach(function(y){var p=y[1].split(' · ');L.push([m.n,(p[1]||p[0])+' ('+p[0]+')',on+norm(y[1]),1]);});
        if(m.b)L.push([m.n,m.b,on+norm(m.b),0]);});
      BSLK[k.no]={no:k.no,kisa:k.kisa,m:L};}
    B.push(BSLK[k.no]);});return B;}
  // belirli kanunları hemen indir (PDF'te atıf geçen kanunlar gibi); sonucu beklenmez
  window.LEX_MV_ONCELIK=function(liste){try{(liste||[]).forEach(function(no){if(no&&!KAN[no]&&!KSOZ[no])kanun(String(no)).catch(function(){});});}catch(e){}};
  window.LEX_MV_HAZIRLA=function(){return indeksYukle().catch(function(){});};   // açılış ekranında yalnız dizini sessizce önceden yükle
  // arka plan: açılıştan sonra, boştayken ve çevrimiçiyken kalan kanunları sırayla indir (servis çalışanı önbelleğe alır)
  var onT=false;
  function arkaPlan(){if(onT)return;try{if(navigator.connection&&navigator.connection.saveData)return;}catch(e){}onT=true;   // veri tasarrufu açıksa arka planda indirme yok
    var bekle=function(f,ms){setTimeout(function(){if(window.requestIdleCallback)requestIdleCallback(f,{timeout:4000});else f();},ms);};
    function sira(i){
      if(i>=IDX.length){if(IDX.every(function(k){return KAN[k.no];})&&navigator.serviceWorker&&navigator.serviceWorker.controller)try{navigator.serviceWorker.controller.postMessage('mevzuat-gecis-tamam');}catch(e){}return;}
      if(navigator.onLine===false||KAN[IDX[i].no]||KSOZ[IDX[i].no]){bekle(function(){sira(i+1);},KAN[IDX[i].no]?0:2000);return;}
      kanun(IDX[i].no).catch(function(){}).then(function(){bekle(function(){sira(i+1);},400);});}
    indeksYukle().then(function(){sira(0);}).catch(function(){onT=false;});}
  if(document.readyState==='complete')setTimeout(function(){bekle0();},0);else addEventListener('load',function(){bekle0();});
  function bekle0(){setTimeout(function(){if(window.requestIdleCallback)requestIdleCallback(arkaPlan,{timeout:8000});else arkaPlan();},3000);}
  addEventListener('online',function(){if(!onT)bekle0();});
  function mz(m){return m.z||(m.z=norm(m.m+' '+(m.b||'')));}
  function resmi(k){return 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo='+k.no+'&MevzuatTur=1&MevzuatTertip='+(k.tertip||5);}
  // Türk Bayrağı: Türk Bayrağı Kanunu oranları (1,5:1), kırmızı #E30A17
  var BAYRAK='<svg viewBox="0 0 1200 800" aria-hidden="true"><rect width="1200" height="800" fill="#E30A17"/><circle cx="425" cy="400" r="200" fill="#fff"/><circle cx="475" cy="400" r="160" fill="#E30A17"/><polygon fill="#fff" points="583.334,400 764.235,458.779 652.431,304.894 652.431,495.106 764.235,341.221"/></svg>';
  function anayasa(k){return k&&k.no==='2709';}
  function adYaz(k){return anayasa(k)?k.ad.toLocaleUpperCase('tr'):k.ad;}
  function kart(k,alt){return '<button type="button" class="mv-k'+(anayasa(k)?' mv-ay':'')+'" data-no="'+esc(k.no)+'">'+(anayasa(k)?'<i class="mv-bayrak" role="img" aria-label="Türk Bayrağı">'+BAYRAK+'</i>':'<i>'+esc(k.kisa)+'</i>')+'<span><b>'+esc(adYaz(k))+'</b><small>'+alt+'</small></span><em>›</em></button>';}
  // ---- favori maddeler (localStorage lex-mv-fav: [[kanun no, madde no, zaman], …], en yeni başta) ----
  function favOku(){try{var a=JSON.parse(localStorage.getItem('lex-mv-fav')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
  function favYaz(a){try{localStorage.setItem('lex-mv-fav',JSON.stringify(a));}catch(e){}}
  function favMi(no,n){return favOku().some(function(x){return x[0]===no&&x[1]===n;});}
  function favDegis(no,n){var a=favOku(),i=-1;a.forEach(function(x,j){if(x[0]===no&&x[1]===n)i=j;});if(i>=0)a.splice(i,1);else a.unshift([no,n,Date.now()]);favYaz(a);return i<0;}
  // ---- maddeye not (localStorage lex-mv-not: {"kanun|madde": [metin, zaman]}) ----
  function notlar(){try{var o=JSON.parse(localStorage.getItem('lex-mv-not')||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
  function notAl(no,n){var x=notlar()[no+'|'+n];return x?x[0]:'';}
  function notKoy(no,n,t){var o=notlar(),k=no+'|'+n;t=String(t||'').replace(/\s+$/,'');if(t)o[k]=[t,Date.now()];else delete o[k];try{localStorage.setItem('lex-mv-not',JSON.stringify(o));}catch(e){}}
  var favSek='fav';
  function favCiz(){
    var el=$('mv-fav');if(!el)return;var a=favOku(),N=notlar(),nk=Object.keys(N).sort(function(x,y){return N[y][1]-N[x][1];});
    if($('mv-ara').value.trim()){el.innerHTML='';return;}
    if(!a.length&&!nk.length){el.innerHTML='<p class="pm-kucuk mv-fav-ip">☆ Bir maddenin yanındaki yıldıza dokunursan favorilerine eklenir; kalem simgesiyle maddeye kendi notunu yazabilirsin. Notlar yalnız bu telefonda kalır.</p>';return;}
    if(favSek==='fav'&&!a.length)favSek='not';if(favSek==='not'&&!nk.length)favSek='fav';
    var gl={};a.forEach(function(x){gl[x[0]]=1;});nk.forEach(function(x){gl[x.split('|')[0]]=1;});
    indeks().then(function(l){return Promise.all(Object.keys(gl).map(function(no){return kanun(no).catch(function(){});})).then(function(){return l;});}).then(function(l){
      if($('mv-ara').value.trim())return;
      var K={},o='',say=0;l.forEach(function(k){K[k.no]=k;});
      function md(no,n){var kk=KAN[no],m=null;if(!kk)return null;kk.maddeler.some(function(y){if(y.n===n){m=y;return true;}return false;});return m;}
      var sek='<div class="mv-sek"><button type="button" data-s="fav"'+(favSek==='fav'?' class="on"':'')+'>★ Favoriler · '+a.length+'</button><button type="button" data-s="not"'+(favSek==='not'?' class="on"':'')+'><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z"/><path d="m13 7 4 4"/></svg>Notlarım · '+nk.length+'</button></div>';
      if(favSek==='not'){nk.forEach(function(x){var p=x.split('|'),k=K[p[0]],m=md(p[0],p[1]);if(!k||!m)return;say++;var t=N[x][0];
          o+='<button type="button" class="mv-b" data-no="'+esc(k.no)+'" data-n="'+esc(m.n)+'"><b>'+esc(k.kisa)+' m. '+esc(m.n)+'</b><span><i class="mv-bb">'+esc(m.b||'')+'</i><span class="mv-nk">'+esc(t.length>110?t.slice(0,110)+'…':t)+'</span></span></button>';});
        el.innerHTML=sek+o;bBagla(el);sekBagla(el);return;}
      a.forEach(function(x){var k=K[x[0]],kk=KAN[x[0]],m=null;if(!k||!kk)return;
        kk.maddeler.some(function(y){if(y.n===x[1]){m=y;return true;}return false;});if(!m)return;say++;
        o+='<div class="mv-fav-s"><button type="button" class="mv-b" data-no="'+esc(k.no)+'" data-n="'+esc(m.n)+'"><b>'+esc(k.kisa)+' m. '+esc(m.n)+'</b><span>'+esc(m.b||(m.m.slice(0,80)+'…'))+'</span></button><button type="button" class="mv-yildiz on" data-no="'+esc(k.no)+'" data-n="'+esc(m.n)+'" aria-label="Favorilerden çıkar">★</button></div>';});
      el.innerHTML=sek+o;
      bBagla(el);sekBagla(el);
    });
  }
  function sekBagla(el){[].forEach.call(el.querySelectorAll('.mv-sek button'),function(b){b.addEventListener('click',function(){favSek=b.dataset.s;favCiz();});});}
  $('pg-mevzuat').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.mv-yildiz');if(!b)return;e.preventDefault();e.stopPropagation();
    var on=favDegis(b.dataset.no,b.dataset.n);
    [].forEach.call(document.querySelectorAll('#pg-mevzuat .mv-yildiz'),function(y){if(y.dataset.no===b.dataset.no&&y.dataset.n===b.dataset.n){y.classList.toggle('on',on);y.textContent=on?'★':'☆';y.setAttribute('aria-label',on?'Favorilerden çıkar':'Favorilere ekle');}});
    if(!$('mv-liste-k').hidden)favCiz();
    if(on&&navigator.vibrate)try{navigator.vibrate(15);}catch(_){}
  },true);
  // ---- ana liste + arama: kanun adı · madde no ("85", "tck 85") · madde başlıkları · madde metinleri ----
  var VURGU='',MT=[],MTN=0,MTH='';
  function isaretle(ham,q){
    var t=esc(ham);if(!q)return t;
    var V=[].concat.apply([],sorgu(q)).sort(function(a,b){return b.length-a.length;}),nt=norm(ham);
    if(!V.length||nt.length!==ham.length)return t;
    var out='',i=0;
    while(i<nt.length){var bul=-1,len=0;V.forEach(function(v){var j=nt.indexOf(v,i);if(j>=0&&(bul<0||j<bul||(j===bul&&v.length>len))){bul=j;len=v.length;}});
      if(bul<0)break;out+=esc(ham.slice(i,bul))+'<mark>'+esc(ham.slice(bul,bul+len))+'</mark>';i=bul+len;}
    return out+esc(ham.slice(i));
  }
  function kesit(m,q){   // eşleşmenin çevresinden kısa bir parça
    var V=[].concat.apply([],sorgu(q)),nt=norm(m.m),j=-1;
    V.forEach(function(v){var k=nt.indexOf(v);if(k>=0&&(j<0||k<j))j=k;});
    if(j<0)j=0;var b=Math.max(0,j-70),e=Math.min(m.m.length,j+130);
    while(b>0&&m.m[b-1]!==' '&&j-b<90)b--;
    return (b>0?'…':'')+isaretle(m.m.slice(b,e).replace(/\n/g,' '),q)+(e<m.m.length?'…':'');
  }
  // madde numarası araması: "85", "m. 85", "madde 85/a", "tck 85", "5237 85", "borçlar 49", "anayasa geçici 1"
  function noAyir(ham,l){
    var t=norm(ham).replace(/([^\d\s\/.,])(\d)/g,'$1 $2').replace(/[.,]/g,' ').split(/\s+/).filter(function(w){return w&&w!=='m'&&w!=='md'&&w!=='madde'&&w!=='maddesi';});
    if(!t.length)return null;var son=t[t.length-1];
    if(!/^\d{1,4}(\/[a-z0-9]{1,2})?$/.test(son))return null;
    t.pop();if(!t.length&&l.some(function(k){return k.no===son;}))return null;   // yalnız kanun numarası: kanunu bul
    var on='';
    if(t.length&&(t[t.length-1]==='gecici'||t[t.length-1]==='ek')){on=t.pop()==='ek'?'ek ':'gecici ';}
    var kn=null;
    if(t.length){var ks=t.join(' ');
      l.forEach(function(k){if(!kn&&(norm(k.kisa)===ks||k.no===ks))kn=k.no;});
      if(!kn){var S=sorgu(ks);l.forEach(function(k){if(!kn&&eslesir(norm(k.ad+' '+k.kisa),S))kn=k.no;});}
      if(!kn)return null;}
    return {kn:kn,n:on+son};
  }
  function bBtn(k,m,etk,alt,ara){return '<button type="button" class="mv-b" data-no="'+esc(k.no)+'" data-n="'+esc(m)+'"'+(ara?' data-q="'+esc(ara)+'"':'')+'><b>'+esc(k.kisa)+' '+etk+'</b><span>'+alt+'</span></button>';}
  function bBagla(el){[].forEach.call(el.querySelectorAll('.mv-b'),function(b){if(b.dataset.ok)return;b.dataset.ok=1;b.addEventListener('click',function(){ac(b.dataset.no,b.dataset.n,'',b.dataset.q||'');});});}
  function mtCiz(){
    var s=$('mv-tam-s'),o='';
    MT.slice(MTN,MTN+30).forEach(function(x){o+=bBtn(x[0],x[1].n,'m. '+esc(x[1].n),(x[1].b?'<i class="mv-bb">'+esc(x[1].b)+'</i>':'')+kesit(x[1],MTH),MTH);});
    MTN=Math.min(MT.length,MTN+30);
    var d=$('mv-mt-daha');if(d)d.remove();
    s.insertAdjacentHTML('beforeend',o+(MT.length>MTN?'<button type="button" class="mt-btn2" id="mv-mt-daha">'+(MT.length-MTN)+' madde daha göster</button>':''));
    bBagla(s);var dd=$('mv-mt-daha');if(dd)dd.addEventListener('click',mtCiz);
  }
  function listeCiz(){
    var ham=$('mv-ara').value.trim(),q=norm(ham),S=sorgu(ham),bs=$('mv-bsl'),ms=$('mv-tam-s');
    ms.innerHTML='';MT=[];MTN=0;favCiz();
    indeks().then(function(l){
      if(norm($('mv-ara').value.trim())!==q)return l;
      var no0=q?noAyir(ham,l):null;
      var tek=no0?(no0.kn?[no0.kn]:null):(q.length<3||l.some(function(k){return norm(k.kisa)===q||k.no===q;}))?[]:null;   // null: bütün kanunlar gerekli
      if(!q||(tek&&!tek.length))return l;
      return (tek?Promise.all(tek.map(function(x){return kanun(x).catch(function(){});})):hepsi()).then(function(){return l;});
    }).then(function(l){
      if(norm($('mv-ara').value.trim())!==q)return;
      var no=q?noAyir(ham,l):null,o='';
      if(!no)l.forEach(function(k){if(q&&!eslesir(norm(k.ad+' '+k.kisa+' '+k.no),S))return;
        o+=kart(k,esc(k.no)+' sayılı · '+(k.madde||'')+' madde · son kontrol '+tarih(k.kontrol));});
      $('mv-liste').innerHTML=o||(l.length?'':'<p class="mv-bos">Mevzuat henüz indirilmedi (yaklaşık 1 MB). İnternete bağlıyken bu sekmeyi bir kez aç.</p>');
      [].forEach.call(document.querySelectorAll('#mv-liste .mv-k'),function(b){b.addEventListener('click',function(){ac(b.dataset.no);});});
      if(no){   // madde numarasıyla arama
        var r='',c=0,nn=norm(no.n);
        l.forEach(function(k){if(no.kn&&k.no!==no.kn)return;var kk=KAN[k.no];if(!kk)return;
          kk.maddeler.forEach(function(m){if(norm(m.n)===nn||(nn.indexOf('/')<0&&norm(m.n).split(' (')[0]===nn)){c++;r+=bBtn(k,m.n,'m. '+esc(m.n),esc(m.b||m.m.slice(0,90)+'…'));}});});
        bs.hidden=false;bs.innerHTML='<p class="mv-etk">Madde '+esc(no.n.replace('gecici','Geçici').replace('ek ','Ek '))+(no.kn?'':' · bütün kanunlar')+'</p>'+(r||'<p class="mv-bos">Bu numarada madde bulunamadı.</p>');
        bBagla(bs);return;}
      if(q.length<3||l.some(function(k){return norm(k.kisa)===q||k.no===q;})){bs.hidden=true;bs.innerHTML='';return;}   // yalnız kanun adı/numarası: sadece kanun kartı
      // 1) madde başlıkları
      var gor={},n=0,ob='';
      basliklar().forEach(function(k){k.m.forEach(function(x){if(!eslesir(x[2],S))return;n++;if(x[3]!==1)gor[k.no+'|'+x[0]]=1;if(n>50)return;
        ob+='<button type="button" class="mv-b'+(x[3]===1?' blm':'')+'" data-no="'+esc(k.no)+'" data-n="'+esc(x[0])+'" data-q="'+esc(ham)+'"><b>'+esc(k.kisa)+(x[3]===1?' · bölüm':' m. '+esc(x[0]))+'</b><span>'+esc(x[1])+'</span></button>';});});
      bs.hidden=false;
      bs.innerHTML='<p class="mv-etk">Madde başlıklarında'+(n?' · '+n+' sonuç'+(n>50?' (ilk 50)':''):'')+'</p>'+(ob||'<p class="mv-bos">Başlığında “'+esc(ham)+'” geçen madde yok.</p>');
      bBagla(bs);
      // 2) madde metinleri (başlıkta çıkanlar hariç), kanun sırasıyla
      var say={};
      l.forEach(function(k){var kk=KAN[k.no];if(!kk)return;kk.maddeler.forEach(function(m){if(gor[k.no+'|'+m.n])return;if(eslesir(mz(m),S)){MT.push([k,m]);say[k.kisa]=(say[k.kisa]||0)+1;}});});
      if(q.indexOf(' ')>0){var tam=[],kal=[];MT.forEach(function(x){(mz(x[1]).indexOf(q)>=0?tam:kal).push(x);});MT=tam.concat(kal);}   // ifadenin tam geçtiği maddeler önce
      MTH=ham;
      var oz=Object.keys(say).map(function(x){return x+' '+say[x];}).join(' · ');
      ms.innerHTML='<p class="mv-etk">Madde metinlerinde'+(MT.length?' · '+MT.length+' madde':'')+'</p>'+(MT.length?'<p class="pm-kucuk mv-oz">'+esc(oz)+'</p>':'<p class="mv-bos">Madde metinlerinde de “'+esc(ham)+'” geçmiyor.</p>');
      if(MT.length)mtCiz();
    });
  }
  var az=null;$('mv-ara').addEventListener('input',function(){clearTimeout(az);az=setTimeout(listeCiz,250);});
  // ---- kanun ----
  function maddeHtml(m,q){
    var t=isaretle(m.m,q||VURGU);
    var f=akt&&favMi(akt.no,m.n);
    return '<article class="mv-m" id="mv-i-'+m.i+'"><h4>'+(akt?'<button type="button" class="mv-yildiz'+(f?' on':'')+'" data-no="'+esc(akt.no)+'" data-n="'+esc(m.n)+'" aria-label="'+(f?'Favorilerden çıkar':'Favorilere ekle')+'">'+(f?'★':'☆')+'</button>':'')+(akt?'<button type="button" class="mv-notb'+(notAl(akt.no,m.n)?' on':'')+'" data-no="'+esc(akt.no)+'" data-n="'+esc(m.n)+'" aria-label="Maddeye not yaz"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z"/><path d="m13 7 4 4"/></svg></button>':'')+'Madde '+esc(m.n)+(m.b?' <small>· '+esc(m.b)+'</small>':'')+'</h4><p>'+t+'</p>'+(akt?krHtml(akt.no,m.n):'')+notHtml(akt&&akt.no,m.n)+'</article>';
  }
  // ---- önemli kararlar (künye: kurul + E. + K. + tarih, iki kaynakla doğrulandı) ----
  var KARARLAR=[{"id": "ibk-1974-1", "kurul": "Yargıtay İçtihadı Birleştirme Büyük Genel Kurulu", "e": "1974/1", "k": "1974/2", "t": "01.04.1974", "rg": "", "konu": "Muris muvazaası (mirastan mal kaçırma)", "ozet": "Mirasbırakan, mirasçılarından mal kaçırmak için tapulu taşınmazını gerçekte bağışladığı hâlde satış gibi gösterirse görünürdeki satış muvazaalıdır; gizli bağış da resmî şekilde yapılmadığından geçersizdir. Saklı paylı olsun olmasın, miras hakkı zedelenen her mirasçı tapu iptali ve tescil isteyebilir.", "not": "", "kanun": "6098", "maddeler": ["19"]}, {"id": "ibk-2017-5", "kurul": "Yargıtay İçtihadı Birleştirme Büyük Genel Kurulu", "e": "2017/5", "k": "2018/7", "t": "06.07.2018", "rg": "08.12.2018", "konu": "Evli kişiyle birlikte olan üçüncü kişiye manevi tazminat", "ozet": "Eşlerden biriyle, evli olduğunu bilerek birlikte olan üçüncü kişiye karşı diğer eş, salt bu birliktelik nedeniyle manevi tazminat isteyemez. Sadakat yükümlülüğü yalnız eşleri bağlar; üçüncü kişinin ayrıca kişilik hakkına yönelik başka bir saldırısı yoksa haksız fiil oluşmaz.", "not": "Eşin kendisine karşı (boşanma davasında) tazminat istemi bu kararın konusu dışındadır.", "kanun": "6098", "maddeler": ["49", "58"]}, {"id": "ibk-1966-16", "kurul": "Yargıtay İçtihadı Birleştirme", "e": "1966/16", "k": "1967/7", "t": "13.12.1967", "rg": "", "konu": "Banka teminat mektubunun hukuki niteliği", "ozet": "Banka teminat mektubu kefalet değil, üçüncü kişinin fiilini üstlenme niteliğinde bağımsız bir garanti sözleşmesidir. Bankanın yükümlülüğü, lehtar ile muhatap arasındaki temel ilişkiden ayrı ve bağımsızdır.", "not": "Eski BK m. 110 dönemine ait; bugünkü karşılığı TBK m. 128.", "kanun": "6098", "maddeler": ["128"]}, {"id": "ibk-1987-2", "kurul": "Yargıtay İçtihadı Birleştirme", "e": "1987/2", "k": "1988/2", "t": "30.09.1988", "rg": "", "konu": "Şekle aykırı (harici) taşınmaz satışı ve tescil", "ozet": "Resmî şekle uyulmadan yapılan tapulu taşınmaz satışı geçersizdir; buna dayanan tescil davası kural olarak kabul edilmez. İstisna: kat mülkiyetine tabi olarak yapımına başlanan binadan bağımsız bölüm alan kişi bedeli ödeyip bölümü teslim almış ve satıcı devirden kaçınıyorsa, hâkim dürüstlük kuralını (TMK m. 2) gözeterek tescile karar verebilir.", "not": "", "kanun": "6098", "maddeler": ["12"]}, {"id": "ibk-1966-7", "kurul": "Yargıtay İçtihadı Birleştirme", "e": "1966/7", "k": "1966/7", "t": "22.06.1966", "rg": "", "konu": "Manevi tazminatın niteliği ve miktarı", "ozet": "Manevi tazminat ne bir ceza ne de gerçek anlamda bir tazminattır; zarar görende bir huzur ve tatmin duygusu doğurmayı amaçlar. Miktarını hâkim, olayın özel hal ve şartlarını gözeterek takdir eder.", "not": "Eski BK m. 47 dönemine ait; bugünkü karşılığı TBK m. 56. Bazı kaynaklarda tarih 26.06.1966 olarak geçer.", "kanun": "6098", "maddeler": ["56", "58"]}, {"id": "ibk-2017-8", "kurul": "Yargıtay İçtihadı Birleştirme Büyük Genel Kurulu", "e": "2017/8", "k": "2019/3", "t": "24.05.2019", "rg": "", "konu": "Kısmi davada ıslahla artırılan miktara faiz", "ozet": "Kısmi davada dava dilekçesinde faiz istenmişse, ıslahla artırılan miktar için ayrıca faiz istenmemiş olsa bile dilekçedeki faiz talebine bağlı olarak artırılan kısma da faize hükmedilir.", "not": "Usul (HMK) ile faiz hükümlerinin kesiştiği bir karar.", "kanun": "6098", "maddeler": ["120"]}, {"id": "ibk-2022-2", "kurul": "Yargıtay İçtihadı Birleştirme Büyük Genel Kurulu", "e": "2022/2", "k": "2025/1", "t": "21.03.2025", "rg": "17.07.2025 / 32958", "konu": "Tüketici kredisi talimatıyla emekli maaşına bloke", "ozet": "Tüketici kredisi nedeniyle verilen hapis, takas, mahsup ve benzeri onay ve rıza talimatlarına dayanarak banka emekli maaşına doğrudan bloke koyabilir. Karar üçüncü görüşmede oy çokluğuyla alındı.", "not": "", "kanun": "6098", "maddeler": ["139", "27"]}, {"id": "ycgk-2009-193", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2009/11-193", "k": "2009/268", "t": "17.11.2009", "rg": "", "konu": "İnternet bankacılığıyla başkasının hesabından para aktarma", "ozet": "Başkasının internet bankacılığı şifresini kullanarak hesabındaki parayı başka bir hesaba aktarmak, TCK m. 244/4 değil, bilişim sistemlerinin kullanılması suretiyle nitelikli hırsızlık (TCK m. 142/2-e) suçunu oluşturur.", "not": "Karar oy çokluğuyla verildi; sonraki Ceza Genel Kurulu kararlarında da aynı çizgi sürdürüldü.", "kanun": "5237", "maddeler": ["142", "244"]}, {"id": "ycgk-2017-1018", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2017/1018", "k": "2021/147", "t": "30.03.2021", "rg": "", "konu": "Tapu devri için cebir/tehdit: senedin yağması", "ozet": "Taşınmazın tapuda devrini sağlamak için cebir veya tehdit kullanmak, taşınmazın kendisinin yağması değil, senedin yağmasıdır (TCK m. 148/2). Somut olayda devir tapuda gerçekleşmediği ve sanıklar yalnızca dükkânları fiilen işgal ettiği için suç teşebbüs aşamasında kaldı.", "not": "", "kanun": "5237", "maddeler": ["148"]}, {"id": "ycgk-2015-709", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2015/6-709", "k": "2016/33", "t": "26.01.2016", "rg": "", "konu": "Yağmada yararlanma amacı", "ozet": "Yağma, cebir veya tehditle yapılan hırsızlıktır; hırsızlıktan farkı malın cebir ya da tehditle alınmasıdır, yararlanma amacı ise yine aranır. Mağdurun telefonunu yalnızca arama kayıtlarına bakmak için alıp kullanmadan geri veren sanığın eylemi yağma değil, silahla tehdit ve kasten yaralamadır.", "not": "", "kanun": "5237", "maddeler": ["148"]}, {"id": "ycgk-2021-43", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2021/43", "k": "2021/287", "t": "17.06.2021", "rg": "", "konu": "Avukatın tahsil ettiği parayı müvekkiline vermemesi", "ozet": "Avukatın müvekkili adına tahsil ettiği parayı ona vermeyip kendi malvarlığına katması zimmet değil, hizmet nedeniyle güveni kötüye kullanmadır (TCK m. 155/2). Avukat ile müvekkil arasındaki vekâlet ilişkisinde kamu gücü kullanılmadığından avukat bu eylem bakımından kamu görevlisi sayılmaz.", "not": "Bazı kaynaklarda esas numarası 2021/5-43 olarak geçer.", "kanun": "5237", "maddeler": ["155", "247"]}, {"id": "ycgk-2017-956", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2017/16.MD-956", "k": "2017/370", "t": "26.09.2017", "rg": "", "konu": "FETÖ/PDY'nin silahlı terör örgütü niteliği ve ByLock", "ozet": "Ceza Genel Kurulu, FETÖ/PDY'nin silahlı terör örgütü olduğunu kabul etti ve ByLock programının kullanılmasını örgüt bağlantısını gösteren bir delil olarak değerlendirdi. Silahlı örgüt üyeliği (TCK m. 314) uygulamasında en sık atıf yapılan kararlardandır.", "not": "Anayasa Mahkemesi kararlarında da bu karara atıf yapılır.", "kanun": "5237", "maddeler": ["314"]}, {"id": "ycgk-2012-1335", "kurul": "Yargıtay Ceza Genel Kurulu", "e": "2012/10-1335", "k": "2013/423", "t": "22.10.2013", "rg": "", "konu": "Uyuşturucu: kullanma amacı mı, ticaret mi?", "ozet": "Ceza Genel Kurulu, uyuşturucu bulundurmanın kullanma amacına yönelik olup olmadığının belirlenmesinde gözetilecek ölçütleri açıkladı: maddenin miktarı ve türü, ele geçirilme biçimi ve failin davranışları birlikte değerlendirilir. Farklı türde maddelerin bir arada bulundurulması kullanma değil ticaret amacına işaret edebilir.", "not": "", "kanun": "5237", "maddeler": ["188", "191"]}];
  function krHtml(no,n){
    var L=KARARLAR.filter(function(k){return k.kanun===String(no)&&k.maddeler.indexOf(String(n))>=0;});if(!L.length)return '';
    return '<details class="mv-kr"><summary><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7.5 20h9M5 7.5h14M12 4.6l-7 2.9M12 4.6l7 2.9"/><path d="M5 7.5 2.6 13a2.4 2.4 0 0 0 4.8 0zM19 7.5 16.6 13a2.4 2.4 0 0 0 4.8 0z"/></svg>Önemli kararlar <span>('+L.length+')</span></summary>'+L.map(function(k){
      return '<div class="mv-kr-i"><b>'+esc(k.konu)+'</b><small>'+esc(k.kurul)+' · T. '+esc(k.t)+' · E. '+esc(k.e)+', K. '+esc(k.k)+(k.rg?' · RG '+esc(k.rg):'')+'</small><p>'+esc(k.ozet)+'</p>'+(k.not?'<p class="mv-kr-not">'+esc(k.not)+'</p>':'')+'</div>';
    }).join('')+'<p class="mv-kr-alt">Tam metin: Yargıtay Karar Arama ya da UYAP Emsal’de “detaylı arama”ya kurul, Esas ve Karar numarasını yaz. İçtihadı birleştirme kararları Resmî Gazete’de de yayımlanır; eski kararlar için ders kitabı ya da kütüphanenin hukuk veri tabanı. Özetler Lex Odak’ındır, kararın resmî metni değildir.</p></details>';
  }
  function notHtml(no,n){var t=no?notAl(no,n):'';return t?'<div class="mv-not" data-no="'+esc(no)+'" data-n="'+esc(n)+'">'+esc(t)+'</div>':'';}
  function notAc(art,no,n){
    if(art.querySelector('.mv-not-d'))return;var v=art.querySelector('.mv-not');if(v)v.remove();
    art.insertAdjacentHTML('beforeend','<div class="mv-not-d"><textarea class="lex-in mv-not-t" placeholder="Bu maddeye notun: hocanın vurguladığı nokta, örnek olay, sınavda çıktı…" maxlength="4000"></textarea><div class="mv-not-a"><small>Otomatik kaydedilir · yalnız bu telefonda</small>'+(notAl(no,n)?'<button type="button" class="sil">Sil</button>':'')+'<button type="button" class="ok">Bitti</button></div></div>');
    var d=art.querySelector('.mv-not-d'),ta=d.querySelector('textarea'),z=null;ta.value=notAl(no,n);
    function kay(){notKoy(no,n,ta.value);var b=art.querySelector('.mv-notb');if(b)b.classList.toggle('on',!!ta.value.trim());}
    ta.addEventListener('input',function(){clearTimeout(z);z=setTimeout(kay,400);});
    function kapa(){clearTimeout(z);kay();d.remove();art.insertAdjacentHTML('beforeend',notHtml(no,n));}
    d.querySelector('.ok').addEventListener('click',kapa);
    var sl=d.querySelector('.sil');if(sl)sl.addEventListener('click',function(){if(!confirm('Bu not silinsin mi?'))return;ta.value='';kapa();});
    ta.focus();
  }
  $('pg-mevzuat').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.mv-notb, .mv-not');if(!b)return;e.preventDefault();e.stopPropagation();
    var art=b.closest('.mv-m');if(art)notAc(art,b.dataset.no,b.dataset.n);
  },true);
  function ayrac(m){return m.y?m.y.map(function(y){return '<div class="mv-y s'+y[0]+'">'+esc(y[1])+'</div>';}).join(''):'';}
  function ciz(q){
    var o='';goster.slice(bas,sinir).forEach(function(m){o+=(filtreli?'':ayrac(m))+maddeHtml(m,q);});
    $('mv-maddeler').innerHTML=o||'<p class="mv-bos">Eşleşen madde yok.</p>';
    $('mv-once').hidden=bas<=0;$('mv-daha').hidden=goster.length<=sinir;
  }
  function tumu(){goster=akt.maddeler;filtreli=false;bas=0;sinir=PARCA;}
  function filtre(){
    if(!akt)return;var q=$('mv-ic-ara').value.trim(),s=$('mv-sonuc');
    if(!q){tumu();s.hidden=true;ciz('');return;}
    if(/^\d+(\/[A-Za-z\d]+)?$/.test(q)){s.hidden=true;git(q);return;}
    var nq=norm(q);if(nq.length<2){tumu();ciz('');return;}
    var S=sorgu(q);goster=akt.maddeler.filter(function(m){return eslesir(mz(m),S);});filtreli=true;bas=0;sinir=60;
    s.hidden=false;s.textContent=goster.length+' maddede geçiyor'+(goster.length>60?' (ilk 60 gösteriliyor)':'');ciz(q);
  }
  var fz=null;$('mv-ic-ara').addEventListener('input',function(){clearTimeout(fz);fz=setTimeout(filtre,180);});
  $('mv-daha').addEventListener('click',function(){sinir+=PARCA;ciz(filtreli?$('mv-ic-ara').value.trim():'');});
  $('mv-once').addEventListener('click',function(){var ilk=goster[bas];bas=Math.max(0,bas-PARCA);ciz('');var el=ilk&&$('mv-i-'+ilk.i);if(el)el.scrollIntoView({block:'start'});});
  function gitI(i){
    tumu();bas=i;sinir=i+PARCA;ciz('');
    var el=$('mv-i-'+i);if(el){el.classList.add('hedef');setTimeout(function(){el.scrollIntoView({block:'start'});},30);setTimeout(function(){el.classList.remove('hedef');},2600);}
  }
  function git(n){
    if(!akt)return;var i=-1,a=String(n).toLowerCase(),ana=a.split('/')[0];
    akt.maddeler.forEach(function(m,k){if(i<0&&String(m.n).toLowerCase()===a)i=k;});
    if(i<0)akt.maddeler.forEach(function(m,k){if(i<0&&String(m.n)===ana)i=k;});
    if(i<0){$('mv-sonuc').hidden=false;$('mv-sonuc').textContent='Madde '+n+' bulunamadı.';return;}
    gitI(i);
  }
  // ---- içindekiler ----
  function icnKapat(){$('mv-icn-p').hidden=true;$('mv-icn').setAttribute('aria-expanded','false');}
  function icnKur(){
    var o='';akt.maddeler.forEach(function(m){if(m.y)m.y.forEach(function(y){o+='<button type="button" class="mv-ic s'+y[0]+'" data-i="'+m.i+'">'+esc(y[1])+' <small>· m. '+esc(m.n)+'</small></button>';});});
    $('mv-icn').hidden=!o;$('mv-icn-p').innerHTML=o;icnKapat();
    [].forEach.call(document.querySelectorAll('#mv-icn-p .mv-ic'),function(b){b.addEventListener('click',function(){icnKapat();if(window.LEX_GERI)LEX_GERI.dus('icn');$('mv-ic-ara').value='';$('mv-sonuc').hidden=true;gitI(+b.dataset.i);});});
  }
  $('mv-icn').addEventListener('click',function(){var p=$('mv-icn-p'),ac_=p.hidden;p.hidden=!ac_;this.setAttribute('aria-expanded',ac_?'true':'false');if(ac_){window.scrollTo(0,0);if(window.LEX_GERI)LEX_GERI.ekle('icn',icnKapat);}else if(window.LEX_GERI)LEX_GERI.dus('icn');});
  var DIS=false,DISY=0,GERIDE=false;
  function kapatK(){akt=null;VURGU='';favCiz();icnKapat();$('mv-kanun-k').hidden=true;$('mv-arac').hidden=true;$('mv-liste-k').hidden=false;}
  function ac(no,madde,ara,vurgu){
    if(window.LEX_GERI&&!GERIDE){var oy=DIS?DISY:window.scrollY,sk=DIS;
      if(sk)LEX_GERI.ekle('mvdis',function(){kapatK();if(window.MF_SAYFA)window.MF_SAYFA(sk);var sy=function(){window.scrollTo({top:oy,behavior:'instant'});};setTimeout(sy,30);setTimeout(sy,200);});
      else if(LEX_GERI.ust()!=='mv'&&LEX_GERI.ust()!=='mvdis')LEX_GERI.ekle('mv',function(){kapatK();setTimeout(function(){window.scrollTo(0,oy);},40);});}
    VURGU=vurgu||'';
    $('mv-liste-k').hidden=true;$('mv-kanun-k').hidden=false;$('mv-arac').hidden=false;$('mv-icn').hidden=true;$('mv-icn-p').hidden=true;$('mv-once').hidden=true;$('mv-daha').hidden=true;
    $('mv-ad').textContent='';$('mv-alt').textContent='';$('mv-maddeler').innerHTML='<p class="mv-bos">Yükleniyor…</p>';$('mv-ic-ara').value='';$('mv-sonuc').hidden=true;
    kanun(no).then(function(k){akt=k;
      $('mv-ad').innerHTML=(anayasa(k)?'<i class="mv-bayrak k" role="img" aria-label="Türk Bayrağı">'+BAYRAK+'</i>':'')+esc(adYaz(k));$('mv-alt').innerHTML=esc(k.no)+' sayılı · son kontrol '+tarih(k.kontrol)+' · <a href="'+resmi(k)+'" target="_blank" rel="noopener">resmî metin ↗</a>';
      icnKur();tumu();
      if(ara){$('mv-ic-ara').value=ara;filtre();window.scrollTo(0,0);}
      else if(madde)git(madde);
      else{ciz('');window.scrollTo(0,0);}
    }).catch(function(){akt=null;$('mv-maddeler').innerHTML='<p class="mv-bos">Bu kanun henüz indirilmedi. Mevzuat bir kez indirildikten sonra internetsiz açılır; internete bağlıyken yeniden dene.</p>';});
  }
  $('mv-geri').addEventListener('click',function(){if(window.LEX_GERI&&LEX_GERI.ust()==='mv'){history.back();return;}kapatK();window.scrollTo(0,0);});
  // ---- sayaç şeridi ----
  var sT=null;
  function serit(){
    var b=$('mv-sayac'),d=null;try{d=JSON.parse(localStorage.getItem('pm-durum')||'null');}catch(e){}
    if(!d||!d.calisiyor||!d.bitis||!document.body.classList.contains('s-mevzuat')){b.hidden=true;return;}
    var k=Math.max(0,d.bitis-Date.now()),s=Math.ceil(k/1000),m=Math.floor(s/60);s%=60;
    var ad=d.mod==='odak'?(d.ders||'Odak'):d.mod==='deneme'?'HMGS':'Mola';
    b.hidden=false;b.innerHTML='<span><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.4 1.6M10 2.8h4M12 2.8v2.7"/></svg>'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s+' · '+esc(ad)+'</span><small>Çalışmaya dön ›</small>';
  }
  $('mv-sayac').addEventListener('click',function(){if(window.MF_SAYFA)window.MF_SAYFA('sayac');});
  window.LEX_MV=function(){if($('mv-kanun-k').hidden)listeCiz();serit();clearInterval(sT);sT=setInterval(function(){if(!document.body.classList.contains('s-mevzuat')){clearInterval(sT);return;}serit();},1000);};
  window.LEX_MV_AC=function(no,madde){var s=window.LEX_SEKME?window.LEX_SEKME():'mevzuat';DIS=s!=='mevzuat'?s:false;DISY=window.scrollY;if(window.MF_SAYFA)window.MF_SAYFA('mevzuat');ac(String(no),madde?String(madde):'');DIS=false;};
  function maddeBul(k,n){var a=String(n).toLowerCase(),ana=a.split('/')[0],r=null;
    k.maddeler.forEach(function(m){if(!r&&String(m.n).toLowerCase()===a)r=m;});
    if(!r)k.maddeler.forEach(function(m){if(!r&&String(m.n)===ana)r=m;});return r;}
  window.LEX_MV_MADDE=function(no,n){return kanun(String(no)).then(function(k){var m=maddeBul(k,n);return {kisa:k.kisa,ad:adYaz(k),no:k.no,m:m};});};
  window.LEX_MV_YAN=function(no,n){DIS=false;ac(String(no),n?String(n):'');};
  window.LEX_MV_INDEKS=function(){return indeks();};   // dizin listesi: [{no,ad,kisa,madde(adet)}]
  window.LEX_MV_VAR=function(cb){indeks().then(function(l){var s={};l.forEach(function(k){s[k.no]=1;});cb(s);});};
  if(location.hash==='#mevzuat'&&window.MF_SAYFA)window.MF_SAYFA('mevzuat');
})();
