// ---- Her sekmede küçük sayaç ----
(function(){
  var m=document.createElement('div');m.className='tb-mini';m.hidden=true;m.setAttribute('role','status');
  m.innerHTML='<button type="button" class="tm-git" aria-label="Çalışma ekranına dön"><span><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.4 1.6M10 2.8h4M12 2.8v2.7"/></svg></span><span class="tm-sure"></span><span class="tm-ad"></span></button><button type="button" class="tm-dur" aria-label="Duraklat"></button>';
  document.body.appendChild(m);
  var sure=m.querySelector('.tm-sure'),ad=m.querySelector('.tm-ad'),dur=m.querySelector('.tm-dur');
  function oku(){try{return JSON.parse(localStorage.getItem('pm-durum')||'null');}catch(e){return null;}}
  function bicU(ms){var s=Math.floor(ms/1000),dk=Math.floor(s/60),sa=Math.floor(dk/60);s%=60;return (sa?sa+':'+(dk%60<10?'0':'')+(dk%60):(dk<10?'0':'')+dk)+':'+(s<10?'0':'')+s;}
  function bic(ms){var s=Math.ceil(ms/1000),dk=Math.floor(s/60);s%=60;return (dk<10?'0':'')+dk+':'+(s<10?'0':'')+s;}
  function guncelle(){
    var d=oku(),g=document.getElementById('kt-gor');
    m.classList.toggle('gor-acik',!!(g&&!g.hidden));
    if(!d||(!d.calisiyor&&!(d.basla&&d.kalan>0&&d.kalan<d.toplam))){m.hidden=true;return;}
    var k=d.calisiyor?Math.max(0,(d.bitis||0)-Date.now()):d.kalan;
    m.hidden=false;sure.textContent=d.serbest?bicU(d.toplam-k):bic(k);
    var mola=d.mod!=='odak'&&d.mod!=='deneme';
    ad.textContent=mola?'Mola':d.mod==='deneme'?'HMGS':(d.ders||'Odak');
    m.classList.toggle('mola',mola);m.classList.toggle('durdu',!d.calisiyor);
    dur.textContent=d.calisiyor?'❚❚':'▶';dur.setAttribute('aria-label',d.calisiyor?'Duraklat':'Devam et');
  }
  m.querySelector('.tm-git').addEventListener('click',function(){var g=document.getElementById('kt-gor');if(g&&!g.hidden){var b=document.getElementById('kt-gor-geri');if(b)b.click();}if(window.MF_SAYFA)window.MF_SAYFA('sayac');});
  dur.addEventListener('click',function(){var b=document.getElementById('pm-basla');if(b){b.click();setTimeout(guncelle,50);}});
  // serbest çalışmada 90 dakikada bir mola hatırlatması
  var hat=document.createElement('div');hat.className='tb-hat';hat.hidden=true;hat.setAttribute('role','alert');
  hat.innerHTML='<b><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9.5h12v5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z"/><path d="M16.5 11h1.3a2.2 2.2 0 0 1 0 4.4h-1.6M8 3.5c0 1.2 1 1.4 1 2.6M12 3.5c0 1.2 1 1.4 1 2.6"/></svg>Kısa bir mola?</b><span class="th-m"></span><button type="button">Tamam</button>';document.body.appendChild(hat);
  hat.querySelector('button').addEventListener('click',function(){hat.hidden=true;});
  setInterval(function(){
    var d=oku();if(!d||!d.serbest||!d.calisiyor||d.mod!=='odak')return;
    var gec=d.toplam-Math.max(0,(d.bitis||0)-Date.now()),n=Math.floor(gec/5400000);if(n<1)return;
    var key='lex-serbest-hat',v='';try{v=sessionStorage.getItem(key)||'';}catch(e){}
    var id=(d.toplam-d.kalan)+'|'+n;var bas=String(Math.round(((d.bitis||0)-d.toplam)/60000));id=bas+'|'+n;
    if(v===id)return;try{sessionStorage.setItem(key,id);}catch(e){}
    var sa=Math.floor(gec/3600000),dk=Math.round(gec%3600000/60000),t=(sa?sa+' sa ':'')+(dk?dk+' dk':'');
    hat.querySelector('.th-m').textContent=t+' oldu. 10 dakika ara verip su içmek odağını tazeler; istersen devam et.';hat.hidden=false;
    try{if(document.hidden&&'Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.ready.then(function(r){r.showNotification('☕ Kısa bir mola?',{body:t+' kesintisiz çalıştın. 10 dk ara iyi gelir.',icon:'icon-192.png',tag:'lex-serbest'});});}catch(e){}
  },15000);
  var sbc=document.querySelector('#pm-odak-c [data-v=serbest]');if(sbc){sbc.setAttribute('aria-label','Serbest çalışma (kronometre)');sbc.title='Serbest çalışma (kronometre)';}
  setInterval(guncelle,1000);guncelle();
})();
