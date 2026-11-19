// ================= ÖLÇÜ (tanı): başlıktaki "Lex Odak" yazısına 1,5 sn basılı tut =================
(function(){
  var h=document.querySelector('h1');if(!h)return;var t=0;
  function goster(){
    var vv=window.visualViewport,m=document.querySelector('meta[name=viewport]');
    var d=document.createElement('div');
    d.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;background:#281619;color:#F2DDA8;padding:14px 18px;border-radius:14px;font:14px/1.5 monospace;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    d.textContent=(window.Capacitor?'UYGULAMA':'TARAYICI')+' · '+innerWidth+'×'+innerHeight+' · dpr '+(window.devicePixelRatio||1).toFixed(2)+' · ekran '+screen.width+'×'+screen.height+(vv?' · ölçek '+vv.scale.toFixed(2):'')+' · yazı '+getComputedStyle(document.documentElement).fontSize;
    document.body.appendChild(d);d.addEventListener('click',function(){d.remove();});setTimeout(function(){d.remove();},12000);
  }
  h.addEventListener('touchstart',function(){clearTimeout(t);t=setTimeout(goster,1500);},{passive:true});
  ['touchend','touchmove','touchcancel'].forEach(function(o){h.addEventListener(o,function(){clearTimeout(t);},{passive:true});});
})();
// ================= GERİ TUŞU =================
(function(){
  var G=[];   // {k:anahtar, fn:geri dönüş, iptal}
  try{history.scrollRestoration='manual';}catch(e){}
  function ust(){return G[G.length-1];}
  function ekle(k,fn){G.push({k:k,fn:fn});try{history.pushState({lex:G.length},'');}catch(e){}}
  function dus(k){var u=ust();if(u&&!u.iptal&&(!k||u.k===k)){u.iptal=true;history.back();return true;}return false;}
  function hepsi(){if(!G.length)return;G.forEach(function(x){x.iptal=true;});history.go(-G.length);}
  addEventListener('popstate',function(e){
    var d=(e.state&&e.state.lex)||0,cal=[];
    while(G.length>d)cal.push(G.pop());
    cal.forEach(function(x){if(!x.iptal)try{x.fn();}catch(_){}});
    var k=0;for(var i=G.length-1;i>=0&&G[i].iptal;i--)k++;   // iptal edilmiş kayıtları atla
    if(k)history.go(-k);
  });
  function sekme(){var c=document.body.classList;return c.contains('s-mevzuat')?'mevzuat':c.contains('s-mantik')?'mantik':c.contains('s-program')?'program':c.contains('s-istat')?'istat':c.contains('s-kutuphane')?'kutuphane':'sayac';}
  // sekme değişimi (alt menü ya da kaydırma): geri tuşu ana sekmeye (Sayaç) döner
  function sekmeGec(h){var c=sekme();if(!h||h===c)return;
    if(h==='sayac'){hepsi();return;}
    var canli=G.filter(function(x){return !x.iptal;});
    if(canli.length===1&&canli[0]===ust()&&ust().k==='tab')return;
    G.forEach(function(x){x.iptal=true;});
    ekle('tab',function(){if(window.MF_SAYFA)window.MF_SAYFA('sayac');});
  }
  window.LEX_GERI={ekle:ekle,dus:dus,hepsi:hepsi,sekme:sekmeGec,ust:function(){var u=ust();return u&&!u.iptal?u.k:null;}};
  window.LEX_SEKME=sekme;
  // Android uygulaması (Capacitor): donanım/hareket geri tuşu web'deki geri mantığına bağlanır; gidecek yer yoksa uygulama kapanır
  try{
    var CAP=window.Capacitor,APP=CAP&&CAP.Plugins&&CAP.Plugins.App;
    if(APP&&APP.addListener)APP.addListener('backButton',function(){
      if(G.some(function(x){return !x.iptal;}))history.back();
      else if(sekme()!=='sayac'&&window.MF_SAYFA)window.MF_SAYFA('sayac');
      else APP.exitApp();
    });
  }catch(e){}
  var nav=document.getElementById('alt-nav');
  if(nav)nav.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button[data-s]');if(b)sekmeGec(b.dataset.s);},true);
})();
