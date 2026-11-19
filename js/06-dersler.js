// ================= LEX ODAK: DERSLER, SINAV TAKVİMİ, ORTALAMA =================
(function(){
  var $=function(id){return document.getElementById(id);};
  function oku(k,v){try{var x=localStorage.getItem(k);return x?JSON.parse(x):v;}catch(e){return v;}}
  function yaz(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function ac(p){p.classList.add('acik');requestAnimationFrame(function(){requestAnimationFrame(function(){p.classList.add('gor');});});}
  function kapat(p){p.classList.remove('gor');setTimeout(function(){p.classList.remove('acik');},280);}
  /* aşağı kaydırarak kapatma: alttaki atla/vazgeç düğmesiyle aynı işi yapar */
  function suruklekapat(sp,dugme){
    var k=sp.querySelector('.sheet-k');if(!k)return;var y0=null,x0=0,dy=0,t0=0,sur=false,yut=false;
    function bas(e){if(e.target.closest('input,select,textarea,a'))return;var q=e.touches?e.touches[0]:e;y0=q.clientY;x0=q.clientX;dy=0;t0=Date.now();sur=false;}
    function har(e){if(y0===null)return;var q=e.touches?e.touches[0]:e,d=q.clientY-y0,dx=Math.abs(q.clientX-x0);
      if(!sur){var ic=e.target.closest&&e.target.closest('.lex-ok-liste');var ust=k.scrollTop<=0&&(!ic||ic.scrollTop<=0);
        if(d>8&&d>dx&&ust){sur=true;k.style.transition='none';}else if(Math.abs(d)>8||dx>8){y0=null;return;}else return;}
      dy=Math.max(0,d);k.style.transform='translateY('+dy+'px)';if(e.cancelable)e.preventDefault();}
    function bir(){if(y0===null)return;y0=null;if(!sur)return;sur=false;yut=true;setTimeout(function(){yut=false;},60);
      var hiz=dy/Math.max(1,Date.now()-t0);k.style.transition='';k.style.transform='';
      if(dy>Math.min(110,k.offsetHeight*.25)||hiz>.6)setTimeout(function(){$(dugme).click();},80);}
    k.addEventListener('touchstart',bas,{passive:true});k.addEventListener('touchmove',har,{passive:false});k.addEventListener('touchend',bir);k.addEventListener('touchcancel',bir);
    k.addEventListener('click',function(e){if(yut){e.stopPropagation();e.preventDefault();}},true);
  }
  function cipler(kap,liste,secili,tik,coklu){var k=$(kap);k.innerHTML='';liste.forEach(function(x){var b=document.createElement('button');b.type='button';b.textContent=x[1];
    var on=coklu?secili.indexOf(x[0])>=0:secili===x[0];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.addEventListener('click',function(){tik(x[0]);});k.appendChild(b);});}
  [].forEach.call(document.querySelectorAll('#lex-sn-p,#lex-dr-p'),function(p){p.addEventListener('click',function(e){if(e.target===p&&!(p.id==='lex-dr-p'&&ilk))kapat(p);});});

  // ---------- okul seçimi ----------
  var OKULLAR=[],OKSOZ=window.LEX_VERI('okul').then(function(v){OKULLAR=v||[];},function(){});
  var PALET=['rgb(142 27 51)','rgb(31 78 156)','rgb(15 122 92)','rgb(178 94 9)','rgb(91 42 134)','rgb(29 111 140)','rgb(156 47 110)','rgb(74 90 30)','rgb(163 58 28)','rgb(46 63 143)'];
  function renkOf(ad){var h=0;for(var i=0;i<ad.length;i++)h=(h*31+ad.charCodeAt(i))>>>0;return PALET[h%PALET.length];}
  function rozet(o,kucuk){return '<i class="lex-roz'+(kucuk?' k':'')+(o.kisa.length>4?' u':'')+'" style="background:'+renkOf(o.ad)+'" aria-hidden="true">'+esc(o.kisa)+'</i>';}
  function norm(x){return String(x).toLocaleLowerCase('tr').replace(/[ıİ]/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u');}
  var op=$('lex-ok-p'),okIlk=false;
  window.LEX_OKUL=function(){var o=oku('lex-okul',null);return o&&o.ad?o:null;};
  var HK_OZEL={'İhsan Doğramacı Bilkent Üniversitesi':'Bilkent Hukuk','TOBB Ekonomi ve Teknoloji Üniversitesi':'TOBB ETÜ Hukuk','Bolu Abant İzzet Baysal Üniversitesi':'Abant İzzet Baysal Hukuk','Tekirdağ Namık Kemal Üniversitesi':'Namık Kemal Hukuk','Fatih Sultan Mehmet Vakıf Üniversitesi':'FSM Hukuk','Uluslararası Final Üniversitesi':'Final Hukuk','Uluslararası Kıbrıs Üniversitesi':'Kıbrıs Hukuk (UKÜ)'};
  window.LEX_HUKUK_AD=function(o){if(!o||!o.ad)return '';return HK_OZEL[o.ad]||(o.ad.replace(/\s+Üniversitesi$/,'')+' Hukuk');};
  function okBaslik(){
    var o=window.LEX_OKUL(),h=document.querySelector('.ust h1 small');if(!h)return;
    if(o){h.className='lex-okul';h.innerHTML=rozet(o,true)+'<span>'+esc(window.LEX_HUKUK_AD(o))+'</span>';h.setAttribute('role','button');h.setAttribute('aria-label','Okulunu değiştir: '+o.ad);}
    else{h.className='';h.textContent='Cebindeki çalışma asistanın';h.removeAttribute('role');h.removeAttribute('aria-label');}
  }
  function okListe(){
    var q=norm($('lex-ok-ara').value.trim()),mev=window.LEX_OKUL(),o='',n=0;
    OKULLAR.forEach(function(x,i){if(q&&norm(x.ad+' '+x.kisa+' '+x.sehir).indexOf(q)<0)return;n++;
      o+='<button type="button" class="lex-ok-s'+(mev&&mev.ad===x.ad?' on':'')+'" data-i="'+i+'" role="option">'+rozet(x)+'<span>'+esc(x.ad)+'<small>'+esc(x.sehir)+(x.tur&&x.tur!=='Devlet'?' · '+esc(x.tur):'')+'</small></span></button>';});
    $('lex-ok-liste').innerHTML=o||'<p class="lex-bos">Bulunamadı. Okulun listede yoksa aşağıdan atlayabilirsin.</p>';
    $('lex-ok-say').textContent=q?n+' sonuç':OKULLAR.length+' fakülte';
    [].forEach.call(document.querySelectorAll('#lex-ok-liste .lex-ok-s'),function(b){b.addEventListener('click',function(){var x=OKULLAR[+b.dataset.i];okBitti({ad:x.ad,kisa:x.kisa});});});
  }
  function okAc(ilkMi){OKSOZ.then(function(){okIlk=!!ilkMi;$('lex-ok-ara').value='';$('lex-ok-atla').textContent=ilkMi?'Listede yok / şimdilik atla':(window.LEX_OKUL()?'Okul seçimini kaldır':'Vazgeç');okListe();ac(op);});}
  function okBitti(o){
    var eski=window.LEX_OKUL();yaz('lex-okul',o||{});okBaslik();kapat(op);
    if((o&&o.ad)!==(eski&&eski.ad)&&window.LEX_SAYAC_YENI)window.LEX_SAYAC_YENI();
    if(okIlk&&!oku('lex-dersler',null))setTimeout(function(){drAc(true);},320);
  }
  $('lex-ok-ara').addEventListener('input',okListe);
  $('lex-ok-atla').addEventListener('click',function(){if(okIlk||window.LEX_OKUL())okBitti(null);else kapat(op);});
  op.addEventListener('click',function(e){if(e.target===op&&!okIlk)kapat(op);});
  document.querySelector('.ust h1').addEventListener('click',function(e){if(e.target.closest('.lex-okul'))okAc(false);});
  okBaslik();
  suruklekapat(op,'lex-ok-atla');

  // ---------- dersleri düzenle ----------
  var dp=$('lex-dr-p'),sec=[],ozel=[],ilk=false,secSinif=null;
  function sinifBul(){var k=null;['1','2','3','4','H'].forEach(function(s){var l=LEX_SINIF[s];if(!k&&l.every(function(x){return sec.indexOf(x)>=0;}))k=s;});return k;}
  function tumu(){var t=[];['1','2','3','4','H'].forEach(function(s){LEX_SINIF[s].forEach(function(x){if(t.indexOf(x)<0)t.push(x);});});return t;}
  function drCiz(){
    cipler('lex-dr-sinif',['1','2','3','4','H'].map(function(s){return [s,LEX_SINIF_AD[s]];}),secSinif,function(s){secSinif=s;sec=LEX_SINIF[s].concat(ozel.filter(function(x){return sec.indexOf(x)>=0;}));drCiz();});
    cipler('lex-dr-liste',tumu().concat(ozel).map(function(x){return [x,x];}),sec,function(x){var i=sec.indexOf(x);if(i>=0)sec.splice(i,1);else sec.push(x);drCiz();},true);
    $('lex-dr-say').textContent=sec.length+' ders seçili';$('lex-dr-kaydet').disabled=!sec.length;
  }
  function drAc(ilkMi){
    ilk=!!ilkMi;sec=lexDersler().slice();var t=tumu();ozel=sec.filter(function(x){return t.indexOf(x)<0;});
    if(ilk)sec=[];secSinif=ilk?null:(oku('lex-sinif',null)||sinifBul());
    $('lex-dr-b').textContent=ilk?(window.LEX_OKUL()?'Kaçıncı sınıftasın?':'Hoş geldin! Kaçıncı sınıftasın?'):'Derslerim';$('lex-dr-vazgec').hidden=false;$('lex-dr-vazgec').textContent=ilk?'Şimdilik atla':'Vazgeç';
    $('lex-dr-yeni').value='';$('lex-dr-hata').textContent='';drCiz();ac(dp);
  }
  $('lex-dr-ekle').addEventListener('click',function(){
    var v=$('lex-dr-yeni').value.replace(/[<>&"]/g,'').replace(/\s+/g,' ').trim().slice(0,30),h='';
    if(!v)return;
    if(v==='Diğer'||tumu().concat(ozel).some(function(x){return x.toLocaleLowerCase('tr')===v.toLocaleLowerCase('tr');}))h='Bu ders zaten listede.';
    else if(ozel.length>=15)h='En fazla 15 özel ders ekleyebilirsin.';
    $('lex-dr-hata').textContent=h;if(h)return;
    ozel.push(v);sec.push(v);$('lex-dr-yeni').value='';drCiz();
  });
  // ilk açılışta 'Şimdilik atla': tüm dersler (varsayılan liste) kaydedilir, sonra Derslerim'den değiştirilebilir
  suruklekapat(dp,'lex-dr-vazgec');
  $('lex-dr-vazgec').addEventListener('click',function(){if(ilk){yaz('lex-dersler',LEX_SINIF.H.slice());location.reload();return;}kapat(dp);});
  $('lex-dr-kaydet').addEventListener('click',function(){
    if(!sec.length)return;
    var sira=tumu().concat(ozel).filter(function(x){return sec.indexOf(x)>=0;});
    yaz('lex-dersler',sira);if(secSinif)yaz('lex-sinif',secSinif);location.reload();
  });
  var db=$('lex-ders-btn');if(db)db.addEventListener('click',function(){drAc(false);});
  (function(){var du=oku('pm-durum',null);if(du&&du.calisiyor)return;
    OKSOZ.then(function(){
    if(!oku('lex-okul',null)&&OKULLAR.length)setTimeout(function(){okAc(true);},400);
    else if(!oku('lex-dersler',null))setTimeout(function(){drAc(true);},400);});})();

  // ---------- sınav takvimi ----------
  var SN_K='lex-sinavlar',TURLER=['Vize','Final','Bütünleme','HMGS','Diğer'];
  var AYK=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],GK=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  var sp=$('lex-sn-p'),sDuz=null,sTur='Vize';
  function liste(){var l=oku(SN_K,[]);return Array.isArray(l)?l:[];}
  function gunFark(iso){var p=iso.split('-'),h=new Date(+p[0],+p[1]-1,+p[2]),b=new Date();b.setHours(0,0,0,0);return Math.round((h-b)/864e5);}
  function tarihYaz(iso){var p=iso.split('-'),t=new Date(+p[0],+p[1]-1,+p[2]);return t.getDate()+' '+AYK[t.getMonth()]+' '+GK[t.getDay()]+(t.getFullYear()!==new Date().getFullYear()?' '+t.getFullYear():'');}
  function kalanYaz(f){return f===0?'Bugün':f===1?'Yarın':f+' gün';}
  function notYaz(n){return String(Math.round(n*10)/10).replace('.',',');}
  function bugunISO(){var t=new Date();return t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);}
  function ad(x){return x.tur==='HMGS'?'HMGS':x.ders+' · '+x.tur;}
  function snCiz(){
    var l=liste(),gel=[],gec=[];
    l.forEach(function(x){(gunFark(x.tarih)>=0?gel:gec).push(x);});
    gel.sort(function(a,b){return a.tarih<b.tarih?-1:1;});gec.sort(function(a,b){return a.tarih<b.tarih?1:-1;});
    var o='';
    gel.forEach(function(x){var f=gunFark(x.tarih);o+='<button type="button" class="lex-sr" data-id="'+x.id+'"><span>'+esc(ad(x))+'<small>'+tarihYaz(x.tarih)+'</small></span><b>'+kalanYaz(f)+'</b></button>';});
    gec.slice(0,12).forEach(function(x){var n=x.not;o+='<button type="button" class="lex-sr eski" data-id="'+x.id+'"><span>'+esc(ad(x))+'<small>'+tarihYaz(x.tarih)+'</small></span>'+(n===null||n===undefined?'<b class="gecti">Notu gir ›</b>':'<b class="notlu">'+notYaz(n)+'</b>')+'</button>';});
    $('lex-sn-liste').innerHTML=o||'<p class="lex-bos">Henüz sınav eklemedin. Vize, final ya da HMGS tarihini ekle; kalan günü burada ve Çalışma ekranında gör.</p>';
    $('lex-sn-ozet').textContent=gel.length?gel.length+' sınav yaklaşıyor · en yakını '+kalanYaz(gunFark(gel[0].tarih)).toLocaleLowerCase('tr'):'Vize, final ve HMGS tarihlerini ekle.';
    [].forEach.call(document.querySelectorAll('#lex-sn-liste .lex-sr'),function(b){b.addEventListener('click',function(){snAc(b.dataset.id);});});
    // sayaç ekranındaki şerit
    var y=$('lex-yakin');if(y){if(gel.length){var x=gel[0];y.hidden=false;var yh='<span><i class="lex-kum" aria-hidden="true"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11M6.5 20.5h11M8 3.5c0 4 4 5.5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5.5-4 8.5s4 4.5 4 8.5"/></svg></i> '+esc(ad(x))+' · '+tarihYaz(x.tarih)+'</span><b>'+kalanYaz(gunFark(x.tarih))+'</b>';if(y._h!==yh){y._h=yh;y.innerHTML=yh;}}else{y.hidden=true;y._h='';}}
    ortCiz(l);
  }
  function ortCiz(l){
    var w=+oku('lex-agirlik',40);if([30,40,50].indexOf(w)<0)w=40;$('lex-agr').value=String(w);
    var D={},sira=[];
    l.slice().sort(function(a,b){return a.tarih<b.tarih?-1:1;}).forEach(function(x){
      if(x.not===null||x.not===undefined||['Vize','Final','Bütünleme'].indexOf(x.tur)<0)return;
      if(!D[x.ders]){D[x.ders]={};sira.push(x.ders);}D[x.ders][x.tur]=x.not;});
    var o='';
    sira.forEach(function(d){var v=D[d].Vize,f=D[d]['Bütünleme']!==undefined?D[d]['Bütünleme']:D[d].Final,but=D[d]['Bütünleme']!==undefined;
      var alt=[];if(v!==undefined)alt.push('Vize '+notYaz(v));if(f!==undefined)alt.push((but?'Bütünleme ':'Final ')+notYaz(f));
      var ort=(v!==undefined&&f!==undefined)?notYaz(v*w/100+f*(100-w)/100):'–';
      o+='<div class="lex-or"><span>'+esc(d)+'<small>'+alt.join(' · ')+'</small></span><b>'+ort+'</b></div>';});
    $('lex-ort-liste').innerHTML=o;$('lex-ort-k').hidden=!sira.length;
  }
  $('lex-agr').addEventListener('change',function(){yaz('lex-agirlik',+this.value);ortCiz(liste());});
  function turCiz(){cipler('lex-sn-tur',TURLER.map(function(t){return [t,t];}),sTur,function(t){sTur=t;turCiz();});$('lex-sn-ders').disabled=sTur==='HMGS';}
  function snAc(id){
    var l=liste(),x=null;l.forEach(function(k){if(String(k.id)===String(id))x=k;});sDuz=x?x.id:null;
    var s=$('lex-sn-ders');s.innerHTML='';var dl=lexDersler().concat(['Diğer']);if(x&&x.ders&&dl.indexOf(x.ders)<0)dl.unshift(x.ders);
    dl.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;s.appendChild(o);});
    sTur=x?x.tur:'Vize';if(x&&x.ders)s.value=x.ders;
    $('lex-sn-tarih').value=x?x.tarih:'';$('lex-sn-not').value=(x&&x.not!==null&&x.not!==undefined)?x.not:'';
    $('lex-sn-b').textContent=x?'Sınavı düzenle':'Sınav ekle';$('lex-sn-sil').hidden=!x;$('lex-sn-hata').textContent='';
    turCiz();ac(sp);
  }
  $('lex-sn-ekle').addEventListener('click',function(){snAc(null);});
  $('lex-sn-kaydet').addEventListener('click',function(){
    var t=$('lex-sn-tarih').value,nv=$('lex-sn-not').value.replace(',','.'),n=nv===''?null:+nv;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(t)){$('lex-sn-hata').textContent='Sınav tarihini seç.';return;}
    if(n!==null&&(isNaN(n)||n<0||n>100)){$('lex-sn-hata').textContent='Not 0 ile 100 arasında olmalı.';return;}
    var l=liste(),k={id:sDuz||Date.now(),ders:sTur==='HMGS'?'':$('lex-sn-ders').value,tur:sTur,tarih:t,not:n};
    l=l.filter(function(x){return x.id!==k.id;});l.push(k);yaz(SN_K,l.slice(-200));kapat(sp);snCiz();if(window.LEX_BILDIRIM_YENILE)window.LEX_BILDIRIM_YENILE();
  });
  $('lex-sn-sil').addEventListener('click',function(){if(sDuz===null)return;yaz(SN_K,liste().filter(function(x){return x.id!==sDuz;}));kapat(sp);snCiz();if(window.LEX_BILDIRIM_YENILE)window.LEX_BILDIRIM_YENILE();});
  var yk=$('lex-yakin');if(yk)yk.addEventListener('click',function(){if(window.MF_SAYFA)window.MF_SAYFA('program');window.scrollTo(0,document.body.scrollHeight);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)snCiz();});
  snCiz();
})();
