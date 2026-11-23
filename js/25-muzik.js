/* Hukukçunun Ufku · yolculuk müziği (Web Audio)
   Sütunlu yolda tek parça: yol-ezgi (D Dorian, 3/4, 88 BPM, 151,363 sn, kesintisiz döngü; ilerlemeden bağımsız).
   Tapınağa girince 5 sn eşit güçte geçişle tapinak, çıkınca yine 5 sn ile yol-ezgi (kaldığı konumdan). Rütbe töreninde döngü kısılır, toren çalar.
   Döngü AudioBufferSourceNode.loop ile örnek hassasiyetinde; AAC başlatma boşluğu varsa kırpılır.
   Ufuk sahnesi, günlük sorular (mt-test/mt-sonuc), tapınak ya da tören açıkken çalar; sayfa gizlenince/başka sekmeye geçince AudioContext askıya alınır.
   Varsayılan KAPALI. */
(function(){
  'use strict';
  var ANAHTAR='lex-ufuk-muzik',KLASOR='ses/ufuk/',SES=0.6,DONGU=6675108/44100;   /* yol-ezgi döngü uzunluğu: 151,363 sn */
  var CUE={'yol':'yol-ezgi','tapinak':'tapinak'};   /* cue -> dosya (ses/ufuk/<ad>.m4a) */
  var GECIS=5,MAXBUF=2,UZUN_DURAK=45000;
  function az(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  var AC=window.AudioContext||window.webkitAudioContext;
  var acik=false;try{acik=JSON.parse(localStorage.getItem(ANAHTAR)||'false')===true;}catch(e){}
  var ctx=null,master=null,bus=null,ana=null,gecen=null,calismaSesi=false,torenAktif=false,torenKaynak=null,torenGain=null,torenTok=0;
  var tampon={},sira=[],yukleme={},uzunT=null,bayrak='',gen=0,hata=0,beklerKilit=false,isle=false,bekleT=0,yolKonum=0;
  var SINE=null,COSN=null;
  (function(){var n=129;SINE=new Float32Array(n);COSN=new Float32Array(n);for(var i=0;i<n;i++){var t=i/(n-1)*Math.PI/2;SINE[i]=Math.sin(t);COSN[i]=Math.cos(t);}})();

  /* ---------- görünürlük / istek ---------- */
  function gor(el){return !!(el&&!el.hidden&&el.offsetParent!==null);}
  function sahneGor(){var b=document.body;if(!b||!b.classList.contains('s-mantik'))return false;
    var g=document.getElementById('mt-giris');return !!(gor(g)&&g.querySelector('.uf-sahne'));}
  /* günlük sorular Ufuk sahnesinden açılır: test ve sonuç ekranı da "Ufuk'ta" sayılır (ders testleri/dt-calis sayılmaz) */
  function testGor(){var b=document.body;if(!b||!b.classList.contains('s-mantik'))return false;
    return gor(document.getElementById('mt-test'))||gor(document.getElementById('mt-sonuc'));}
  function tapinakGor(){return !!document.querySelector('.tp-kap:not(.kapan)');}
  function hedefCue(){return tapinakGor()?'tapinak':'yol';}
  function istek(){
    var gorunur=sahneGor()||testGor()||tapinakGor()||torenAktif;
    return {calsin:acik&&!document.hidden&&gorunur&&!calismaSesi&&!!AC,cue:hedefCue()};
  }

  /* ---------- tampon (çözülmüş PCM) önbelleği ---------- */
  function guvende(id){return (ana&&ana.id===id)||(gecen&&gecen.id===id);}
  /* en çok n çözülmüş tampon kalsın: çalanlar (guvende) silinmez, en eskiden başlanır */
  function sigdir(n){n=n===undefined?MAXBUF:n;while(sira.length>n){var s=-1;for(var i=0;i<sira.length;i++)if(!guvende(sira[i])){s=i;break;}if(s<0)break;delete tampon[sira[s]];sira.splice(s,1);}}
  function yerVar(id){if(tampon[id])return true;sigdir(MAXBUF-1);return sira.length<MAXBUF;}
  /* AAC başlatma gecikmesi: çözücü bazen başa/sona sessizlik ekler; yol-ezgi için belgedeki uzunluğa göre kırp */
  function kirp(id,buf){
    if(id!=='yol-ezgi')return {b:buf,kirpilan:0,bas:0};
    var sr=buf.sampleRate,hedef=Math.round(DONGU*sr),fazla=buf.length-hedef;
    if(fazla<=0||fazla>sr*0.2)return {b:buf,kirpilan:0,bas:0};
    var n=buf.numberOfChannels,d=[],i,c,bas=0;
    for(c=0;c<n;c++)d.push(buf.getChannelData(c));
    var lim=Math.min(fazla,buf.length);
    while(bas<lim){var s=false;for(c=0;c<n;c++)if(Math.abs(d[c][bas])>1e-3){s=true;break;}if(s)break;bas++;}
    var yeni=ctx.createBuffer(n,hedef,sr);
    for(c=0;c<n;c++)yeni.copyToChannel(d[c].subarray(bas,bas+hedef),c);
    return {b:yeni,kirpilan:fazla,bas:bas};
  }
  function indir(id){
    return caches_al(id).then(function(ab){return new Promise(function(ok,no){var p=ctx.decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(no);});});
  }
  function caches_al(id){return fetch(KLASOR+id+'.m4a').then(function(r){if(!r.ok)throw 0;return r.arrayBuffer();});}
  function yukle(id){
    if(tampon[id])return Promise.resolve(tampon[id]);
    if(yukleme[id])return yukleme[id];
    if(!ctx||Date.now()<bekleT||!yerVar(id))return Promise.resolve(null);
    var g=gen;
    var p=indir(id).then(function(b){
      delete yukleme[id];
      if(g!==gen||!ctx)return null;
      var k=kirp(id,b);tampon[id]=k.b;tampon[id].__kirp=k.kirpilan;sira.push(id);hata=0;
      return tampon[id];
    },function(){delete yukleme[id];hata++;bekleT=Date.now()+4000*Math.min(hata,6);if(hata===1&&window.MF_TOAST)MF_TOAST('Müzik indirilemedi. Bağlantını kontrol et.');return null;});
    yukleme[id]=p;return p;
  }

  /* ---------- ses grafiği ---------- */
  function kur(){
    if(ctx)return true;
    try{ctx=new AC({latencyHint:'playback',sampleRate:22050});}catch(e){try{ctx=new AC();}catch(x){ctx=null;return false;}}
    master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    bus=ctx.createGain();bus.gain.value=1;bus.connect(master);
    return true;
  }
  function konum(v){var d=v.buf.duration;return (((ctx.currentTime-v.t0)%d)+d)%d;}
  function yokEt(){gen++;[ana,gecen].forEach(function(v){if(v)vSil(v);});ana=gecen=null;tampon={};sira=[];yukleme={};
    if(torenKaynak){try{torenKaynak.stop();}catch(e){}torenKaynak=null;}
    clearTimeout(uzunT);uzunT=null;}
  function vSil(v){
    if(v.cue==='yol'&&ctx){try{yolKonum=konum(v);}catch(e){}}   /* yola dönünce kaldığı yerden sürsün */
    if(v.src){try{v.src.stop();}catch(e){}try{v.src.disconnect();}catch(e){}}
    try{v.gain.disconnect();}catch(e){}
  }
  /* yeni ses katmanı (döngülü): ctx zamanında 'basla' anında 'off' sn konumundan; egri: eşit güçte giriş eğrisi süresi */
  function vYap(cue,id,buf,basla,off,egri){
    var g=ctx.createGain();g.connect(bus);
    if(egri){g.gain.setValueAtTime(0,0);g.gain.setValueCurveAtTime(SINE,basla,egri);}
    var s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.loopStart=0;s.loopEnd=buf.duration;s.connect(g);
    s.start(basla,off);
    return {cue:cue,id:id,gain:g,buf:buf,src:s,t0:basla-off};
  }

  /* ---------- geçişler ---------- */
  function gecis(cue){
    if(gecen||isle)return;
    var eski=ana,g=gen,sure=az()?1.2:GECIS,id=CUE[cue];
    isle=true;
    yukle(id).then(function(b){
      isle=false;
      if(g!==gen||!ctx||!b)return;
      if(ana!==eski||gecen)return;
      if(!istek().calsin||hedefCue()!==cue)return;
      var basla=ctx.currentTime+0.06,off=cue==='yol'?Math.min(yolKonum,b.duration-1):0;
      if(off<0)off=0;
      if(!eski){ana=vYap(cue,id,b,basla,off,0);return;}
      var nv=vYap(cue,id,b,basla,off,sure);
      eski.gain.gain.cancelScheduledValues(0);eski.gain.gain.setValueAtTime(1,basla);eski.gain.gain.setValueCurveAtTime(COSN,basla,sure);
      gecen=eski;ana=nv;
      var bitir=function(){
        if(gecen!==eski)return;
        if(ctx&&ctx.currentTime<basla+sure+0.1){setTimeout(bitir,500);return;}   /* ctx askıdaysa geçiş zamanı da durur */
        vSil(eski);gecen=null;sigdir();uyumla();
      };
      setTimeout(bitir,(sure+0.3)*1000);
    });
  }

/* ---------- ana akış ---------- */
  function durdur(hizli){
    if(!ctx)return;
    clearTimeout(uzunT);bayrak='dur';
    var t=ctx.currentTime;
    try{master.gain.cancelScheduledValues(0);
      if(hizli)master.gain.setValueAtTime(0,t);else master.gain.setTargetAtTime(0,t,0.07);}catch(e){}
    var f=function(){if(bayrak==='dur'&&ctx&&ctx.state==='running')ctx.suspend().catch(function(){});};
    if(hizli||ctx.state!=='running')f();else setTimeout(f,380);
    uzunT=setTimeout(function(){if(bayrak==='dur'){yokEt();}},UZUN_DURAK);
  }
  function uyumla(){
    if(!AC)return;
    var s=istek();
    if(!s.calsin){if(ctx&&bayrak!=='dur')durdur(document.hidden);arayuz();return;}
    if(!kur())return;
    clearTimeout(uzunT);uzunT=null;
    if(ctx.state!=='running'){
      var pr;try{pr=ctx.resume();}catch(e){}
      if(pr&&pr.then)pr.then(function(){if(ctx.state==='running')uyumla();else bekleKilit();},bekleKilit);else bekleKilit();
      return;
    }
    if(bayrak!=='cal'){   /* kısa ses yükselmesi */
      var t=ctx.currentTime;try{master.gain.cancelScheduledValues(0);master.gain.setValueAtTime(0,t);master.gain.linearRampToValueAtTime(SES,t+(az()?0.3:1.5));}catch(e){}
      bayrak='cal';
    }
    if(!ana)gecis(s.cue);
    else if(!gecen&&ana.cue!==s.cue)gecis(s.cue);
    arayuz();
  }
  /* Kayıtlı 'açık' ama tarayıcı henüz kullanıcı hareketi görmediyse: ilk dokunuşta başlat */
  function bekleKilit(){
    if(beklerKilit)return;beklerKilit=true;
    var f=function(){['pointerdown','keydown','touchend'].forEach(function(t){document.removeEventListener(t,f,true);});beklerKilit=false;uyumla();};
    ['pointerdown','keydown','touchend'].forEach(function(t){document.addEventListener(t,f,true);});
  }

  /* ---------- tören: döngüyü kıs, toren'i bir kez çal ---------- */
  function torenBasla(){
    torenAktif=true;
    if(!acik||!AC||!kur())return;
    var tk=++torenTok,g=gen;
    uyumla();
    var hz=ctx.state==='running'?Promise.resolve():ctx.resume();
    hz.then(function(){return caches_al('toren');}).then(function(ab){return new Promise(function(ok,no){var p=ctx.decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(no);});}).then(function(b){
      if(tk!==torenTok||!torenAktif||g!==gen||!ctx||ctx.state!=='running')return;
      var t=ctx.currentTime;
      torenGain=ctx.createGain();torenGain.connect(master);
      torenGain.gain.setValueAtTime(0,t);torenGain.gain.linearRampToValueAtTime(1,t+(az()?0.2:1));
      var s=ctx.createBufferSource();s.buffer=b;s.connect(torenGain);s.start(t+0.02);torenKaynak=s;
      bus.gain.cancelScheduledValues(0);bus.gain.setTargetAtTime(0.15,t,0.125);
      s.onended=function(){if(torenKaynak===s){torenKaynak=null;torenGain=null;}
        if(ctx&&bus){var n=ctx.currentTime;bus.gain.cancelScheduledValues(0);bus.gain.setTargetAtTime(1,n,0.5);}};
    }).catch(function(){});
  }
  function torenBitir(){
    if(!torenAktif)return;torenAktif=false;torenTok++;
    if(ctx&&torenGain&&torenKaynak){
      var t=ctx.currentTime,s=torenKaynak,gk=torenGain;
      try{gk.gain.cancelScheduledValues(0);gk.gain.setTargetAtTime(0,t,0.12);}catch(e){}
      setTimeout(function(){try{s.stop();}catch(e){}},700);
    }
    if(ctx&&bus){var n=ctx.currentTime;bus.gain.cancelScheduledValues(0);bus.gain.setTargetAtTime(1,n,0.5);}
    uyumla();
  }

  /* ---------- arayüz: hoparlör düğmesi ---------- */
  var IK_A='<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5z" fill="currentColor"/><path d="M15.4 9a4.2 4.2 0 010 6M17.8 6.6a7.6 7.6 0 010 10.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  var IK_K='<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  function dugme(){return '<button type="button" class="uf-mz'+(acik?' ac':'')+'" aria-label="Müzik" aria-pressed="'+(acik?'true':'false')+'">'+(acik?IK_A:IK_K)+'</button>';}
  function arayuz(){
    [].forEach.call(document.querySelectorAll('.uf-mz'),function(b){
      b.setAttribute('aria-pressed',acik?'true':'false');b.classList.toggle('ac',acik);
      var h=b.innerHTML.indexOf('M16 9.5l5')>=0;if(acik===h)b.innerHTML=acik?IK_A:IK_K;});
  }
  function ayarla(v){
    acik=!!v;try{localStorage.setItem(ANAHTAR,JSON.stringify(acik));}catch(e){}
    if(acik&&calismaSesi&&window.MF_TOAST)MF_TOAST('Çalışma sesi çalıyor. O durunca Ufuk müziği başlar.');
    uyumla();arayuz();
  }
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('.uf-mz');if(!b)return;
    e.stopPropagation();ayarla(!acik);   /* ctx bu tıklama (kullanıcı hareketi) içinde oluşur ve resume edilir */
  },true);
  ['pointerdown','pointerup'].forEach(function(t){document.addEventListener(t,function(e){if(e.target&&e.target.closest&&e.target.closest('.uf-mz'))e.stopPropagation();},true);});

  /* ---------- durum izleme ---------- */
  function izle(){
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){uyumla();});
      mo.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true});
      ['mt-giris','mt-test','mt-sonuc'].forEach(function(i){var g=document.getElementById(i);if(g)mo.observe(g,{attributes:true,attributeFilter:['hidden'],childList:true});});
    }
    setInterval(function(){if(acik||ctx)uyumla();},1000);
    document.addEventListener('visibilitychange',function(){uyumla();});
    window.addEventListener('pagehide',function(){if(ctx)durdur(true);});
    window.addEventListener('pageshow',function(){uyumla();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',izle);else izle();

  window.LEX_UFUK_MUZIK={
    dugme:dugme,
    toren:torenBasla,torenBitti:torenBitir,
    calismaSesi:function(v){v=!!v;if(v===calismaSesi)return;calismaSesi=v;uyumla();},
    ac:function(){return acik;},ayarla:ayarla,
    durum:function(){
      var v=function(x){return x&&{cue:x.cue,id:x.id,konum:ctx?+konum(x).toFixed(3):null,kazanc:+x.gain.gain.value.toFixed(3),dongu:x.src.loop};};
      var bl={};sira.forEach(function(k){bl[k]={kare:tampon[k].length,sn:+tampon[k].duration.toFixed(5),kirpilan:tampon[k].__kirp,sr:tampon[k].sampleRate};});
      return {acik:acik,ctx:ctx?ctx.state:null,sr:ctx?ctx.sampleRate:null,calisiyor:!!(ctx&&ctx.state==='running'&&ana),cue:ana?ana.cue:null,ana:v(ana),gecen:v(gecen),yolKonum:+yolKonum.toFixed(3),hedef:hedefCue(),istek:istek(),
        ses:master?+master.gain.value.toFixed(3):null,bus:bus?+bus.gain.value.toFixed(3):null,toren:{aktif:torenAktif,calan:!!torenKaynak},tamponlar:bl,tamponSay:sira.length,calismaSesi:calismaSesi};},
    _konumla:function(kalan){   /* test: ana katmanı döngü sonuna 'kalan' sn kala getir */
      if(!ctx||!ana||gecen)return false;var a=ana,b=a.buf,now=ctx.currentTime+0.05,off=Math.max(0,b.duration-kalan);
      try{a.src.stop();a.src.disconnect();}catch(e){}
      var s=ctx.createBufferSource();s.buffer=b;s.loop=true;s.loopStart=0;s.loopEnd=b.duration;s.connect(a.gain);s.start(now,off);a.src=s;a.t0=now-off;return true;}
  };
})();
