// ================= YEDEKLE-DIŞI: YEREL BİLDİRİMLER (yalnız Android uygulaması) =================
(function(){
  var LN=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
  if(!LN)return; // web'de tamamen pasif
  var K='lex-bildirim',KANAL='calisma';
  var VARSAYILAN={acik:false,gunluk:{acik:false,saat:'20:00'},sinav:{acik:true},program:{acik:false}};
  function oku(k,v){try{var x=localStorage.getItem(k);return x?JSON.parse(x):v;}catch(e){return v;}}
  function ayarOku(){var a=oku(K,null)||{};return {acik:!!a.acik,
    gunluk:{acik:!!(a.gunluk&&a.gunluk.acik),saat:(a.gunluk&&/^\d{1,2}:\d{2}$/.test(a.gunluk.saat))?a.gunluk.saat:'20:00'},
    sinav:{acik:!(a.sinav&&a.sinav.acik===false)},program:{acik:!!(a.program&&a.program.acik)}};}
  function ayarYaz(a){try{localStorage.setItem(K,JSON.stringify(a));}catch(e){}}
  function gunAnahtar(t){var x=new Date(t);return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate();}
  function saatAyir(s){var p=String(s).split(':');return [Math.min(23,Math.max(0,+p[0]||0)),Math.min(59,Math.max(0,+p[1]||0))];}
  function gunSaat(off,h,m){var t=new Date();t.setHours(0,0,0,0);t.setDate(t.getDate()+off);t.setHours(h,m,0,0);return t;}
  function bugunCalisti(){var k=oku('pm-kayit',{}),b=k[gunAnahtar(Date.now())];return !!(b&&(b.dk>0||b.p>0));}
  function iki(n){return (n<10?'0':'')+n;}
  function programGun(off){ // 0=Pzt..6=Paz
    var pr=oku('mf-program',null),i=(new Date(gunSaat(off,12,0)).getDay()+6)%7;
    return (pr&&pr.g&&Array.isArray(pr.g[i]))?pr.g[i]:[];}
  function dersListe(l){return l.map(function(o){return o.ders;}).filter(function(x,i,a){return x&&a.indexOf(x)===i;}).slice(0,4).join(', ');}
  function sinavAd(x){var d=x.ders||'',t=(x.tur&&x.tur!=='Diğer')?x.tur:'';return (d+(d&&t?' ':'')+t)||'Sınav';}
  var GUNLUK_ID=1000,PROGRAM_ID=2000,SINAV_ID=3000;
  function hepsiIdler(){var l=[],i;for(i=0;i<7;i++){l.push({id:GUNLUK_ID+i});l.push({id:PROGRAM_ID+i});}for(i=0;i<100;i++)l.push({id:SINAV_ID+i});return l;}
  function kendiMi(id){return (id>=1000&&id<1007)||(id>=2000&&id<2007)||(id>=3000&&id<3100);}
  function planla(){
    var a=ayarOku(),simdi=Date.now()+10000,liste=[],i;
    if(!a.acik)return liste;
    var calisti=bugunCalisti(),sd=saatAyir(a.gunluk.saat);
    function ekle(id,at,baslik,govde){if(at.getTime()>simdi)liste.push({id:id,title:baslik,body:govde,channelId:KANAL,schedule:{at:at,allowWhileIdle:true},isExactNotification:false,isExactMandatory:false});/* tam zamanlı alarm isteme: eklenti 8.3+ izin yoksa ayar sayfasını açıyor */}
    // 1+3: gunluk (programla birlesik) ve program
    for(i=0;i<7;i++){
      var pg=programGun(i),at=gunSaat(i,sd[0],sd[1]),atla=(i===0&&calisti),bas='Lex Odak ⚖️';
      var zamanli=pg.filter(function(o){return o&&/^\d{1,2}:\d{2}$/.test(o.saat||'');}).sort(function(x,y){var p=saatAyir(x.saat),q=saatAyir(y.saat);return p[0]*60+p[1]-q[0]*60-q[1];});
      var zamansiz=pg.length&&!zamanli.length;
      if(a.program.acik&&zamanli.length){
        var f=zamanli[0],fs=saatAyir(f.saat),ft=gunSaat(i,fs[0],fs[1]);ft.setMinutes(ft.getMinutes()-10);
        ekle(PROGRAM_ID+i,ft,bas,'Programına göre '+iki(fs[0])+':'+iki(fs[1])+"'de "+f.ders+' var.');
      }
      if(atla)continue;
      if(a.gunluk.acik){
        var g='Bugün henüz çalışmadın.';
        if(a.program.acik&&zamansiz)g+=' Programında: '+dersListe(pg)+'.';else g+=' Kısa bir odak oturumu yeter.';
        ekle(GUNLUK_ID+i,at,bas,g);
      }else if(a.program.acik&&zamansiz){
        ekle(PROGRAM_ID+i,at,bas,'Bugünkü programın: '+dersListe(pg)+'.');
      }
    }
    // 2: sinavlar
    if(a.sinav.acik){
      var sl=oku('lex-sinavlar',[]);if(!Array.isArray(sl))sl=[];
      var b=new Date();b.setHours(0,0,0,0);
      var gel=sl.map(function(x){var q=String(x.tarih||'').split('-'),t=new Date(+q[0],+q[1]-1,+q[2]);return {ad:sinavAd(x),t:t,id:x.id};})
        .filter(function(x){return !isNaN(x.t.getTime())&&x.t>=b;}).sort(function(x,y){return x.t-y.t;}).slice(0,50);
      gel.forEach(function(x,n){
        var d3=new Date(x.t);d3.setDate(d3.getDate()-3);d3.setHours(19,0,0,0);
        var d1=new Date(x.t);d1.setDate(d1.getDate()-1);d1.setHours(19,0,0,0);
        ekle(SINAV_ID+n*2,d3,'Sınav yaklaşıyor',x.ad+' sınavına 3 gün kaldı.');
        ekle(SINAV_ID+n*2+1,d1,'Sınav yaklaşıyor','Yarın '+x.ad+' sınavın var — kısa bir tekrar?');
      });
    }
    return liste;
  }
  var sira=Promise.resolve();
  function yenile(){sira=sira.then(function(){return isle();}).catch(function(){});return sira;}
  function isle(){
    var liste=planla();
    return Promise.resolve().then(function(){return LN.getPending();}).then(function(r){
        var ids=((r&&r.notifications)||[]).filter(function(n){return kendiMi(+n.id);}).map(function(n){return {id:+n.id};});return ids;
      },function(){return hepsiIdler();})
      .then(function(ids){return ids.length?LN.cancel({notifications:ids}):null;})
      .then(function(){return liste.length?LN.schedule({notifications:liste}):null;});
  }
  function bugunuIptal(){sira=sira.then(function(){
    var a=ayarOku();if(!a.acik)return null;
    return LN.cancel({notifications:[{id:GUNLUK_ID},{id:PROGRAM_ID}]});
  }).then(function(){return isle();}).catch(function(){});}
  window.LEX_BILDIRIM_YENILE=yenile;
  window.LEX_BILDIRIM_CALISTI=bugunuIptal;
  function kanalAc(){try{var p=window.Capacitor.getPlatform?window.Capacitor.getPlatform():'android';
    if(p==='android'&&LN.createChannel)return Promise.resolve(LN.createChannel({id:KANAL,name:'Çalışma hatırlatmaları',description:'Günlük, sınav ve program hatırlatmaları',importance:3,visibility:1})).catch(function(){});}catch(e){}return Promise.resolve();}
  function izinIste(){return Promise.resolve(LN.checkPermissions()).then(function(r){
    if(r&&r.display==='granted')return true;
    return Promise.resolve(LN.requestPermissions()).then(function(q){return !!(q&&q.display==='granted');});
  }).catch(function(){return false;});}
  // --- arayuz ---
  var kart=document.getElementById('bld-kart');
  function $(i){return document.getElementById(i);}
  function ciz(){
    var a=ayarOku();
    $('bld-ana').checked=a.acik;$('bld-ic').hidden=!a.acik;
    $('bld-gun').checked=a.gunluk.acik;$('bld-saat').value=iki(saatAyir(a.gunluk.saat)[0])+':'+iki(saatAyir(a.gunluk.saat)[1]);$('bld-saat-k').hidden=!a.gunluk.acik;
    $('bld-sin').checked=a.sinav.acik;$('bld-prg').checked=a.program.acik;
  }
  function kaydetYenile(a){ayarYaz(a);ciz();yenile();}
  function mesaj(t){var m=$('bld-mesaj');m.textContent=t||'';}
  if(kart){
    kart.hidden=false;
    $('bld-ana').addEventListener('change',function(){
      var a=ayarOku(),acik=this.checked;mesaj('');
      if(!acik){a.acik=false;kaydetYenile(a);return;}
      var kutu=this;
      izinIste().then(function(ok){
        if(!ok){kutu.checked=false;mesaj('Bildirim izni verilmedi. Telefon ayarlarından izin verebilirsin.');return;}
        a=ayarOku();a.acik=true;
        kanalAc().then(function(){kaydetYenile(a);});
      });
    });
    $('bld-gun').addEventListener('change',function(){var a=ayarOku();a.gunluk.acik=this.checked;kaydetYenile(a);});
    $('bld-saat').addEventListener('change',function(){var a=ayarOku();if(this.value)a.gunluk.saat=this.value;kaydetYenile(a);});
    $('bld-sin').addEventListener('change',function(){var a=ayarOku();a.sinav.acik=this.checked;kaydetYenile(a);});
    $('bld-prg').addEventListener('change',function(){var a=ayarOku();a.program.acik=this.checked;kaydetYenile(a);});
    ciz();
  }
  // acilis + geri donus
  if(ayarOku().acik)kanalAc().then(yenile);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&ayarOku().acik)yenile();});
})();
