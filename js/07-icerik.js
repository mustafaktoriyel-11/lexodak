// ================= İÇERİK (orta yol) =================
// Web'de içerik dosyaları service worker ile gelir. Android uygulamasında (Capacitor) uygulamanın içinden gelir;
// lexodak.com'da daha yenisi varsa indirilir, doğrulanır (biçim + dizindeki özet) ve 'lex-icerik' önbelleğinde tutulur.
// Uygulama yeni bir sürümle güncellenince önbellek sıfırlanır (içteki daha yeni içerik geride kalmasın).
(function(){
  var CAP=!!window.Capacitor,UZAK='https://lexodak.com/',ONB='lex-icerik-1',PK='lex-icerik-paket',ZK='lex-icerik-zaman';
  function yerel(u){return fetch(u).then(function(r){if(!r.ok)throw 0;return r.json();});}
  function yerelMetin(u){return fetch(u).then(function(r){if(!r.ok)throw 0;return r.text();});}
  function kullan(){return CAP&&window.caches&&window.crypto&&crypto.subtle;}
  function onbellekten(u){if(!kullan())return Promise.reject(0);return caches.open(ONB).then(function(c){return c.match(u);}).then(function(r){if(!r)throw 0;return r.json();});}
  window.LEX_ICERIK=function(u){return onbellekten(u).catch(function(){return yerel(u);});};
  function gecerli(u,j){
    if(!j||typeof j!=='object')return false;
    if(/mevzuat\/index\.json$/.test(u))return Array.isArray(j.index)&&j.index.length>0&&j.index.every(function(k){return k&&k.no&&k.h&&k.ad;});
    if(/mevzuat\/\d+\.json$/.test(u))return Array.isArray(j.maddeler)&&j.maddeler.length>0&&j.maddeler.every(function(m){return m&&m.n!=null&&typeof m.m==='string';});
    if(/(testler|klasik)\.json$/.test(u))return Array.isArray(j.dersler)&&j.dersler.length>0;
    return false;
  }
  function ozet(t){return crypto.subtle.digest('SHA-1',new TextEncoder().encode(t)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2);}).join('');});}
  function uzak(u){return fetch(UZAK+u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.text();}).then(function(t){if(!gecerli(u,JSON.parse(t)))throw 0;return t;});}
  function koy(c,u,t){return c.put(u,new Response(t,{headers:{'Content-Type':'application/json'}}));}
  async function guncelle(){
    var c=await caches.open(ONB);
    var paket=await yerel('mevzuat/index.json');
    // uygulama güncellendiyse eski indirilenler silinir
    try{if(localStorage.getItem(PK)!==paket.surum){await caches.delete(ONB);c=await caches.open(ONB);localStorage.setItem(PK,paket.surum);}}catch(e){}
    // mevzuat: yalnız özeti değişen kanunlar iner; hepsi sağlam inmeden dizin değişmez
    var simdi=await onbellekten('mevzuat/index.json').catch(function(){return paket;});
    var ut=await uzak('mevzuat/index.json'),uz=JSON.parse(ut);
    if(uz.surum!==simdi.surum){
      var H={};simdi.index.forEach(function(k){H[k.no]=k.h;});
      for(var i=0;i<uz.index.length;i++){
        var k=uz.index[i];if(H[k.no]===k.h)continue;
        var t=await uzak('mevzuat/'+k.no+'.json');
        if((await ozet(t)).slice(0,8)!==k.h)throw new Error('özet tutmadı: '+k.no);
        await koy(c,'mevzuat/'+k.no+'.json',t);
      }
      await koy(c,'mevzuat/index.json',ut);
    }
    // ders testleri ve klasik sınavlar: tek dosya, içerik farklıysa
    var D=['testler.json','klasik.json'];
    for(var j=0;j<D.length;j++){
      try{
        var r=await c.match(D[j]),eski=r?await r.text():await yerelMetin(D[j]),yeni=await uzak(D[j]);
        if(yeni!==eski)await koy(c,D[j],yeni);
      }catch(e){}
    }
    try{localStorage.setItem(ZK,String(Date.now()));}catch(e){}
  }
  if(kullan()){
    addEventListener('load',function(){setTimeout(function(){
      var son=0;try{son=+localStorage.getItem(ZK)||0;}catch(e){}
      if(!navigator.onLine||Date.now()-son<6*3600*1000)return;
      guncelle().catch(function(){});
    },8000);});
  }
})();
