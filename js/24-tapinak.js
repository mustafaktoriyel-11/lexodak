/* Tapınak: Hukukçunun Ufku'nun sonundaki tapınağın içi.
   Ana salon (7 kapı) + 5 Roma hukuku odası + sınav salonu. İçerik veri/tapinak.json.
   Görsel 2431x1512 (tasarım uzayı 1600x995); tıklama alanları görselin yüzdesi olarak tanımlıdır (görselle birlikte ölçeklenir).
   Geri tuşu: oda > ana salon > kapanış (LEX_GERI: 'tpn-oda', 'tpn'). */
(function(){
  'use strict';
  var K='lex-tapinak',IW=1600,IH=995,SORU_N=10;
  var D=null,el=null,oda=null,tok=0,kartAc=null,sinav=null,odak0=null,kapaniyor=false,onk=[],SW=0,SH=0,cw=0,ch=0,sc=1,z=1,px=0,py=0,anim=null,ZMAX=4;
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function az(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  function bul(s){return el&&el.querySelector(s);}
  /* ---- gezilenler ---- */
  function oku(){try{var r=JSON.parse(localStorage.getItem(K)||'null');if(r&&r.v===1&&r.g)return r;}catch(e){}return {v:1,g:{},o:{},s:0};}
  function yaz(r){try{localStorage.setItem(K,JSON.stringify(r));}catch(e){}}
  function odaGezildi(id){var r=oku();if(!r.o[id]){r.o[id]=1;yaz(r);}}
  function eserGordu(id,e){var r=oku();(r.g[id]=r.g[id]||[]);if(r.g[id].indexOf(e)<0){r.g[id].push(e);yaz(r);}}
  function eserVar(id,e){var r=oku();return (r.g[id]||[]).indexOf(e)>=0;}
  function odaSay(){var r=oku(),n=0;Object.keys(D.odalar).forEach(function(k){if(k!=='ana'&&r.o[k])n++;});return n;}
  function veri(){
    if(D)return Promise.resolve(D);
    var p=window.LEX_VERI?window.LEX_VERI('tapinak'):fetch('veri/tapinak.json').then(function(r){if(!r.ok)throw 0;return r.json();});
    return p.then(function(d){D=d;return d;});
  }
  /* ---- geri yığını ---- */
  function geriEkle(k,fn){if(window.LEX_GERI)LEX_GERI.ekle(k,fn);}
  function geriDus(k){if(window.LEX_GERI)LEX_GERI.dus(k);}
  /* ---- yazıtlar: levha ve kitaplara perspektifle oturtulmuş gerçek Latince metinler ----
     Her yazıt, görsel pikselindeki 4 köşesine matrix3d (homografi) ile eşlenen sabit boyutlu (YW genişlik) bir kutudur.
     Katman, tıklama alanlarıyla aynı kutuda (.tp-kutu) durur; olc() katmanı görselle birlikte ölçekler. */
  var YW=400;
  function homog(k,w,h){ /* (0,0),(w,0),(w,h),(0,h) -> k[0..3]; CSS matrix3d dizgesi */
    var S=[[0,0],[w,0],[w,h],[0,h]],A=[],B=[],i,j,m;
    for(i=0;i<4;i++){var x=S[i][0],y=S[i][1],X=k[i][0],Y=k[i][1];
      A.push([x,y,1,0,0,0,-X*x,-X*y]);B.push(X);A.push([0,0,0,x,y,1,-Y*x,-Y*y]);B.push(Y);}
    for(i=0;i<8;i++){var p=i;for(j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;
      m=A[i];A[i]=A[p];A[p]=m;m=B[i];B[i]=B[p];B[p]=m;
      for(j=i+1;j<8;j++){var f=A[j][i]/A[i][i];for(var c=i;c<8;c++)A[j][c]-=f*A[i][c];B[j]-=f*B[i];}}
    var q=[];for(i=7;i>=0;i--){var t=B[i];for(j=i+1;j<8;j++)t-=A[i][j]*q[7-j];q[7-i]=t/A[i][i];}
    q=q.reverse();
    return 'matrix3d('+[q[0],q[3],0,q[6],q[1],q[4],0,q[7],0,0,1,0,q[2],q[5],0,1].map(function(v){return +v.toFixed(7);}).join(',')+')';}
  function uz(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
  function yzSekil(y){ /* tunç levha: klasik Roma büyük harfleri, U yerine V */
    return y.stil==='tunc'?y.la.toUpperCase().replace(/U/g,'V'):y.la;}
  function yzIc(b,y){ /* yazıtın tıklama alanı (eser kutusu) içinde mi? */
    var cx=0,cy=0;y.kose.forEach(function(p){cx+=p[0]/4;cy+=p[1]/4;});
    return cx>=b.x/100*IW&&cx<=(b.x+b.w)/100*IW&&cy>=b.y/100*IH&&cy<=(b.y+b.h)/100*IH;}
  function yzEsle(r){ /* her yazıt, üstüne düştüğü eserin kartına bağlanır; hiçbirine düşmezse kendi dokunma alanı olur */
    (r.eserler||[]).forEach(function(e){e.__y=[];});
    (r.yazitlar||[]).forEach(function(y){y.__e=null;
      (r.eserler||[]).some(function(e){if(yzIc(e,y)){e.__y.push(y);y.__e=e;return true;}return false;});});}
  function yzHtml(r){
    var Y=r.yazitlar||[];if(!Y.length)return '';
    var h='<div class="tp-yl" aria-hidden="true">';
    Y.forEach(function(y,i){
      var k=y.kose,w=YW,hh=Math.round(YW*((uz(k[0],k[3])+uz(k[1],k[2]))/2)/((uz(k[0],k[1])+uz(k[3],k[2]))/2));
      var d=y.dolgu||['#c27335','#a25634'];
      var tag=y.__e?'div':'button type="button"',son=y.__e?'div':'button';
      h+='<'+tag+' class="tp-yz tp-yz-'+esc(y.stil)+(y.__e?'':' tp-yz-b')+'" data-yi="'+i+'" style="width:'+w+'px;height:'+hh+'px;transform:'+homog(k,w,hh)+';background:linear-gradient(135deg,'+d[0]+','+d[1]+')"'+(y.__e?'':' aria-label="'+esc('Yazıt: '+y.kaynak+' (kartı aç)')+'"')+'><span class="tp-yt" lang="la">'+esc(yzSekil(y))+'</span></'+son+'>';});
    return h+'</div>';}
  function yzSigdir(){ /* metni kutuyu ~%80-90 dolduracak en büyük punto ile yerleştir (tasarım uzayında, ölçekten bağımsız) */
    [].forEach.call(el.querySelectorAll('.tp-yz'),function(z){
      var t=z.querySelector('.tp-yt'),cs=getComputedStyle(z),
        ih=z.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom),lo=3,hi=Math.min(110,ih),m;
      for(var n=0;n<14;n++){m=(lo+hi)/2;t.style.fontSize=m+'px';
        if(t.offsetHeight<=ih&&t.scrollWidth<=t.clientWidth+1)lo=m;else hi=m;}
      t.style.fontSize=lo+'px';});}
  function yzKart(es){
    if(!es||!es.length)return '';
    return es.map(function(y){return '<section class="tp-yk" aria-label="Latince yazıt"><p class="tp-yk-la" lang="la">'+esc(y.la)+'</p><p class="tp-yk-tr">'+esc(y.tr)+'</p><small class="tp-yk-k">Kaynak: '+esc(y.kaynak)+'</small></section>';}).join('');}
  function yzGit(es){var b=yzBirlesik(es);if(!b)return '';return '<button type="button" class="tp-btn2 tp-yz-git" data-b="'+b.map(Math.round).join(',')+'">Yazıta yakınlaş</button>';}
  /* ---- görünüm ---- */
  var UY={t:'Gelenek / tartışmalı: tarihler ve ayrıntılar kaynağa göre değişebilir.',y:'Tarih ve ayrıntılar kaynağa göre değişebilir; ders kitabınla karşılaştır.'};
  function liste(r){var L=[];
    if(r.kapilar)r.kapilar.forEach(function(k){L.push({t:'kapi',k:k,ad:k.ad,aria:k.kilit?'Tören salonu, kilitli. Yalnızca dönüşüm törenlerinde açılır':k.ad+' kapısı. '+k.ip});});
    if(r.sinav)L.push({t:'sinav',k:r.sinav,ad:r.sinav.ad,aria:'Kum saati: sınavı başlat'});
    yzEsle(r);
    (r.eserler||[]).forEach(function(e){L.push({t:'eser',k:e,ad:e.ad,aria:e.ad+' (eser kartını aç'+(e.__y&&e.__y.length?', Latince yazıt içerir':'')+')'});});
    return L;}
  function gor(id,L){return L.t==='kapi'?!L.k.kilit&&!!oku().o[L.k.hedef]:L.t==='eser'?eserVar(id,L.k.id):L.t==='sinav'?!!oku().s:false;}
  /* ---- yakınlaştırma modeli: .tp-kutu, sahne içinde translate(px,py) scale(z) ile konumlanır (z: 1..ZMAX).
     1x'te davranış eskisiyle aynıdır: telefon dikeyde görsel boyu, yatayda kaydırma; masaüstünde sığdırma (contain). ---- */
  function kisit(z1,x,y){var w=cw*z1,h=ch*z1;
    return [w<=SW+.5?(SW-w)/2:Math.min(0,Math.max(SW-w,x)),h<=SH+.5?(SH-h)/2:Math.min(0,Math.max(SH-h,y))];}
  function sinirla(){var r=kisit(z,px,py);px=r[0];py=r[1];}
  function uygula(){
    var k=bul('.tp-kutu'),s=bul('.tp-sahne');if(!k)return;
    k.style.transform='translate('+px.toFixed(2)+'px,'+py.toFixed(2)+'px) scale('+z.toFixed(4)+')';
    k.style.setProperty('--iz',(1/z).toFixed(4));
    if(s)s.classList.toggle('zm',z>1.001);
    var zk=bul('.tp-zk');if(zk)zk.classList.toggle('z1',z<=1.001);
    if(P25)derinUyan();}
  function olc(){
    var s=bul('.tp-sahne'),k=bul('.tp-kutu');if(!s||!k)return;
    var W=s.clientWidth,H=s.clientHeight;if(!W||!H)return;
    var u=.5,v=.5;
    if(cw>0&&SW>0){u=(SW/2-px)/(cw*z);v=(SH/2-py)/(ch*z);}else z=1;
    sc=W<H?H/IH:Math.min(W/IW,H/IH);
    cw=IW*sc;ch=IH*sc;k.style.width=cw+'px';k.style.height=ch+'px';
    var yl=k.querySelector('.tp-yl');if(yl)yl.style.transform='scale('+sc+')';
    SW=W;SH=H;
    px=W/2-u*cw*z;py=H/2-v*ch*z;sinirla();uygula();}
  function animIptal(){if(anim){cancelAnimationFrame(anim);anim=null;}}
  function git(z1,x1,y1,hizli){ /* hedef durum (z1,x1,y1): ≈300ms yumuşak geçiş; azaltılmış harekette anında */
    animIptal();
    var z0=z,x0=px,y0=py,t0=0,d=hizli||az()?0:300,r=kisit(z1,x1,y1);x1=r[0];y1=r[1];
    if(!d){z=z1;px=x1;py=y1;uygula();return;}
    function f(t){if(!t0)t0=t;var u=Math.min(1,(t-t0)/d),e=1-Math.pow(1-u,3);
      z=z0+(z1-z0)*e;px=x0+(x1-x0)*e;py=y0+(y1-y0)*e;if(u>=1){z=z1;px=x1;py=y1;}else sinirla();uygula();
      anim=u<1?requestAnimationFrame(f):null;}
    anim=requestAnimationFrame(f);}
  function zoomNokta(z1,mx,my,anlik){ /* (mx,my) sahne noktası sabit kalacak şekilde z1'e */
    z1=Math.min(ZMAX,Math.max(1,z1));var q=z1/z;
    if(anlik){animIptal();px=mx-(mx-px)*q;py=my-(my-py)*q;z=z1;sinirla();uygula();return;}
    git(z1,mx-(mx-px)*q,my-(my-py)*q);}
  function kutuyaGit(bx,by,bw,bh){ /* tasarım uzayındaki (1600x995) kutuyu görünümün ~%80'ini dolduracak şekilde ortala; en çok 4x */
    var z1=Math.min(ZMAX,Math.max(1.5,Math.min(.8*SW/(bw*sc),.8*SH/(bh*sc))));
    git(z1,SW/2-(bx+bw/2)*sc*z1,SH/2-(by+bh/2)*sc*z1);}
  function kutuBox(k){var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;k.forEach(function(p){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);});return [x0,y0,x1-x0,y1-y0];}
  function yzBirlesik(es){var b=null;(es||[]).forEach(function(y){var q=kutuBox(y.kose);if(!b)b=q;else{var x0=Math.min(b[0],q[0]),y0=Math.min(b[1],q[1]),x1=Math.max(b[0]+b[2],q[0]+q[2]),y1=Math.max(b[1]+b[3],q[1]+q[3]);b=[x0,y0,x1-x0,y1-y0];}});return b;}
  function nesneBul(x,y){ /* dokunulan noktanın yakınındaki yazıt, yoksa eser/kapı kutusu (tasarım uzayı) */
    var r=D.odalar[oda],T=24,best=null,bd=1e9;
    function dene(b){if(x>=b[0]-T&&x<=b[0]+b[2]+T&&y>=b[1]-T&&y<=b[1]+b[3]+T){var d=Math.hypot(x-(b[0]+b[2]/2),y-(b[1]+b[3]/2));if(d<bd){bd=d;best=b;}}}
    (r.yazitlar||[]).forEach(function(q){dene(kutuBox(q.kose));});
    if(best)return best;
    [].concat(r.kapilar||[],r.eserler||[],r.sinav?[r.sinav]:[]).forEach(function(o){dene([o.x/100*IW,o.y/100*IH,o.w/100*IW,o.h/100*IH]);});
    return best;}
  function sigdir(){git(1,(SW-cw)/2,(SH-ch)/2);}
  function ciftTap(mx,my){
    if(z>1.05){sigdir();return;}
    var cx=(mx-px)/z/sc,cy=(my-py)/z/sc,b=nesneBul(cx,cy);
    if(b){kutuyaGit(b[0],b[1],b[2],b[3]);return;}
    git(2.5,SW/2-cx*sc*2.5,SH/2-cy*sc*2.5);}
  /* ---- ayrıntı katmanı: odanın detay vektörü (SVG), tek sefer indirilip önbelleğe alınır; satır içi eklenir (alevler sonra canlandırılabilsin) ---- */
  var DT={};
  function detayYukle(src){
    if(!src)return Promise.resolve('');
    if(DT[src])return Promise.resolve(DT[src]);
    return fetch(src).then(function(r){if(!r.ok)throw 0;return r.text();}).then(function(t){
      if(t.indexOf('<svg')<0)return '';DT[src]=t;return t;},function(){return '';});}
  function resimYukle(src){return new Promise(function(ok,hata){
    var im=new Image();im.decoding='async';im.onerror=function(){hata();};
    im.onload=function(){(im.decode?im.decode().catch(function(){}):Promise.resolve()).then(function(){ok(im);});};
    im.src=src;});}
  function goster(id,kayit){
    var r=D.odalar[id],t=++tok;if(!r||!el)return Promise.resolve();
    el.classList.add('yuk');
    return Promise.all([resimYukle(r.img),detayYukle(r.detay)]).then(function(ar){
      var im=ar[0],dt=ar[1];
      if(t!==tok||!el)return;
      kartKapat(true);sinavKapat(true);
      oda=id;
      var L=liste(r),h='';
      L.forEach(function(x,i){var b=x.k,cls='tp-hs tp-'+(x.t==='eser'?'eser':'kapi')+(x.t==='eser'&&b.__y&&b.__y.length?' tp-hs-y':'')+(x.t==='kapi'&&b.kilit?' kilit':'')+(gor(id,x)?' gor':'');
        h+='<button type="button" class="'+cls+'" data-i="'+i+'" style="left:'+b.x+'%;top:'+b.y+'%;width:'+b.w+'%;height:'+b.h+'%" aria-label="'+esc(x.aria)+'"'+(x.t==='kapi'&&b.kilit?' aria-disabled="true"':'')+'><i class="tp-ring" aria-hidden="true"></i><span class="tp-et" aria-hidden="true">'+esc(x.ad)+'</span></button>';});
      derinDurdur();
      var s=bul('.tp-sahne'),eski=s.querySelector('.tp-kutu');if(eski)s.removeChild(eski);
      s.insertAdjacentHTML('afterbegin','<div class="tp-kutu"><img src="'+esc(r.img)+'" alt="" draggable="false">'+(dt?'<div class="tp-dt" aria-hidden="true">'+dt+'</div>':'')+yzHtml(r)+h+'</div>');
      s.setAttribute('aria-label',r.ad+(id==='ana'?'. Kapılara dokunarak odalara gir.':'. Eserlere dokun ya da aşağıdaki listeyi kullan.'));
      var k=bul('.tp-kutu');k.className='tp-kutu tp-gir';
      SW=0;cw=0;olc();yzSigdir();
      bul('.tp-bas b').textContent=r.ad;
      var sm=bul('.tp-bas small'),yk=cw>bul('.tp-sahne').clientWidth+2;sm.textContent=id==='ana'?odaSay()+'/'+(Object.keys(D.odalar).length-1)+' oda gezildi'+(yk?' · yana kaydır':''):r.giris;
      bul('.tp-geri').hidden=id==='ana';
      var C=bul('.tp-chip'),c='';
      if(id!=='ana')c+='<button type="button" class="tp-ch tp-ch-g" data-g="1">‹ Ana salon</button>';
      L.forEach(function(x,i){c+='<button type="button" class="tp-ch'+(gor(id,x)?' gor':'')+(x.t==='kapi'&&x.k.kilit?' kilit':'')+(x.t==='sinav'?' sin':'')+'" data-i="'+i+'" aria-label="'+esc(x.aria)+'"><span class="tp-ck" aria-hidden="true">✓</span>'+esc(x.t==='kapi'&&x.k.kilit?'Tören salonu':x.ad)+'</button>';});
      C.innerHTML=c;C.scrollLeft=0;
      el.classList.remove('yuk');
      el.__L=L;
      if(id==='ana')derinBaslat(t);
      if(id!=='ana')odaGezildi(id);
      if(kayit&&im&&!window.__tpOn){window.__tpOn=1;onYukle();}
      return true;
    },function(){if(t!==tok)return;if(el)el.classList.remove('yuk');if(window.MF_TOAST)MF_TOAST('Oda yüklenemedi, bağlantını kontrol et.');throw 0;});
  }
  function onYukle(){try{if(navigator.connection&&navigator.connection.saveData)return;}catch(e){}
    setTimeout(function(){Object.keys(D.odalar).forEach(function(k){var i=new Image();i.src=D.odalar[k].img;});},1500);}
  /* ---- etkileşim ---- */
  function sars(b){if(az())return;[b,bul('.tp-kutu')].forEach(function(e){if(!e)return;e.classList.remove('tp-sars');void e.offsetWidth;e.classList.add('tp-sars');setTimeout(function(){e.classList.remove('tp-sars');},520);});}
  function etkin(i,tetik){
    var L=el&&el.__L&&el.__L[i];if(!L)return;
    if(L.t==='kapi'){
      if(derinYuru(L,tetik))return;
      if(L.k.kilit){sars(tetik);if(window.MF_TOAST)MF_TOAST(L.k.not||'Bu salon yalnızca dönüşüm törenlerinde açılır.');return;}
      odaAc(L.k.hedef);return;}
    if(L.t==='sinav'){sinavBasla(tetik);return;}
    kartAc_(oda,L.k,tetik);
  }
  var odaBek=false;
  function odaAc(id){
    if(!D.odalar[id]||oda!=='ana')return;
    if(odaBek)return;odaBek=true; /* yükleme sürerken çift dokunuş ikinci kayıt itmesin */
    goster(id).then(function(ok){odaBek=false;if(ok&&el&&oda===id)geriEkle('tpn-oda',function(){if(el)goster('ana').catch(function(){});});}).catch(function(){odaBek=false;});
  }
  function anaSalon(){ /* arayüz düğmesi: önce ekranı değiştir, sonra geçmiş kaydını düşür */
    if(!el||oda==='ana')return;
    goster('ana').then(function(ok){if(ok)geriDus('tpn-oda');},function(){});
  }
  function panGit(i,fn){
    var h=bul('.tp-hs[data-i="'+i+'"]');
    if(!h||!bul('.tp-sahne')){fn();return;}
    var cx=(parseFloat(h.style.left)+parseFloat(h.style.width)/2)/100*IW,cy=(parseFloat(h.style.top)+parseFloat(h.style.height)/2)/100*IH,
      r=kisit(z,SW/2-cx*sc*z,SH/2-cy*sc*z),mv=Math.abs(r[0]-px)>2||Math.abs(r[1]-py)>2;
    git(z,r[0],r[1]);
    h.classList.add('onay');setTimeout(function(){h.classList.remove('onay');},1200);
    setTimeout(function(){fn(h);},az()||!mv?0:380);
  }
  /* ---- eser kartı ve sınav (alttan pencere) ---- */
  function pencere(html,cls){
    var o=bul('.tp-ort');o.className='tp-ort '+(cls||'');o.hidden=false;
    o.querySelector('.tp-kart').innerHTML=html;
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(o)o.classList.add('gor');});});
    return o;}
  function kartKapat(hizli){
    var o=bul('.tp-ort');if(!o||o.hidden)return;
    var b=kartAc;kartAc=null;o.classList.remove('gor');
    if(hizli){o.hidden=true;o.querySelector('.tp-kart').innerHTML='';}
    else setTimeout(function(){if(!kartAc&&!sinav){o.hidden=true;o.querySelector('.tp-kart').innerHTML='';}},260);
    if(b&&b.isConnected)try{b.focus();}catch(e){}
  }
  function kartAc_(id,e,tetik){
    kartAc=tetik||null;eserGordu(id,e.id);
    var u='';if(e.uyari&&e.uyari.length)u='<p class="tp-uyari">'+esc(e.uyari.indexOf('t')>=0?UY.t:UY.y)+'</p>';
    var tr='';if(e.terimler&&e.terimler.length){tr='<h4>Latince terimler</h4><ul class="tp-terim">'+e.terimler.map(function(t){return '<li><b lang="la">'+esc(t[0])+'</b> '+esc(t[1])+'</li>';}).join('')+'</ul>';}
    pencere('<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">'+esc(D.odalar[id].ad)+'</span><h3 id="tp-kb">'+esc(e.ad)+'</h3></div><button type="button" class="tp-kx" aria-label="Kartı kapat">×</button></div>'+yzKart(e.__y)+yzGit(e.__y)+'<p class="tp-km">'+esc(e.metin)+'</p>'+u+tr);
    var o=bul('.tp-ort');o.querySelector('.tp-kart').setAttribute('aria-labelledby','tp-kb');
    var h=el.querySelector('.tp-hs[data-i="'+(el.__L||[]).findIndex(function(x){return x.k===e;})+'"]');
    if(h)h.classList.add('gor');
    var c=el.querySelector('.tp-ch[data-i="'+(el.__L||[]).findIndex(function(x){return x.k===e;})+'"]');if(c)c.classList.add('gor');
    o.querySelector('.tp-kx').focus();
  }
  function yazitKart(i,tetik){ /* eserin üstüne düşmeyen yazıt: yalnızca yazıt kartı */
    var y=D.odalar[oda].yazitlar[i];if(!y)return;kartAc=tetik||null;
    pencere('<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">'+esc(D.odalar[oda].ad)+'</span><h3 id="tp-kb">Latince yazıt</h3></div><button type="button" class="tp-kx" aria-label="Kartı kapat">×</button></div>'+yzKart([y])+yzGit([y]));
    var o=bul('.tp-ort');o.querySelector('.tp-kart').setAttribute('aria-labelledby','tp-kb');o.querySelector('.tp-kx').focus();
  }
  function sinavKapat(hizli){if(!sinav)return;sinav=null;kartKapat(hizli);}
  /* sınav: tüm odaların sorularından 10 soru, şıklar karışık */
  function kar(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function sinavBasla(tetik){
    var H=[];Object.keys(D.odalar).forEach(function(k){(D.odalar[k].sorular||[]).forEach(function(q){H.push({s:q.s,o:q.o,c:q.c,a:q.a,od:D.odalar[k].ad});});});
    if(!H.length)return;
    var Q=kar(H).slice(0,Math.min(SORU_N,H.length)).map(function(q){var ix=kar(q.o.map(function(_,i){return i;}));return {s:q.s,od:q.od,a:q.a,o:ix.map(function(i){return q.o[i];}),c:ix.indexOf(q.c)};});
    sinav={Q:Q,i:0,p:0};kartAc=tetik||null;soruGoster();
  }
  function soruGoster(){
    var S=sinav,q=S.Q[S.i],h='<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">Sınav · Soru '+(S.i+1)+'/'+S.Q.length+'</span><h3 id="tp-kb">'+esc(q.s)+'</h3></div><button type="button" class="tp-kx" aria-label="Sınavı kapat">×</button></div>';
    h+='<div class="tp-pr" aria-hidden="true"><i style="width:'+(S.i/S.Q.length*100)+'%"></i></div><div class="tp-sec" role="group" aria-labelledby="tp-kb">';
    q.o.forEach(function(o,i){h+='<button type="button" class="tp-so" data-i="'+i+'"><b>'+'ABCD'.charAt(i)+'</b><span>'+esc(o)+'</span></button>';});
    h+='</div><div class="tp-gb" role="status" aria-live="polite"></div>';
    var o=pencere(h,'sinav');o.querySelector('.tp-kart').setAttribute('aria-labelledby','tp-kb');
    var f=o.querySelector('.tp-so');if(f)f.focus();
  }
  function cevap(i){
    var S=sinav,q=S.Q[S.i],o=bul('.tp-ort'),dg=i===q.c;
    if(o.querySelector('.tp-so.k'))return;
    if(dg)S.p++;
    [].forEach.call(o.querySelectorAll('.tp-so'),function(b,k){b.classList.add('k');b.disabled=true;if(k===q.c)b.classList.add('dogru');else if(k===i)b.classList.add('yanlis');});
    var son=S.i>=S.Q.length-1;
    var g=o.querySelector('.tp-gb');
    g.innerHTML='<p class="'+(dg?'d':'y')+'"><b>'+(dg?'Doğru.':'Yanlış.')+'</b> '+esc(q.a)+'</p><small>'+esc(q.od)+'</small><button type="button" class="tp-btn tp-sonra">'+(son?'Sonucu gör':'Sonraki soru')+'</button>';
    var b=g.querySelector('.tp-sonra');b.focus();
    try{o.querySelector('.tp-kart').scrollTo({top:99999,behavior:az()?'auto':'smooth'});}catch(e){}
    b.addEventListener('click',function(){if(son)sinavSonuc();else{S.i++;soruGoster();}});
  }
  function sinavSonuc(){
    var S=sinav,n=S.Q.length,r=oku(),en=Math.max(r.s||0,S.p);r.s=en;yaz(r);
    var yz=S.p/n,m=yz>=.9?'Harika. Roma hukukunu iyi biliyorsun.':yz>=.6?'İyi gidiyorsun. Kaçırdığın konular için ilgili odaya dönebilirsin.':'Bir kez daha odaları gezip kartları okumak iyi gelir.';
    var h='<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">Sınav bitti</span><h3 id="tp-kb">Puanın: '+S.p+' / '+n+'</h3></div><button type="button" class="tp-kx" aria-label="Kapat">×</button></div>'+
      '<p class="tp-km">'+m+'</p><p class="tp-uyari tp-en">En yüksek puanın: '+en+' / '+n+'. Bu puan rütbene ya da serine sayılmaz.</p>'+
      '<div class="tp-sn-d"><button type="button" class="tp-btn tp-yeniden">Yeniden</button><button type="button" class="tp-btn2 tp-kapat-s">Kapat</button></div>';
    var o=pencere(h,'sinav');o.querySelector('.tp-kart').setAttribute('aria-labelledby','tp-kb');o.querySelector('.tp-yeniden').focus();
    var iS=(el.__L||[]).findIndex(function(x){return x.t==='sinav';}),a=el.querySelector('.tp-hs[data-i="'+iS+'"]'),c=el.querySelector('.tp-ch[data-i="'+iS+'"]');
    if(a)a.classList.add('gor');if(c)c.classList.add('gor');
  }
  /* ---- jestler: iki parmak yakınlaştırma, tek parmak/fare ile kaydırma, çift dokunuş / çift tık, tekerlek ----
     Tek ve çift dokunuş ayrımı: hotspot/yazıt tıklaması 240ms bekletilir (klavyeyle tıklama beklemez); o sürede ikinci
     dokunuş gelirse bekleyen tıklama iptal edilir ve çift dokunuş çalışır. Kaydırma/sıkıştırma ile biten
     dokunuşun ardından gelen click yutulur, böylece hotspot açılmaz. */
  var yut=false,yutT=0,bekle=null,sonTap=null;
  function gec(e,fn){clearTimeout(bekle);bekle=null;if(!e.detail){fn();return;}bekle=setTimeout(function(){bekle=null;if(el)fn();},240);}
  function jestBagla(s){
    var P={},n=0,pin=null,sur=null,pinSeq=false;
    function nk(e){var r=s.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
    function ikili(){var k=Object.keys(P);return [P[k[0]],P[k[1]]];}
    s.addEventListener('click',function(e){if(yut&&performance.now()-yutT<400){e.stopPropagation();e.preventDefault();yut=false;}},true);
    s.addEventListener('pointerdown',function(e){
      if(e.target.closest('.tp-zk,.tp-egim')||(e.pointerType==='mouse'&&e.button!==0))return;
      yut=false;animIptal();var p=nk(e);
      if(Object.keys(P).length>=2)return;
      P[e.pointerId]={x:p[0],y:p[1],x0:p[0],y0:p[1],h:false};n++;
      if(n===2){clearTimeout(bekle);bekle=null;sonTap=null;pinSeq=true;sur=null;
        var q=ikili(),d=Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y)||1,mx=(q[0].x+q[1].x)/2,my=(q[0].y+q[1].y)/2;
        q[0].h=q[1].h=true;pin={d:d,z:z,cx:(mx-px)/z,cy:(my-py)/z};}
    });
    s.addEventListener('pointermove',function(e){
      var q=P[e.pointerId];if(!q)return;var p=nk(e);q.x=p[0];q.y=p[1];
      if(n>=2&&pin){var w=ikili(),d=Math.hypot(w[0].x-w[1].x,w[0].y-w[1].y),mx=(w[0].x+w[1].x)/2,my=(w[0].y+w[1].y)/2,
          z1=Math.min(ZMAX,Math.max(1,pin.z*d/pin.d));
        z=z1;px=mx-pin.cx*z1;py=my-pin.cy*z1;sinirla();uygula();e.preventDefault();return;}
      if(n!==1)return;
      var dx=p[0]-q.x0,dy=p[1]-q.y0;
      if(!q.h&&Math.hypot(dx,dy)>(e.pointerType==='mouse'?4:8)){q.h=true;sur={x:p[0],y:p[1],px:px,py:py,v:[]};
        if(e.pointerType==='mouse'){try{s.setPointerCapture(e.pointerId);}catch(x){}}s.classList.add('sur');}
      if(q.h&&sur){px=sur.px+(p[0]-sur.x);py=sur.py+(p[1]-sur.y);sinirla();uygula();
        var t=performance.now();if(P25&&e.pointerType!=='mouse'&&z<=1.001&&cw<=SW+.5){if(sur.d0===undefined)sur.d0=kS.drag;kS.drag=Math.max(-1,Math.min(1,sur.d0-(p[0]-sur.x)/(.4*SW)));derinGirdi();}
        sur.v.push([t,p[0],p[1]]);while(sur.v.length>2&&t-sur.v[0][0]>90)sur.v.shift();e.preventDefault();}
    });
    function eylem(vx,vy){ /* bırakınca kısa eylemsizlik (yerel kaydırmanın yerine) */
      animIptal();var t0=performance.now();
      (function f(t){var dt=Math.min(32,t-t0);t0=t;px+=vx*dt;py+=vy*dt;var a=px,b=py;sinirla();
        if(px!==a)vx=0;if(py!==b)vy=0;uygula();var k=Math.pow(.94,dt/16);vx*=k;vy*=k;
        anim=Math.hypot(vx,vy)>.02?requestAnimationFrame(f):null;})(t0);}
    function bit(e){
      var q=P[e.pointerId];if(!q)return;delete P[e.pointerId];n--;
      var p=nk(e),ok=e.type==='pointerup';
      if(pin&&n<2){pin=null;var k=Object.keys(P);if(k.length){var r=P[k[0]];r.h=true;sur={x:r.x,y:r.y,px:px,py:py,v:[]};}}
      if(q.h||pinSeq){yut=true;yutT=performance.now();}
      if(n>0)return;
      s.classList.remove('sur');
      if(!q.h&&!pinSeq&&ok){
        var now=performance.now();
        if(sonTap&&now-sonTap.t<320&&Math.hypot(p[0]-sonTap.x,p[1]-sonTap.y)<40){clearTimeout(bekle);bekle=null;sonTap=null;yut=true;yutT=now;ciftTap(p[0],p[1]);}
        else sonTap={t:now,x:p[0],y:p[1]};
      }else sonTap=null;
      if(q.h&&sur&&ok&&!az()&&!pinSeq&&sur.v.length>1){
        var a=sur.v[0],b=sur.v[sur.v.length-1],dt=b[0]-a[0]||1,vx=(b[1]-a[1])/dt,vy=(b[2]-a[2])/dt;
        if(Math.hypot(vx,vy)>.25&&performance.now()-b[0]<60)eylem(vx,vy);}
      sur=null;pinSeq=false;
    }
    s.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'&&P25&&SW){kS.mx=Math.max(-1,Math.min(1,nk(e)[0]/SW*2-1));kS.mv=true;derinGirdi();}});
    s.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&P25){kS.mv=false;derinGirdi();}});
    s.addEventListener('pointerup',bit);s.addEventListener('pointercancel',bit);
    s.addEventListener('wheel',function(e){
      e.preventDefault();var p=nk(e),dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);
      zoomNokta(z*Math.exp(-dy*(e.ctrlKey?.01:.0018)),p[0],p[1],true);},{passive:false});
    ['gesturestart','gesturechange','gestureend'].forEach(function(g){s.addEventListener(g,function(e){e.preventDefault();});});
    s.addEventListener('dragstart',function(e){e.preventDefault();});
  }
  /* ---- 2.5D ana salon: derinlik katmanları (img/tapinak/salon/) ----
     Katmanlar 2431x1512 uzayında, kaçış noktası (1215.5,770) etrafında ölçeklenir ve yatayda sx (-1..1) ile kayar:
     dx = -sx*maxKayma, s = 1+(yuruOlcek-1)*yuru. Tek ham görsel önce gösterilir; 6 katman inince üstüne yumuşakça geçilir,
     biri inmezse tek görsel kalır; bellek için katmanlar saydam olmayan kutuya kırpılmıştır (KT.c = [x,y,w,h], 2431x1512 uzayında), dönüşüm yine tam sahne kutusuna uygulanır; ilk ham görsel yığın görününce bırakılır. Kapı tıklama alanları kendi katmanıyla aynı dönüşümü alır. Yalnızca transform/opacity. */
  var DK=2431,DH=1512,KD='img/tapinak/salon/',SZ=1.015;
  var KT=[{d:'katman-0-arka',m:10,s:1.02},{d:'katman-1-uzak',m:24,s:1.03,c:[543,365,1345,640]},{d:'katman-2-orta',m:41,s:1.045,c:[351,237,1730,832]},{d:'katman-3-yakin',m:61,s:1.06,c:[0,0,2431,1212]},{d:'katman-4-on',m:36,s:1.04,c:[817,1001,798,213]},{d:'isik',m:10,s:1.02,c:[834,160,763,758]}];
  var KB=[[3,146,496,221,651],[2,467,583,120,454],[1,656,637,81,334],[3,2065,496,220,651],[2,1844,583,119,454],[1,1693,638,83,333],[0,1082,582,268,334]]; /* [katman,x,y,w,h] kapı kutuları (2431 uzayı) */
  var P25=null,kRaf=0,kT=0,kYuk=null,kS={mx:0,mv:false,drag:0,gy:0,gv:false,son:0,dr:0,t:0,lt:0};
  function eEase(u){return u*u;}function eOut(u){return 1-Math.pow(1-u,3);}function eIO(u){return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;}
  function katBul(cx,cy){var b=-1,a=1e12;KB.forEach(function(k,i){if(cx>=k[1]&&cx<=k[1]+k[3]&&cy>=k[2]&&cy<=k[2]+k[4]&&k[3]*k[4]<a){a=k[3]*k[4];b=k[0];}});return b<0?0:b;}
  function katYukle(){if(!kYuk)kYuk=Promise.all(KT.map(function(k){return resimYukle(KD+k.d+'.webp');})).catch(function(e){kYuk=null;throw e;});return kYuk;}
  function derinBaslat(t){
    derinDurdur();var k=bul('.tp-kutu');if(!k)return;
    katYukle().then(function(ims){if(t!==tok||!el||oda!=='ana'||bul('.tp-kutu')!==k)return;derinKur(k,ims);},function(){});}
  function derinKur(k,ims){
    var sz=document.createElement('div'),st=document.createElement('div'),hz=document.createElement('div'),ph=k.querySelector('img'),ly=[],hy=[],i;
    sz.className='tp-sz';st.className='tp-st';hz.className='tp-hz';
    ims.forEach(function(im,i){var d=document.createElement('div'),c=im.cloneNode(false);d.className='tp-ly'+(i===5?' tp-is':'');c.alt='';c.draggable=false;var cr=KT[i].c;if(cr)c.style.cssText='inset:0 auto auto 0;width:'+(cr[2]/DK*100).toFixed(4)+'%;height:'+(cr[3]/DH*100).toFixed(4)+'%;transform:translate('+(cr[0]/cr[2]*100).toFixed(4)+'%,'+(cr[1]/cr[3]*100).toFixed(4)+'%)';d.appendChild(c);st.appendChild(d);ly.push(d);});
    for(i=0;i<4;i++){var g=document.createElement('div');g.className='tp-hy';hz.appendChild(g);hy.push(g);}
    [].forEach.call(k.querySelectorAll('.tp-hs'),function(b){
      var cx=(parseFloat(b.style.left)+parseFloat(b.style.width)/2)/100*DK,cy=(parseFloat(b.style.top)+parseFloat(b.style.height)/2)/100*DH;
      hy[katBul(cx,cy)].appendChild(b);});
    sz.appendChild(st);sz.appendChild(hz);k.appendChild(sz);k.classList.add('tp-25');
    var p=P25={k:k,sz:sz,st:st,ly:ly,hy:hy,c:[],sx:0,walk:az()?0:.4,wa:null,yr:false};
    kS.son=performance.now();kS.t=0;kS.dr=0;kS.gy=0;
    p.sx=derinHedef();derinCiz();
    requestAnimationFrame(function(){if(P25===p)st.classList.add('ok');});
    setTimeout(function(){if(P25===p&&ph&&ph.parentNode){ph.removeAttribute('src');ph.parentNode.removeChild(ph);}},520);
    addEventListener('deviceorientation',gyroH);document.addEventListener('visibilitychange',gorunur);
    egimDuzenle();
    if(!az())derinAnim(0,700,eOut,null,null);else derinUyan();}
  function derinDurdur(){
    if(kRaf)cancelAnimationFrame(kRaf);kRaf=0;clearTimeout(kT);
    removeEventListener('deviceorientation',gyroH);document.removeEventListener('visibilitychange',gorunur);
    var b=bul('.tp-egim');if(b)b.parentNode.removeChild(b);
    var s=bul('.tp-sahne');if(s)s.classList.remove('tp-yr');
    P25=null;}
  function gorunur(){if(!document.hidden){kS.t=0;derinUyan();}}
  function derinUyan(){if(!P25||kRaf||document.hidden)return;clearTimeout(kT);kRaf=requestAnimationFrame(derinDongu);}
  function derinGirdi(){kS.son=performance.now();derinUyan();}
  function derinHedef(){
    var t=performance.now(),rg=cw*z-SW,rd=az(),b=0,e=0,dr=0;
    if(rg>1){b=-px/rg*2-1;if(!rd)e=kS.gy*.35;}
    else if(!rd){b=(kS.mv?kS.mx:0)+kS.drag;e=kS.gy;}
    if(!rd){var f=t-kS.son>3000?1:0;kS.dr+=(f-kS.dr)*(f?.02:.2);if(kS.dr<.001&&!f)kS.dr=0;dr=.08*kS.dr*Math.sin(t/10000*2*Math.PI);}
    return Math.max(-1,Math.min(1,b+e+dr));}
  function derinCiz(){
    var p=P25,i,K,s,str;if(!p)return;
    for(i=0;i<6;i++){K=KT[i===5?0:i];s=1+(K.s-1)*p.walk;
      str='translate('+(-p.sx*K.m/DK*100).toFixed(3)+'%,0) scale('+s.toFixed(4)+')';
      if(p.c[i]!==str){p.c[i]=str;p.ly[i].style.transform=str;if(i<4)p.hy[i].style.transform=str;}}}
  function derinAnim(w1,ms,ease,zf,bitti){ /* yürüme değerini w1'e götür; zf: {z,x,y,fade} ile sahne (yakınlaştırma/kaydırma) birlikte */
    var p=P25;if(!p)return;
    if(az()||!ms){p.wa=null;p.walk=w1;if(zf){animIptal();z=zf.z;px=zf.x;py=zf.y;uygula();if(zf.fade)p.k.style.opacity=0;}derinCiz();derinUyan();if(bitti)bitti();return;}
    p.wa={t0:0,d:ms,w0:p.walk,w1:w1,ease:ease,zf:zf,z0:z,x0:px,y0:py,bitti:bitti};derinUyan();}
  function derinDongu(t){
    kRaf=0;var p=P25;if(!p||!el||document.hidden)return;
    var dt=kS.t?Math.min(64,t-kS.t):16,w=p.wa,now=performance.now(),run=false,rd=az();kS.t=t;
    p.sz.classList.add('tp-an');
    if(w){
      if(!w.t0)w.t0=t;
      var u=Math.min(1,(t-w.t0)/w.d),e=w.ease(u);
      p.walk=w.w0+(w.w1-w.w0)*e;
      if(w.zf){z=w.z0+(w.zf.z-w.z0)*e;px=w.x0+(w.zf.x-w.x0)*e;py=w.y0+(w.zf.y-w.y0)*e;if(u<1)sinirla();uygula();
        if(w.zf.fade)p.k.style.opacity=u<.6?1:Math.max(0,1-(u-.6)/.4);}
      if(u>=1){p.wa=null;if(w.bitti)w.bitti();}else run=true;}
    if(kS.drag&&now-kS.son>2500){kS.drag*=Math.pow(.985,dt/16.7);if(Math.abs(kS.drag)<.002)kS.drag=0;}
    var h=derinHedef(),d=h-p.sx,drifting=!rd&&(now-kS.son>3000||kS.dr>.001),moving=Math.abs(d)>.0004;
    var recent=now-kS.son<300||Math.abs(d)>.02;
    if(!run&&!recent&&drifting&&t-(kS.lt||0)<33){kRaf=requestAnimationFrame(derinDongu);return;}
    kS.lt=t;
    if(moving)p.sx+=d*(1-Math.pow(.92,dt/16.67));else p.sx=h;
    derinCiz();
    if(P25!==p)return;
    if(run||moving||drifting){if(!kRaf)kRaf=requestAnimationFrame(derinDongu);}
    else{p.sz.classList.remove('tp-an');kS.t=0;if(!rd&&!kRaf)kT=setTimeout(derinUyan,Math.max(150,3050-(now-kS.son)));}}
  /* gyro: gamma, ±2° ölü bölge, ±20° tam aralık; yalnızca dikey duruşta */
  function gyroH(e){
    if(e.gamma==null)return;kS.gv=true;
    var g=e.gamma,a=Math.abs(g),v=a<2?0:Math.min(1,(a-2)/18)*(g<0?-1:1);
    if(innerWidth>innerHeight)v=0;
    if(Math.abs(v-kS.gy)>.002){var big=Math.abs(v-kS.gy)>.05;kS.gy=v;if(big)kS.son=performance.now();derinUyan();}
    var r=oku();if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'&&r.d!=='ok'&&(a>0)){r.d='ok';yaz(r);var b=bul('.tp-egim');if(b)b.parentNode.removeChild(b);}}
  function egimDuzenle(){ /* yalnızca iOS (izin gerekir): "Derinlik için telefonu eğ" düğmesi */
    if(typeof DeviceOrientationEvent==='undefined'||typeof DeviceOrientationEvent.requestPermission!=='function')return;
    var r=oku();if(r.d==='red')return;
    var s=bul('.tp-sahne'),b=document.createElement('button'),p=P25;
    b.type='button';b.className='tp-egim';b.textContent='Derinlik için telefonu eğ';b.hidden=true;
    /* sensör olayları zaten geliyorsa (izin gerekmiyorsa) ya da dokunmatik değilse düğme hiç görünmez */
    setTimeout(function(){if(P25===p&&!kS.gv&&b.parentNode&&(navigator.maxTouchPoints||0)>0)b.hidden=false;},r.d==='ok'?2000:1200);
    s.appendChild(b);}
  function egimIzin(){
    var b=bul('.tp-egim'),f=typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission;
    function bitir(ok){var r=oku();r.d=ok?'ok':'red';yaz(r);if(b&&b.parentNode)b.parentNode.removeChild(b);}
    if(typeof f!=='function'){bitir(false);return;}
    try{f.call(DeviceOrientationEvent).then(function(x){bitir(x==='granted');},function(){bitir(false);});}catch(x){bitir(false);}}
  function derinYuru(L,tetik){ /* kapıya yürü; ele alındıysa true */
    var p=P25;if(!p||oda!=='ana'||!bul('.tp-sz'))return false;
    if(p.yr)return true;
    if(az())return false;
    var s=bul('.tp-sahne');p.yr=true;animIptal();s.classList.add('tp-yr');
    if(L.k.kilit){
      derinAnim(.35,350,eOut,null,function(){sars(tetik);if(window.MF_TOAST)MF_TOAST(L.k.not||'Bu salon yalnızca dönüşüm törenlerinde açılır.');
        derinAnim(0,450,eIO,null,function(){p.yr=false;s.classList.remove('tp-yr');});});
      return true;}
    var cx=(L.k.x+L.k.w/2)/100*IW,cy=(L.k.y+L.k.h/2)/100*IH,z1=Math.max(z,1.6),r=kisit(z1,SW/2-cx*sc*z1,SH/2-cy*sc*z1);
    derinAnim(1,550,eEase,{z:z1,x:r[0],y:r[1],fade:true},function(){
      odaAc(L.k.hedef);
      setTimeout(function(){ /* oda açılmadıysa (yükleme hatası) salona geri dön */
        if(el&&P25===p&&oda==='ana'){var q=kisit(1,0,0);p.k.style.opacity='';p.yr=false;s.classList.remove('tp-yr');derinAnim(0,400,eIO,{z:1,x:q[0],y:q[1]},null);}},2500);});
    return true;}
  /* ---- açma / kapama ---- */
  function ac(odaId){
    if(el||kapaniyor)return Promise.resolve();
    var U=window.LEX_UFUK;if(U&&U.aktifToren&&U.aktifToren())return Promise.resolve();
    odak0=document.activeElement;
    el=document.createElement('div');el.className='tp-kap yuk';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Tapınak');
    el.innerHTML='<div class="tp-ust"><button type="button" class="tp-geri" hidden>‹ Ana salon</button><div class="tp-bas"><b>Tapınak</b><small></small></div><button type="button" class="tp-x" aria-label="Tapınaktan çık">×</button></div>'+
      '<div class="tp-sahne" role="group" tabindex="-1"><div class="tp-zk z1" role="group" aria-label="Yakınlaştırma"><button type="button" class="tp-z" data-z="+" aria-label="Yakınlaştır">+</button><button type="button" class="tp-z" data-z="-" aria-label="Uzaklaştır">−</button><button type="button" class="tp-z tp-z1" data-z="0" aria-label="Sığdır">1x</button></div></div><div class="tp-chip" role="group" aria-label="Kapılar ve eserler"></div>'+
      '<div class="tp-ort" hidden><div class="tp-kart" role="dialog" aria-modal="true"></div></div>';
    document.body.appendChild(el);document.body.classList.add('uf-kilit');
    var kp=el;
    requestAnimationFrame(function(){if(kp===el)el.classList.add('ac');});
    bagla();
    geriEkle('tpn',function(){kapat(false,true);});
    var ilk=odaId&&D&&D.odalar[odaId]?odaId:null;
    return veri().then(function(){
      if(el!==kp)return;
      return goster(D.salon||'ana',true).then(function(){if(ilk&&ilk!=='ana')odaAc(ilk);});
    }).catch(function(){
      if(el===kp){if(window.MF_TOAST)MF_TOAST('Tapınak yüklenemedi, bağlantını kontrol et.');kapat();}
    });
  }
  function bagla(){
    var s=bul('.tp-sahne'),C=bul('.tp-chip');
    el.addEventListener('click',function(e){
      var t=e.target;
      if(t.closest('.tp-x')){kapat();return;}
      if(t.closest('.tp-geri')){anaSalon();return;}
      var zb=t.closest('.tp-z');if(zb){var zd=zb.getAttribute('data-z');
        if(zd==='0')sigdir();else zoomNokta(zd==='+'?z*1.6:(z/1.6<1.05?1:z/1.6),SW/2,SH/2);return;}
      if(t.closest('.tp-egim')){egimIzin();return;}
      var yg=t.closest('.tp-yz-git');if(yg){var gb=yg.getAttribute('data-b').split(',').map(Number);sinavKapat();kartKapat();[].forEach.call(el.querySelectorAll('.tp-hs.onay'),function(o){o.classList.remove('onay');});kutuyaGit(gb[0],gb[1],gb[2],gb[3]);return;}
      if(t.closest('.tp-kx,.tp-kapat-s')){sinavKapat();kartKapat();return;}
      if(t===bul('.tp-ort')){if(!sinav)kartKapat();return;}
      var so=t.closest('.tp-so');if(so&&sinav){cevap(+so.getAttribute('data-i'));return;}
      if(t.closest('.tp-yeniden')){sinavBasla(kartAc);return;}
      var yb=t.closest('.tp-yz-b');if(yb){gec(e,function(){yazitKart(+yb.getAttribute('data-yi'),yb);});return;}
      var hs=t.closest('.tp-hs');if(hs){gec(e,function(){etkin(+hs.getAttribute('data-i'),hs);});return;}
      var ch=t.closest('.tp-ch');if(ch){
        if(ch.getAttribute('data-g')){anaSalon();return;}
        var i=+ch.getAttribute('data-i');kartKapat(true);
        panGit(i,function(h){etkin(i,h||ch);});}
    });
    el.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(bul('.tp-ort')&&!bul('.tp-ort').hidden){sinavKapat();kartKapat();}else if(oda&&oda!=='ana')anaSalon();else kapat();return;}
      var ortA=bul('.tp-ort'),kapali=!ortA||ortA.hidden;
      if(kapali&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        if(e.key==='+'||e.key==='='){e.preventDefault();zoomNokta(z*1.6,SW/2,SH/2);return;}
        if(e.key==='-'||e.key==='_'){e.preventDefault();zoomNokta(z/1.6<1.05?1:z/1.6,SW/2,SH/2);return;}
        if(e.key==='0'){e.preventDefault();sigdir();return;}}
      if(e.key==='Tab'){var f=[].filter.call(el.querySelectorAll('button:not([disabled]):not([hidden])'),function(b){return b.offsetParent!==null&&!b.closest('[hidden]');});
        var ort=bul('.tp-ort');if(ort&&!ort.hidden)f=f.filter(function(b){return ort.contains(b);});
        if(!f.length)return;var a=f.indexOf(document.activeElement);
        if(e.shiftKey&&a<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&(a<0||a===f.length-1)){e.preventDefault();f[0].focus();}}
    });
    jestBagla(s);
    if(window.ResizeObserver)el.__ro=new ResizeObserver(function(){olc();}),el.__ro.observe(s);else window.addEventListener('resize',olc);
    bul('.tp-x').focus();
  }
  /* kapat(): arayüzden (geçmişi düşürür). kapat(zorla,geriden): geri tuşuyla geldiyse kayıtlar zaten düşmüştür. */
  function kapat(zorla,geriden){
    if(!el||kapaniyor)return;
    var odada=oda&&oda!=='ana',e=el;kapaniyor=true;tok++;derinDurdur();
    if(e.__ro)e.__ro.disconnect();
    e.classList.remove('ac');e.classList.add('kapan');
    setTimeout(function(){
      if(e.parentNode)e.parentNode.removeChild(e);
      kapaniyor=false;
      var U=window.LEX_UFUK;if(!(U&&U.aktifToren&&U.aktifToren()))document.body.classList.remove('uf-kilit');
      try{if(odak0&&odak0.isConnected)odak0.focus();}catch(x){}
      var f=onk;onk=[];f.forEach(function(g){try{g();}catch(x){}});
    },az()?0:240);
    animIptal();clearTimeout(bekle);bekle=null;z=1;cw=0;el=null;oda=null;kartAc=null;sinav=null;
    if(geriden)return;
    /* geçmiş kayıtlarını düşür: önce oda (varsa), popstate bitince ana salon */
    if(odada){geriDus('tpn-oda');var f=function(){removeEventListener('popstate',f);setTimeout(function(){geriDus('tpn');},0);};addEventListener('popstate',f);}
    else geriDus('tpn');
  }
  window.LEX_TAPINAK={ac:ac,kapat:function(){kapat(true);},acik:function(){return !!el||kapaniyor;},derin:function(){return P25?{sx:P25.sx,walk:P25.walk,hedef:derinHedef(),gy:kS.gy,drag:kS.drag,calisiyor:!!kRaf}:null;},sonra:function(f){if(el||kapaniyor)onk.push(f);else f();},
    kilitliKapi:function(){if(window.MF_TOAST)MF_TOAST('Bu salon yalnızca dönüşüm törenlerinde açılır.');}};
})();
