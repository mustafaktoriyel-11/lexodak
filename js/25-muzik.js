/* Hukukçunun Ufku · yolculuk müziği (Web Audio)
   Yol sahnesinde yolun neresinde olunduğuna göre 3 parça (yol-1/2/3), tapınakta tapinak, rütbe töreninde toren.
   Parçalar 72,727 sn'lik (20 ölçü, 66 BPM) aynı ızgarada olduğundan geçişler ölçü hizasında, eşit güçte (4-5 sn) yapılır.
   Döngü sonunda (yol-1: a/b/c, yol-2: a/b) rastgele bir varyant, <audio> değil AudioBufferSourceNode ile örnek hassasiyetinde bağlanır.
   Yalnız Sınav sekmesindeki Ufuk sahnesi ya da tapınak açıkken çalar; sayfa gizlenince AudioContext askıya alınır. Varsayılan KAPALI. */
(function(){
  'use strict';
  var ANAHTAR='lex-ufuk-muzik',KLASOR='ses/ufuk/',SES=0.6,DONGU=3207273/44100;   /* belgedeki döngü uzunluğu: 72,727 sn */
  var CUE={'yol-1':['yol-1a','yol-1b','yol-1c'],'yol-2':['yol-2a','yol-2b'],'yol-3':['yol-3'],'tapinak':['tapinak']};
  var GECIS={yol:4,tapinak:5},MAXBUF=3,OKU_ONCE=22,ZAMANLA=6,BEKLEME=600,UZUN_DURAK=45000;
  var ESIK1=33,ESIK2=75;                     /* ilerleme yüzdesi: yol-1 0-33, yol-2 33-75, yol-3 75-100 */
  function az(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  var AC=window.AudioContext||window.webkitAudioContext;
  var acik=false;try{acik=JSON.parse(localStorage.getItem(ANAHTAR)||'false')===true;}catch(e){}
  var ctx=null,master=null,bus=null,ana=null,gecen=null,beklenen=null,prog=0,calismaSesi=false,torenAktif=false,torenKaynak=null,torenGain=null,torenTok=0;
  var tampon={},sira=[],yukleme={},sonVaryant={},zincir=[],uzunT=null,tickT=null,bandT=null,gozT=null,bayrak='',gen=0,hata=0,beklerKilit=false,isle=false,aday=null,adayT=0,sonOnizle=null,bekleT=0;
  var SINE=null,COSN=null;
  (function(){var n=129;SINE=new Float32Array(n);COSN=new Float32Array(n);for(var i=0;i<n;i++){var t=i/(n-1)*Math.PI/2;SINE[i]=Math.sin(t);COSN[i]=Math.cos(t);}})();

  /* ---------- görünürlük / istek ---------- */
  function sahneGor(){var b=document.body;if(!b||!b.classList.contains('s-mantik'))return false;
    var g=document.getElementById('mt-giris');if(!g||g.hidden)return false;var s=g.querySelector('.uf-sahne');return !!(s&&s.offsetParent!==null);}
  function tapinakGor(){return !!document.querySelector('.tp-kap:not(.kapan)');}
  function bandCue(p){return p<ESIK1?'yol-1':p<ESIK2?'yol-2':'yol-3';}
  function hedefCue(){return tapinakGor()?'tapinak':bandCue(prog);}
  function istek(){
    var gorunur=sahneGor()||tapinakGor()||torenAktif;
    return {calsin:acik&&!document.hidden&&gorunur&&!calismaSesi&&!!AC,cue:hedefCue()};
  }

  /* ---------- tampon (çözülmüş PCM) önbelleği ---------- */
  function guvende(id){return (ana&&(ana.cur.id===id||(ana.next&&ana.next.id===id)))||(gecen&&(gecen.cur.id===id||(gecen.next&&gecen.next.id===id)));}
  /* en çok n çözülmüş tampon kalsın: çalan/zamanlanmış olanlar (guvende) silinmez, en eskiden başlanır */
  function sigdir(n){n=n===undefined?MAXBUF:n;while(sira.length>n){var s=-1;for(var i=0;i<sira.length;i++)if(!guvende(sira[i])){s=i;break;}if(s<0)break;delete tampon[sira[s]];sira.splice(s,1);}}
  function yerVar(id){if(tampon[id])return true;sigdir(MAXBUF-1);return sira.length<MAXBUF;}
  /* AAC başlatma gecikmesi: çözücü bazen başa/sona sessizlik ekler; belgedeki uzunluğa göre kırp */
  function kirp(buf){
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
      var k=kirp(b);tampon[id]=k.b;tampon[id].__kirp=k.kirpilan;sira.push(id);hata=0;
      return tampon[id];
    },function(){delete yukleme[id];hata++;bekleT=Date.now()+4000*Math.min(hata,6);if(hata===1&&window.MF_TOAST)MF_TOAST('Müzik indirilemedi. Bağlantını kontrol et.');return null;});
    yukleme[id]=p;return p;
  }
  function bosta(f){if(window.requestIdleCallback)requestIdleCallback(f,{timeout:3000});else setTimeout(f,1200);}

  /* ---------- ses grafiği ---------- */
  function kur(){
    if(ctx)return true;
    try{ctx=new AC({latencyHint:'playback'});}catch(e){try{ctx=new AC();}catch(x){ctx=null;return false;}}
    master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    bus=ctx.createGain();bus.gain.value=1;bus.connect(master);
    return true;
  }
  function yokEt(){gen++;[ana,gecen].forEach(function(v){if(v)vSil(v);});ana=gecen=null;tampon={};sira=[];yukleme={};
    if(torenKaynak){try{torenKaynak.stop();}catch(e){}torenKaynak=null;}
    clearInterval(tickT);tickT=null;clearTimeout(uzunT);uzunT=null;}
  function vSil(v){
    [v.cur,v.next].forEach(function(s){if(s&&s.src){s.src.onended=null;try{s.src.stop();}catch(e){}try{s.src.disconnect();}catch(e){}}});
    try{v.gain.disconnect();}catch(e){}
  }
  function secVaryant(cue,haric){
    var l=CUE[cue];if(l.length===1)return l[0];
    var son=haric||sonVaryant[cue],ad=l.filter(function(x){return x!==son;});
    return ad[Math.floor(Math.random()*ad.length)];
  }
  /* t0: ctx zamanında bu varyantın 0. örneğinin başladığı an (kare ızgarasına oturtulmuş) */
  function kaynak(buf,t0,off,gain){
    var s=ctx.createBufferSource();s.buffer=buf;s.connect(gain);
    if(off>0)s.start(t0+off>ctx.currentTime?t0+off:ctx.currentTime,off);else s.start(t0);
    return s;
  }
  function kare(t){return Math.round(t*ctx.sampleRate)/ctx.sampleRate;}
  /* yeni ses katmanı: cue, tampon, ctx zamanında 'basla' anında 'off' sn konumundan */
  function vYap(cue,id,buf,basla,off,egri){
    var g=ctx.createGain();g.connect(bus);
    var t0=kare(basla-off);
    if(egri){g.gain.setValueAtTime(0,0);g.gain.setValueCurveAtTime(SINE,basla,egri);}
    var s=kaynak(buf,t0,off,g);
    var v={cue:cue,gain:g,cur:{id:id,buf:buf,src:s,t0:t0,end:t0+buf.duration},next:null,pend:null};
    sonVaryant[cue]=id;
    return v;
  }
  /* sıradaki varyantı seç, çöz, döngü sonuna örnek hassasiyetiyle zamanla (ayni: çözmeden aynı tamponu yinele) */
  function sonraki(v,ayni){
    if(!v||v.next)return;
    if(ayni){
      var s0=kaynak(v.cur.buf,v.cur.end,0,v.gain);
      v.next={id:v.cur.id,buf:v.cur.buf,src:s0,t0:v.cur.end,end:v.cur.end+v.cur.buf.duration};return;}
    if(v.pend)return;
    var l=CUE[v.cue],id=l.length>1?secVaryant(v.cue,v.cur.id):v.cur.id;
    v.pend=yukle(id).then(function(b){
      v.pend=null;
      if(v.next||(v!==ana&&v!==gecen)||!ctx)return;
      if(!b){b=v.cur.buf;id=v.cur.id;}     /* bellek dolu ya da indirilemedi: aynı varyantı yeniden çal */
      var s=kaynak(b,v.cur.end,0,v.gain);
      v.next={id:id,buf:b,src:s,t0:v.cur.end,end:v.cur.end+b.duration};
    });
  }
  function tikla(){
    if(!ctx||ctx.state!=='running')return;
    var now=ctx.currentTime;
    [ana,gecen].forEach(function(v){
      if(!v)return;
      if(v.next&&now>=v.next.t0-0.001){
        zincir.push({cue:v.cue,den:v.cur.id,ye:v.next.id,t0:v.next.t0,fark:v.next.t0-v.cur.end,gecikme:+(now-v.next.t0).toFixed(3)});if(zincir.length>20)zincir.shift();
        try{v.cur.src.disconnect();}catch(e){}
        v.cur=v.next;v.next=null;sonVaryant[v.cue]=v.cur.id;sigdir();
      }
      var kalan=v.cur.end-now;
      if(!v.next){
        /* geçiş sürerken (bellek payı: 3 tampon) yeni katman çözmeden aynı tamponla sürer; yükleme geç kalırsa da aynı tamponla */
        if(kalan<2||(gecen&&v===ana&&kalan<ZAMANLA)){v.pend=null;sonraki(v,true);}
        else if(kalan<OKU_ONCE&&!(gecen&&v===ana))sonraki(v,false);
      }
    });
  }
  function tickBasla(){if(!tickT)tickT=setInterval(tikla,250);}

  /* ---------- geçişler ---------- */
  function gecis(cue){
    if(gecen||isle)return;
    var yeni=cue,eski=ana,g=gen,sure=(yeni==='tapinak'||(eski&&eski.cue==='tapinak'))?GECIS.tapinak:GECIS.yol;
    if(az())sure=Math.min(sure,1.2);
    var id=secVaryant(yeni,null);isle=true;
    yukle(id).then(function(b){
      isle=false;
      if(g!==gen||!ctx||!b)return;
      if(ana!==eski||gecen)return;
      if(!istek().calsin||hedefCue()!==yeni)return;
      var basla=ctx.currentTime+0.06,off=0;
      if(!eski){ana=vYap(yeni,id,b,basla,0,0);bandOnizle();return;}
      if(yeni!=='tapinak'&&eski.cue!=='tapinak'){   /* aynı ızgara: eski katmanın döngü konumundan devam (ölçü hizalı) */
        var d=eski.cur.buf.duration;off=(((basla-eski.cur.t0)%d)+d)%d;
        if(off>b.duration-1)off=0;}
      var nv=vYap(yeni,id,b,basla,off,sure);
      eski.gain.gain.cancelScheduledValues(0);eski.gain.gain.setValueAtTime(1,basla);eski.gain.gain.setValueCurveAtTime(COSN,basla,sure);
      gecen=eski;ana=nv;
      setTimeout(function(){
        if(gecen===eski){vSil(eski);gecen=null;}
        sigdir();uyumla();bandOnizle();
      },(sure+0.3)*1000);
    });
  }
  function bandOnizle(){   /* komşu bandın (ya da tapınağın) parçasını boşta zamanda hazırla */
    clearTimeout(gozT);
    gozT=setTimeout(function(){bosta(function(){
      if(!ctx||!ana||gecen||isle)return;
      var n=null,p=prog;
      if(ana.cue==='yol-1'&&p>ESIK1*0.55)n='yol-2';
      else if(ana.cue==='yol-2'&&p>ESIK1+(ESIK2-ESIK1)*0.6)n='yol-3';
      else if(ana.cue==='yol-3'&&p>85)n='tapinak';
      if(!n||tampon[CUE[n][0]])return;
      var l=CUE[n],id=l.length>1?secVaryant(n,null):l[0];
      if(!tampon[id]&&!yukleme[id])yukle(id);
      sonOnizle=id;
    });},1200);
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
    tickBasla();
    if(!ana){gecis(s.cue);}
    else if(!gecen&&ana.cue!==s.cue){
      var hizli=s.cue==='tapinak'||ana.cue==='tapinak';
      if(aday!==s.cue){aday=s.cue;adayT=Date.now();}
      var gec=BEKLEME-(Date.now()-adayT);
      if(hizli||gec<=0)gecis(s.cue);else{clearTimeout(bandT);bandT=setTimeout(uyumla,gec+30);}
    }else aday=null;
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
      var g=document.getElementById('mt-giris');if(g)mo.observe(g,{attributes:true,attributeFilter:['hidden'],childList:true});
    }
    setInterval(function(){if(acik||ctx)uyumla();},1000);
    document.addEventListener('visibilitychange',function(){uyumla();});
    window.addEventListener('pagehide',function(){if(ctx)durdur(true);});
    window.addEventListener('pageshow',function(){uyumla();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',izle);else izle();

  window.LEX_UFUK_MUZIK={
    dugme:dugme,
    /* sahne her karede çağırır: tt 0..1 (kameranın yol boyunca ilerlemesi) */
    ilerleme:function(tt){var p=Math.max(0,Math.min(1,tt))*100,eski=bandCue(prog);prog=p;
      if(!acik||!ana||gecen)return;
      if(bandCue(p)!==eski||hedefCue()!==ana.cue){clearTimeout(bandT);bandT=setTimeout(uyumla,BEKLEME+30);}
      else bandOnizle();},
    toren:torenBasla,torenBitti:torenBitir,
    calismaSesi:function(v){v=!!v;if(v===calismaSesi)return;calismaSesi=v;uyumla();},
    ac:function(){return acik;},ayarla:ayarla,
    durum:function(){
      var v=function(x){return x&&{cue:x.cue,id:x.cur.id,sonraki:x.next?x.next.id:null,konum:ctx?+(((ctx.currentTime-x.cur.t0)%x.cur.buf.duration+x.cur.buf.duration)%x.cur.buf.duration).toFixed(3):null,kalan:ctx?+(x.cur.end-ctx.currentTime).toFixed(2):null,kazanc:+x.gain.gain.value.toFixed(3)};};
      var bl={};sira.forEach(function(k){bl[k]={kare:tampon[k].length,sn:+tampon[k].duration.toFixed(5),kirpilan:tampon[k].__kirp,sr:tampon[k].sampleRate};});
      return {acik:acik,ctx:ctx?ctx.state:null,sr:ctx?ctx.sampleRate:null,calisiyor:!!(ctx&&ctx.state==='running'&&ana),cue:ana?ana.cue:null,ana:v(ana),gecen:v(gecen),ilerleme:+prog.toFixed(1),hedef:hedefCue(),istek:istek(),
        ses:master?+master.gain.value.toFixed(3):null,bus:bus?+bus.gain.value.toFixed(3):null,toren:{aktif:torenAktif,calan:!!torenKaynak},tamponlar:bl,tamponSay:sira.length,zincir:zincir.slice(),calismaSesi:calismaSesi};},
    _konumla:function(kalan){   /* test: ana katmanı döngü sonuna 'kalan' sn kala getir */
      if(!ctx||!ana||gecen)return false;var a=ana,b=a.cur.buf,now=ctx.currentTime+0.05,off=Math.max(0,b.duration-kalan);
      try{a.cur.src.onended=null;a.cur.src.stop();}catch(e){}
      if(a.next){try{a.next.src.stop();}catch(e){}a.next=null;}
      var t0=kare(now-off);a.cur={id:a.cur.id,buf:b,src:kaynak(b,t0,off,a.gain),t0:t0,end:t0+b.duration};return true;}
  };
})();
