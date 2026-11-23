/* Tapınak: Hukukçunun Ufku'nun sonundaki tapınağın içi.
   Ana salon (7 kapı) + 5 Roma hukuku odası + sınav salonu. İçerik veri/tapinak.json.
   Görsel 1600x995; tıklama alanları görselin yüzdesi olarak tanımlıdır (görselle birlikte ölçeklenir).
   Geri tuşu: oda > ana salon > kapanış (LEX_GERI: 'tpn-oda', 'tpn'). */
(function(){
  'use strict';
  var K='lex-tapinak',IW=1600,IH=995,SORU_N=10;
  var D=null,el=null,oda=null,tok=0,kartAc=null,sinav=null,odak0=null,kapaniyor=false,onk=[],SW=0,SH=0,kw=0;
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
  /* ---- görünüm ---- */
  var UY={t:'Gelenek / tartışmalı: tarihler ve ayrıntılar kaynağa göre değişebilir.',y:'Tarih ve ayrıntılar kaynağa göre değişebilir; ders kitabınla karşılaştır.'};
  function liste(r){var L=[];
    if(r.kapilar)r.kapilar.forEach(function(k){L.push({t:'kapi',k:k,ad:k.ad,aria:k.kilit?'Tören salonu, kilitli. Yalnızca dönüşüm törenlerinde açılır':k.ad+' kapısı. '+k.ip});});
    if(r.sinav)L.push({t:'sinav',k:r.sinav,ad:r.sinav.ad,aria:'Kum saati: sınavı başlat'});
    yzEsle(r);
    (r.eserler||[]).forEach(function(e){L.push({t:'eser',k:e,ad:e.ad,aria:e.ad+' (eser kartını aç'+(e.__y&&e.__y.length?', Latince yazıt içerir':'')+')'});});
    return L;}
  function gor(id,L){return L.t==='kapi'?!L.k.kilit&&!!oku().o[L.k.hedef]:L.t==='eser'?eserVar(id,L.k.id):L.t==='sinav'?!!oku().s:false;}
  function olc(){
    var s=bul('.tp-sahne'),k=bul('.tp-kutu');if(!s||!k)return;
    var W=s.clientWidth,H=s.clientHeight;if(!W||!H)return;
    var oran=SW>0&&kw>0?(s.scrollLeft+SW/2)/kw:.5;
    var sc=W<H?H/IH:Math.min(W/IW,H/IH);
    kw=IW*sc;k.style.width=kw+'px';k.style.height=IH*sc+'px';
    var yl=k.querySelector('.tp-yl');if(yl)yl.style.transform='scale('+sc+')';
    if(kw>W)s.scrollLeft=Math.max(0,oran*kw-W/2);
    SW=W;SH=H;}
  function ortala(){var s=bul('.tp-sahne');if(s&&kw>s.clientWidth)s.scrollLeft=(kw-s.clientWidth)/2;}
  function resimYukle(src){return new Promise(function(ok,hata){
    var im=new Image();im.decoding='async';im.onerror=function(){hata();};
    im.onload=function(){(im.decode?im.decode().catch(function(){}):Promise.resolve()).then(function(){ok(im);});};
    im.src=src;});}
  function goster(id,kayit){
    var r=D.odalar[id],t=++tok;if(!r||!el)return Promise.resolve();
    el.classList.add('yuk');
    return resimYukle(r.img).then(function(im){
      if(t!==tok||!el)return;
      kartKapat(true);sinavKapat(true);
      oda=id;
      var L=liste(r),h='';
      L.forEach(function(x,i){var b=x.k,cls='tp-hs tp-'+(x.t==='eser'?'eser':'kapi')+(x.t==='eser'&&b.__y&&b.__y.length?' tp-hs-y':'')+(x.t==='kapi'&&b.kilit?' kilit':'')+(gor(id,x)?' gor':'');
        h+='<button type="button" class="'+cls+'" data-i="'+i+'" style="left:'+b.x+'%;top:'+b.y+'%;width:'+b.w+'%;height:'+b.h+'%" aria-label="'+esc(x.aria)+'"'+(x.t==='kapi'&&b.kilit?' aria-disabled="true"':'')+'><i class="tp-ring" aria-hidden="true"></i><span class="tp-et" aria-hidden="true">'+esc(x.ad)+'</span></button>';});
      var s=bul('.tp-sahne');
      s.innerHTML='<div class="tp-kutu"><img src="'+esc(r.img)+'" alt="" draggable="false">'+yzHtml(r)+h+'</div>';
      s.setAttribute('aria-label',r.ad+(id==='ana'?'. Kapılara dokunarak odalara gir.':'. Eserlere dokun ya da aşağıdaki listeyi kullan.'));
      var k=bul('.tp-kutu');k.className='tp-kutu tp-gir';
      SW=0;kw=0;olc();ortala();yzSigdir();
      bul('.tp-bas b').textContent=r.ad;
      var sm=bul('.tp-bas small'),yk=kw>bul('.tp-sahne').clientWidth+2;sm.textContent=id==='ana'?odaSay()+'/'+(Object.keys(D.odalar).length-1)+' oda gezildi'+(yk?' · yana kaydır':''):r.giris;
      bul('.tp-geri').hidden=id==='ana';
      var C=bul('.tp-chip'),c='';
      if(id!=='ana')c+='<button type="button" class="tp-ch tp-ch-g" data-g="1">‹ Ana salon</button>';
      L.forEach(function(x,i){c+='<button type="button" class="tp-ch'+(gor(id,x)?' gor':'')+(x.t==='kapi'&&x.k.kilit?' kilit':'')+(x.t==='sinav'?' sin':'')+'" data-i="'+i+'" aria-label="'+esc(x.aria)+'"><span class="tp-ck" aria-hidden="true">✓</span>'+esc(x.t==='kapi'&&x.k.kilit?'Tören salonu':x.ad)+'</button>';});
      C.innerHTML=c;C.scrollLeft=0;
      el.classList.remove('yuk');
      el.__L=L;
      if(id!=='ana')odaGezildi(id);
      if(kayit&&im&&!window.__tpOn){window.__tpOn=1;onYukle();}
    },function(){if(t!==tok)return;if(el)el.classList.remove('yuk');if(window.MF_TOAST)MF_TOAST('Oda yüklenemedi, bağlantını kontrol et.');throw 0;});
  }
  function onYukle(){try{if(navigator.connection&&navigator.connection.saveData)return;}catch(e){}
    setTimeout(function(){Object.keys(D.odalar).forEach(function(k){var i=new Image();i.src=D.odalar[k].img;});},1500);}
  /* ---- etkileşim ---- */
  function sars(b){if(az())return;[b,bul('.tp-kutu')].forEach(function(e){if(!e)return;e.classList.remove('tp-sars');void e.offsetWidth;e.classList.add('tp-sars');setTimeout(function(){e.classList.remove('tp-sars');},520);});}
  function etkin(i,tetik){
    var L=el&&el.__L&&el.__L[i];if(!L)return;
    if(L.t==='kapi'){
      if(L.k.kilit){sars(tetik);if(window.MF_TOAST)MF_TOAST(L.k.not||'Bu salon yalnızca dönüşüm törenlerinde açılır.');return;}
      odaAc(L.k.hedef);return;}
    if(L.t==='sinav'){sinavBasla(tetik);return;}
    kartAc_(oda,L.k,tetik);
  }
  function odaAc(id){
    if(!D.odalar[id]||oda!=='ana')return;
    goster(id).then(function(){geriEkle('tpn-oda',function(){if(el)goster('ana').catch(function(){});});}).catch(function(){});
  }
  function anaSalon(){ /* arayüz düğmesi: önce ekranı değiştir, sonra geçmiş kaydını düşür */
    if(!el||oda==='ana')return;
    goster('ana').then(function(){geriDus('tpn-oda');},function(){});
  }
  function panGit(i,fn){
    var h=bul('.tp-hs[data-i="'+i+'"]'),s=bul('.tp-sahne');
    if(!h||!s){fn();return;}
    var k=bul('.tp-kutu'),x=(parseFloat(h.style.left)+parseFloat(h.style.width)/2)/100*kw;
    if(kw>s.clientWidth)s.scrollTo({left:Math.max(0,x-s.clientWidth/2),behavior:az()?'auto':'smooth'});
    h.classList.add('onay');setTimeout(function(){h.classList.remove('onay');},1200);
    setTimeout(function(){fn(h);},az()||kw<=s.clientWidth?0:380);
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
    pencere('<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">'+esc(D.odalar[id].ad)+'</span><h3 id="tp-kb">'+esc(e.ad)+'</h3></div><button type="button" class="tp-kx" aria-label="Kartı kapat">×</button></div>'+yzKart(e.__y)+'<p class="tp-km">'+esc(e.metin)+'</p>'+u+tr);
    var o=bul('.tp-ort');o.querySelector('.tp-kart').setAttribute('aria-labelledby','tp-kb');
    var h=el.querySelector('.tp-hs[data-i="'+(el.__L||[]).findIndex(function(x){return x.k===e;})+'"]');
    if(h)h.classList.add('gor');
    var c=el.querySelector('.tp-ch[data-i="'+(el.__L||[]).findIndex(function(x){return x.k===e;})+'"]');if(c)c.classList.add('gor');
    o.querySelector('.tp-kx').focus();
  }
  function yazitKart(i,tetik){ /* eserin üstüne düşmeyen yazıt: yalnızca yazıt kartı */
    var y=D.odalar[oda].yazitlar[i];if(!y)return;kartAc=tetik||null;
    pencere('<div class="tp-tut" aria-hidden="true"></div><div class="tp-ku"><div><span class="tp-ko">'+esc(D.odalar[oda].ad)+'</span><h3 id="tp-kb">Latince yazıt</h3></div><button type="button" class="tp-kx" aria-label="Kartı kapat">×</button></div>'+yzKart([y]));
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
  /* ---- açma / kapama ---- */
  function ac(odaId){
    if(el||kapaniyor)return Promise.resolve();
    var U=window.LEX_UFUK;if(U&&U.aktifToren&&U.aktifToren())return Promise.resolve();
    odak0=document.activeElement;
    el=document.createElement('div');el.className='tp-kap yuk';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Tapınak');
    el.innerHTML='<div class="tp-ust"><button type="button" class="tp-geri" hidden>‹ Ana salon</button><div class="tp-bas"><b>Tapınak</b><small></small></div><button type="button" class="tp-x" aria-label="Tapınaktan çık">×</button></div>'+
      '<div class="tp-sahne" role="group" tabindex="-1"></div><div class="tp-chip" role="group" aria-label="Kapılar ve eserler"></div>'+
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
      if(t.closest('.tp-kx,.tp-kapat-s')){sinavKapat();kartKapat();return;}
      if(t===bul('.tp-ort')){if(!sinav)kartKapat();return;}
      var so=t.closest('.tp-so');if(so&&sinav){cevap(+so.getAttribute('data-i'));return;}
      if(t.closest('.tp-yeniden')){sinavBasla(kartAc);return;}
      var yb=t.closest('.tp-yz-b');if(yb){yazitKart(+yb.getAttribute('data-yi'),yb);return;}
      var hs=t.closest('.tp-hs');if(hs){etkin(+hs.getAttribute('data-i'),hs);return;}
      var ch=t.closest('.tp-ch');if(ch){
        if(ch.getAttribute('data-g')){anaSalon();return;}
        var i=+ch.getAttribute('data-i');kartKapat(true);
        panGit(i,function(h){etkin(i,h||ch);});}
    });
    el.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(bul('.tp-ort')&&!bul('.tp-ort').hidden){sinavKapat();kartKapat();}else if(oda&&oda!=='ana')anaSalon();else kapat();return;}
      if(e.key==='Tab'){var f=[].filter.call(el.querySelectorAll('button:not([disabled]):not([hidden])'),function(b){return b.offsetParent!==null&&!b.closest('[hidden]');});
        var ort=bul('.tp-ort');if(ort&&!ort.hidden)f=f.filter(function(b){return ort.contains(b);});
        if(!f.length)return;var a=f.indexOf(document.activeElement);
        if(e.shiftKey&&a<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&(a<0||a===f.length-1)){e.preventDefault();f[0].focus();}}
    });
    if(window.ResizeObserver)el.__ro=new ResizeObserver(function(){olc();}),el.__ro.observe(s);else window.addEventListener('resize',olc);
    bul('.tp-x').focus();
  }
  /* kapat(): arayüzden (geçmişi düşürür). kapat(zorla,geriden): geri tuşuyla geldiyse kayıtlar zaten düşmüştür. */
  function kapat(zorla,geriden){
    if(!el||kapaniyor)return;
    var odada=oda&&oda!=='ana',e=el;kapaniyor=true;tok++;
    if(e.__ro)e.__ro.disconnect();
    e.classList.remove('ac');e.classList.add('kapan');
    setTimeout(function(){
      if(e.parentNode)e.parentNode.removeChild(e);
      kapaniyor=false;
      var U=window.LEX_UFUK;if(!(U&&U.aktifToren&&U.aktifToren()))document.body.classList.remove('uf-kilit');
      try{if(odak0&&odak0.isConnected)odak0.focus();}catch(x){}
      var f=onk;onk=[];f.forEach(function(g){try{g();}catch(x){}});
    },az()?0:240);
    el=null;oda=null;kartAc=null;sinav=null;
    if(geriden)return;
    /* geçmiş kayıtlarını düşür: önce oda (varsa), popstate bitince ana salon */
    if(odada){geriDus('tpn-oda');var f=function(){removeEventListener('popstate',f);setTimeout(function(){geriDus('tpn');},0);};addEventListener('popstate',f);}
    else geriDus('tpn');
  }
  window.LEX_TAPINAK={ac:ac,kapat:function(){kapat(true);},acik:function(){return !!el||kapaniyor;},sonra:function(f){if(el||kapaniyor)onk.push(f);else f();},
    kilitliKapi:function(){if(window.MF_TOAST)MF_TOAST('Bu salon yalnızca dönüşüm törenlerinde açılır.');}};
})();
