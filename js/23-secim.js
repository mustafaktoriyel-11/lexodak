// Ders ve süre seçimi (MF Odak'taki gibi): Başlat'ın altında iki küçük düğme (kitap ve saat ikonlu); dokununca alttan pencere.
// Var olan seçim öğeleri (#pm-ders-k, #pm-odak-k, #pm-ozel-k) pencerelere taşınır; sayaç mantığı aynı kalır.
(function(){
  'use strict';
  function $(i){return document.getElementById(i);}
  var dk=$('pm-ders-k'),ok=$('pm-odak-k'),oz=$('pm-ozel-k'),dg=document.querySelector('#pg-sayac .pm-dugmeler');
  if(!dk||!ok||!dg)return;
  var IK_KITAP='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/></svg>';
  var IK_SAAT='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4M12 2v3"/></svg>';

  // çizgiden aşağı kaydırınca kapanır (MF Odak'taki ksKapat'ın aynısı, Lex renkleriyle)
  function asagiKapat(sayfa,kapatFn){
    var pan=sayfa.querySelector(':scope>.sheet-k')||sayfa,fon=sayfa;
    var y0=null,x0=0,dy=0,t0=0,basladi=false,yut=false,h=0,baz=.55;
    function bgA(){var m=/([\d.]+)\)\s*$/.exec(getComputedStyle(fon).backgroundColor);return m?+m[1]:.55;}
    function kaydirilabilir(t){for(var n=t;n&&n.nodeType===1;n=n.parentNode){if(n.scrollTop>0)return true;if(n===pan)break;}return false;}
    function bas(e){
      if(e.target.closest&&e.target.closest('input,select,textarea,a,[contenteditable]'))return;
      if(kaydirilabilir(e.target))return;
      var p=e.touches?e.touches[0]:e;y0=p.clientY;x0=p.clientX;dy=0;t0=Date.now();basladi=false;}
    function hareket(e){
      if(y0===null)return;var p=e.touches?e.touches[0]:e,d=p.clientY-y0,dx=Math.abs(p.clientX-x0);
      if(!basladi){
        if(d>8&&d>dx){basladi=true;h=pan.offsetHeight||400;baz=bgA();pan.style.transition='none';fon.style.transition='none';}
        else if(Math.abs(d)>8||dx>8){y0=null;return;}
        else return;}
      dy=Math.max(0,d);pan.style.transform='translateY('+dy+'px)';
      fon.style.background='rgba(39,19,22,'+(baz*Math.max(0,1-dy/h)).toFixed(3)+')';
      if(e.cancelable)e.preventDefault();}
    function bitir(){
      if(y0===null)return;y0=null;if(!basladi)return;basladi=false;
      yut=true;setTimeout(function(){yut=false;},350);
      var hiz=dy/Math.max(1,Date.now()-t0);
      pan.style.transition='transform .2s ease-out';fon.style.transition='background .2s';
      if(dy>h*.25||(hiz>.5&&dy>30)){
        pan.style.transform='translateY('+(pan.offsetHeight+dy)+'px)';fon.style.background='rgba(39,19,22,0)';
        setTimeout(function(){yut=false;kapatFn();pan.style.transition='';pan.style.transform='';fon.style.transition='';fon.style.background='';},200);
      }else{pan.style.transform='';fon.style.background='';setTimeout(function(){pan.style.transition='';fon.style.transition='';},220);}}
    pan.addEventListener('touchstart',bas,{passive:true});pan.addEventListener('touchmove',hareket,{passive:false});
    pan.addEventListener('touchend',bitir);pan.addEventListener('touchcancel',bitir);
    sayfa.addEventListener('click',function(e){if(yut){e.stopImmediatePropagation();e.preventDefault();}},true);
  }

  function sayfa(id,baslik){var p=document.createElement('div');p.id=id;p.className='pm-sheet sc-p';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');
    p.innerHTML='<div class="sheet-k"><div class="sheet-tut"></div><div class="sheet-ust"><b>'+baslik+'</b></div><div class="sc-ic"></div><button type="button" class="mt-btn sc-tamam">Tamam</button></div>';
    document.body.appendChild(p);var acik=false;
    function ac(){if(acik)return;acik=true;p.classList.add('acik');requestAnimationFrame(function(){requestAnimationFrame(function(){p.classList.add('gor');});});if(window.LEX_GERI&&LEX_GERI.ekle)LEX_GERI.ekle(id,kapat);}
    function kapat(){if(!acik)return;acik=false;p.classList.remove('gor');setTimeout(function(){if(!acik)p.classList.remove('acik');},280);}
    function kapatT(){if(window.LEX_GERI&&LEX_GERI.dus)LEX_GERI.dus(id);kapat();}
    p.addEventListener('click',function(e){if(e.target===p)kapatT();});p.querySelector('.sc-tamam').addEventListener('click',kapatT);
    asagiKapat(p,kapatT);
    return {el:p,ust:p.querySelector('.sheet-ust'),ic:p.querySelector('.sc-ic'),ac:ac,kapat:kapatT};}
  var D=sayfa('sc-dp','Hangi dersi çalışıyorsun?'),S=sayfa('sc-sp','Odak süresi');
  D.ic.appendChild(dk);S.ic.appendChild(ok);if(oz)S.ic.appendChild(oz);
  var dc=$('pm-ders-c');if(dc)dc.classList.remove('kaydir');
  // "Dersleri düzenle" pencere başlığına taşınır; dokununca bu pencere kapanır, düzenleme penceresi açılır
  var db=$('lex-ders-btn');if(db){D.ust.appendChild(db);db.addEventListener('click',function(){D.kapat();},true);}

  // ana ekrandaki satır
  var sat=document.createElement('div');sat.className='sc-satir';sat.id='sc-satir';
  sat.innerHTML='<button type="button" class="sc-btn" id="sc-ders" aria-haspopup="dialog"><span class="sc-i">'+IK_KITAP+'</span><b id="sc-ders-et"></b><i aria-hidden="true">▾</i></button>'+
    '<button type="button" class="sc-btn" id="sc-sure" aria-haspopup="dialog"><span class="sc-i">'+IK_SAAT+'</span><b id="sc-sure-et"></b><i aria-hidden="true">▾</i></button>';
  dg.parentNode.insertBefore(sat,dg.nextSibling);
  // dokunuş bu düğmede başlamadıysa (ör. Bitir'e basılı tutan parmak kalkınca) tıklama sayılmaz
  var basilan=null;sat.addEventListener('pointerdown',function(e){basilan=e.target.closest('button');},true);
  function izinli(b){var r=basilan===b;basilan=null;return r;}
  $('sc-ders').addEventListener('click',function(){if(izinli(this))D.ac();});$('sc-sure').addEventListener('click',function(){if(izinli(this))S.ac();});
  function yaz(){
    var d=$('pm-ders'),dv=d?d.value:'';$('sc-ders-et').textContent=dv||'Ders seç';
    var v=$('pm-odak').value,t=v==='serbest'?'∞ Serbest':v==='ozel'?('Özel · '+(+$('pm-ozel').value||0)+' dk'):(v+' dk');
    $('sc-sure-et').textContent=t;$('sc-ders').setAttribute('aria-label','Ders: '+(dv||'seçilmedi')+', değiştir');$('sc-sure').setAttribute('aria-label','Odak süresi: '+t+', değiştir');
    // deneme modunda ya da seans başlamışken satır görünmez (eski seçim alanlarıyla aynı kural)
    var bas=$('pm-basla');sat.hidden=dk.style.display==='none'||!bas||!/Başlat/.test(bas.textContent);
  }
  ['pm-ders','pm-odak','pm-ozel'].forEach(function(i){var e=$(i);if(e){e.addEventListener('change',yaz);e.addEventListener('input',yaz);}});
  new MutationObserver(yaz).observe($('pm-basla'),{childList:true,characterData:true,subtree:true});
  new MutationObserver(yaz).observe(dk,{attributes:true,attributeFilter:['style']});
  if(dc)new MutationObserver(function(){setTimeout(yaz,0);}).observe(dc,{childList:true}); // dersler düzenlenince
  // seçim yapılınca pencere açık kalır; Tamam, dışarı dokunma veya aşağı kaydırma ile kapanır
  if(dc)dc.addEventListener('click',function(e){if(e.target.closest('button'))setTimeout(yaz,160);});
  var oc=$('pm-odak-c');if(oc)oc.addEventListener('click',function(e){if(e.target.closest('button'))setTimeout(yaz,160);});
  yaz();setTimeout(yaz,600);
})();
