// ================= DERS DOSYALARI KÜTÜPHANESİ =================
(function(){
  var DB_AD='lex-kutuphane', MAX=100*1024*1024,BUYUK=50*1024*1024;
  var VARSAYILAN=['Borçlar Genel','Borçlar Özel','Ceza Genel','Ceza Özel','İcra ve İflas','İş Hukuku','Ticaret Hukuku','Eşya Hukuku','Medeni Hukuk','Anayasa Hukuku','MÖHUK'];
  var DIGER='Genel / Diğer';
  var AY=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  var ETIKET={vize:'Vize',final:'Final'};
  var $=function(i){return document.getElementById(i);};
  var kart=$('kt-kart');
  if(!kart)return;
  var durumEl=$('kt-durum'), listeEl=$('kt-liste'), icerik=$('kt-icerik');
  var st={meta:[],filtre:'',ara:'',db:null,hata:false,sekme:'dosya'};
  var durumT=0;

  // ---------- yardımcılar ----------
  function bildir(m,kalici){
    durumEl.textContent=m||'';
    clearTimeout(durumT);
    if(m&&!kalici)durumT=setTimeout(function(){if(durumEl.textContent===m)durumEl.textContent='';},6000);
  }
  function tr(s){return String(s||'').toLocaleLowerCase('tr');}
  function boyutYaz(b){
    if(b<1024*1024)return Math.max(1,Math.round(b/1024))+' KB';
    return (b/1048576).toFixed(b<10485760?1:0).replace('.',',')+' MB';
  }
  function tarihYaz(ms){var d=new Date(ms);return d.getDate()+' '+AY[d.getMonth()]+' '+d.getFullYear();}
  function yeniId(){return 'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
  function dersler(){
    var l=[];
    try{l=JSON.parse(localStorage.getItem('lex-dersler')||'[]');}catch(e){}
    if(!Array.isArray(l)||!l.length)l=VARSAYILAN.slice();
    l=l.filter(function(x){return typeof x==='string'&&x&&x!==DIGER;});
    l.push(DIGER);
    return l;
  }
  function uzanti(m){
    if(m.tur==='pdf')return '.pdf';
    var t=(m.mime||'').toLowerCase();
    if(t.indexOf('png')>-1)return '.png';
    if(t.indexOf('webp')>-1)return '.webp';
    if(t.indexOf('gif')>-1)return '.gif';
    if(t.indexOf('heic')>-1)return '.heic';
    return '.jpg';
  }
  function guvenliAd(m){
    var a=String(m.ad||'dosya').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,'_').replace(/^\.+/,'').trim()||'dosya';
    return a.slice(0,120)+uzanti(m);
  }
  function uzantisiz(ad){return String(ad).replace(/\.(pdf|png|jpe?g|webp|gif|heic|heif|bmp|avif)$/i,'');}
  function yedekGerek(){
    if(!st.meta.length)return false;
    var n=parseInt(localStorage.getItem('lex-son-yedek'),10);
    return !n||(Date.now()-n)>30*86400000;
  }

  // ---------- IndexedDB ----------
  function idbAc(){
    if(st.db)return Promise.resolve(st.db);
    return new Promise(function(ok,hata){
      if(!window.indexedDB){hata(new Error('yok'));return;}
      var r;
      try{r=indexedDB.open(DB_AD,1);}catch(e){hata(e);return;}
      r.onupgradeneeded=function(){
        var d=r.result;
        if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'id'});
        if(!d.objectStoreNames.contains('veri'))d.createObjectStore('veri',{keyPath:'id'});
      };
      r.onsuccess=function(){
        st.db=r.result;
        st.db.onversionchange=function(){try{st.db.close();}catch(e){}st.db=null;};
        ok(st.db);
      };
      r.onerror=function(){hata(r.error||new Error('açılamadı'));};
      r.onblocked=function(){hata(new Error('engellendi'));};
    });
  }
  function islem(depolar,kip,fn){
    return idbAc().then(function(db){
      return new Promise(function(ok,hata){
        var t=db.transaction(depolar,kip), sonuc;
        t.oncomplete=function(){ok(sonuc);};
        t.onerror=function(){hata(t.error);};
        t.onabort=function(){hata(t.error||new Error('iptal'));};
        sonuc=fn(t);
      });
    });
  }
  function istek(r){return new Promise(function(ok,hata){r.onsuccess=function(){ok(r.result);};r.onerror=function(){hata(r.error);};});}
  function metaOku(){
    return idbAc().then(function(db){return istek(db.transaction('meta','readonly').objectStore('meta').getAll());});
  }
  function blobOku(id){
    return idbAc().then(function(db){return istek(db.transaction('veri','readonly').objectStore('veri').get(id));}).then(function(r){return r&&r.blob;});
  }
  function metaYaz(m){return islem('meta','readwrite',function(t){t.objectStore('meta').put(m);});}
  function hataMesaji(e){
    var ad=e&&e.name;
    if(ad==='QuotaExceededError')return 'Telefonda yeterli alan yok. Bazı dosyaları silip tekrar dene.';
    return 'İşlem yapılamadı. Tekrar dene.';
  }

  // ---------- liste ----------
  function yenile(){
    return metaOku().then(function(l){
      st.meta=l||[];st.hata=false;
    }).catch(function(){st.meta=[];st.hata=true;}).then(ciz);
  }
  function sbVar(m){return !!(m&&m.sablon&&m.sablon.veri);}
  function sekGor(m){return st.sekme!=='sablon'||sbVar(m);}
  function sayilar(){
    var s={};
    st.meta.forEach(function(m){if(sekGor(m))s[m.ders]=(s[m.ders]||0)+1;});
    return s;
  }
  function ciz(){
    var arac=$('kt-arac'), ekle=$('kt-ekle'), serit=$('kt-serit');
    if(st.hata||!window.indexedDB){
      ekle.hidden=true;arac.hidden=true;serit.hidden=true;$('kt-sek').hidden=true;$('kt-depo').textContent='';
      listeEl.innerHTML='<div class="kt-bos"><div class="kt-bs"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8 21 19.5H3z"/><path d="M12 9.8v4.6M12 17v.1"/></svg></div><p>Bu tarayıcı dosya saklamayı desteklemiyor.</p></div>';
      return;
    }
    ekle.hidden=false;
    serit.hidden=!yedekGerek();
    var sy=sayilar();
    if(st.filtre&&!sy[st.filtre])st.filtre='';
    if(!st.meta.length){
      arac.hidden=true;$('kt-sek').hidden=true;
      listeEl.innerHTML='<div class="kt-bos"><div class="kt-bs"><svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 17.5V7a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.2H17a1.5 1.5 0 0 1 1.5 1.5v1.3"/><path d="M3.5 17.5 6 11.2a1.5 1.5 0 0 1 1.4-1h12.4a1 1 0 0 1 .9 1.4l-2.4 6a1.5 1.5 0 0 1-1.4.9z"/></svg></div><p>Ders notlarını, PDF\'lerini ve tahta fotoğraflarını buraya ekle. Hepsi yalnız bu telefonda saklanır.</p></div>';
      depoYaz();
      return;
    }
    var sbN=st.meta.filter(sbVar).length, sek=$('kt-sek');
    sek.hidden=false;$('kt-sek-n').textContent=sbN?String(sbN):'';
    [].forEach.call(sek.querySelectorAll('button'),function(b){var on=b.getAttribute('data-t')===st.sekme;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');});
    if(st.sekme==='sablon'&&!sbN){
      arac.hidden=true;
      listeEl.innerHTML='<div class="kt-bos"><p>Henüz şablon yok. Bir PDF notunun yanındaki <b>⋯</b> menüsünden <b>Şablon çıkar</b>’a dokun; özet, tanımlar ve ilgili maddeler burada toplanır.</p></div>';
      depoYaz();
      return;
    }
    arac.hidden=false;
    // çipler
    var sira=dersler(), cip='<button type="button" class="kt-cip'+(st.filtre?'':' on')+'" data-d="">Tümü<i>'+st.meta.filter(sekGor).length+'</i></button>';
    var gorulen={};
    sira.forEach(function(d){gorulen[d]=1;});
    var sirali=sira.concat(Object.keys(sy).filter(function(d){return !gorulen[d];}));
    sirali.forEach(function(d){
      if(!sy[d])return;
      cip+='<button type="button" class="kt-cip'+(st.filtre===d?' on':'')+'" data-d="'+esc(d)+'">'+esc(d)+'<i>'+sy[d]+'</i></button>';
    });
    $('kt-cipler').innerHTML=cip;
    // gruplar
    var q=tr(st.ara).trim();
    var gr={};
    st.meta.forEach(function(m){
      if(!sekGor(m))return;
      if(st.filtre&&m.ders!==st.filtre)return;
      if(q&&tr(m.ad).indexOf(q)<0)return;
      (gr[m.ders]=gr[m.ders]||[]).push(m);
    });
    var h='';
    sirali.forEach(function(d){
      var l=gr[d];if(!l)return;
      l.sort(function(a,b){return b.eklendi-a.eklendi;});
      h+='<div class="kt-grup">'+esc(d)+'</div>';
      l.forEach(function(m){
        var rz=m.etiket&&ETIKET[m.etiket]?' <span class="kt-rozet '+m.etiket+'">'+ETIKET[m.etiket]+'</span>':'';
        h+='<div class="kt-satir"><button type="button" class="kt-ac" data-id="'+m.id+'"><span class="kt-sim">'+(m.tur==='pdf'?'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5L18 7.5v13H6.5z"/><path d="M14 3.5v4h4M9 12.5h6.5M9 15.5h6.5M9 18h4"/></svg>':'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4"/></svg>')+'</span><span class="kt-metin"><span class="kt-ad">'+esc(m.ad)+'</span><span class="kt-alt">'+(st.sekme==='sablon'?'Şablon · '+tarihYaz(m.sablon.tarih||m.eklendi):boyutYaz(m.boyut)+' · '+tarihYaz(m.eklendi))+rz+(st.sekme!=='sablon'&&sbVar(m)?' <span class="kt-rozet sb">Şablon</span>':'')+'</span></span></button><button type="button" class="kt-dd" data-id="'+m.id+'" aria-label="Seçenekler">⋯</button></div>';
      });
    });
    listeEl.innerHTML=h||'<p class="pm-kucuk kt-yok">Eşleşen dosya yok.</p>';
    depoYaz();
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function depoYaz(){
    var top=st.meta.reduce(function(a,m){return a+(m.boyut||0);},0);
    var el=$('kt-depo'), t='Kütüphane: '+boyutYaz(top);
    el.textContent=t;
    try{
      if(navigator.storage&&navigator.storage.estimate){
        navigator.storage.estimate().then(function(e){
          if(e&&e.quota!=null&&e.usage!=null){
            var bos=Math.max(0,e.quota-e.usage);
            el.textContent=t+' · Telefonda kullanılabilir alan: '+(bos>=1073741824?(bos/1073741824).toFixed(1).replace('.',',')+' GB':boyutYaz(bos));
          }
        }).catch(function(){});
      }
    }catch(e){}
  }

  // ---------- ekleme / düzenleme penceresi ----------
  var sh={kip:'',dosyalar:[],duz:null,ders:'',etiket:''};
  var shEl=$('kt-sheet');
  function dersSecenekleri(secili){
    var l=dersler();
    if(secili&&l.indexOf(secili)<0)l.splice(l.length-1,0,secili);
    $('kt-sh-ders').innerHTML=l.map(function(d){return '<option value="'+esc(d)+'"'+(d===secili?' selected':'')+'>'+esc(d)+'</option>';}).join('');
  }
  function etiketSec(e){
    sh.etiket=e;
    Array.prototype.forEach.call(document.querySelectorAll('#kt-sh-etiket .kt-eb'),function(b){
      var on=b.getAttribute('data-e')===e;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false');
    });
  }
  function shAc(){
    shEl.hidden=false;
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-sheet',function(){shEl.hidden=true;});
  }
  function shKapat(geriden){
    if(shEl.hidden)return;
    shEl.hidden=true;
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('kt-sheet');
  }
  function onerilenDers(){
    var d=st.filtre||localStorage.getItem('lex-kut-son-ders')||'';
    return dersler().indexOf(d)>-1||d?d:dersler()[0];
  }
  function ekleSheet(dosyalar,reddedilen){
    sh.kip='ekle';sh.dosyalar=dosyalar;sh.duz=null;
    $('kt-sh-baslik').textContent=dosyalar.length>1?dosyalar.length+' dosya ekle':'Dosya ekle';
    var u=$('kt-sh-uyari');
    u.hidden=!reddedilen.length;u.textContent=reddedilen.join(' ');
    $('kt-sh-satirlar').innerHTML=dosyalar.map(function(f,i){
      return '<div class="kt-sh-satir"><span class="kt-sim">'+(f.tur==='pdf'?'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5L18 7.5v13H6.5z"/><path d="M14 3.5v4h4M9 12.5h6.5M9 15.5h6.5M9 18h4"/></svg>':'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4"/></svg>')+'</span><input type="text" class="lex-in kt-ad-in" data-i="'+i+'" value="'+esc(f.ad)+'" maxlength="150" aria-label="Dosya adı"><span class="kt-boy">'+boyutYaz(f.file.size)+'</span></div>';
    }).join('');
    dersSecenekleri(onerilenDers());
    etiketSec('');
    $('kt-sh-kaydet').textContent='Kaydet';
    shAc();
  }
  function duzenleSheet(m){
    sh.kip='duzenle';sh.duz=m;sh.dosyalar=[];
    $('kt-sh-baslik').textContent='Dersi ve etiketi değiştir';
    $('kt-sh-uyari').hidden=true;
    $('kt-sh-satirlar').innerHTML='<div class="kt-sh-satir"><span class="kt-sim">'+(m.tur==='pdf'?'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5L18 7.5v13H6.5z"/><path d="M14 3.5v4h4M9 12.5h6.5M9 15.5h6.5M9 18h4"/></svg>':'<svg class="lx-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4"/></svg>')+'</span><input type="text" class="lex-in kt-ad-in" data-i="0" value="'+esc(m.ad)+'" maxlength="150" aria-label="Dosya adı"></div>';
    dersSecenekleri(m.ders);
    etiketSec(m.etiket||'');
    $('kt-sh-kaydet').textContent='Kaydet';
    shAc();
  }
  var kaydediyor=false;
  async function shKaydet(){
    if(kaydediyor)return;
    kaydediyor=true;$('kt-sh-kaydet').disabled=true;
    var ders=$('kt-sh-ders').value||DIGER, girdiler=document.querySelectorAll('#kt-sh-satirlar .kt-ad-in');
    try{
      if(sh.kip==='duzenle'){
        var m=sh.duz, ad=(girdiler[0].value||'').trim();
        m.ad=uzantisiz(ad)||m.ad;m.ders=ders;m.etiket=sh.etiket;
        await metaYaz(m);
        shKapat();bildir('Kaydedildi.');
      }else{
        var ilk=!st.meta.length, eklenen=0, hatali=0, son=null;
        for(var i=0;i<sh.dosyalar.length;i++){
          var f=sh.dosyalar[i], ad2=uzantisiz((girdiler[i].value||'').trim())||f.ad;
          var id=yeniId();
          var blob=f.file.slice(0,f.file.size,f.mime);
          var meta={id:id,ad:ad2,ders:ders,tur:f.tur,mime:f.mime,boyut:f.file.size,eklendi:Date.now(),etiket:sh.etiket,sonSayfa:1};
          try{
            await islem(['meta','veri'],'readwrite',function(t){t.objectStore('veri').put({id:id,blob:blob});t.objectStore('meta').put(meta);});
            eklenen++;
          }catch(e){hatali++;son=e;}
        }
        if(eklenen){
          try{localStorage.setItem('lex-kut-son-ders',ders);}catch(e){}
          if(ilk&&navigator.storage&&navigator.storage.persist){try{navigator.storage.persist();}catch(e){}}
        }
        shKapat();
        if(hatali)bildir(eklenen?eklenen+' dosya eklendi, '+hatali+' dosya eklenemedi. '+hataMesaji(son):hataMesaji(son),true);
        else bildir(eklenen+' dosya eklendi.');
        // PDF görüntüleyiciyi internet varken önceden indir (sonra internetsiz açılsın)
        if(eklenen&&navigator.onLine!==false)['pdfjs.min.mjs','pdfjs.worker.min.mjs','jbig2.wasm','openjpeg.wasm'].forEach(function(u){try{fetch(u).catch(function(){});}catch(e){}});
      }
      await yenile();
    }catch(e){
      bildir(hataMesaji(e),true);
    }finally{kaydediyor=false;$('kt-sh-kaydet').disabled=false;}
  }
  shEl.addEventListener('click',function(e){
    if(e.target.getAttribute&&e.target.getAttribute('data-kapat'))shKapat();
    var b=e.target.closest('.kt-eb');if(b)etiketSec(b.getAttribute('data-e'));
  });
  $('kt-sh-iptal').addEventListener('click',function(){shKapat();});
  $('kt-sh-kaydet').addEventListener('click',shKaydet);

  // ---------- dosya seçimi ----------
  var inp=$('kt-dosya');
  $('kt-ekle').addEventListener('click',function(){inp.value='';inp.click();});
  inp.addEventListener('change',function(){
    var fl=Array.prototype.slice.call(inp.files||[]), gecerli=[], red=[];
    fl.forEach(function(f){
      var t=(f.type||'').toLowerCase(), pdf=t==='application/pdf'||(!t&&/\.pdf$/i.test(f.name));
      var res=t.indexOf('image/')===0;
      if(!pdf&&!res){red.push('"'+f.name+'" PDF ya da resim olmadığı için eklenmedi.');return;}
      if(f.size>MAX){red.push('"'+f.name+'" '+boyutYaz(f.size)+' olduğu için eklenmedi (en çok 100 MB).');return;}
      if(f.size>BUYUK)red.push('"'+f.name+'" '+boyutYaz(f.size)+': büyük dosya, eski telefonlarda yavaş açılabilir.');
      gecerli.push({file:f,tur:pdf?'pdf':'resim',mime:pdf?'application/pdf':t,ad:uzantisiz(f.name)||'Dosya'});
    });
    inp.value='';
    if(!gecerli.length){if(red.length)bildir(red.join(' '),true);return;}
    bildir('');
    ekleSheet(gecerli,red);
  });

  // ---------- liste olayları ----------
  var araT=0;
  $('kt-ara').addEventListener('input',function(e){
    clearTimeout(araT);var v=e.target.value;
    araT=setTimeout(function(){st.ara=v;ciz();},120);
  });
  $('kt-cipler').addEventListener('click',function(e){
    var b=e.target.closest('.kt-cip');if(!b)return;
    st.filtre=b.getAttribute('data-d')||'';ciz();
  });
  $('kt-serit').addEventListener('click',function(){
    var y=$('yd-kart');
    if(y&&y.scrollIntoView)y.scrollIntoView({behavior:'smooth',block:'start'});
  });
  listeEl.addEventListener('click',function(e){
    var d=e.target.closest('.kt-dd');
    if(d){menuAc(d.getAttribute('data-id'));return;}
    var a=e.target.closest('.kt-ac');
    if(a){if(st.sekme==='sablon'){var mm=bul(a.getAttribute('data-id'));if(mm)sbAc(mm);}else gorAc(a.getAttribute('data-id'));}
  });
  $('kt-sek').addEventListener('click',function(e){
    var b=e.target.closest('button[data-t]');if(!b)return;
    st.sekme=b.getAttribute('data-t');st.filtre='';ciz();
  });
  function bul(id){for(var i=0;i<st.meta.length;i++)if(st.meta[i].id===id)return st.meta[i];return null;}

  // ---------- satır menüsü ----------
  var mnEl=$('kt-menu'), mnId=null;
  function menuAc(id){
    var m=bul(id);if(!m)return;
    mnId=id;$('kt-mn-ad').textContent=m.ad;mnEl.hidden=false;$('kt-mn-notlu').hidden=!(m.tur==='pdf'&&notSay(m)>0);
    $('kt-mn-sablon').hidden=m.tur!=='pdf';$('kt-mn-sablon').textContent=sbVar(m)?'Şablonu yeniden çıkar':'Şablon çıkar';$('kt-mn-sablonac').hidden=!sbVar(m);
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-menu',function(){mnEl.hidden=true;});
  }
  function menuKapat(){
    if(mnEl.hidden)return;
    mnEl.hidden=true;
    if(window.LEX_GERI)window.LEX_GERI.dus('kt-menu');
  }
  mnEl.addEventListener('click',function(e){
    if(e.target.getAttribute&&e.target.getAttribute('data-kapat')){menuKapat();return;}
    var b=e.target.closest('.kt-mn-b');if(!b)return;
    var m=bul(mnId), i=b.getAttribute('data-i');
    menuKapat();
    if(!m)return;
    // geri tuşu kaydı kapanırken popstate asenkron; işlemi bir sonraki turda yap
    setTimeout(function(){
      if(i==='ad')adDegistir(m);
      else if(i==='ders')duzenleSheet(m);
      else if(i==='paylas')paylas(m);
      else if(i==='notlu')dsAc(m,null);
      else if(i==='sablon')sbCikar(m);
      else if(i==='sablonac')sbAc(m);
      else if(i==='sil')sil(m);
    },window.LEX_GERI?60:0);
  });
  async function adDegistir(m){
    var y=prompt('Yeni ad',m.ad);
    if(y===null)return;
    y=uzantisiz(y.trim());
    if(!y)return;
    try{m.ad=y;await metaYaz(m);bildir('Yeniden adlandırıldı.');await yenile();}
    catch(e){bildir(hataMesaji(e),true);}
  }
  async function sil(m){
    if(!confirm('"'+m.ad+'" silinsin mi? Bu işlem geri alınamaz.'))return;
    try{
      await islem(['meta','veri'],'readwrite',function(t){t.objectStore('meta').delete(m.id);t.objectStore('veri').delete(m.id);});
      bildir('Silindi.');await yenile();
    }catch(e){bildir(hataMesaji(e),true);}
  }
  async function paylas(m,blobHazir){
    try{
      var b=blobHazir||await blobOku(m.id);
      if(!b){bildir('Dosya bulunamadı.',true);return;}
      var so=await window.LEX_DOSYA(b,guvenliAd(m),m.mime||b.type,null,{baslik:m.ad});
      if(so==='hata')bildir('Paylaşılamadı.',true);
    }catch(e){bildir('Paylaşılamadı.',true);}
  }

  // ---------- görüntüleyici ----------
  var gor=$('kt-gor'), kaydir=$('kt-gor-kaydir'), ic=$('kt-gor-ic'), msg=$('kt-gor-msg'), sayfaEl=$('kt-gor-sayfa');
  var G=null; // açık görüntüleyici durumu
  // ---------- tam ekran (S Pen ile yazarken alt çubuğa/dock'a değip uygulamadan çıkılmasın) ----------
  var FS_E=document.documentElement,tamBtn=$('kt-tam-ac');
  function tamEkranMi(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
  function tamEkranVar(){return !!(FS_E.requestFullscreen||FS_E.webkitRequestFullscreen);}
  function tamEkranIste(){
    try{
      var p=FS_E.requestFullscreen?FS_E.requestFullscreen({navigationUI:'hide'}):FS_E.webkitRequestFullscreen&&FS_E.webkitRequestFullscreen();
      if(p&&p.catch)p.catch(function(){});
    }catch(e){}
  }
  function tamEkranBirak(){
    tamBtn.hidden=true;
    try{
      if(!tamEkranMi())return;
      var p=document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen&&document.webkitExitFullscreen();
      if(p&&p.catch)p.catch(function(){});
    }catch(e){}
  }
  function tamDugme(){tamBtn.hidden=!(G&&G.m.tur==='pdf'&&tamEkranVar()&&!tamEkranMi());}
  tamBtn.addEventListener('click',function(){tamEkranIste();});
  // ---------- yerleşim değişince (tam ekran, döndürme, çizim sütunu) sayfaları yeniden sığdır ----------
  var duzT=0,duzLw=0;
  function duzenIste(){clearTimeout(duzT);duzT=setTimeout(duzenUygula,140);}
  function duzenUygula(){
    var g=G;tamDugme();
    if(!g)return;
    var w=kaydir.clientWidth;if(!w||Math.abs(w-duzLw)<2)return;
    if(PN||(CZ.ciziyor)){duzenIste();return;}
    duzLw=w;
    if(g.m.tur==='pdf'){
      if(!g.sayfalar.length||!g.obs)return;
      var oran=kaydir.scrollHeight>0?kaydir.scrollTop/kaydir.scrollHeight:0;
      yerlestir(g,g.sayfa);kaydir.scrollTop=oran*kaydir.scrollHeight;
    }else resimOlcek(g);
  }
  document.addEventListener('fullscreenchange',duzenIste);
  document.addEventListener('webkitfullscreenchange',duzenIste);
  window.addEventListener('resize',duzenIste);
  try{new ResizeObserver(duzenIste).observe(kaydir);}catch(e){}
  var pdfjsP=null;
  function pdfjsYukle(){
    if(!pdfjsP){
      pdfjsP=import(new URL('pdfjs.min.mjs',document.baseURI).href).then(function(m){
        m.GlobalWorkerOptions.workerSrc='./pdfjs.worker.min.mjs';
        return m;
      }).catch(function(e){pdfjsP=null;throw e;});
    }
    return pdfjsP;
  }
  var kilitEski=null;
  function kilitle(k){
    var h=document.documentElement,b=document.body;
    if(k){kilitEski=[h.style.overflow,b.style.overflow];h.style.overflow='hidden';b.style.overflow='hidden';}
    else if(kilitEski){h.style.overflow=kilitEski[0];b.style.overflow=kilitEski[1];kilitEski=null;}
  }
  function mesaj(t,dugme){
    msg.hidden=false;msg.innerHTML='';
    var p=document.createElement('div');p.textContent=t;msg.appendChild(p);
    if(dugme){var b=document.createElement('button');b.type='button';b.textContent=dugme.ad;b.addEventListener('click',dugme.fn);msg.appendChild(b);}
  }
  async function gorAc(id){
    if(G)return;
    var m=bul(id);if(!m)return;
    G={atif:{},taranmis:false,ocrAcik:!!m.ocrAcik,ocrQ:[],m:m,id:id,zoom:1,sayfalar:[],obs:null,pdf:null,url:null,kapali:false,sayfa:1,kayitT:0,raf:0,blob:null,gorev:[]};
    var g=G;
    $('kt-gor-ad').textContent=m.ad;
    sayfaEl.textContent='';
    ic.innerHTML='';msg.hidden=true;
    $('kt-gor-eksi').disabled=$('kt-gor-arti').disabled=false;
    $('kt-ciz-ac').hidden=m.tur!=='pdf';$('kt-ds-ac').hidden=m.tur!=='pdf';$('kt-ocr-ac').hidden=true;$('kt-ocr-ac').classList.remove('calis');
    $('kt-yan-ac').hidden=false;
    krBasla(m);
    gor.hidden=false;kilitle(true);
    if(m.tur==='pdf'){tamEkranIste();duzenIste();}
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-gor',kapat);
    try{
      g.blob=await blobOku(id);
      if(g.kapali)return;
      if(!g.blob){mesaj('Dosya bulunamadı.');return;}
      if(m.tur==='pdf')await pdfAc(g);else resimAc(g);
    }catch(e){
      if(!g.kapali)mesaj('Dosya açılamadı.',{ad:'Telefonda aç',fn:function(){paylas(m,g.blob);}});
    }
  }
  function kapat(){
    var g=G;if(!g||g.kapali)return;
    cizKapat(false);yanKapat(true);setTimeout(krBitir,350);ocrBirak();
    g.kapali=true;G=null;
    kaydet(g,true);notYaz(g,true);
    if(g.obs)try{g.obs.disconnect();}catch(e){}
    g.gorev.forEach(function(t){try{t.cancel();}catch(e){}});
    if(g.url)URL.revokeObjectURL(g.url);
    if(g.pdf)try{g.pdf.destroy();}catch(e){}
    if(g.gorevPdf)try{g.gorevPdf.destroy();}catch(e){}
    ic.innerHTML='';msg.hidden=true;msg.innerHTML='';
    gor.hidden=true;kilitle(false);tamEkranBirak();
    ciz();
  }
  $('kt-gor-geri').addEventListener('click',function(){
    if(!G)return;
    kapat();
    if(window.LEX_GERI)window.LEX_GERI.dus('kt-gor');
  });
  function kaydet(g,hemen){
    if(g.m.tur!=='pdf'||!g.sayfalar.length)return;
    clearTimeout(g.kayitT);
    var yaz=function(){
      g.m.sonSayfa=g.sayfa;
      metaYaz(g.m).catch(function(){});
    };
    if(hemen)yaz();else g.kayitT=setTimeout(yaz,700);
  }
  function zoomDegis(d){
    var g=G;if(!g)return;
    var z=Math.round((g.zoom+d)*100)/100;
    z=Math.max(.5,Math.min(4,z));
    if(z===g.zoom)return;
    g.zoom=z;
    if(g.m.tur==='pdf')yerlestir(g,g.sayfa);else resimOlcek(g);
  }
  // iki parmakla yakınlaştır/uzaklaştır (tarayıcının sayfa zumu yerine belgeyi büyütür)
  var PN=null;
  function pnMesafe(t){var a=t[0],b=t[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1;}
  function pnMerkez(t){var r=kaydir.getBoundingClientRect();return {x:(t[0].clientX+t[1].clientX)/2-r.left,y:(t[0].clientY+t[1].clientY)/2-r.top};}
  kaydir.addEventListener('touchstart',function(e){
    var g=G;if(!g||CZ.acik||e.touches.length!==2)return;
    var c=pnMerkez(e.touches);
    PN={d0:pnMesafe(e.touches),c0:c,c:c,f:1,z0:g.zoom,ox:kaydir.scrollLeft+c.x-ic.offsetLeft,oy:kaydir.scrollTop+c.y-ic.offsetTop};
    ic.style.transformOrigin=PN.ox+'px '+PN.oy+'px';ic.style.willChange='transform';
  },{passive:true});
  kaydir.addEventListener('touchmove',function(e){
    if(!PN)return;if(e.touches.length<2)return;
    if(e.cancelable)e.preventDefault();
    var z=Math.max(.5,Math.min(4,PN.z0*pnMesafe(e.touches)/PN.d0));
    PN.f=z/PN.z0;PN.c=pnMerkez(e.touches);
    ic.style.transform='translate('+(PN.c.x-PN.c0.x)+'px,'+(PN.c.y-PN.c0.y)+'px) scale('+PN.f+')';
    sayfaEl.textContent=Math.round(z*100)+'%';
  },{passive:false});
  function pnBitir(){
    var p=PN,g=G;if(!p)return;PN=null;
    ic.style.transform='';ic.style.transformOrigin='';ic.style.willChange='';
    if(!g)return;
    var z=Math.round(p.z0*p.f*100)/100;z=Math.max(.5,Math.min(4,z));
    if(Math.abs(z-g.zoom)<.02){sayfaEl.textContent=g.m.tur==='pdf'?'':Math.round(g.zoom*100)+'%';if(g.m.tur==='pdf')sayfaGoster(g);return;}
    var oran=z/g.zoom;g.zoom=z;
    if(g.m.tur==='pdf')yenidenOlcek(g);else resimOlcek(g);
    kaydir.scrollLeft=Math.max(0,p.ox*oran+ic.offsetLeft-p.c.x);
    kaydir.scrollTop=Math.max(0,p.oy*oran+ic.offsetTop-p.c.y);
    if(g.m.tur==='pdf'){sayfaGoster(g);cizGorunur(g);}
  }
  kaydir.addEventListener('touchend',function(e){if(PN&&e.touches.length<2)pnBitir();},{passive:true});
  kaydir.addEventListener('touchcancel',function(){if(PN)pnBitir();},{passive:true});
  $('kt-gor-eksi').addEventListener('click',function(){zoomDegis(-.25);});
  $('kt-gor-arti').addEventListener('click',function(){zoomDegis(.25);});

  // resim
  function resimAc(g){
    g.url=URL.createObjectURL(g.blob);
    var im=new Image();
    im.alt=g.m.ad;
    im.onload=function(){g.nw=im.naturalWidth;g.nh=im.naturalHeight;resimOlcek(g);resimAtif(g);};
    im.onerror=function(){mesaj('Resim açılamadı.',{ad:'Telefonda aç',fn:function(){paylas(g.m,g.blob);}});};
    var sar=document.createElement('div');sar.className='kt-rs';sar.appendChild(im);
    ic.innerHTML='';ic.appendChild(sar);im.src=g.url;g.img=im;g.resimS={n:1,el:sar,canvas:im};
  }
  function resimOlcek(g){
    if(!g.img||!g.nw)return;
    var w=Math.max(120,kaydir.clientWidth-16);duzLw=kaydir.clientWidth;
    g.img.style.width=Math.round(w*g.zoom)+'px';
    g.img.style.height='auto';
    sayfaEl.textContent=Math.round(g.zoom*100)+'%';
  }

  // PDF
  async function pdfAc(g){
    mesaj('PDF hazırlanıyor…');
    var lib;
    try{lib=await pdfjsYukle();}
    catch(e){
      if(g.kapali)return;
      mesaj('PDF görüntüleyici ilk kullanımda internetten bir kez yüklenir. İnternete bağlanıp tekrar dene.',{ad:'Telefonda aç',fn:function(){paylas(g.m,g.blob);}});
      return;
    }
    if(g.kapali)return;
    var data=new Uint8Array(await g.blob.arrayBuffer());
    if(g.kapali)return;
    var gorev=lib.getDocument({data:data,wasmUrl:'./',isEvalSupported:false,enableScripting:false});
    g.gorevPdf=gorev;
    gorev.onPassword=function(cb,neden){
      var p=prompt(neden===2?'Parola yanlış. Tekrar dene:':'Bu PDF şifreli. Parolayı gir:');
      if(p===null){try{gorev.destroy();}catch(e){}return;}
      cb(p);
    };
    var pdf;
    try{pdf=await gorev.promise;}
    catch(e){
      if(g.kapali)return;
      var pw=e&&e.name==='PasswordException';
      mesaj(pw?'Şifreli PDF açılmadı.':'PDF açılamadı. Dosya bozuk olabilir.',{ad:'Telefonda aç',fn:function(){paylas(g.m,g.blob);}});
      return;
    }
    if(g.kapali){try{pdf.destroy();}catch(e){}return;}
    g.pdf=pdf;
    // tüm sayfaların boyutu
    var n=pdf.numPages, i;
    for(i=1;i<=n;i++){
      var pg=await pdf.getPage(i);
      if(g.kapali)return;
      var vp=pg.getViewport({scale:1});
      g.sayfalar.push({n:i,w:vp.width,h:vp.height,page:null,el:null,canvas:null,gorev:null,is:0});
      pg.cleanup();
      if(i===1)mesaj('PDF hazırlanıyor… (1 / '+n+')');
    }
    msg.hidden=true;
    var ilk=Math.max(1,Math.min(n,parseInt(g.m.sonSayfa,10)||1));
    g.sayfa=ilk;
    kaydir.addEventListener('scroll',kaydirma,{passive:true});
    g.obs=new IntersectionObserver(function(es){
      es.forEach(function(e){
        var s=g.sayfalar[parseInt(e.target.getAttribute('data-n'),10)-1];
        if(e.isIntersecting)ciziliyor(g,s);else bosalt(s);
      });
    },{root:kaydir,rootMargin:'100% 0px 100% 0px',threshold:0});
    yerlestir(g,ilk);
  }
  function yerlestir(g,git){
    // tüm yer tutucuları (yeniden) kur
    if(g.obs)g.obs.disconnect();
    g.sayfalar.forEach(function(s){bosalt(s);});
    ic.innerHTML='';
    var gen=Math.max(120,kaydir.clientWidth-16)*g.zoom;duzLw=kaydir.clientWidth;
    g.sayfalar.forEach(function(s){
      var el=document.createElement('div');
      el.className='kt-sf';el.setAttribute('data-n',s.n);
      var oran=gen/s.w;
      s.cw=Math.round(gen);s.ch=Math.round(s.h*oran);s.oran=oran;
      el.style.width=s.cw+'px';el.style.height=s.ch+'px';
      s.el=el;ic.appendChild(el);
    });
    kaydir.scrollTop=0;
    var hedef=g.sayfalar[git-1];
    if(hedef)kaydir.scrollTop=Math.max(0,hedef.el.offsetTop-8);
    g.sayfalar.forEach(function(s){g.obs.observe(s.el);});
    sayfaGoster(g);
  }
  function yenidenOlcek(g){
    var gen=Math.max(120,kaydir.clientWidth-16)*g.zoom;duzLw=kaydir.clientWidth;
    g.sayfalar.forEach(function(s){
      if(s.gorev){try{s.gorev.cancel();}catch(e){}s.gorev=null;}
      s.is=0;
      var oran=gen/s.w;s.cw=Math.round(gen);s.ch=Math.round(s.h*oran);s.oran=oran;
      if(s.el){s.el.style.width=s.cw+'px';s.el.style.height=s.ch+'px';}
      if(s.canvas){if(s.eskiC){s.eskiC.width=0;s.eskiC.height=0;if(s.eskiC.parentNode)s.eskiC.parentNode.removeChild(s.eskiC);}s.eskiC=s.canvas;s.canvas=null;}
    });
  }
  function cizGorunur(g){g.sayfalar.forEach(function(s){if(s.el&&isGorunur(g,s))ciziliyor(g,s);else if(s.eskiC)bosalt(s);});}
  function sayfaGoster(g){
    sayfaEl.textContent=g.sayfa+' / '+g.sayfalar.length;
  }
  function kaydirma(){
    var g=G;if(!g||g.raf||!g.sayfalar.length)return;
    g.raf=requestAnimationFrame(function(){
      g.raf=0;
      if(G!==g)return;
      var y=kaydir.scrollTop+kaydir.clientHeight*0.35, bulunan=1, l=g.sayfalar, a=0, b=l.length-1;
      while(a<=b){
        var o=(a+b)>>1;
        if(l[o].el.offsetTop<=y){bulunan=l[o].n;a=o+1;}else b=o-1;
      }
      if(kaydir.scrollTop>0&&kaydir.scrollTop+kaydir.clientHeight>=kaydir.scrollHeight-2)bulunan=l[l.length-1].n;
      if(bulunan!==g.sayfa){g.sayfa=bulunan;sayfaGoster(g);kaydet(g,false);}
    });
  }
  var JET=0;
  async function ciziliyor(g,s){
    if(g.kapali||s.canvas||s.is)return;
    var j=s.is=++JET;
    try{
      var page=await g.pdf.getPage(s.n);
      if(g.kapali||s.is!==j||!s.el||!s.el.isConnected||!isGorunur(g,s)){if(s.is===j)s.is=0;try{page.cleanup();}catch(e){}return;}
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var olcek=s.oran*dpr;
      var px=s.w*olcek*s.h*olcek;
      if(px>16e6)olcek*=Math.sqrt(16e6/px);
      var vp=page.getViewport({scale:olcek});
      var c=document.createElement('canvas');
      c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));
      var gorev=page.render({canvasContext:c.getContext('2d'),viewport:vp});
      s.gorev=gorev;g.gorev.push(gorev);
      try{await gorev.promise;}finally{g.gorev=g.gorev.filter(function(t){return t!==gorev;});}
      if(g.kapali||s.is!==j){return;}
      s.gorev=null;s.canvas=c;s.el.insertBefore(c,s.el.firstChild);if(s.eskiC){s.eskiC.width=0;s.eskiC.height=0;if(s.eskiC.parentNode)s.eskiC.parentNode.removeChild(s.eskiC);s.eskiC=null;}s.is=0;notKatman(g,s);atifKatman(g,s);
      try{page.cleanup();}catch(e){}
    }catch(e){
      if(s.is===j){s.is=0;s.gorev=null;}
    }
  }
  function isGorunur(g,s){
    var r=s.el.getBoundingClientRect(), k=kaydir.getBoundingClientRect(), h=k.height;
    return r.bottom>k.top-h&&r.top<k.bottom+h;
  }
  function bosalt(s){
    if(!s)return;
    s.is=0;
    if(s.gorev){try{s.gorev.cancel();}catch(e){}s.gorev=null;}
    if(s.canvas){s.canvas.width=0;s.canvas.height=0;if(s.canvas.parentNode)s.canvas.parentNode.removeChild(s.canvas);s.canvas=null;}
    if(s.eskiC){s.eskiC.width=0;s.eskiC.height=0;if(s.eskiC.parentNode)s.eskiC.parentNode.removeChild(s.eskiC);s.eskiC=null;}
    if(s.not){s.not.width=0;s.not.height=0;if(s.not.parentNode)s.not.parentNode.removeChild(s.not);s.not=null;}
    if(s.atk){if(s.atk.parentNode)s.atk.parentNode.removeChild(s.atk);s.atk=null;}
  }




  // ---------- sayaç açılmadan çalışma: gizli kronometre ----------
  var KR={aktif:0,son:0,dosya:null,ders:'',t:0},KR_K='lex-pdf-sure',ESIK=180000,BOS=600000;
  function sayacCalisiyor(){try{var d=JSON.parse(localStorage.getItem('pm-durum')||'null');return !!(d&&d.calisiyor);}catch(e){return false;}}
  function krKaydet(){try{if(KR.dosya&&KR.aktif>=ESIK)localStorage.setItem(KR_K,JSON.stringify({aktif:KR.aktif,ad:KR.ad,ders:KR.ders,t:Date.now()}));}catch(e){}}
  function krBasla(m){KR={aktif:0,son:Date.now(),dosya:m.id,ad:m.ad,ders:m.ders||'',t:Date.now()};}
  function etkin(){if(KR.dosya)KR.son=Date.now();}
  ['pointerdown','wheel','keydown','scroll'].forEach(function(o){gor.addEventListener(o,etkin,{passive:true,capture:true});});
  setInterval(function(){
    if(!KR.dosya||!G||gor.hidden)return;
    var simdi=Date.now(),adim=Math.min(simdi-KR.t,10000);KR.t=simdi;
    if(document.visibilityState!=='visible'||simdi-KR.son>BOS||sayacCalisiyor())return;
    KR.aktif+=adim;if(KR.aktif>=ESIK)krKaydet();
  },5000);
  document.addEventListener('visibilitychange',function(){if(KR.dosya){KR.t=Date.now();if(document.visibilityState!=='visible')krKaydet();}});
  function krBitir(){
    var k=KR;KR={aktif:0,dosya:null};
    try{localStorage.removeItem(KR_K);}catch(e){}
    if(k.aktif>=ESIK)sureSor({aktif:k.aktif,ad:k.ad,ders:k.ders});
  }
  var SURE=null;
  function sureSor(k){
    var dk=Math.max(1,Math.round(k.aktif/60000));SURE={dk:dk,sec:''};
    $('kt-sure-dk').textContent=dk+' dk';
    $('kt-sure-ac').textContent='“'+(k.ad||'Dosya')+'” açıkken sayaç kapalıydı. Bu süreyi çalışmana ekledik; dersini seç ya da genel çalışma olarak kaydet.';
    var L=dersler().filter(function(x){return x!==DIGER;});
    if(k.ders&&k.ders!==DIGER&&L.indexOf(k.ders)<0)L.unshift(k.ders);
    if(k.ders&&L.indexOf(k.ders)>0){L.splice(L.indexOf(k.ders),1);L.unshift(k.ders);}
    $('kt-sure-d').innerHTML=L.map(function(d){return '<button type="button" class="kt-eb" role="radio" aria-checked="false" data-d="'+esc(d)+'">'+esc(d)+(d===k.ders?'<small>bu dosyanın dersi</small>':'')+'</button>';}).join('');
    var ilk=k.ders&&$('kt-sure-d').querySelector('[data-d]');if(ilk&&ilk.getAttribute('data-d')===k.ders){ilk.classList.add('on');ilk.setAttribute('aria-checked','true');SURE.sec=k.ders;}
    $('kt-sure').hidden=false;
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-sure',function(){sureKapat('Genel çalışma',true);});
  }
  function sureKapat(ders,geriden){
    if(!SURE)return;var s=SURE;SURE=null;
    $('kt-sure').hidden=true;
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('kt-sure');
    try{if(window.LEX_KAYIT_EKLE)window.LEX_KAYIT_EKLE(s.dk,ders);}catch(e){}
    bildir(s.dk+' dk “'+ders+'” olarak çalışmana eklendi.');
  }
  $('kt-sure-d').addEventListener('click',function(e){var b=e.target.closest('[data-d]');if(!b||!SURE)return;SURE.sec=b.getAttribute('data-d');[].forEach.call(this.querySelectorAll('[data-d]'),function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on?'true':'false');});});
  $('kt-sure-kaydet').addEventListener('click',function(){if(!SURE)return;sureKapat(SURE.sec||'Genel çalışma');});
  $('kt-sure-genel').addEventListener('click',function(){sureKapat('Genel çalışma');});
  $('kt-sure').addEventListener('click',function(e){if(e.target.getAttribute('data-kapat'))sureKapat('Genel çalışma');});
  // uygulama PDF açıkken kapandıysa: sonraki açılışta sor
  setTimeout(function(){try{var k=JSON.parse(localStorage.getItem(KR_K)||'null');if(k&&k.aktif>=ESIK&&Date.now()-k.t<12*3600000){localStorage.removeItem(KR_K);sureSor(k);}else if(k)localStorage.removeItem(KR_K);}catch(e){}},2500);
  // ---------- yan yana: PDF solda, mevzuat sağda (yatay tablet / bilgisayar) ----------
  var govde=document.createElement('div');govde.className='kt-gor-govde';
  kaydir.parentNode.insertBefore(govde,kaydir);govde.appendChild(kaydir);
  var yanP=document.createElement('div');yanP.className='kt-yan';yanP.id='kt-yan';govde.appendChild(yanP);
  ['kt-ciz-ac','kt-ciz-bar','kt-ciz-fly','kt-ciz-ipucu'].forEach(function(k){govde.appendChild($(k));});
  var yanBtn=$('kt-yan-ac'),mvYer=null;
  function yanAc(){
    var mv=$('pg-mevzuat');if(!mv||!G)return;
    if(!mvYer){mvYer=document.createComment('mv');mv.parentNode.insertBefore(mvYer,mv);}
    yanP.appendChild(mv);gor.classList.add('yan');yanBtn.setAttribute('aria-pressed','true');
    try{if(window.LEX_MV)window.LEX_MV();}catch(e){}
    var g=G;if(g&&g.m.tur==='pdf'&&g.sayfalar.length)yerlestir(g,g.sayfa);else if(g)resimOlcek(g);
  }
  function yanKapat(sessiz){
    var mv=$('pg-mevzuat');
    if(mv&&mvYer&&mv.parentNode===yanP)mvYer.parentNode.insertBefore(mv,mvYer.nextSibling);
    var acikti=gor.classList.contains('yan');gor.classList.remove('yan');yanBtn.setAttribute('aria-pressed','false');
    if(sessiz)return;
    var g=G;if(acikti&&g&&g.m.tur==='pdf'&&g.sayfalar.length)yerlestir(g,g.sayfa);else if(acikti&&g)resimOlcek(g);
  }
  yanBtn.addEventListener('click',function(){if(gor.classList.contains('yan'))yanKapat();else yanAc();});
  // ---------- PDF üzerine not (kalem, fosforlu, altını çiz, boya, damga, silgi) ----------
  // Kayıt biçimi (geriye uyumlu): {t:'k|f|c|b|d', r:renk, w:kalınlık(sayfa genişliği oranı), p:[x,y,...] (0-1 oranlı)}
  // İsteğe bağlı alanlar: q (kalem baskı çarpanları, nokta başına), d (damga adı; t='d')
  var DMG={"d": {"unlem": "M 9.5 5.5 A 2.5 2.5 0 0 1 14.5 5.5 L 14.5 12 A 2.5 2.5 0 0 1 9.5 12 Z M 12 16.2 A 2.3 2.3 0 0 1 12 20.8 A 2.3 2.3 0 0 1 12 16.2 Z", "simsek": "M 16 2 L 13 9.5 L 19 9.5 L 9.5 22 L 11 13.5 L 5 13.5 L 14 2 Z", "tokmak": "M 19.52 9.28 Q 20.51 10.27 19.52 11.26 L 17.26 13.52 Q 16.27 14.51 15.28 13.52 L 9.48 7.72 Q 8.49 6.73 9.48 5.74 L 11.74 3.48 Q 12.73 2.49 13.72 3.48 Z M 6.86 18.12 L 4.88 16.14 L 11.74 9.28 L 13.72 11.26 Z M 3 20.6 Q 3 19.8 3.8 19.8 L 20.2 19.8 Q 21 19.8 21 20.6 L 21 21.4 Q 21 22.2 20.2 22.2 L 3.8 22.2 Q 3 22.2 3 21.4 Z", "yildiz": "M 12 2 L 14.76 8.8 L 22.08 9.32 L 16.47 14.05 L 18.23 21.18 L 12 17.3 L 5.77 21.18 L 7.53 14.05 L 1.92 9.32 L 9.24 8.8 Z", "soru": "M 6.74 10.42 A 5.6 5.6 0 1 1 13.6 13.87 L 13.6 15.2 L 10.4 15.2 L 10.4 10.29 A 2.4 2.4 0 0 0 13.6 10.29 A 2.4 2.4 0 1 0 9.74 9.32 Z M 12 17.2 A 2 2 0 0 1 12 21.2 A 2 2 0 0 1 12 17.2 Z", "onay": "M 5.14 11.26 L 9.53 15.64 L 18.79 5.33 L 21.61 7.87 L 9.67 21.16 L 2.46 13.94 Z"}, "ad": {"unlem": "Ünlem", "simsek": "Şimşek", "tokmak": "Tokmak", "yildiz": "Yıldız", "soru": "Soru", "onay": "Onay"}};
  var CZ={acik:false,arac:'k',renk:{k:'#1A237E',f:'#FFE600',c:'#C62828',b:'#FFE600',d:'#C62828',g:'#1A237E'},damga:'unlem',kalemVar:false,ciziyor:null,parmak:{},geri:[],yazT:0,cv:null,penT:0};
  var RENK={k:['#111111','#1A237E','#C62828','#2E7D32','#762B37'],f:['#FFE600','#3DFF6E','#FF4FA8','#2EC5FF','#FF9A2E','#B388FF'],c:['#C62828','#762B37','#1A5FD0','#2F8A5F','#111111','#C99A2E'],b:['#FFE600','#FF9A2E','#C62828','#E0508F','#B388FF','#2E7BE0','#2EC5FF','#2F8A5F','#C99A2E','#762B37','#8A8F9C','#111111'],g:['#111111','#1A237E','#C62828','#2E7D32','#762B37','#C99A2E'],d:['#C62828','#762B37','#C99A2E','#2F8A5F','#1A237E','#111111']};
  // ---- geometrik şekiller (çember, 3B cisimler) ----
// SEKIL: geometrik tel-kafes sekiller (Canvas 2D). ES5, saf (DOM yok).
var SEKIL = (function () {
  var PI = Math.PI;

  function nb(x0, y0, x1, y1) {
    var l = Math.min(x0, x1), r = Math.max(x0, x1), t = Math.min(y0, y1), b = Math.max(y0, y1);
    return { l: l, r: r, t: t, b: b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 };
  }

  // Sekil parametreleri (ciz ve kontur ortak kullanir)
  function geo(ad, B) {
    var l = B.l, r = B.r, t = B.t, b = B.b, w = B.w, h = B.h, g = { ad: ad }, m = Math.min(w, h);
    var ry, ox, oy, fw, fh, s;
    if (ad === 'cember') {
      g.cx = B.cx; g.cy = B.cy; g.rx = w / 2; g.ry = h / 2;
    } else if (ad === 'kure') {
      g.cx = B.cx; g.cy = B.cy; g.rx = g.ry = m / 2; g.ery = g.rx * 0.3;
    } else if (ad === 'kup') {
      s = m / 1.35; ox = oy = 0.35 * s;
      l = B.cx - (s + ox) / 2; t = B.cy - (s + oy) / 2;
      g.v = cuboid(l, t, s, s, ox, oy);
    } else if (ad === 'prizma') {
      ox = oy = 0.3 * m;
      g.v = cuboid(l, t, w - ox, h - oy, ox, oy);
    } else if (ad === 'silindir') {
      ry = Math.min(0.11 * w, 0.15 * h);
      g.cx = B.cx; g.rx = w / 2; g.ry = ry; g.l = l; g.r = r; g.yt = t + ry; g.yb = b - ry;
    } else if (ad === 'koni') {
      ry = Math.min(0.11 * w, 0.15 * h);
      g.cx = B.cx; g.rx = w / 2; g.ry = ry; g.l = l; g.r = r; g.t = t; g.yb = b - ry;
    } else if (ad === 'piramit') {
      ox = 0.3 * w; oy = 0.28 * h;
      g.FL = [l, b]; g.FR = [r - ox, b]; g.BL = [l + ox, b - oy]; g.BR = [r, b - oy]; g.A = [B.cx, t];
    } else if (ad === 'ucgen') {
      ox = 0.3 * w; oy = 0.28 * h; fw = w - ox; fh = h - oy;
      g.FL = [l, b]; g.FR = [l + fw, b]; g.FT = [l + fw / 2, t + oy];
      g.BL = [l + ox, b - oy]; g.BR = [r, b - oy]; g.BT = [l + ox + fw / 2, t];
    } else return null;
    return g;
  }

  // Kup/dikdortgen prizma kose noktalari: on yuz (l,t+oy, fw x fh), arka yuz (+ox,-oy)
  function cuboid(l, t, fw, fh, ox, oy) {
    var ft = t + oy;
    return {
      FTL: [l, ft], FTR: [l + fw, ft], FBL: [l, ft + fh], FBR: [l + fw, ft + fh],
      BTL: [l + ox, t], BTR: [l + fw + ox, t], BBL: [l + ox, t + fh], BBR: [l + fw + ox, t + fh]
    };
  }

  function path(ctx, pts, close) {
    var i;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
    ctx.stroke();
  }
  function lines(ctx, list) { // list: [[p,q],[p,q]...]
    var i;
    ctx.beginPath();
    for (i = 0; i < list.length; i++) { ctx.moveTo(list[i][0][0], list[i][0][1]); ctx.lineTo(list[i][1][0], list[i][1][1]); }
    ctx.stroke();
  }
  function arc(ctx, cx, cy, rx, ry, a0, a1) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, a0, a1, false); ctx.stroke();
  }
  function dash(ctx, lw, on) { ctx.setLineDash(on ? [lw * 3, lw * 2.5] : []); }

  function ciz(ctx, ad, x0, y0, x1, y1, lw, renk) {
    var B = nb(x0, y0, x1, y1);
    if (B.w < 2 || B.h < 2) return;
    var g = geo(ad, B);
    if (!g) return;
    var v = g.v;
    ctx.save();
    ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
    if (ad === 'cember' || ad === 'kure') {
      arc(ctx, g.cx, g.cy, g.rx, g.ry, 0, 2 * PI);
      if (ad === 'cember') {
        ctx.beginPath(); ctx.arc(g.cx, g.cy, lw * 1.2, 0, 2 * PI); ctx.fill();
      } else {
        arc(ctx, g.cx, g.cy, g.rx, g.ery, 0, PI);
        dash(ctx, lw, true); arc(ctx, g.cx, g.cy, g.rx, g.ery, PI, 2 * PI); dash(ctx, lw, false);
      }
    } else if (ad === 'kup' || ad === 'prizma') {
      path(ctx, [v.FTL, v.FTR, v.FBR, v.FBL], true);
      path(ctx, [v.FTL, v.BTL, v.BTR, v.BBR, v.FBR]);
      lines(ctx, [[v.FTR, v.BTR]]);
      dash(ctx, lw, true);
      path(ctx, [v.FBL, v.BBL, v.BBR]);
      lines(ctx, [[v.BBL, v.BTL]]);
      dash(ctx, lw, false);
    } else if (ad === 'silindir') {
      arc(ctx, g.cx, g.yt, g.rx, g.ry, 0, 2 * PI);
      lines(ctx, [[[g.l, g.yt], [g.l, g.yb]], [[g.r, g.yt], [g.r, g.yb]]]);
      arc(ctx, g.cx, g.yb, g.rx, g.ry, 0, PI);
      dash(ctx, lw, true); arc(ctx, g.cx, g.yb, g.rx, g.ry, PI, 2 * PI); dash(ctx, lw, false);
    } else if (ad === 'koni') {
      lines(ctx, [[[g.cx, g.t], [g.l, g.yb]], [[g.cx, g.t], [g.r, g.yb]]]);
      arc(ctx, g.cx, g.yb, g.rx, g.ry, 0, PI);
      dash(ctx, lw, true);
      arc(ctx, g.cx, g.yb, g.rx, g.ry, PI, 2 * PI);
      lines(ctx, [[[g.cx, g.t], [g.cx, g.yb]]]);
      dash(ctx, lw, false);
      ctx.beginPath(); ctx.arc(g.cx, g.yb, lw * 1.2, 0, 2 * PI); ctx.fill();
    } else if (ad === 'piramit') {
      path(ctx, [g.A, g.FL, g.FR], true);
      lines(ctx, [[g.FR, g.BR], [g.A, g.BR]]);
      dash(ctx, lw, true);
      path(ctx, [g.FL, g.BL, g.BR]);
      lines(ctx, [[g.A, g.BL]]);
      dash(ctx, lw, false);
    } else if (ad === 'ucgen') {
      path(ctx, [g.FL, g.FR, g.FT], true);
      path(ctx, [g.FR, g.BR, g.BT, g.FT]);
      dash(ctx, lw, true);
      path(ctx, [g.FL, g.BL, g.BR]);
      lines(ctx, [[g.BL, g.BT]]);
      dash(ctx, lw, false);
    }
    ctx.restore();
  }

  function sample(out, cx, cy, rx, ry, a0, a1, n) {
    var i, a;
    for (i = 0; i <= n; i++) { a = a0 + (a1 - a0) * i / n; out.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a)); }
  }

  function hull(pts) { // pts: [[x,y],...] -> flat array (monotone chain)
    var p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var lo = [], up = [], i, out = [];
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < p.length; i++) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    lo.pop(); up.pop(); lo = lo.concat(up);
    for (i = 0; i < lo.length; i++) out.push(lo[i][0], lo[i][1]);
    return out;
  }

  function kontur(ad, x0, y0, x1, y1) {
    var B = nb(x0, y0, x1, y1), g = geo(ad, B), o = [], k;
    if (!g) return o;
    if (ad === 'cember' || ad === 'kure') { sample(o, g.cx, g.cy, g.rx, g.ry, 0, 2 * PI, 48); o.length -= 2; return o; }
    if (ad === 'silindir') {
      sample(o, g.cx, g.yt, g.rx, g.ry, PI, 2 * PI, 24);   // ust yay (soldan saga)
      sample(o, g.cx, g.yb, g.rx, g.ry, 0, PI, 24);        // alt on yay (sagdan sola)
      return o;
    }
    if (ad === 'koni') {
      o.push(g.cx, g.t);
      sample(o, g.cx, g.yb, g.rx, g.ry, 0, PI, 24);
      return o;
    }
    if (ad === 'kup' || ad === 'prizma') {
      var v = g.v, pts = [];
      for (k in v) pts.push(v[k]);
      return hull(pts);
    }
    var q = [];
    for (k in g) if (g[k] instanceof Array) q.push(g[k]);
    return hull(q);
  }

  return {
    sira: ['cember', 'kup', 'prizma', 'silindir', 'koni', 'kure', 'piramit', 'ucgen'],
    ad: { cember: 'Çember', kup: 'Küp', prizma: 'Dikdörtgenler prizması', silindir: 'Silindir', koni: 'Koni', kure: 'Küre', piramit: 'Piramit', ucgen: 'Üçgen prizma' },
    ikon: {
      cember: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11.2a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6',
      kup: 'M3 9h12v12H3zM3 9l6-6h12v12l-6 6M15 9l6-6',
      prizma: 'M2 10h14v11H2zM2 10l6-5h14v11l-6 5M16 10l6-5',
      silindir: 'M5 6a7 2.5 0 1 0 14 0a7 2.5 0 1 0-14 0M5 6v12M19 6v12M5 18a7 2.5 0 0 0 14 0',
      koni: 'M12 3L4 18M12 3l8 15M4 18a8 2.8 0 0 0 16 0',
      kure: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12a9 3 0 0 0 18 0',
      piramit: 'M12 3L2 20h14zM16 20l6-5L12 3',
      ucgen: 'M2 20h14l-7-10zM16 20l6-5l-7-10l-6 5'
    },
    ciz: ciz,
    kontur: kontur
  };
})();
  var KAL={k:.0024,f:.022,c:.0032,b:.0018,d:.06,g:.0022};
  var KAT=[.55,1,1.8],KAT_AD=['İnce','Orta','Kalın'],KAT_K='lex-ciz-kalin';
  var KSEC={k:1,f:1,c:1,g:1};try{var ks=JSON.parse(localStorage.getItem(KAT_K)||'null');if(ks&&typeof ks==='object')['k','f','c','g'].forEach(function(a){if(ks[a]===0||ks[a]===1||ks[a]===2)KSEC[a]=ks[a];});}catch(x){}
  // kalem ucu (standart / dolma), boya dolgusu (saydam / tam), şekil türü: cihazda hatırlanır
  var AYAR_K='lex-ciz-ayar',AYAR={uc:'s',dolu:0,sekil:'kup'};
  try{var ay=JSON.parse(localStorage.getItem(AYAR_K)||'null');if(ay){if(ay.uc==='d')AYAR.uc='d';if(ay.dolu===1)AYAR.dolu=1;if(typeof ay.sekil==='string')AYAR.sekil=ay.sekil;}}catch(x){}
  function ayarYaz(){try{localStorage.setItem(AYAR_K,JSON.stringify(AYAR));}catch(x){}}
  function kalinlik(t){return KSEC[t]===undefined?KAL[t]:Math.round(KAL[t]*KAT[KSEC[t]]*1e5)/1e5;}
  var P2={};
  function dp(ad){return P2[ad]||(P2[ad]=new Path2D(DMG.d[ad]));}
  var bar=$('kt-ciz-bar'),acBtn=$('kt-ciz-ac'),ipucu=$('kt-ciz-ipucu');
  function notlar(g){if(!g.m.not||typeof g.m.not!=='object')g.m.not={};return g.m.not;}
  function notKatman(g,s){
    if(!s.el||!s.canvas)return;
    var c=s.not;
    if(!c){c=document.createElement('canvas');c.className='kt-not';s.not=c;}
    if(c.parentNode!==s.el)s.el.appendChild(c);
    var dpr=Math.min(window.devicePixelRatio||1,2);
    c.width=Math.max(1,Math.round(s.cw*dpr));c.height=Math.max(1,Math.round(s.ch*dpr));
    notCiz(g,s);
  }
  // yumuşatılmış yol (orta nokta eğrileri); ilk parça p0'dan başlar
  function yol(ctx,p,W,H){
    ctx.moveTo(p[0]*W,p[1]*H);
    if(p.length<=6){for(var i=2;i<p.length;i+=2)ctx.lineTo(p[i]*W,p[i+1]*H);return;}
    for(var i=2;i<p.length-2;i+=2){var mx=(p[i]+p[i+2])/2*W,my=(p[i+1]+p[i+3])/2*H;ctx.quadraticCurveTo(p[i]*W,p[i+1]*H,mx,my);}
    ctx.lineTo(p[p.length-2]*W,p[p.length-1]*H);
  }
  // baskılı kalemde parça parça çizim: k. noktanın eğrisi (1<=k<=n-2) ve son düz parça
  function parca(ctx,p,q,k,W,H,w){
    var x0=p[2*k-2]*W,y0=p[2*k-1]*H,x1=p[2*k]*W,y1=p[2*k+1]*H,x2=p[2*k+2]*W,y2=p[2*k+3]*H;
    var ax=k===1?x0:(x0+x1)/2,ay=k===1?y0:(y0+y1)/2;
    ctx.lineWidth=Math.max(1,w*W*(q&&q[k]?q[k]:1));
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(x1,y1,(x1+x2)/2,(y1+y2)/2);ctx.stroke();
  }
  function sonParca(ctx,p,q,W,H,w){
    var n=p.length/2;if(n<3)return;
    var ax=(p[2*n-4]+p[2*n-2])/2*W,ay=(p[2*n-3]+p[2*n-1])/2*H;
    ctx.lineWidth=Math.max(1,w*W*(q&&q[n-1]?q[n-1]:1));
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(p[2*n-2]*W,p[2*n-1]*H);ctx.stroke();
  }
  function damgaCiz(ctx,st,W,H){
    if(!DMG.d[st.d])return;
    var s=st.w*W/24;ctx.save();ctx.translate(st.p[0]*W,st.p[1]*H);ctx.scale(s,s);ctx.translate(-12,-12);
    ctx.fillStyle=st.r;ctx.fill(dp(st.d));ctx.restore();
  }
  function cizgi(ctx,st,W,H,canli){
    var p=st.p;if(!p||p.length<2)return;
    if(st.t==='d'){damgaCiz(ctx,st,W,H);return;}
    if(st.t==='g'){if(typeof SEKIL!=='undefined'&&p.length>=4)SEKIL.ciz(ctx,st.g,p[0]*W,p[1]*H,p[2]*W,p[3]*H,Math.max(1,st.w*W),st.r);return;}
    ctx.save();
    ctx.lineCap=st.t==='f'?'butt':'round';ctx.lineJoin='round';
    ctx.strokeStyle=st.r;ctx.lineWidth=Math.max(1,st.w*W);
    if(st.t==='b'){
      if(p.length>=6){
        ctx.beginPath();yol(ctx,p,W,H);ctx.closePath();
        ctx.fillStyle=st.r;
        if(st.o===1){ctx.globalAlpha=.95;ctx.fill();}
        else if(st.o===0){ctx.globalAlpha=.55;if(!canli)ctx.globalCompositeOperation='multiply';ctx.fill();ctx.globalCompositeOperation='source-over';}
        else{ctx.globalAlpha=.35;ctx.fill();}
        if(!st.y){ctx.globalAlpha=.9;ctx.stroke();}
      }
      ctx.restore();return;
    }
    if(st.t==='f'){ctx.globalAlpha=.55;if(!canli)ctx.globalCompositeOperation='multiply';}
    if(st.t==='k'&&st.q&&p.length>=6){
      var n=p.length/2;for(var k=1;k<n-1;k++)parca(ctx,p,st.q,k,W,H,st.w);
      sonParca(ctx,p,st.q,W,H,st.w);ctx.restore();return;
    }
    ctx.beginPath();ctx.moveTo(p[0]*W,p[1]*H);
    if(p.length===2)ctx.lineTo(p[0]*W+.1,p[1]*H);
    else if(st.t==='k'&&p.length>6)yol(ctx,p,W,H);
    else for(var i=2;i<p.length;i+=2)ctx.lineTo(p[i]*W,p[i+1]*H);
    ctx.stroke();ctx.restore();
  }
  function notCiz(g,s){
    var c=s.not;if(!c)return;
    var ctx=c.getContext('2d'),W=c.width,H=c.height;
    ctx.clearRect(0,0,W,H);
    (notlar(g)[s.n]||[]).forEach(function(st){cizgi(ctx,st,W,H);});
  }
  function notYaz(g,hemen){
    clearTimeout(CZ.yazT);
    var yaz=function(){metaYaz(g.m).catch(function(){bildir('Not kaydedilemedi. Depolama dolu olabilir.');});};
    if(hemen)yaz();else CZ.yazT=setTimeout(yaz,600);
  }
  function damgaSatir(){
    var d=$('kt-ciz-damga');d.hidden=CZ.arac!=='d';
    if(CZ.arac!=='d'){d.innerHTML='';return;}
    d.innerHTML=Object.keys(DMG.d).map(function(ad){return '<button type="button" data-dm="'+ad+'" aria-label="'+esc(DMG.ad[ad]||ad)+'"'+(CZ.damga===ad?' class="sec"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="'+CZ.renk.d+'" d="'+DMG.d[ad]+'"/></svg></button>';}).join('');
  }
  function ucSatir(){
    var d=$('kt-ciz-uc'),a=CZ.arac;
    if(a==='k'){d.hidden=false;d.innerHTML='<button type="button" data-uc="s"'+(AYAR.uc==='s'?' class="sec"':'')+'>Standart</button><button type="button" data-uc="d"'+(AYAR.uc==='d'?' class="sec"':'')+'>Dolma kalem</button>';}
    else if(a==='b'){d.hidden=false;d.innerHTML='<button type="button" data-dl="0"'+(AYAR.dolu?'':' class="sec"')+'>Saydam</button><button type="button" data-dl="1"'+(AYAR.dolu?' class="sec"':'')+'>Tam renk</button>';}
    else{d.hidden=true;d.innerHTML='';}
  }
  function sekilSatir(){
    var d=$('kt-ciz-sk');if(CZ.arac!=='g'||typeof SEKIL==='undefined'){d.hidden=true;d.innerHTML='';return;}
    if(SEKIL.sira.indexOf(AYAR.sekil)<0)AYAR.sekil=SEKIL.sira[0];
    d.hidden=false;
    d.innerHTML=SEKIL.sira.map(function(ad){return '<button type="button" data-sk="'+ad+'" aria-label="'+esc(SEKIL.ad[ad]||ad)+'"'+(AYAR.sekil===ad?' class="sec"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="'+(CZ.renk.g||'#1A237E')+'" d="'+SEKIL.ikon[ad]+'"/></svg></button>';}).join('');
  }
  function kalSatir(){
    var d=$('kt-ciz-kal'),a=CZ.arac;d.hidden=KSEC[a]===undefined;
    if(d.hidden){d.innerHTML='';return;}
    var renk=CZ.renk[a]||'#fff',boy=a==='f'?[6,10,16]:[3,6,11];
    d.innerHTML=KAT.map(function(_,i){var h=boy[i];return '<button type="button" data-kl="'+i+'" aria-label="'+KAT_AD[i]+'"'+(KSEC[a]===i?' class="sec"':'')+'><i style="width:24px;height:'+h+'px;background:'+renk+(a==='f'?';opacity:.7':'')+'"></i></button>';}).join('');
  }
  function renkCiz(){
    var r=$('kt-ciz-renk'),f=$('kt-ciz-fly');damgaSatir();kalSatir();ucSatir();sekilSatir();
    if(CZ.arac==='s'){r.innerHTML='';f.hidden=true;return;}
    f.hidden=!CZ.fly;
    r.innerHTML=RENK[CZ.arac].map(function(k){return '<button type="button" data-r="'+k+'" aria-label="Renk" style="background:'+k+'"'+(CZ.renk[CZ.arac]===k?' class="sec"':'')+'></button>';}).join('');
    flyKonum();
  }
  function ipucuYaz(){
    var t={k:'Kalemle yaz',f:'Cümlenin üzerinden geç, düz boyanır',c:'Cümlenin altından çiz, düz çizgi olur',b:'Kapalı bir şekil çiz ya da çizdiğin şeklin içine dokun: içi boyanır',g:'Sürükle: şekil o boyda çizilir · dokun: normal boy',d:'Kalemle sürükle: damga o boyda çizilir · dokun: normal boy',s:'Silmek istediğin çizginin üzerinden geç'}[CZ.arac];
    ipucuGoster(t+(CZ.kalemVar?' · parmakla kaydır':' · iki parmakla kaydır')+(CZ.arac!=='s'?' · renk/kalınlık için araca dokun':''));
  }
  var ipT=0;
  function ipucuGoster(t){ipucu.textContent=t;ipucu.classList.add('goster');clearTimeout(ipT);ipT=setTimeout(function(){ipucu.classList.remove('goster');},3800);}
  // yan açılır (renk / damga): seçili aracın hizasında, sütunun sağına
  function flyKonum(){
    var f=$('kt-ciz-fly');if(f.hidden)return;
    var b=bar.querySelector('[data-a].sec'),gr=govde.getBoundingClientRect();if(!b)return;
    var br=b.getBoundingClientRect(),h=f.offsetHeight,t=br.top-gr.top+br.height/2-Math.min(h,48)/2-6;
    t=Math.max(8,Math.min(t,gr.height-h-8));f.style.top=Math.round(t)+'px';
  }
  $('kt-ciz-ar').addEventListener('scroll',flyKonum,{passive:true});
  function cizAc(){
    var g=G;if(!g||g.m.tur!=='pdf'||CZ.acik)return;
    CZ.acik=true;CZ.geri=[];CZ.fly=false;gor.classList.add('ciz');bar.hidden=false;acBtn.setAttribute('aria-pressed','true');
    renkCiz();ipucuYaz();
    if(!tamEkranMi())tamEkranIste();
    duzenIste();
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-ciz',function(){cizKapat(false,true);});
  }
  function cizKapat(sessiz,geriden){
    if(!CZ.acik)return;
    CZ.acik=false;if(CZ.ciziyor){cancelAnimationFrame(CZ.ciziyor.raf);canliKaldir(CZ.ciziyor);}CZ.ciziyor=null;CZ.parmak={};gor.classList.remove('ciz');bar.hidden=true;$('kt-ciz-fly').hidden=true;ipucu.classList.remove('goster');duzenIste();acBtn.setAttribute('aria-pressed','false');
    ['cv','cv2'].forEach(function(k){var v=CZ[k];if(v){v.width=0;v.height=0;if(v.parentNode)v.parentNode.removeChild(v);CZ[k]=null;}});
    if(G)notYaz(G,true);
    if(!geriden&&!sessiz&&window.LEX_GERI)window.LEX_GERI.dus('kt-ciz');
  }
  acBtn.addEventListener('click',function(){if(CZ.acik)cizKapat();else cizAc();});
  $('kt-ciz-bitti').addEventListener('click',function(){cizKapat();});
  function cizTik(e){
    var b=e.target.closest('[data-a]');
    if(b){var ayni=CZ.arac===b.getAttribute('data-a');CZ.fly=ayni?!CZ.fly:true;CZ.arac=b.getAttribute('data-a');[].forEach.call(bar.querySelectorAll('[data-a]'),function(x){x.classList.toggle('sec',x===b);});renkCiz();ipucuYaz();return;}
    var r=e.target.closest('[data-r]');
    if(r){CZ.renk[CZ.arac]=r.getAttribute('data-r');CZ.fly=false;renkCiz();return;}
    var kl=e.target.closest('[data-kl]');
    var uc=e.target.closest('[data-uc]');
    if(uc){AYAR.uc=uc.getAttribute('data-uc');ayarYaz();ucSatir();return;}
    var dl=e.target.closest('[data-dl]');
    if(dl){AYAR.dolu=+dl.getAttribute('data-dl');ayarYaz();ucSatir();return;}
    var sk=e.target.closest('[data-sk]');
    if(sk){AYAR.sekil=sk.getAttribute('data-sk');ayarYaz();sekilSatir();return;}
    if(kl){KSEC[CZ.arac]=+kl.getAttribute('data-kl');try{localStorage.setItem(KAT_K,JSON.stringify(KSEC));}catch(x){}kalSatir();return;}
    var d=e.target.closest('[data-dm]');
    if(d){CZ.damga=d.getAttribute('data-dm');damgaSatir();}
  }
  bar.addEventListener('click',cizTik);$('kt-ciz-fly').addEventListener('click',cizTik);
  $('kt-ciz-geri').addEventListener('click',function(){
    var g=G;if(!g)return;var x=CZ.geri.pop();if(!x){ipucuGoster('Geri alınacak bir şey yok');return;}
    var L=notlar(g)[x.n]=notlar(g)[x.n]||[];
    if(x.tur==='ekle'){var i=L.indexOf(x.st);if(i>=0)L.splice(i,1);}else{L.splice(Math.min(x.i,L.length),0,x.st);}
    var s=g.sayfalar[x.n-1];if(s)notCiz(g,s);notYaz(g);
  });
  function sayfaBul(g,x,y){
    for(var i=0;i<g.sayfalar.length;i++){var s=g.sayfalar[i];if(!s.el)continue;var r=s.el.getBoundingClientRect();if(y>=r.top&&y<=r.bottom&&x>=r.left&&x<=r.right)return {s:s,r:r};}
    return null;
  }
  function nokta(b,e){return [Math.round((e.clientX-b.r.left)/b.r.width*1e4)/1e4,Math.round((e.clientY-b.r.top)/b.r.height*1e4)/1e4];}
  function icinde(p,q,en,es){
    var qx=q[0]*en,qy=q[1]*es,ic=false;
    for(var i=0,j=p.length-2;i<p.length;j=i,i+=2){
      var xi=p[i]*en,yi=p[i+1]*es,xj=p[j]*en,yj=p[j+1]*es;
      if((yi>qy)!==(yj>qy)&&qx<(xj-xi)*(qy-yi)/(yj-yi)+xi)ic=!ic;
    }
    return ic;
  }
  // silgi: bir dokunuş noktası için; silinen çizgi varsa true
  function notSil1(g,b,e){
    var q=nokta(b,e),L=notlar(g)[b.s.n]||[],en=b.r.width,es=b.r.height,yar=14;
    for(var i=L.length-1;i>=0;i--){
      var p=L[i].p,ek=Math.max(yar,L[i].w*en/2),vur=L[i].t==='b'&&p.length>=6&&icinde(p,q,en,es);
      if(L[i].t==='g'&&p.length>=4){var kx0=Math.min(p[0],p[2])*en-yar,kx1=Math.max(p[0],p[2])*en+yar,ky0=Math.min(p[1],p[3])*es-yar,ky1=Math.max(p[1],p[3])*es+yar,qx=q[0]*en,qy=q[1]*es;vur=qx>=kx0&&qx<=kx1&&qy>=ky0&&qy<=ky1;p=[];}
      for(var j=0;j<p.length&&!vur;j+=2){
        var dx=(p[j]-q[0])*en,dy=(p[j+1]-q[1])*es;
        var bas=j>=2?[p[j-2],p[j-1]]:null,yakin=dx*dx+dy*dy<=ek*ek;
        if(!yakin&&bas){var ax=bas[0]*en,ay=bas[1]*es,bx=p[j]*en,by=p[j+1]*es,qx=q[0]*en,qy=q[1]*es,vx=bx-ax,vy=by-ay,L2=vx*vx+vy*vy,t=L2?Math.max(0,Math.min(1,((qx-ax)*vx+(qy-ay)*vy)/L2)):0,cx=ax+t*vx-qx,cy=ay+t*vy-qy;yakin=cx*cx+cy*cy<=ek*ek;}
        if(yakin)vur=true;
      }
      if(vur){var st=L.splice(i,1)[0];CZ.geri.push({tur:'sil',n:b.s.n,st:st,i:i});return true;}
    }
    return false;
  }
  function notSil(g,b,evs){
    var d=false;for(var i=0;i<evs.length;i++)if(notSil1(g,b,evs[i]))d=true;
    if(d){notCiz(g,b.s);notYaz(g);}
  }
  function kaydirParmak(){
    var ids=Object.keys(CZ.parmak);if(!ids.length)return null;
    var x=0,y=0;ids.forEach(function(k){x+=CZ.parmak[k].x;y+=CZ.parmak[k].y;});return {x:x/ids.length,y:y/ids.length,n:ids.length};
  }
  // uç genişliği: standart = basınca hafif duyarlı; dolma = 45° kesik uç (yöne göre ince-kalın) + basınç
  function ucGen(tip,e,dolma){
    var pr=tip==='pen'&&e.pressure>0?Math.min(1,e.pressure*1.5):.6;
    return dolma?(.75+.5*pr)*.8:(.6+.7*pr);
  }
  function baski(e){var pr=e.pressure>0?e.pressure:.5;pr=Math.min(1,pr*1.5);return .35+1.15*Math.pow(pr,.8);}
  kaydir.addEventListener('contextmenu',function(e){if(CZ.acik)e.preventDefault();});
  kaydir.addEventListener('pointerdown',function(e){
    var g=G;if(!CZ.acik||!g)return;
    if(CZ.fly){CZ.fly=false;$('kt-ciz-fly').hidden=true;}
    var c0=CZ.ciziyor;
    if(e.pointerType==='pen'){
      if(!CZ.kalemVar){CZ.kalemVar=true;ipucuYaz();}
      CZ.parmak={};CZ.kay=null; // kalem inince bekleyen avuç/parmak izleri atılır
      if(c0&&c0.id!==e.pointerId){cancelAnimationFrame(c0.raf);CZ.ciziyor=null;canliKaldir(c0);notCiz(g,c0.s);}
    }
    // kalemle yazarken (ve hemen sonrasında) gelen dokunuşlar avuçtur: yok say
    if(e.pointerType==='touch'&&((c0&&c0.tip==='pen')||Date.now()-CZ.penT<350)){if(e.cancelable)e.preventDefault();return;}
    var parmakla=e.pointerType==='touch'&&(CZ.kalemVar||Object.keys(CZ.parmak).length>0);
    if(e.pointerType==='touch'){CZ.parmak[e.pointerId]={x:e.clientX,y:e.clientY};}
    if(parmakla||(e.pointerType==='touch'&&Object.keys(CZ.parmak).length>1)){
      if(CZ.ciziyor&&CZ.ciziyor.id!==e.pointerId){var cs=CZ.ciziyor;CZ.ciziyor=null;cancelAnimationFrame(cs.raf);canliKaldir(cs);notCiz(g,cs.s);}
      CZ.kay=kaydirParmak();return;
    }
    var b=sayfaBul(g,e.clientX,e.clientY);if(!b||!b.s.not)return;
    e.preventDefault();try{kaydir.setPointerCapture(e.pointerId);}catch(x){}
    var t=CZ.arac,tip=e.pointerType;
    if(tip==='pen')CZ.penT=Date.now();
    if(t==='s'){CZ.ciziyor={id:e.pointerId,s:b.s,r:b.r,silgi:true,tip:tip};notSil(g,b,[e]);return;}
    var q=nokta(b,e),st={t:t,r:CZ.renk[t],w:kalinlik(t),p:q.slice()};
    if(t==='d')st.d=CZ.damga;
    if(t==='g')st.g=AYAR.sekil;
    if(t==='b')st.o=AYAR.dolu;
    var dolma=t==='k'&&AYAR.uc==='d';if(dolma)st.u='d';
    var pen=t==='k'&&(tip==='pen'||dolma),qs=pen?ucGen(tip,e,dolma):1;
    if(pen)st.q=[Math.round(qs*100)/100];
    CZ.ciziyor={id:e.pointerId,s:b.s,r:b.r,st:st,tip:tip,pen:pen,qs:qs,di:1,raf:0,ax:e.clientX,ay:e.clientY,boy:false};
    canliKur(CZ.ciziyor);
  });

  // canlı katman: sayfa boyutunda değil, yalnız görünen alan boyutunda (zumda bile küçük kalır → hızlı)
  function ustKur(cv,c){
    var kr=kaydir.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    var pw=Math.max(1,Math.round(kr.width*dpr)),ph=Math.max(1,Math.round(kr.height*dpr));
    if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}
    cv.style.cssText='position:fixed;left:'+kr.left+'px;top:'+kr.top+'px;width:'+kr.width+'px;height:'+kr.height+'px;pointer-events:none;z-index:2';
    if(cv.parentNode!==kaydir.parentNode||cv.previousSibling!==kaydir)kaydir.parentNode.insertBefore(cv,kaydir.nextSibling);
    var ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,pw,ph);
    // sayfa tuvali koordinatları (0..W) → görünen alan pikseli: mevcut çizim kodu değişmeden çalışır
    var sx=pw/kr.width,k=c.r.width*sx/c.W;
    ctx.setTransform(k,0,0,k,(c.r.left-kr.left)*sx,(c.r.top-kr.top)*sx);
    return ctx;
  }
  // Ink API: kalemin ucunu tarayıcı yerine işletim sistemi çizer (destek yoksa hiçbir şey yapmaz)
  function inkHazirla(el){
    if(CZ.inkEl===el)return;
    CZ.inkEl=el;CZ.ink=null;
    try{
      if(!navigator.ink||!navigator.ink.requestPresenter)return;
      navigator.ink.requestPresenter({presentationArea:el}).then(function(pr){if(CZ.inkEl===el)CZ.ink=pr;}).catch(function(){});
    }catch(x){}
  }
  function inkIz(c,e){
    var pr=CZ.ink;if(!pr||!c.pen||CZ.inkEl!==c.cv2)return false;
    try{pr.updateInkTrailStartPoint(e,{color:c.st.r,diameter:Math.max(1,c.st.w*c.r.width*c.qs)});return true;}catch(x){return false;}
  }
  function temizle(ctx){if(!ctx)return;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}
  function canliKur(c){
    var s=c.s;c.W=s.not.width;c.H=s.not.height;
    if(!CZ.cv){CZ.cv=document.createElement('canvas');CZ.cv.className='kt-ust';}
    var ctx=ustKur(CZ.cv,c);c.cv=CZ.cv;c.ctx=ctx;var W=c.W,H=c.H;
    if(c.st.t==='k'){ // kuyruk katmanı: çizginin ucu + kalemin tahmini yönü, her harekette silinip yeniden çizilir
      if(!CZ.cv2){CZ.cv2=document.createElement('canvas');CZ.cv2.className='kt-ust';}
      c.ctx2=ustKur(CZ.cv2,c);c.cv2=CZ.cv2;c.kb=null;c.pr=null;
      if(c.pen)inkHazirla(CZ.cv2);
    }
    ctx.lineCap=c.st.t==='f'?'butt':'round';ctx.lineJoin='round';ctx.strokeStyle=c.st.r;ctx.fillStyle=c.st.r;ctx.lineWidth=Math.max(1,c.st.w*W);
    if(c.st.t==='k'){var p=c.st.p;ctx.lineWidth=Math.max(1,c.st.w*W*c.qs);ctx.beginPath();ctx.moveTo(p[0]*W,p[1]*H);ctx.lineTo(p[0]*W+.1,p[1]*H);ctx.stroke();}
    else if(c.st.t==='d')canliCiz(c);
  }
  function canliKaldir(c){if(c&&c.cv){temizle(c.ctx);c.cv=null;c.ctx=null;}if(c&&c.cv2){temizle(c.ctx2);c.cv2=null;c.ctx2=null;}}
  function plan(c){if(c.raf)return;c.raf=requestAnimationFrame(function(){c.raf=0;canliCiz(c);});}
  // rAF başına bir kez: yalnız yeni parçalar çizilir
  function canliCiz(c){
    var ctx=c.ctx;if(!ctx)return;
    var st=c.st,t=st.t,p=st.p,W=c.W,H=c.H;
    if(t==='d'||t==='c'||t==='f'||t==='g'){temizle(ctx);ctx.lineCap=t==='f'?'butt':'round';ctx.lineJoin='round';ctx.strokeStyle=st.r;ctx.fillStyle=st.r;cizgi(ctx,st,W,H,true);return;}
    var n=p.length/2;
    ctx.lineWidth=Math.max(1,st.w*W);
    while(c.di<=n-2){parca(ctx,p,st.q,c.di,W,H,st.w);c.di++;}
    if(c.ctx2)kuyruk(c);
  }
  // kalıcı eğri son iki noktanın ortasında biter; ucu gerçek son noktaya ve tahmini yöne kadar uzat (gecikme hissi gider)
  function kuyruk(c){
    var x=c.ctx2,p=c.st.p,n=p.length/2,W=c.W,H=c.H;
    if(c.kb){x.clearRect(c.kb[0],c.kb[1],c.kb[2],c.kb[3]);c.kb=null;}
    if(n<2)return;
    var w=Math.max(1,c.st.w*W*(c.pen?c.qs:1)),ax=(p[2*n-4]+p[2*n-2])/2*W,ay=(p[2*n-3]+p[2*n-1])/2*H;
    var xs=[ax],ys=[ay];
    x.lineCap='round';x.lineJoin='round';x.strokeStyle=c.st.r;x.lineWidth=w;
    x.beginPath();x.moveTo(ax,ay);
    var lx=p[2*n-2]*W,ly=p[2*n-1]*H;x.lineTo(lx,ly);xs.push(lx);ys.push(ly);
    var P=c.pr||[];for(var i=0;i<P.length;i++){var qx=P[i][0]*W,qy=P[i][1]*H;x.lineTo(qx,qy);xs.push(qx);ys.push(qy);}
    x.stroke();
    var x0=Math.min.apply(null,xs)-w-2,y0=Math.min.apply(null,ys)-w-2,x1=Math.max.apply(null,xs)+w+2,y1=Math.max.apply(null,ys)+w+2;
    c.kb=[x0,y0,x1-x0,y1-y0];
  }
  function ekleNokta(c,ev){
    var r=c.r,p=c.st.p,x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;
    var lx=p[p.length-2],ly=p[p.length-1];
    if(Math.abs((x-lx)*r.width)+Math.abs((y-ly)*r.height)<0.5)return false;
    p.push(Math.round(x*1e4)/1e4,Math.round(y*1e4)/1e4);
    if(c.pen){
      var pr=c.tip==='pen'&&ev.pressure>0?Math.min(1,ev.pressure*1.5):.6,hedef;
      if(c.st.u==='d'){var a=Math.atan2((y-ly)*r.height,(x-lx)*r.width);hedef=(.3+1.15*Math.abs(Math.sin(a+Math.PI/4)))*(.75+.5*pr);}
      else hedef=.6+.7*pr;
      c.qs=c.qs*(c.st.u==='d'?.6:.45)+hedef*(c.st.u==='d'?.4:.55);c.st.q.push(Math.round(c.qs*100)/100);
    }
    return true;
  }
  function hareket(e){
    var g=G,c=CZ.ciziyor;if(!g||!c||c.id!==e.pointerId)return;
    if(e.cancelable)e.preventDefault();
    var L=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];if(!L.length)L=[e];
    if(c.tip==='pen')CZ.penT=Date.now();
    if(c.silgi){notSil(g,{s:c.s,r:c.r},L);return;}
    var r=c.r,t=c.st.t,p=c.st.p,son=L[L.length-1];
    if(t==='g'){
      var gx=son.clientX-c.ax,gy=son.clientY-c.ay;
      if(!c.boy&&Math.max(Math.abs(gx),Math.abs(gy))<8)return;
      c.boy=true;
      if(c.st.g==='cember'||c.st.g==='kure'){var m=Math.max(Math.abs(gx),Math.abs(gy));gx=(gx<0?-1:1)*m;gy=(gy<0?-1:1)*m;}
      c.st.p=[Math.round((c.ax-r.left)/r.width*1e4)/1e4,Math.round((c.ay-r.top)/r.height*1e4)/1e4,Math.round((c.ax+gx-r.left)/r.width*1e4)/1e4,Math.round((c.ay+gy-r.top)/r.height*1e4)/1e4];
      canliCiz(c);return;
    }
    if(t==='d'){
      // damga: çapa köşesi + sürükleme = o boyda kare (her yöne); kısa dokunuş = varsayılan boy
      var ddx=son.clientX-c.ax,ddy=son.clientY-c.ay,big=Math.max(Math.abs(ddx),Math.abs(ddy));
      if(!c.boy&&big<8)return;
      c.boy=true;
      var sz=Math.max(.03*r.width,Math.min(.6*r.width,big)),sx=ddx<0?-1:1,sy=ddy<0?-1:1;
      c.st.w=Math.round(sz/r.width*1e4)/1e4;
      c.st.p=[Math.round((c.ax+sx*sz/2-r.left)/r.width*1e4)/1e4,Math.round((c.ay+sy*sz/2-r.top)/r.height*1e4)/1e4];
      canliCiz(c);return;
    }
    if(t==='c'||t==='f'){
      var q=[(son.clientX-r.left)/r.width,(son.clientY-r.top)/r.height];
      var dx=(q[0]-p[0])*r.width,dy=(q[1]-p[1])*r.height;
      c.st.p=[p[0],p[1],Math.round(q[0]*1e4)/1e4,Math.abs(dy)<Math.max(10,Math.abs(dx)*.12)?p[1]:Math.round(q[1]*1e4)/1e4];
      canliCiz(c);return;
    }
    var yeni=false;for(var i=0;i<L.length;i++)if(ekleNokta(c,L[i]))yeni=true;
    if(c.ctx2){
      var PE=c.ink?[]:(e.getPredictedEvents&&e.getPredictedEvents())||[];
      c.pr=PE.slice(0,3).map(function(v){return [(v.clientX-r.left)/r.width,(v.clientY-r.top)/r.height];});
      yeni=true;
    }
    if(yeni)canliCiz(c);
    if(c.ctx2)c.ink=inkIz(c,e);
  }
  kaydir.addEventListener('pointermove',function(e){
    var g=G;if(!CZ.acik||!g)return;
    if(e.pointerType==='touch'&&CZ.parmak[e.pointerId]){
      CZ.parmak[e.pointerId]={x:e.clientX,y:e.clientY};
      if(!CZ.ciziyor||CZ.ciziyor.id!==e.pointerId){
        var k=kaydirParmak();if(CZ.kay&&k&&k.n===CZ.kay.n){kaydir.scrollLeft-=k.x-CZ.kay.x;kaydir.scrollTop-=k.y-CZ.kay.y;}
        CZ.kay=k;return;
      }
    }
    hareket(e);
  });
  function birak(e){
    var g=G;
    if(CZ.parmak[e.pointerId]){delete CZ.parmak[e.pointerId];CZ.kay=kaydirParmak();}
    var c=CZ.ciziyor;if(!c||c.id!==e.pointerId||!g)return;
    CZ.ciziyor=null;cancelAnimationFrame(c.raf);c.raf=0;
    if(c.tip==='pen')CZ.penT=Date.now();
    if(c.silgi)return;
    var st=c.st,t=st.t,iptal=e.type==='pointercancel';
    if(iptal&&!(t==='k'&&st.p.length>=4)){canliKaldir(c);return;}
    if(!iptal&&(t==='k'||t==='b'))ekleNokta(c,e);
    if(t==='b'){
      var xs=[],ys=[];for(var i=0;i<st.p.length;i+=2){xs.push(st.p[i]);ys.push(st.p[i+1]);}
      var gen=(Math.max.apply(null,xs)-Math.min.apply(null,xs))*c.r.width,yuk=(Math.max.apply(null,ys)-Math.min.apply(null,ys))*c.r.height;
      if(st.p.length<6||gen<12||yuk<12){canliKaldir(c);if(!iptal)boyaDokun(g,c,st);return;}
    }
    if(t==='g'){
      if(iptal){canliKaldir(c);return;}
      if(!c.boy){var hw=.09,hh=hw*c.r.width/c.r.height,cx=st.p[0],cy=st.p[1];st.p=[Math.round((cx-hw)*1e4)/1e4,Math.round((cy-hh)*1e4)/1e4,Math.round((cx+hw)*1e4)/1e4,Math.round((cy+hh)*1e4)/1e4];}
    }
    var L=notlar(g)[c.s.n]=notlar(g)[c.s.n]||[];
    L.push(st);CZ.geri.push({tur:'ekle',n:c.s.n,st:st});
    // aynı karede: kalıcı tuvale yalnız bu çizgi, canlı tuval temizlenir (titreme/sıçrama yok)
    var nc=c.s.not;
    if(nc&&nc.width===c.W&&nc.height===c.H)cizgi(nc.getContext('2d'),st,nc.width,nc.height);else notCiz(g,c.s);
    canliKaldir(c);notYaz(g);
  }
  // boya: kapalı bir çizginin / şeklin içine dokununca o şeklin içini doldur
  function kapali(st,en,es){
    if(st.t==='g'&&st.p.length>=4&&typeof SEKIL!=='undefined'){
      var k=SEKIL.kontur(st.g,st.p[0]*en,st.p[1]*es,st.p[2]*en,st.p[3]*es)||[];
      return k.map(function(v,i){return Math.round(v/(i%2?es:en)*1e4)/1e4;});
    }
    if(st.t!=='k'&&st.t!=='b')return null;
    var p=st.p;if(!p||p.length<12)return null;
    var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(var i=0;i<p.length;i+=2){x0=Math.min(x0,p[i]*en);x1=Math.max(x1,p[i]*en);y0=Math.min(y0,p[i+1]*es);y1=Math.max(y1,p[i+1]*es);}
    var cap=Math.hypot(x1-x0,y1-y0);if(cap<16)return null;
    // uçlar birbirine yakınsa kapalı say (çizginin sonu başına değmese de)
    var dx=(p[0]-p[p.length-2])*en,dy=(p[1]-p[p.length-1])*es;
    return Math.hypot(dx,dy)<=Math.max(24,cap*.2)?p.slice():null;
  }
  function alan(p,en,es){var a=0;for(var i=0,j=p.length-2;i<p.length;j=i,i+=2)a+=(p[j]*en)*(p[i+1]*es)-(p[i]*en)*(p[j+1]*es);return Math.abs(a/2);}
  function boyaDokun(g,c,st){
    var L=notlar(g)[c.s.n]||[],en=c.r.width,es=c.r.height,q=[st.p[0],st.p[1]],bul=-1,poly=null,enk=1e18;
    for(var i=0;i<L.length;i++){
      if(L[i].t==='b'&&L[i].y)continue;
      var k=kapali(L[i],en,es);if(!k||k.length<6||!icinde(k,q,en,es))continue;
      var a=alan(k,en,es);if(a<enk){enk=a;bul=i;poly=k;}
    }
    if(bul<0){ipucuGoster('Önce kalemle kapalı bir şekil çiz, sonra içine dokun');return;}
    var yeni={t:'b',r:st.r,w:st.w,p:poly,o:AYAR.dolu,y:1};
    // dolgu, şeklin çizgisinin altına girer: çizgi üstte kalır
    L.splice(bul,0,yeni);notlar(g)[c.s.n]=L;CZ.geri.push({tur:'ekle',n:c.s.n,st:yeni});
    notCiz(g,c.s);notYaz(g);
  }
  kaydir.addEventListener('pointerup',birak);
  kaydir.addEventListener('pointercancel',birak);


  // ---------- PDF'teki kanun atıfları: "TBK m. 49" -> dokun, madde açılsın ----------
  var KAN_AD=[['2709',['Anayasa','ANAYASA','AY','Any.']],['4721',['TMK','MK']],['6098',['TBK']],['6102',['TTK']],['5237',['TCK']],['5271',['CMK']],['6100',['HMK']],['2004',['İİK','IIK']],['2577',['İYUK','IYUK']],['4857',['İşK','İş K.','İş Kanunu']],['7201',['TebK','Teb. K.','Tebligat Kanunu']],['1136',['AvK','Av. K.','Avukatlık Kanunu']],['5718',['MÖHUK','MOHUK']],['5326',['KabK','Kab. K.','Kabahatler Kanunu']],['2918',['KTK','KarTK']],['5275',['İnfaz Kanunu','İnfazK','CGTİK','CGTİHK']],['213',['VUK','Vergi Usul Kanunu']],['657',['DMK','Devlet Memurları Kanunu']],['6698',['KVKK','KVK Kanunu']],['6502',['TKHK','Tüketici Kanunu']],['5510',['SSGSSK']],['7036',['İş Mahkemeleri Kanunu','İMK']],['6325',['HUAK','Arabuluculuk Kanunu']],['2942',['KamK','Kamulaştırma Kanunu']],['7545',['Siber Güvenlik Kanunu','SiberGK']]];
  var KAN_HARITA={},KAN_NO={},adlar=[];
  KAN_AD.forEach(function(x){KAN_NO[x[0]]=1;x[1].forEach(function(a){KAN_HARITA[a]=x[0];adlar.push(a);});});
  adlar.sort(function(a,b){return b.length-a.length;});
  function rx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  var HARF='A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû';
  var MAD='(?:maddesi(?:nin|nde|ne)?|madde|mad\\.|md\\.|md|m\\.)';
  var NUM='(\\d{1,4})(?:\\s*\\/\\s*(?:\\d{1,2}|[a-zçğıöşü]))?(?![\\d])';
  var RE_K=new RegExp('(?<!['+HARF+'])('+adlar.map(rx).join('|')+')(?!['+HARF+'])(?:[\'’][a-zçğıöşü]{1,6})?[\\s,.]*(?:'+MAD+'\\s*)?'+NUM,'g');
  var RE_S=new RegExp('(?<!\\d)(\\d{4})\\s*(?:sayılı|s\\.)\\s*(?:[^\\d]{0,60}?)(?:Kanun|K\\.)\\S{0,6}\\s*(?:'+MAD+'\\s*)?'+NUM,'g');
  var RE_UC=new RegExp('(?:(?<!['+HARF+'])('+adlar.map(rx).join('|')+')(?:[\'’][a-zçğıöşü]{1,6})?[\\s,.]*)?(?<!['+HARF+'])(?:madde|md\\.?|m\\.)\\s*$');
  var RE_D=new RegExp('(?<!['+HARF+'])(?:madde|md\\.|m\\.)\\s*'+NUM,'g');
  // satır sonu/başı bölünmüş atıflar (metin katmanı + OCR ortak). UE: satır sonu "KANUN" (m. yok), SU: "6098 sayılı ... Kanun [m.]", BAS: satır başı "[(] [m.] 36"
  var RE_UE=new RegExp('(?<!['+HARF+'])('+adlar.map(rx).join('|')+')(?:[\'’][a-zçğıöşü]{1,6})?[\\s,.]*$');
  var RE_SU=new RegExp('(?<!\\d)(\\d{4})\\s*(?:sayılı|s\\.)\\s*(?:[^\\d]{0,60}?)(?:Kanun|K\\.)\\S{0,6}\\s*(?:('+MAD+')\\s*)?$');
  var RE_BAS=new RegExp('^[\\s(\\[]*(?:('+MAD+')\\s*)?'+NUM);
  function caprazAtif(t1,t2,vars){
    var bas=RE_BAS.exec(t2);if(!bas)return null;
    var uc=RE_UC.exec(t1),su=RE_SU.exec(t1),ue,kn,v=0,u0,gerek=0; // gerek: satır başında "m." şart
    if(su&&!KAN_NO[su[1]])su=null;
    if(uc&&!uc[1]&&su)uc=null; // "6098 sayılı Kanun m.": kanun adı belli
    if(uc){
      if(bas[1])return null; // "m." + "m. 12": çift madde sözcüğü
      kn=uc[1]?KAN_HARITA[uc[1]]:vars;v=uc[1]?0:1;
      u0=uc.index;var q=t1.slice(u0).search(/[A-Za-zÇĞİÖŞÜçğıöşü]/);u0+=q<0?0:q;
    }else if(su){
      kn=su[1];u0=su.index;
      if(su[2]){if(bas[1])return null;}else gerek=1;
    }else if((ue=RE_UE.exec(t1))){kn=KAN_HARITA[ue[1]];u0=ue.index;gerek=1;}
    else return null;
    if(gerek&&!bas[1])return null; // "TBK" + alt satırda çıplak sayı: atıf sayma
    var n=parseInt(bas[2],10);if(!(n>0)||n>1600||KAN_NO[bas[2]])return null;
    var b0=bas[1]?bas[0].indexOf(bas[1]):bas[0].indexOf(bas[2]);
    if(b0<0)b0=0;
    return {no:kn,v:v,u0:u0,b0:b0,b1:bas[0].length,n:String(n),yalin:(v&&!vars)?1:0};
  }
  var DERS_K=[['infaz','5275'],['siber','7545'],['vergi','213'],['tüketici','6502'],['kişisel veri','6698'],['sosyal güvenlik','5510'],['arabulucu','6325'],['kamulaştırma','2942'],['muhakeme','5271'],['cmk','5271'],['ceza','5237'],['medeni usul','6100'],['hmk','6100'],['usul','6100'],['borç','6098'],['icra','2004'],['iflas','2004'],['idari yarg','2577'],['iş hukuk','4857'],['ticaret','6102'],['şirket','6102'],['kıymetli','6102'],['eşya','4721'],['medeni','4721'],['aile','4721'],['miras','4721'],['kişiler','4721'],['anayasa','2709'],['möhuk','5718'],['özel hukuk','5718'],['kabahat','5326']];
  function dersKanun(d){d=String(d||'').toLocaleLowerCase('tr');for(var i=0;i<DERS_K.length;i++)if(d.indexOf(DERS_K[i][0])>=0)return DERS_K[i][1];return '';}
  var OLC=null;
  function olc(t){if(!OLC){OLC=document.createElement('canvas').getContext('2d');OLC.font='100px Arial, Helvetica, sans-serif';}return OLC.measureText(t).width;}
  function satirlar(items,vt){
    var L=[];
    items.forEach(function(it){
      if(!it.str)return;var t=it.transform;
      var m=[vt[0]*t[0]+vt[2]*t[1],vt[1]*t[0]+vt[3]*t[1],vt[0]*t[2]+vt[2]*t[3],vt[1]*t[2]+vt[3]*t[3],vt[0]*t[4]+vt[2]*t[5]+vt[4],vt[1]*t[4]+vt[3]*t[5]+vt[5]];
      var fh=Math.hypot(m[2],m[3]);if(!fh||Math.abs(m[1])>fh*.05)return;
      var sx=Math.hypot(m[0],m[1])/fh||1;
      L.push({s:it.str,x:m[4],y:m[5],h:fh,w:(it.width||0)*sx*(Math.abs(vt[0])||Math.abs(vt[1])||1)});
    });
    L.sort(function(a,b){return Math.abs(a.y-b.y)<Math.min(a.h,b.h)*.5?a.x-b.x:a.y-b.y;});
    var out=[],cur=null;
    L.forEach(function(it){
      if(!cur||Math.abs(it.y-cur.y)>=Math.min(it.h,cur.h)*.5||it.x<cur.son-cur.h){cur={t:'',x1:[],x2:[],y:it.y,h:it.h,son:it.x};out.push(cur);}
      if(cur.t&&it.x-cur.son>it.h*.12&&!/\s$/.test(cur.t)&&!/^\s/.test(it.s)){cur.t+=' ';cur.x1.push(cur.son);cur.x2.push(it.x);}
      var n=it.s.length,top=olc(it.s)||n,once=0;
      for(var i=0;i<n;i++){var son=olc(it.s.slice(0,i+1));cur.t+=it.s[i];cur.x1.push(it.x+it.w*once/top);cur.x2.push(it.x+it.w*son/top);once=son;}
      cur.son=it.x+it.w;cur.h=Math.max(cur.h,it.h);
    });
    return out;
  }
  function atifBul(page,vars){
    var vp=page.getViewport({scale:1});
    return page.getTextContent().then(function(tc){
      var harf=0;tc.items.forEach(function(it){harf+=(it.str||'').replace(/\s/g,'').length;});
      var S=satirlar(tc.items,vp.transform);
      S.forEach(function(sa){sa.ust=sa.y-sa.h*.92;sa.yuk=sa.h*1.18;});
      var L=atifSatir(S,vars,vp.width,vp.height);L.taranmis=harf<25;return L;
    });
  }
  function atifSatir(S,vars,VW,VH){
      var bulunan=[],yalin=0;
      // satır sonunda "İİK m." / "TBK" / "(m." / "6098 sayılı Kanun m.", alt satır başında "36" / "m. 49": iki parça da aynı maddeye gider
      for(var si=0;si+1<S.length;si++){
        var a1=S[si],a2=S[si+1],cx=caprazAtif(a1.t,a2.t,vars);
        if(!cx)continue;
        if(cx.yalin)yalin++;
        var o1={x:a1.x1[cx.u0]/VW,y:a1.ust/VH,w:(a1.x2[a1.t.length-1]-a1.x1[cx.u0])/VW,h:a1.yuk/VH,no:cx.no,n:cx.n};
        var o2={x:a2.x1[cx.b0]/VW,y:a2.ust/VH,w:(a2.x2[cx.b1-1]-a2.x1[cx.b0])/VW,h:a2.yuk/VH,no:cx.no,n:cx.n};
        if(cx.v){o1.v=o2.v=1;}
        if(o1.w>0)bulunan.push(o1);if(o2.w>0)bulunan.push(o2);
        (a2.dolu||(a2.dolu=[])).push([cx.b0,cx.b1]);
      }
      S.forEach(function(sa){
        var dolu=sa.dolu?sa.dolu.slice():[];
        function ekle(a,b,no,n,v){
          for(var i=0;i<dolu.length;i++)if(a<dolu[i][1]&&b>dolu[i][0])return;
          var na=parseInt(n,10);if(!(na>0)||na>1600||KAN_NO[n])return;
          dolu.push([a,b]);
          var x1=sa.x1[a],x2=sa.x2[b-1];
          var o={x:x1/VW,y:sa.ust/VH,w:(x2-x1)/VW,h:sa.yuk/VH,no:no,n:String(na)};if(v)o.v=1;bulunan.push(o);
        }
        var m;RE_K.lastIndex=0;
        while((m=RE_K.exec(sa.t)))ekle(m.index,m.index+m[0].length,KAN_HARITA[m[1]],m[2]);
        RE_S.lastIndex=0;
        while((m=RE_S.exec(sa.t)))if(KAN_NO[m[1]])ekle(m.index,m.index+m[0].length,m[1],m[2]);
        RE_D.lastIndex=0;while((m=RE_D.exec(sa.t))){if(!vars)yalin++;ekle(m.index,m.index+m[0].length,vars,m[1],1);}
      });
      bulunan.yalin=yalin;bulunan.metin=S.map(function(sa){return sa.t;}).join(' ').slice(0,6000);
      return bulunan;
  }
  var ATIF_IP='lex-atif-ipucu';
  async function atifKatman(g,s){
    try{
      if(!g.atif[s.n]){
        var page=await g.pdf.getPage(s.n);
        var A=await atifBul(page,varsK(g));
        if(A.taranmis){
          var oc=g.m.ocr&&g.m.ocr[s.n];
          if(oc){A=oc.slice();A.taranmis=true;A.okundu=true;}
          else{g.taranmis=true;ocrDugme(g);}
        }
        g.atif[s.n]=A;
        try{if(window.LEX_MV_ONCELIK){var kn={},kl=[],vk0=varsK(g);if(vk0)kn[vk0]=1;A.forEach(function(a){if(a.no)kn[a.no]=1;});for(var x in kn)kl.push(x);if(kl.length)LEX_MV_ONCELIK(kl);}}catch(e){}
        if(A.yalin&&!varsK(g))knSor(g,A.metin);
      }
      if(g.kapali||!s.canvas||!s.el)return;
      var L=g.atif[s.n];
      if(L.taranmis&&!L.okundu&&g.ocrAcik)ocrSira(g,s.n);
      if(!L.length)return;
      var k=s.atk;if(!k){k=document.createElement('div');k.className='kt-atk';s.atk=k;}
      var vk=varsK(g);
      k.innerHTML=L.map(function(a,i){if(a.v&&!vk)return '';return '<button type="button" class="kt-atif" data-i="'+i+'" style="left:'+(a.x*100).toFixed(3)+'%;top:'+(a.y*100).toFixed(3)+'%;width:'+(a.w*100).toFixed(3)+'%;height:'+(a.h*100).toFixed(3)+'%" aria-label="Madde '+esc(a.n)+'"></button>';}).join('');
      k.setAttribute('data-n',s.n);
      if(k.parentNode!==s.el)s.el.appendChild(k);
      try{if(!localStorage.getItem(ATIF_IP)){localStorage.setItem(ATIF_IP,'1');bildir('§ Altı noktalı atıflara dokun: madde hemen açılır.');}}catch(e){}
    }catch(e){}
  }
  var MAD_A=null;
  function genis(){return window.matchMedia&&matchMedia('(min-width:1000px) and (orientation:landscape)').matches;}
  ic.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.kt-atif');if(!b||!G||CZ.acik)return;
    var k=b.parentNode,n=+k.getAttribute('data-n'),a=(G.atif[n]||[])[+b.getAttribute('data-i')];if(!a)return;
    if(a.v){var vk=varsK(G);if(!vk)return;a={no:vk,n:a.n,v:1};}
    e.preventDefault();e.stopPropagation();
    if(gor.classList.contains('yan')&&window.LEX_MV_YAN){window.LEX_MV_YAN(a.no,a.n);return;}
    madAc(a);
  });
  function madAc(a){
    MAD_A=a;
    $('kt-mad-ad').textContent='m. '+a.n;$('kt-mad-alt').textContent='';
    $('kt-mad-m').innerHTML='<p class="pm-kucuk" style="margin:0">Yükleniyor…</p>';
    $('kt-mad-git').textContent=genis()?'Yanda aç':'Mevzuatta aç';
    var kb=$('kt-mad-kn');kb.hidden=!a.v;if(a.v)kb.innerHTML='Bu dosyadaki yalın “m.” atıfları: <b>'+esc(kanAd(a.no))+'</b> · değiştir';
    $('kt-mad').hidden=false;
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-mad',function(){madKapat(true);});
    if(!window.LEX_MV_MADDE){$('kt-mad-m').textContent='Mevzuat yüklenemedi.';return;}
    window.LEX_MV_MADDE(a.no,a.n).then(function(r){
      if(MAD_A!==a)return;
      $('kt-mad-ad').textContent=r.kisa+' m. '+(r.m?r.m.n:a.n);$('kt-mad-alt').textContent=r.ad;
      if(!r.m){$('kt-mad-m').textContent='Bu kanunda '+a.n+'. madde bulunamadı.';return;}
      $('kt-mad-m').innerHTML=(r.m.b?'<h5>'+esc(r.m.b)+'</h5>':'')+esc(r.m.m||'');
      $('kt-mad-m').scrollTop=0;
    }).catch(function(){if(MAD_A===a)$('kt-mad-m').textContent='Mevzuat henüz indirilmedi. İnternete bağlıyken Mevzuat sekmesini bir kez aç; sonra internetsiz de çalışır.';});
  }
  function madKapat(geriden){
    if($('kt-mad').hidden)return;$('kt-mad').hidden=true;
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('kt-mad');
  }
  $('kt-mad').addEventListener('click',function(e){if(e.target.getAttribute('data-kapat'))madKapat();});
  (function(){
    var P=null;
    function kaydirilir(el,panel){for(;el&&el!==panel;el=el.parentElement){if(el.scrollHeight>el.clientHeight+2&&/auto|scroll/.test(getComputedStyle(el).overflowY))return el;}return null;}
    document.addEventListener('touchstart',function(e){
      var t=e.target;if(e.touches.length!==1||!t.closest)return;
      var pn=t.closest('.kt-ort .kt-panel');if(!pn||!pn.querySelector('.kt-tut'))return;
      if(t.closest('button,input,select,textarea,a'))return;
      var sk=kaydirilir(t,pn);if(sk&&!t.closest('.kt-tut'))return;            // içerik kaydırılıyorsa dokunma
      if(!t.closest('.kt-tut')&&pn.scrollTop>0)return;
      P={pn:pn,y0:e.touches[0].clientY,dy:0,t0:Date.now(),kilit:false};
    },{passive:true});
    document.addEventListener('touchmove',function(e){
      if(!P)return;var dy=e.touches[0].clientY-P.y0;
      if(!P.kilit){if(Math.abs(dy)<8)return;if(dy<0){P=null;return;}P.kilit=true;P.pn.classList.add('kt-surukle');}
      P.dy=Math.max(0,dy);P.pn.style.transform='translateY('+P.dy+'px)';
      if(e.cancelable)e.preventDefault();
    },{passive:false});
    function bit(){
      if(!P)return;var p=P;P=null;if(!p.kilit)return;
      var hiz=p.dy/Math.max(1,Date.now()-p.t0),kapat=p.dy>Math.min(140,p.pn.offsetHeight*.3)||hiz>.6;
      p.pn.classList.remove('kt-surukle');p.pn.style.transition='transform .2s ease';
      if(kapat){
        p.pn.style.transform='translateY(100%)';
        setTimeout(function(){p.pn.style.transition='';p.pn.style.transform='';var pr=p.pn.parentNode&&p.pn.parentNode.querySelector('[data-kapat]');if(pr)pr.click();},190);
      }else{p.pn.style.transform='';setTimeout(function(){p.pn.style.transition='';},210);}
    }
    document.addEventListener('touchend',bit,{passive:true});document.addEventListener('touchcancel',bit,{passive:true});
  })();
  $('kt-mad-kapat').addEventListener('click',function(){madKapat();});
  $('kt-mad-kn').addEventListener('click',function(){madKapat();var g=G;if(g)setTimeout(function(){knSor(g,'',true);},window.LEX_GERI?80:0);});
  $('kt-mad-git').addEventListener('click',function(){
    var a=MAD_A;if(!a)return;madKapat();
    setTimeout(function(){
      if(genis()&&G){if(!gor.classList.contains('yan'))yanAc();if(window.LEX_MV_YAN)window.LEX_MV_YAN(a.no,a.n);return;}
      if(G){kapat();if(window.LEX_GERI)window.LEX_GERI.dus('kt-gor');}
      var sbk=sbAcikMi();if(sbk)sbKapat();
      setTimeout(function(){if(window.LEX_MV_AC)window.LEX_MV_AC(a.no,a.n);},window.LEX_GERI?(sbk?260:120):0);
    },window.LEX_GERI?80:0);
  });


  // ---------- taranmış PDF: sayfayı oku (OCR, Tesseract.js) -> atıfları bul ----------
  var TES_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',TESP=null,OCRW=null,OCRWP=null,OCR_IS=false;
  function tesYukle(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(!TESP)TESP=new Promise(function(ok,hata){var sc=document.createElement('script');sc.src=TES_URL;sc.async=true;sc.crossOrigin='anonymous';
      sc.onload=function(){window.Tesseract?ok(window.Tesseract):hata(new Error('yok'));};sc.onerror=function(){TESP=null;sc.remove();hata(new Error('ag'));};document.head.appendChild(sc);});
    return TESP;
  }
  function ocrYuz(t){$('kt-ocr-yuz').textContent=t||'';}
  function ocrIsci(){
    if(OCRWP)return OCRWP;
    OCRWP=tesYukle().then(function(T){
      return T.createWorker('tur',1,{logger:function(m){
        if(m&&/loading|initializ/i.test(m.status||'')&&m.progress<1)ocrYuz(Math.round((m.progress||0)*100)+'%');
      }});
    }).then(function(w){OCRW=w;ocrYuz('');return w;}).catch(function(e){OCRWP=null;throw e;});
    return OCRWP;
  }
  function ocrBirak(){var w=OCRW;OCRW=null;OCRWP=null;if(w)try{w.terminate();}catch(e){}}
  function ocrDugme(g){
    if(G!==g)return;var b=$('kt-ocr-ac');b.hidden=false;
    b.classList.toggle('acik',!!g.ocrAcik);
    b.setAttribute('aria-label',g.ocrAcik?'Atıf okuma açık (kapatmak için dokun)':'Taranmış sayfada atıfları bul');
  }
  var OCR_IP='lex-ocr-ipucu';
  $('kt-ocr-ac').addEventListener('click',function(){
    var g=G;if(!g)return;
    if(g.ocrAcik){g.ocrAcik=false;g.m.ocrAcik=false;g.ocrQ=[];metaYaz(g.m).catch(function(){});ocrDugme(g);$('kt-ocr-ac').classList.remove('calis');ocrYuz('');bildir('Atıf okuma kapatıldı. Okunmuş sayfalar kalır.');return;}
    g.ocrAcik=true;g.m.ocrAcik=true;metaYaz(g.m).catch(function(){});ocrDugme(g);
    var ilk=!window.Tesseract&&!localStorage.getItem(OCR_IP);
    bildir(ilk?'Okuma motoru bir kez indiriliyor (~5 MB). Sonra internetsiz çalışır; açtığın sayfalar birkaç saniyede okunur.':'Taranmış sayfalar okunuyor; atıflar birkaç saniyede belirir.');
    tumS(g).forEach(function(s){var L=g.atif[s.n];if(s.canvas&&L&&L.taranmis&&!L.okundu)ocrSira(g,s.n);});
  });
  function ocrSira(g,n){
    if(g.ocrQ.indexOf(n)<0)g.ocrQ.push(n);
    ocrCalis(g);
  }
  async function ocrCalis(g){
    if(OCR_IS)return;OCR_IS=true;
    var b=$('kt-ocr-ac');
    try{
      while(G===g&&g.ocrAcik&&g.ocrQ.length){
        // önce ekranda görünen sayfa
        var sec=0;for(var i=0;i<g.ocrQ.length;i++){var s=sayfaS(g,g.ocrQ[i]);if(s&&s.el&&isGorunur(g,s)&&Math.abs(g.ocrQ[i]-g.sayfa)<=1){sec=i;break;}}
        var n=g.ocrQ.splice(sec,1)[0],L=g.atif[n];if(!L||L.okundu)continue;
        var sy=sayfaS(g,n);if(!sy||!sy.el||!isGorunur(g,sy))continue; // uzaklaştıysa: yeniden görününce sıraya girer
        b.classList.add('calis');
        var w=await ocrIsci();if(G!==g||!g.ocrAcik)break;
        try{localStorage.setItem(OCR_IP,'1');}catch(e){}
        ocrYuz(g.pdf?'s.'+n:'…');
        var c=document.createElement('canvas'),ctx;
        if(g.pdf){
          var page=await g.pdf.getPage(n),v1=page.getViewport({scale:1});
          var olcek=Math.min(3,1800/Math.max(1,v1.width)),vp=page.getViewport({scale:olcek});
          c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
          ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
          await page.render({canvasContext:ctx,viewport:vp}).promise;
        }else{
          var rk=Math.min(2.5,2600/Math.max(g.nw,g.nh,1));if(Math.max(g.nw,g.nh)*rk<1200)rk=1200/Math.max(g.nw,g.nh,1);
          c.width=Math.round(g.nw*rk);c.height=Math.round(g.nh*rk);
          ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(g.img,0,0,c.width,c.height);
        }
        try{arkaDuzelt(c);}catch(e){}
        if(G!==g)break;
        var r=await w.recognize(c);
        var A=atifSatir(ocrSatir(r&&r.data),varsK(g),c.width,c.height);
        c.width=c.height=0;
        A.taranmis=true;A.okundu=true;g.atif[n]=A;
        if(!g.m.ocr||typeof g.m.ocr!=='object')g.m.ocr={};
        g.m.ocr[n]=A.map(function(a){var o={x:+a.x.toFixed(4),y:+a.y.toFixed(4),w:+a.w.toFixed(4),h:+a.h.toFixed(4),no:a.no,n:a.n};if(a.v)o.v=1;return o;});
        if(A.yalin&&!varsK(g))knSor(g,A.metin);
        metaYaz(g.m).catch(function(){});
        if(sy.canvas&&G===g)atifKatman(g,sy);
      }
    }catch(e){
      if(G===g){g.ocrAcik=false;ocrDugme(g);bildir(navigator.onLine===false?'Okuma motoru ilk kullanımda internetten bir kez inmeli. İnternete bağlanıp tekrar dene.':'Sayfa okunamadı. Biraz sonra tekrar dene.');}
    }finally{OCR_IS=false;b.classList.remove('calis');ocrYuz('');}
  }
  function ocrSatir(d){
    var S=[];if(!d)return S;
    var satir=d.lines||[];
    if(!satir.length&&d.blocks)d.blocks.forEach(function(bl){(bl.paragraphs||[]).forEach(function(p){(p.lines||[]).forEach(function(l){satir.push(l);});});});
    satir.forEach(function(l){
      var ws=(l.words||[]).filter(function(w){return w&&w.text&&w.bbox;});if(!ws.length)return;
      var sa={t:'',x1:[],x2:[],ust:l.bbox?l.bbox.y0-2:ws[0].bbox.y0,yuk:0};
      var alt=l.bbox?l.bbox.y1+2:ws[0].bbox.y1;sa.yuk=alt-sa.ust;
      ws.forEach(function(w,k){
        var bx=w.bbox,t=String(w.text);
        if(k){sa.t+=' ';sa.x1.push(ws[k-1].bbox.x1);sa.x2.push(bx.x0);}
        var top=olc(t)||t.length,once=0,gen=bx.x1-bx.x0;
        for(var i=0;i<t.length;i++){var son=olc(t.slice(0,i+1));sa.t+=t[i];sa.x1.push(bx.x0+gen*once/top);sa.x2.push(bx.x0+gen*son/top);once=son;}
      });
      S.push(sa);
    });
    return S;
  }




  // fotoğraf/tarama: her pikseli çevresinin ortalamasına böl -> gölge ve renkli ışık gider, yazı koyulaşır
  function arkaDuzelt(c){
    var W=c.width,H=c.height,ctx=c.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,W,H),d=im.data,n=W*H;
    var gr=new Float32Array(n),i,x,y;
    for(i=0;i<n;i++)gr[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;
    var W1=W+1,ig=new Float64Array(W1*(H+1));
    for(y=1;y<=H;y++){var sat=0,o=y*W1,p=(y-1)*W1,r=(y-1)*W;for(x=1;x<=W;x++){sat+=gr[r+x-1];ig[o+x]=ig[p+x]+sat;}}
    var R=Math.max(12,Math.round(Math.max(W,H)/90));
    for(y=0;y<H;y++){
      var y0=Math.max(0,y-R),y1=Math.min(H,y+R+1);
      for(x=0;x<W;x++){
        var x0=Math.max(0,x-R),x1=Math.min(W,x+R+1);
        var ort=(ig[y1*W1+x1]-ig[y0*W1+x1]-ig[y1*W1+x0]+ig[y0*W1+x0])/((x1-x0)*(y1-y0));
        var v=gr[y*W+x]/Math.max(ort,1)*255;v=(v-150)*2.43;v=v<0?0:v>255?255:v;
        i=(y*W+x)*4;d[i]=d[i+1]=d[i+2]=v;
      }
    }
    ctx.putImageData(im,0,0);
  }

  // ---------- resim dosyası: tek "sayfa" gibi ----------
  function sayfaS(g,n){return g.pdf?g.sayfalar[n-1]:(n===1?g.resimS:null);}
  function tumS(g){return g.pdf?g.sayfalar:(g.resimS?[g.resimS]:[]);}
  function resimAtif(g){
    if(G!==g||!g.resimS)return;
    var oc=g.m.ocr&&g.m.ocr[1],A=oc?oc.slice():[];A.taranmis=true;if(oc)A.okundu=true;
    g.atif[1]=A;g.taranmis=true;ocrDugme(g);
    atifKatman(g,g.resimS);
  }

  // ---------- dosyanın kanunu: yalın "m. 62" atıfları hangi kanuna? ----------
  function varsK(g){var k=g.m.kanun;if(k==='-')return '';return (k&&KAN_NO[k])?k:dersKanun(g.m.ders);}
  function kanAd(no){for(var i=0;i<KAN_AD.length;i++)if(KAN_AD[i][0]===no){var a=KAN_AD[i][1];return a[0]==='Anayasa'?'Anayasa':a[0];}return no;}
  var KN_IP=[['2004',/icra|haciz|iflas|ilam|ilâm|konkordato|takip|ödeme emri|itiraz/g],['5237',/suç|ceza|fail|kast|taksir|mağdur/g],['5271',/soruşturma|kovuşturma|sanık|şüpheli|savcı|tutuklama/g],
    ['6098',/borç|alacak|sözleşme|tazminat|haksız fiil|temerrüt|kefil/g],['4721',/zilyet|mülkiyet|tapu|miras|mirasçı|evlilik|boşanma|velayet|vasi|ayni hak|irtifak/g],
    ['6102',/şirket|tacir|ticari|kambiyo|bono|poliçe|anonim|limited/g],['6100',/dava şartı|ispat|delil|istinaf|temyiz|ön inceleme|ihtiyati tedbir/g],
    ['2709',/anayasa|temel hak|yasama|yürütme|cumhurbaşkanı|anayasa mahkemesi/g],['4857',/işçi|işveren|kıdem|ihbar|fesih|iş sözleşmesi/g],['2577',/idari|iptal davası|tam yargı|idare mahkemesi/g],
    ['5718',/yabancı|tanıma|tenfiz|kanunlar ihtilafı/g],['5326',/kabahat|idari para cezası/g]];
  function knTahmin(t){
    t=String(t||'').toLocaleLowerCase('tr');var en='',ep=2;
    KN_IP.forEach(function(x){var p=(t.match(x[1])||[]).length;if(p>ep){ep=p;en=x[0];}});
    return en;
  }
  var KN=null;
  function knSor(g,metin,elle){
    if(G!==g||KN||(!elle&&(g.knSoruldu||g.m.kanun)))return;
    g.knSoruldu=true;
    var tah=elle?(varsK(g)||''):knTahmin(metin);
    KN={g:g,sec:tah};
    $('kt-kn-ac').textContent=elle?'Bu dosyada kanun adı yazmayan “m. 62” gibi atıflar bu kanundan açılır.':'Bu sayfada kanun adı yazmayan “m. 62” gibi atıflar var. Kanunu seçersen onlara da dokunup maddeyi açabilirsin. Bir kez sorulur.';
    var KL=KAN_AD.slice();if(tah)KL.sort(function(x,y){return (y[0]===tah)-(x[0]===tah);});
    $('kt-kn-l').innerHTML=KL.map(function(x){var no=x[0],on=no===tah;return '<button type="button" class="kt-eb'+(on?' on':'')+'" role="radio" aria-checked="'+(on?'true':'false')+'" data-k="'+no+'">'+esc(kanAd(no))+(on&&!elle?'<small>tahmin</small>':'')+'</button>';}).join('');
    $('kt-kn').hidden=false;
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-kn',function(){knKapat(null,true);});
  }
  function knKapat(no,geriden){
    if(!KN)return;var k=KN;KN=null;$('kt-kn').hidden=true;
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('kt-kn');
    var g=k.g;if(no==null||G!==g)return;
    g.m.kanun=no;metaYaz(g.m).catch(function(){});
    // sayfaları yeniden tara (OCR sonuçları korunur; yalın atıflar tıklamada güncel kanunu kullanır)
    var eski=g.atif;g.atif={};
    tumS(g).forEach(function(s){var L=eski[s.n];if(L&&L.okundu){var A=(g.m.ocr&&g.m.ocr[s.n])||[];A=A.slice();A.taranmis=true;A.okundu=true;g.atif[s.n]=A;}});
    tumS(g).forEach(function(s){if(s.canvas){if(s.atk){s.atk.innerHTML='';}if(!g.atif[s.n]&&!g.pdf){var R=[];R.taranmis=true;g.atif[s.n]=R;}atifKatman(g,s);}});
    if(no!=='-')bildir('Yalın “m.” atıfları artık '+kanAd(no)+' maddesi olarak açılır.');
  }
  $('kt-kn-l').addEventListener('click',function(e){var b=e.target.closest('[data-k]');if(!b||!KN)return;KN.sec=b.getAttribute('data-k');[].forEach.call(this.querySelectorAll('[data-k]'),function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on?'true':'false');});});
  $('kt-kn-tamam').addEventListener('click',function(){if(KN)knKapat(KN.sec||'-');});
  $('kt-kn-yok').addEventListener('click',function(){knKapat('-');});
  $('kt-kn').addEventListener('click',function(e){if(e.target.getAttribute('data-kapat'))knKapat(null);});

  // ---------- notlu paylaşım: PDF (notlu sayfalar / tümü) ya da bu sayfa resim ----------
  function notSay(m){var n=0,o=m&&m.not;if(o&&typeof o==='object')for(var k in o)if(o[k]&&o[k].length)n++;return n;}
  var DS=null,DS_TUM_SINIR=150;
  function dsAc(m,g){
    DS={m:m,g:g,dosya:null,calis:false,iptal:false};
    var ns=notSay(m);
    $('kt-ds-ad').textContent=m.ad+(ns?' · '+ns+' sayfada not var':' · henüz not yok');
    $('kt-ds-notlu').disabled=!ns;$('kt-ds-notlu').textContent='Notlu sayfalar · PDF'+(ns?' ('+ns+' sayfa)':'');
    $('kt-ds-resim').hidden=!g;
    $('kt-ds-sec').hidden=false;$('kt-ds-is').hidden=true;$('kt-ds-hazir').hidden=true;
    $('kt-ds').hidden=false;
    if(window.LEX_GERI)window.LEX_GERI.ekle('kt-ds',function(){dsKapat(true);});
  }
  function dsKapat(geriden){
    if($('kt-ds').hidden)return;$('kt-ds').hidden=true;if(DS)DS.iptal=true;DS=null;
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('kt-ds');
  }
  $('kt-ds').addEventListener('click',function(e){if(e.target.getAttribute('data-kapat'))dsKapat();});
  $('kt-ds-ac').addEventListener('click',function(){if(G&&G.m.tur==='pdf'){if(CZ.acik)cizKapat(false);dsAc(G.m,G);}});
  $('kt-ds-sec').addEventListener('click',function(e){var b=e.target.closest('[data-s]');if(!b||b.disabled||!DS||DS.calis)return;dsUret(DS,b.getAttribute('data-s'));});
  function dsDurum(t,o){$('kt-ds-durum').textContent=t;if(o!=null)$('kt-ds-dolu').style.width=Math.round(o*100)+'%';}
  function filigran(ctx,W,H){
    var f=Math.max(11,Math.round(W*.016));
    ctx.save();ctx.font='600 '+f+'px Georgia, serif';ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(255,255,255,.85)';var t='§ Lex Odak · lexodak.com',w=ctx.measureText(t).width;
    ctx.fillRect(W-w-f*1.4,H-f*2.1,w+f*1.0,f*1.6);
    ctx.fillStyle='rgba(77,26,34,.78)';ctx.fillText(t,W-f*.9,H-f*.65);ctx.restore();
  }
  async function sayfaResmi(pdf,n,notL){
    var page=await pdf.getPage(n),v1=page.getViewport({scale:1});
    var olcek=Math.min(2.2,1700/Math.max(v1.width,1));if(v1.width*v1.height*olcek*olcek>6e6)olcek=Math.sqrt(6e6/(v1.width*v1.height));
    var vp=page.getViewport({scale:olcek}),c=document.createElement('canvas');
    c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));
    var ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    (notL||[]).forEach(function(st){cizgi(ctx,st,c.width,c.height);});
    filigran(ctx,c.width,c.height);
    try{page.cleanup();}catch(e){}
    var b=await new Promise(function(ok){c.toBlob(ok,'image/jpeg',.86);});
    var r={pw:c.width,ph:c.height,w:v1.width,h:v1.height,jpg:new Uint8Array(await b.arrayBuffer()),blob:b};
    c.width=c.height=0;return r;
  }
  function pdfYap(sayfalar){
    var enc=new TextEncoder(),par=[],off=[],boy=0;
    function yaz(x){var u=typeof x==='string'?enc.encode(x):x;par.push(u);boy+=u.length;}
    function obj(i,f){off[i]=boy;yaz(i+' 0 obj\n');f();yaz('\nendobj\n');}
    var n=sayfalar.length,kids=[];
    for(var i=0;i<n;i++)kids.push((3+i*3)+' 0 R');
    yaz('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1,function(){yaz('<< /Type /Catalog /Pages 2 0 R >>');});
    obj(2,function(){yaz('<< /Type /Pages /Count '+n+' /Kids ['+kids.join(' ')+'] >>');});
    sayfalar.forEach(function(s,i){
      var p=3+i*3,w=s.w.toFixed(2),h=s.h.toFixed(2),ic_='q '+w+' 0 0 '+h+' 0 0 cm /Im0 Do Q';
      obj(p,function(){yaz('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+(p+2)+' 0 R >> >> /Contents '+(p+1)+' 0 R >>');});
      obj(p+1,function(){yaz('<< /Length '+ic_.length+' >>\nstream\n'+ic_+'\nendstream');});
      obj(p+2,function(){yaz('<< /Type /XObject /Subtype /Image /Width '+s.pw+' /Height '+s.ph+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+s.jpg.length+' >>\nstream\n');yaz(s.jpg);yaz('\nendstream');});
    });
    var top=3+n*3,xr=boy,t='xref\n0 '+top+'\n0000000000 65535 f \n';
    for(var j=1;j<top;j++)t+=('0000000000'+off[j]).slice(-10)+' 00000 n \n';
    yaz(t+'trailer\n<< /Size '+top+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF\n');
    return new Blob(par,{type:'application/pdf'});
  }
  async function dsUret(d,tur){
    d.calis=true;$('kt-ds-sec').hidden=true;$('kt-ds-is').hidden=false;$('kt-ds-hazir').hidden=true;dsDurum('Hazırlanıyor…',0);
    var pdf=null,gorev=null,kendi=false;
    try{
      if(d.g&&d.g.pdf&&!d.g.kapali)pdf=d.g.pdf;
      else{
        var lib=await pdfjsYukle(),blob=await blobOku(d.m.id);if(!blob)throw new Error('yok');
        gorev=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),wasmUrl:'./',isEvalSupported:false,enableScripting:false});
        pdf=await gorev.promise;kendi=true;
      }
      var notlarM=(d.m.not&&typeof d.m.not==='object')?d.m.not:{},liste=[],i;
      if(tur==='resim')liste=[d.g.sayfa||1];
      else if(tur==='notlu'){for(i=1;i<=pdf.numPages;i++)if(notlarM[i]&&notlarM[i].length)liste.push(i);}
      else{if(pdf.numPages>DS_TUM_SINIR){dsDurum('Bu PDF '+pdf.numPages+' sayfa. Telefon zorlanmasın diye bütün PDF en çok '+DS_TUM_SINIR+' sayfa olabilir; notlu sayfaları paylaş.',0);d.calis=false;return;}
        for(i=1;i<=pdf.numPages;i++)liste.push(i);}
      if(!liste.length){dsDurum('Paylaşılacak notlu sayfa yok.',0);d.calis=false;return;}
      var S=[];
      for(i=0;i<liste.length;i++){
        if(d.iptal||DS!==d)return;
        dsDurum('Sayfa '+(i+1)+' / '+liste.length+' hazırlanıyor…',i/liste.length);
        S.push(await sayfaResmi(pdf,liste[i],notlarM[liste[i]]));
      }
      if(d.iptal||DS!==d)return;
      var ad=uzantisiz(d.m.ad||'dosya').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,'_').slice(0,100);
      if(tur==='resim')d.dosya=new File([S[0].blob],ad+' - s'+liste[0]+'.jpg',{type:'image/jpeg'});
      else d.dosya=new File([pdfYap(S)],ad+' (notlu).pdf',{type:'application/pdf'});
      S=null;
      dsDurum('Hazır: '+d.dosya.name+' · '+boyutYaz(d.dosya.size),1);
      $('kt-ds-hazir').hidden=false;
      $('kt-ds-paylas').hidden=!(window.Capacitor||(navigator.canShare&&navigator.share&&navigator.canShare({files:[d.dosya]})));
    }catch(e){
      if(DS===d)dsDurum('Hazırlanamadı. Dosya çok büyük ya da bozuk olabilir.',0);
    }finally{
      d.calis=false;
      if(kendi&&pdf)try{pdf.destroy();}catch(e){}else if(gorev)try{gorev.destroy();}catch(e){}
    }
  }
  $('kt-ds-paylas').addEventListener('click',async function(){
    var d=DS;if(!d||!d.dosya)return;
    var so=await window.LEX_DOSYA(d.dosya,d.dosya.name,d.dosya.type,null,{baslik:d.dosya.name});
    if(so==='paylasildi')dsKapat();else if(so==='hata')bildir('Paylaşılamadı; İndir ile kaydedebilirsin.');
  });
  $('kt-ds-indir').addEventListener('click',function(){
    var d=DS;if(!d||!d.dosya)return;
    window.LEX_DOSYA(d.dosya,d.dosya.name,d.dosya.type,null,{baslik:d.dosya.name,indir:true}).then(function(so){if(so==='indirildi')bildir('İndirilenler klasörüne kaydedildi.');else if(so==='hata')bildir('Kaydedilemedi.',true);});
  });

  // ---------- yedek kancası ----------
  window.LEX_KUT_YEDEK={
    topla:async function(){
      var out=[], meta;
      try{meta=await metaOku();}catch(e){return out;}
      for(var i=0;i<meta.length;i++){
        var b=await blobOku(meta[i].id);
        if(b)out.push({yol:'dosyalar/'+meta[i].id+'/'+guvenliAd(meta[i]),blob:b});
      }
      var vard={};out.forEach(function(o){vard[o.yol.split('/')[1]]=1;});
      var gecerli=meta.filter(function(m){return vard[m.id];});
      out.push({yol:'dosyalar/_liste.json',blob:new Blob([JSON.stringify(gecerli)],{type:'application/json'})});
      return out;
    },
    yukle:async function(dosyalar){
      var liste=null, blobs={}, i;
      for(i=0;i<dosyalar.length;i++){
        var yol=String(dosyalar[i].yol||'');
        if(yol==='dosyalar/_liste.json'){
          try{
            var tx=dosyalar[i].blob.text?await dosyalar[i].blob.text():await new Promise(function(ok,h){var r=new FileReader();r.onload=function(){ok(r.result);};r.onerror=h;r.readAsText(dosyalar[i].blob);});
            liste=JSON.parse(tx);
          }catch(e){liste=null;}
        }else{
          var p=yol.split('/');
          if(p.length>=3&&p[0]==='dosyalar')blobs[p[1]]=dosyalar[i].blob;
        }
      }
      if(!Array.isArray(liste))liste=[];
      var db=await idbAc();
      await islem(['meta','veri'],'readwrite',function(t){
        t.objectStore('meta').clear();t.objectStore('veri').clear();
        liste.forEach(function(m){
          if(!m||!m.id||!blobs[m.id])return;
          var tip=m.mime||'';
          var b=blobs[m.id];
          if(tip&&b.type!==tip)b=b.slice(0,b.size,tip);
          t.objectStore('veri').put({id:m.id,blob:b});
          t.objectStore('meta').put(m);
        });
      });
      yenile();
    }
  };

  // ---------- ŞABLON (özet · tanımlar · ilgili maddeler) ----------
  var SB_ORAN={k:.1,o:.2,u:.35}, SB_AD={k:'Kısa',o:'Orta',u:'Uzun'}, SB_KAY='lex-sb-kaynak';
  var SB_BOL=[['n','Sınav notları'],['z','Özet'],['b','Tablolar'],['t','Kavramlar ve tanımlar'],['s','Şartlar / unsurlar'],['i','İstisnalar'],['a','İlgili maddeler'],['d','Kararlar'],['g','Görüşler'],['e','Örnekler'],['y','Ek bilgi (notu derleyen eklemiş)'],['q','Deneme soruları']];
  var SB_SOL=['n','z'];
  var SB_ACIK={n:1,z:1,b:1,t:1,s:1};
  var sbEl=$('sb-pnl'), sbIc=$('sb-ic'), sbMsg=$('sb-msg'), sbKay=$('sb-kaydir');
  var SB=null, sbLP=null, sbNotT=0;
  function sbAcikMi(){return !!SB&&!sbEl.hidden;}
  function sbYukle(){
    if(window.LEXOZET)return Promise.resolve(window.LEXOZET);
    if(!sbLP){
      sbLP=new Promise(function(ok,hata){
        var sc=document.createElement('script');sc.src='ozet.js';
        sc.onload=function(){if(window.LEXOZET)ok(window.LEXOZET);else{sbLP=null;hata(new Error('yok'));}};
        sc.onerror=function(){sbLP=null;hata(new Error('yok'));};
        document.head.appendChild(sc);
      });
    }
    return sbLP;
  }
  function sbH(s){var h=5381,i;s=String(s);for(i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
  function sbId(k,o){return k+':'+sbH(k==='a'?o.kanun+'|'+o.madde:k==='b'?(o.baslik||'')+'|'+(o.sutunlar||[]).join('|')+'|'+((o.satirlar||[])[0]||[]).join('|'):k==='q'?(o.deneme||'')+'|'+(o.no||'')+'|'+o.t:(o.t||(o.maddeler&&o.maddeler[0])||''));}
  function sbOK(){var o=SB.m.sablon.oran||.1;return o<=.15?'k':(o>=.3?'u':'o');}
  function sbMesaj(h){sbMsg.hidden=false;sbIc.hidden=true;sbMsg.innerHTML=h;$('sb-yenile').hidden=true;$('sb-pay').hidden=true;$('sb-paybar').hidden=true;}
  function sbPanelAc(m){
    SB={m:m,ist:false,gorev:null,cv:{}};
    $('sb-ad').textContent=m.ad;sbEl.hidden=false;sbKay.scrollTop=0;
    if(window.LEX_GERI)window.LEX_GERI.ekle('sb',function(){sbKapat(true);});
  }
  function sbKapat(geriden){
    var S=SB;if(!S)return;
    sbNotYaz();
    SB=null;
    if(S.gorev)try{S.gorev.destroy();}catch(e){}
    sbEl.hidden=true;sbIc.innerHTML='';sbMsg.innerHTML='';
    if(!geriden&&window.LEX_GERI)window.LEX_GERI.dus('sb');
    ciz();
  }
  $('sb-geri').addEventListener('click',function(){sbKapat();});
  function sbAc(m){
    if(!m)return;
    if(!sbVar(m)){sbCikar(m);return;}
    if(!sbAcikMi())sbPanelAc(m);
    sbCiz();
  }
  function sbBekle(){return new Promise(function(r){setTimeout(r,0);});}
  function sbPuan(t){return String(t||'').replace(/\s+/g,'').length;}
  async function sbCikar(m){
    if(!sbAcikMi()||SB.m!==m)sbPanelAc(m);
    var S=SB, onceki=m.sablon||null;
    sbMesaj('<b>Şablon hazırlanıyor</b><span id="sb-ilk">Hazırlanıyor…</span><div class="sb-bar"><i id="sb-bar-i"></i></div>');
    var oz,lib,pdf,i;
    var ilerle=function(t,p){if(SB!==S)return;var e=$('sb-ilk'),b=$('sb-bar-i');if(e)e.textContent=t;if(b)b.style.width=Math.round(p*100)+'%';};
    try{oz=await sbYukle();lib=await pdfjsYukle();}
    catch(e){if(SB===S)sbMesaj('<b>Şablon motoru yüklenemedi</b>İnternete bağlanıp tekrar dene.');return;}
    try{
      var blob=await blobOku(m.id);
      if(SB!==S)return;
      if(!blob){sbMesaj('<b>Dosya bulunamadı</b>');return;}
      var data=new Uint8Array(await blob.arrayBuffer());
      var gorev=lib.getDocument({data:data,wasmUrl:'./',isEvalSupported:false,enableScripting:false});
      S.gorev=gorev;
      gorev.onPassword=function(cb,neden){
        var p=prompt(neden===2?'Parola yanlış. Tekrar dene:':'Bu PDF şifreli. Parolayı gir:');
        if(p===null){try{gorev.destroy();}catch(e){}return;}
        cb(p);
      };
      pdf=await gorev.promise;
    }catch(e){if(SB===S)sbMesaj('<b>PDF okunamadı</b>Dosya şifreli ya da bozuk olabilir.');return;}
    var n=pdf.numPages, sayfalar=[], metinli=0, tarama=0;
    try{
      for(i=1;i<=n;i++){
        if(SB!==S){try{pdf.destroy();}catch(e){}return;}
        ilerle('Sayfa '+i+'/'+n+' okunuyor…',i/n*.85);
        var pg=await pdf.getPage(i), tc=await pg.getTextContent();
        var satir=oz.pdfjsSatirlar(tc.items), say=0;
        satir.forEach(function(l){say+=sbPuan(l.t);});
        if(say>=40)metinli++;else{tarama++;}
        sayfalar.push(say>=40?satir:[]);
        pg.cleanup();
        await sbBekle();
      }
    }catch(e){try{pdf.destroy();}catch(x){}if(SB===S)sbMesaj('<b>PDF okunamadı</b>Okuma sırasında bir sorun çıktı. Tekrar dene.');return;}
    try{pdf.destroy();}catch(e){}
    if(SB!==S)return;
    if(!metinli){
      sbMesaj('<b>Bu not taranmış görünüyor</b>Sayfalar resim olarak kaydedilmiş; şimdilik yalnızca metni seçilebilen PDF’lerden şablon çıkarabiliyorum. Taranmış notlar için okuma desteği sonra gelecek.');
      return;
    }
    var r,rk,ru;
    try{
      ilerle('Şablon hazırlanıyor…',.9);await sbBekle();
      r=oz.sablon(sayfalar,{oran:.2});await sbBekle();
      rk=oz.sablon(sayfalar,{oran:.1});await sbBekle();
      ru=oz.sablon(sayfalar,{oran:.35});
    }catch(e){if(SB===S)sbMesaj('<b>Şablon çıkarılamadı</b>Bu PDF’in metni beklenmedik bir biçimde. Başka bir notla dene.');return;}
    if(SB!==S)return;
    var sade=function(l,al){return (l||[]).map(function(o){var y={};al.forEach(function(a){if(o[a]!==undefined&&o[a]!==null&&o[a]!=='')y[a]=o[a];});return y;});};
    var oz3=function(l){return sade(l,['t','sayfa','baslik','maddeler','daha']);};
    var veri={
      mod:r.mod==='iskelet'?'iskelet':'ozet',
      sinavNotlari:sade(r.sinavNotlari,['t','sayfa','baslik','maddeler']),
      ekBilgi:sade(r.ekBilgi,['t','sayfa','baslik','maddeler','ad']),
      tablolar:sade(r.tablolar,['baslik','sayfa','sutunlar','satirlar','sema']),
      testler:sade(r.testler,['t','secenekler','sayfa','no','deneme','cevap','aciklama']),
      klasikSorular:sade(r.klasikSorular,['t','no','puan','deneme','sayfa','cevapNoktalari']),
      ozet:{k:oz3(rk.ozet),o:oz3(r.ozet),u:oz3(ru.ozet)},
      tanimlar:sade(r.tanimlar,['t','sayfa','baslik','terim']),
      sartlar:(r.sartlar||[]).map(function(o){return {t:o.t,sayfa:o.sayfa,maddeler:(o.maddeler||[]).slice(0,10)};}),
      istisnalar:sade(r.istisnalar,['t','sayfa','guc']),
      atiflar:sade(r.atiflar,['t','kanun','madde','fikra','sayfa','adet','kanunAd','belirsiz']),
      kanunlar:sade(r.kanunlar,['kanun','no','kisaltma']),
      kararlar:sade(r.kararlar,['t','sayfa','mahkeme']),
      gorusler:sade(r.gorusler,['t','sayfa','tur']),
      ornekler:sade(r.ornekler,['t','sayfa'])
    };
    m.sablon={v:1,tarih:Date.now(),oran:onceki?onceki.oran:.1,kaldirilan:onceki?onceki.kaldirilan:[],not:onceki?onceki.not:'',sayfa:n,taranmis:tarama,veri:veri};
    try{await metaYaz(m);}catch(e){bildir(hataMesaji(e),true);}
    if(SB!==S)return;
    sbCiz();
  }
  // görünür öğeler
  function sbDizi(k){
    var v=SB.m.sablon.veri||{};
    var d=k==='z'?((v.ozet||{})[sbOK()]):k==='n'?v.sinavNotlari:k==='b'?v.tablolar:k==='t'?v.tanimlar:k==='s'?v.sartlar:k==='i'?v.istisnalar:k==='a'?v.atiflar:k==='d'?v.kararlar:k==='g'?v.gorusler:k==='e'?v.ornekler:k==='y'?v.ekBilgi:k==='q'?(v.testler||[]).concat(v.klasikSorular||[]):[];
    return d||[];
  }
  function sbListe(k){
    var s=SB.m.sablon,kl=s.kaldirilan||[],l=[];
    sbDizi(k).forEach(function(o){var id=sbId(k,o);if(kl.indexOf(id)<0)l.push({o:o,id:id});});
    return l;
  }
  function sbGorunur(k){
    var l=sbListe(k);
    if(k==='i'&&!SB.ist)l=l.filter(function(x){return (x.o.guc||0)>=2;});
    return l;
  }
  function sbIskelet(){return (SB.m.sablon.veri||{}).mod==='iskelet';}
  function sbCumleSay(t){return t?Math.max(1,String(t).split(/[.!?…]["”’)]*\s+(?=[A-ZÇĞİÖŞÜ0-9“"(])/).length):0;}
  function sbOzetSay(l){
    var n=0;
    l.forEach(function(x){var o=x.o;if(sbIskelet()){n+=sbCumleSay(o.t)+(o.maddeler?o.maddeler.length:0);}else n++;});
    return n;
  }
  function sbOzetSayOran(a){
    var s=SB.m.sablon,kl=s.kaldirilan||[],v=s.veri||{},l=[];
    ((v.ozet||{})[a]||[]).forEach(function(o){if(kl.indexOf(sbId('z',o))<0)l.push({o:o});});
    return sbOzetSay(l);
  }
  function sbSayfaDugme(n){return n?'<button type="button" class="sb-s" data-s="'+n+'" aria-label="Sayfa '+n+'’i aç">s. '+n+'</button>':'';}
  function sbNo(a,v){
    var m=/^(\d{3,4}) sayılı/.exec(a.kanun||'');if(m)return m[1];
    if(KAN_HARITA[a.kanun])return KAN_HARITA[a.kanun];
    var kl=v.kanunlar||[],i;
    for(i=0;i<kl.length;i++)if(kl[i].kisaltma&&kl[i].kisaltma===a.kanun&&kl[i].no)return kl[i].no;
    return '';
  }
  function sbKanunAd(no,a,v){
    var kl=v.kanunlar||[],i;
    if(no){for(i=0;i<kl.length;i++)if(kl[i].no===no)return kl[i].kanun;return kanAd(no)+' ('+no+' sayılı)';}
    return a.kanunAd||a.kanun||'Diğer';
  }
  function sbAtifGrup(l,v){
    var g={},sira=[];
    l.forEach(function(x){
      var no=sbNo(x.o,v),key=no||('x:'+(x.o.kanunAd||x.o.kanun));
      if(!g[key]){g[key]={no:no,ad:sbKanunAd(no,x.o,v),l:[],top:0};sira.push(key);}
      g[key].l.push(x);g[key].top+=x.o.adet||1;
    });
    return sira.map(function(k){return g[k];}).sort(function(a,b){return b.top-a.top;});
  }
  var SB_X='<button type="button" class="sb-x" data-x="@" aria-label="Şablondan kaldır">×</button>';
  function sbAlt(o){
    var ek='';
    if(o.maddeler&&o.maddeler.length){
      ek='<ul>'+o.maddeler.map(function(t){return '<li>'+esc(t)+'</li>';}).join('');
      if(o.daha>0)ek+='<li class="sb-daha">…ve '+o.daha+' madde daha</li>';
      ek+='</ul>';
    }else if(o.daha>0)ek='<ul><li class="sb-daha">…ve '+o.daha+' madde daha</li></ul>';
    return ek;
  }
  function sbOge(k,x){
    var o=x.o,ek=sbAlt(o),on='';
    if(k==='y'&&o.ad)on='<span class="sb-etk">'+esc(o.ad)+'</span> ';
    return '<div class="sb-it"><div class="sb-t">'+on+(o.t?esc(o.t):'')+ek+'</div>'+sbSayfaDugme(o.sayfa)+SB_X.replace('@',x.id)+'</div>';
  }
  function sbTabloHtml(x){
    var o=x.o,c=o.sutunlar||[],h='<div class="sb-tbl"><div class="sb-tbas"><b>'+esc(o.baslik||'Tablo')+(o.sema?' <small>(şema)</small>':'')+'</b>'+sbSayfaDugme(o.sayfa)+SB_X.replace('@',x.id)+'</div><div class="sb-tw" tabindex="0"><table>';
    if(c.length)h+='<thead><tr>'+c.map(function(t){return '<th>'+esc(t)+'</th>';}).join('')+'</tr></thead>';
    h+='<tbody>'+(o.satirlar||[]).map(function(r){return '<tr>'+(r||[]).map(function(t,i){return (i===0?'<th scope="row">':'<td>')+esc(t)+(i===0?'</th>':'</td>');}).join('')+'</tr>';}).join('')+'</tbody></table></div></div>';
    return h;
  }
  function sbSoruHtml(x){
    var o=x.o,sec=o.secenekler||[],cv=!!(o.cevap||o.cevapNoktalari),ac=!!(SB.cv&&SB.cv[x.id]),h;
    h='<div class="sb-q"><div class="sb-qt"><div class="sb-t"><b>'+esc(o.no!==undefined?o.no+'. ':'')+'</b>'+esc(o.t)+'</div>'+sbSayfaDugme(o.sayfa)+SB_X.replace('@',x.id)+'</div>';
    if(sec.length)h+='<ul class="sb-sec">'+sec.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
    if(cv){
      h+='<button type="button" class="sb-cv" data-q="'+x.id+'" aria-expanded="'+ac+'">'+(ac?'Cevabı gizle':'Cevabı göster')+'</button>';
      h+='<div class="sb-cvp"'+(ac?'':' hidden')+'>'+(o.cevap?'<b>Cevap: '+esc(o.cevap)+'</b>'+(o.aciklama?' · '+esc(o.aciklama):''):'<b>Cevap noktaları:</b> '+esc(o.cevapNoktalari))+'</div>';
    }else if(sec.length)h+='<p class="sb-bos">Cevap anahtarı notta bulunamadı.</p>';
    return h+'</div>';
  }
  function sbBolumHtml(k,ad){
    var l=sbGorunur(k),h='',bos='',say=l.length;
    if((k==='g'||k==='n'||k==='b'||k==='y'||k==='q')&&!sbListe(k).length)return '';
    if(k==='z'){
      var isk=sbIskelet();say=sbOzetSay(l);
      if(isk)h+='<p class="sb-iskelet">Bu not zaten özet niteliğinde; kısaltmak yerine yapısı gösteriliyor.</p>';
      h+='<div class="sb-ara" role="group" aria-label="Özet uzunluğu">';
      ['k','o','u'].forEach(function(a){h+='<button type="button" data-o="'+a+'" class="'+(sbOK()===a?'on':'')+'" aria-pressed="'+(sbOK()===a)+'"><b>'+SB_AD[a]+'</b><small>'+sbOzetSayOran(a)+' '+(isk?'madde':'cümle')+'</small></button>';});
      h+='</div>';
      var on=null;
      l.forEach(function(x){
        var b=x.o.baslik||'';
        if(b!==on){h+=b?'<div class="sb-grup">'+esc(b)+'</div>':'';on=b;}
        h+=sbOge('z',x);
      });
    }else if(k==='b'){
      l.forEach(function(x){h+=sbTabloHtml(x);});
    }else if(k==='q'){
      var dn=null;
      l.forEach(function(x){
        var d=x.o.deneme;
        if(d!==dn){h+=d?'<div class="sb-grup">Deneme '+esc(d)+(x.o.secenekler?' · test soruları':' · klasik sorular')+'</div>':'';dn=d;}
        h+=sbSoruHtml(x);
      });
    }else if(k==='y'){
      h+='<p class="sb-iskelet">Bu kısım notu derleyen kişi tarafından eklenmiş; hocanın ifadesi değildir. Özete katılmadı.</p>';
      l.forEach(function(x){h+=sbOge('y',x);});
    }else if(k==='a'){
      var v=SB.m.sablon.veri,bel=false;
      sbAtifGrup(l,v).forEach(function(g){
        h+='<div class="sb-kn">'+esc(g.ad)+'<small>'+g.l.length+' madde</small></div><div>';
        g.l.forEach(function(x){
          var o=x.o;if(o.belirsiz)bel=true;
          var ad2=(o.adet>1?'<i>×'+o.adet+'</i>':'');
          h+='<span class="sb-at'+(o.belirsiz?' bel':'')+'"'+(o.belirsiz?' title="Kanun adı metinde net değil"':'')+'><button type="button" class="sb-am'+(g.no?'':' pasif')+'" data-no="'+esc(g.no)+'" data-n="'+esc(o.madde)+'">m. '+esc(o.madde)+ad2+'</button>'+sbSayfaDugme(o.sayfa)+SB_X.replace('@',x.id)+'</span>';
        });
        h+='</div>';
      });
      if(bel)h+='<p class="pm-kucuk" style="margin:8px 0 0">Kesik çizgili olanlarda kanun adı metinde net değil; açmadan önce kontrol et.</p>';
    }else{
      l.forEach(function(x){h+=sbOge(k,x);});
    }
    if(k==='i'){
      var tum=sbListe('i').length;
      if(tum>l.length||SB.ist)h+='<div class="sb-ek"><button type="button" id="sb-ist">'+(SB.ist?'Yalnız güçlü olanları göster':'Tümünü göster ('+tum+')')+'</button></div>';
    }
    if(!l.length&&k!=='i')bos='<p class="sb-bos">Bu bölümde gösterilecek öğe yok.</p>';
    if(k==='i'&&!l.length)bos='<p class="sb-bos">Güçlü bir istisna bulunamadı.</p>';
    return '<section class="sb-kart'+(SB_ACIK[k]?'':' kapali')+'" data-k="'+k+'"><button type="button" class="sb-bas" aria-expanded="'+(SB_ACIK[k]?'true':'false')+'"><b>'+ad+'</b><i>'+say+'</i></button><div class="sb-govde">'+bos+h+'</div></section>';
  }
  function sbCiz(){
    var S=SB;if(!S||!S.m.sablon)return;
    var y=sbKay.scrollTop,sb=S.m.sablon,sol='',sag='',not;
    not='<section class="sb-kart"><div class="sb-bas sb-sab"><b>Notum</b></div><div class="sb-govde"><textarea class="sb-not" id="sb-not" rows="3" placeholder="Bu not için kendi hatırlatmalarını yaz…" aria-label="Notum">'+esc(sb.not||'')+'</textarea></div></section>';
    SB_BOL.forEach(function(b){var h=sbBolumHtml(b[0],b[1]);if(SB_SOL.indexOf(b[0])>=0)sol+=h;else sag+=h;});
    var uy='';
    if(sb.taranmis>0)uy='<div class="sb-uyari">Bu notun '+sb.taranmis+' sayfası taranmış (resim) görünüyor; o sayfalar atlandı. Taranmış notlar için okuma desteği ileride eklenecek.</div>';
    var gr='';
    if((sb.kaldirilan||[]).length)gr='<button type="button" class="sb-geri-al" id="sb-geri-al">'+sb.kaldirilan.length+' öğe kaldırıldı · Geri getir</button>';
    sbMsg.hidden=true;sbIc.hidden=false;
    sbIc.className='sb-ic iki';
    sbIc.innerHTML=uy+'<div class="sb-sol">'+not+sol+'</div><div class="sb-sag">'+sag+gr+'</div>';
    $('sb-yenile').hidden=false;$('sb-pay').hidden=false;
    sbKay.scrollTop=y;
  }
  function sbKaydetM(){if(SB)metaYaz(SB.m).catch(function(){});}
  function sbNotYaz(){
    clearTimeout(sbNotT);
    var e=$('sb-not');
    if(SB&&SB.m.sablon&&e&&e.value!==(SB.m.sablon.not||'')){SB.m.sablon.not=e.value;sbKaydetM();}
  }
  sbIc.addEventListener('input',function(e){
    if(e.target.id!=='sb-not')return;
    clearTimeout(sbNotT);sbNotT=setTimeout(sbNotYaz,600);
  });
  sbIc.addEventListener('click',function(e){
    if(!SB||!SB.m.sablon)return;
    var t=e.target,b;
    if((b=t.closest('.sb-x'))){
      var id=b.getAttribute('data-x');
      var kl=SB.m.sablon.kaldirilan=SB.m.sablon.kaldirilan||[];
      if(kl.indexOf(id)<0)kl.push(id);
      sbKaydetM();sbCiz();return;
    }
    if((b=t.closest('.sb-s'))){sbSayfaAc(parseInt(b.getAttribute('data-s'),10)||1);return;}
    if((b=t.closest('.sb-am'))){
      var no=b.getAttribute('data-no');if(!no)return;
      madAc({no:no,n:b.getAttribute('data-n')});return;
    }
    if((b=t.closest('.sb-ara button'))){
      SB.m.sablon.oran=SB_ORAN[b.getAttribute('data-o')]||.2;sbKaydetM();sbCiz();return;
    }
    if((b=t.closest('.sb-cv'))){
      var qi=b.getAttribute('data-q');SB.cv[qi]=!SB.cv[qi];
      var pn=b.nextElementSibling;pn.hidden=!SB.cv[qi];b.textContent=SB.cv[qi]?'Cevabı gizle':'Cevabı göster';b.setAttribute('aria-expanded',SB.cv[qi]?'true':'false');return;
    }
    if(t.closest('#sb-ist')){SB.ist=!SB.ist;sbCiz();return;}
    if(t.closest('#sb-geri-al')){SB.m.sablon.kaldirilan=[];sbKaydetM();sbCiz();return;}
    if((b=t.closest('.sb-bas'))&&b.tagName==='BUTTON'){
      var sec=b.parentNode,k=sec.getAttribute('data-k');
      var ac=sec.classList.contains('kapali');
      SB_ACIK[k]=ac?1:0;sec.classList.toggle('kapali',!ac);b.setAttribute('aria-expanded',ac?'true':'false');
    }
  });
  function sbSayfaAc(n){
    var m=SB&&SB.m;if(!m||G)return;
    m.sonSayfa=n;gorAc(m.id);
  }
  $('sb-yenile').addEventListener('click',function(){if(SB)sbCikar(SB.m);});
  // paylaş / dışa aktar: önce belge modeli (metin ve PDF aynı modelden üretilir)
  var SB_ALT='Kaynak: @. Bu özet kaynaktaki cümlelerden otomatik derlenmiştir · Lex Odak ile hazırlandı (lexodak.com)';
  function sbBelge(){
    var m=SB.m,s=m.sablon,v=s.veri||{},B=[];
    B.push({tip:'baslik',t:uzantisiz(m.ad)});
    if(s.not&&s.not.trim()){B.push({tip:'bolum',t:'Notum'});B.push({tip:'p',t:s.not.trim()});}
    SB_BOL.forEach(function(b){
      var k=b[0];if(k==='q')return;
      var l=sbGorunur(k);if(!l.length)return;
      B.push({tip:'bolum',t:b[1]});
      if(k==='y')B.push({tip:'etiket',t:'Notu derleyen eklemiş; hocanın ifadesi değildir.'});
      if(k==='z'){
        if(sbIskelet())B.push({tip:'etiket',t:'Bu not zaten özet niteliğinde; kısaltmak yerine yapısı gösteriliyor.'});
        var on=null;
        l.forEach(function(x){
          var o=x.o,bs=o.baslik||'';
          if(bs!==on){if(bs)B.push({tip:'grup',t:bs});on=bs;}
          var alt=(o.maddeler||[]).slice();if(o.daha>0)alt.push('…ve '+o.daha+' madde daha');
          if(o.t)B.push({tip:'madde',t:o.t,sayfa:o.sayfa,alt:alt});
          else alt.forEach(function(t,i){B.push({tip:'madde',t:t,sayfa:i===0?o.sayfa:0});});
        });
      }else if(k==='b'){
        l.forEach(function(x){B.push({tip:'tablo',baslik:x.o.baslik||'Tablo',sayfa:x.o.sayfa,sutunlar:x.o.sutunlar||[],satirlar:x.o.satirlar||[]});});
      }else if(k==='a'){
        sbAtifGrup(l,v).forEach(function(g){
          B.push({tip:'madde',t:g.ad+': '+g.l.map(function(x){return 'm. '+x.o.madde+(x.o.sayfa?' (s. '+x.o.sayfa+')':'');}).join(', ')});
        });
      }else{
        l.forEach(function(x){
          var alt=(x.o.maddeler||[]).slice();if(x.o.daha>0)alt.push('…ve '+x.o.daha+' madde daha');
          B.push({tip:'madde',t:(k==='y'&&x.o.ad?x.o.ad+': ':'')+(x.o.t||''),sayfa:x.o.sayfa,alt:alt});
        });
      }
    });
    return B;
  }
  function sbMetin(){
    var m=SB.m,B=sbBelge(),L=[],kaynak=$('sb-kaynak').checked;
    B.forEach(function(b){
      if(b.tip==='baslik')L.push('# '+b.t+' - Şablon');
      else if(b.tip==='bolum')L.push('','## '+b.t);
      else if(b.tip==='grup')L.push('','### '+b.t);
      else if(b.tip==='p'){L.push(b.t);}
      else if(b.tip==='etiket')L.push('('+b.t+')');
      else if(b.tip==='madde'){
        L.push('- '+b.t+(b.sayfa?' (s. '+b.sayfa+')':''));
        (b.alt||[]).forEach(function(t){L.push('  - '+t);});
      }else if(b.tip==='tablo'){
        L.push('','Tablo: '+b.baslik+(b.sayfa?' (s. '+b.sayfa+')':''));
        if(b.sutunlar.length)L.push('| '+b.sutunlar.join(' | ')+' |','|'+b.sutunlar.map(function(){return '---';}).join('|')+'|');
        b.satirlar.forEach(function(r){L.push('| '+r.join(' | ')+' |');});
      }
    });
    if(kaynak)L.push('','---',SB_ALT.replace('@',m.ad));
    return L.join('\n')+'\n';
  }
  async function sbPaylas(){
    if(!SB||!SB.m.sablon)return;
    sbNotYaz();
    var m=SB.m,metin=sbMetin(),ad=guvenliAd({ad:m.ad+' - şablon',tur:'pdf'}).replace(/\.pdf$/,'')+'.txt';
    var so=await window.LEX_DOSYA(null,ad,'text/plain;charset=utf-8',metin,{baslik:uzantisiz(m.ad)+' - Şablon'});
    if(so==='indirildi')bildir('Şablon metin dosyası olarak indirildi.');
    else if(so==='hata')bildir('Paylaşılamadı.',true);
  }
  // PDF: jsPDF + Noto Sans (lib/), yalnızca dışa aktarırken yüklenir
  var sbPdfLP=null;
  function sbPdfYukle(){
    if(sbPdfLP)return sbPdfLP;
    var beta=function(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.arrayBuffer();});};
    var b64=function(ab){var u=new Uint8Array(ab),s='',i;for(i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s);};
    sbPdfLP=Promise.all([
      window.jspdf?Promise.resolve():new Promise(function(ok,hata){var sc=document.createElement('script');sc.src='lib/jspdf.umd.min.js';sc.onload=ok;sc.onerror=function(){hata(new Error('jspdf'));};document.head.appendChild(sc);}),
      beta('lib/NotoSans-Regular.ttf'),beta('lib/NotoSans-Bold.ttf')
    ]).then(function(r){return {jsPDF:window.jspdf.jsPDF,r:b64(r[1]),b:b64(r[2])};}).catch(function(e){sbPdfLP=null;throw e;});
    return sbPdfLP;
  }
  function sbPdfYap(K,B,kaynak,ad){
    var doc=new K.jsPDF({unit:'mm',format:'a4',compress:true}),W=210,H=297,M=18,ALT=kaynak?22:16,GEN=W-2*M,y=M;
    doc.addFileToVFS('NotoSans-Regular.ttf',K.r);doc.addFont('NotoSans-Regular.ttf','NotoSans','normal');
    doc.addFileToVFS('NotoSans-Bold.ttf',K.b);doc.addFont('NotoSans-Bold.ttf','NotoSans','bold');
    doc.setProperties({title:uzantisiz(ad)+' - Şablon',creator:'Lex Odak'});
    var PT=0.3528;
    function pdfMetin(t){return String(t).replace(/→/g,'->').replace(/←/g,'<-').replace(/[★✦✓]/g,'');}
    function yaz(st,pt){doc.setFont('NotoSans',st);doc.setFontSize(pt);}
    function sat(pt,k){return pt*PT*(k||1.42);}
    function yer(h){if(y+h>H-ALT){doc.addPage();y=M;return true;}return false;}
    function par(t,pt,st,x0,gen,aralik){
      yaz(st,pt);var ls=doc.splitTextToSize(pdfMetin(t),gen),h=sat(pt),i;
      for(i=0;i<ls.length;i++){yer(h);doc.text(ls[i],x0,y+pt*PT*.82);y+=h;}
      y+=aralik||0;
    }
    function tablo(b){
      var n=Math.max(b.sutunlar.length,b.satirlar.reduce(function(a,r){return Math.max(a,r.length);},0)),pt=9,ic=1.6,i,j;
      if(!n)return;
      var gen=[],tp=0,mx=[];
      for(j=0;j<n;j++){var uz=String(b.sutunlar[j]||'').length;b.satirlar.forEach(function(r){uz=Math.max(uz,Math.min(String((r||[])[j]||'').length,60));});mx.push(Math.max(uz,6));tp+=Math.max(uz,6);}
      mx.forEach(function(u){gen.push(Math.max(GEN*u/tp,n>5?16:24));});
      var tg=gen.reduce(function(a,c){return a+c;},0);gen=gen.map(function(g){return g*GEN/tg;});
      var mn=[];
      for(j=0;j<n;j++){
        var kw=0;
        [b.sutunlar].concat(b.satirlar).forEach(function(r,ri){
          yaz((ri===0||j===0)?'bold':'normal',pt);
          pdfMetin((r||[])[j]||'').split(/\s+/).forEach(function(w){kw=Math.max(kw,doc.getTextWidth(w));});
        });
        mn.push(Math.min(kw+2*ic+1,GEN/2));
      }
      for(var it=0;it<4;it++){
        var fazla=0,esn=0;
        for(j=0;j<n;j++){if(gen[j]<mn[j]){fazla+=mn[j]-gen[j];gen[j]=mn[j];}else esn+=gen[j]-mn[j];}
        if(fazla<=0.01||esn<=0)break;
        for(j=0;j<n;j++){if(gen[j]>mn[j])gen[j]-=fazla*(gen[j]-mn[j])/esn;}
      }
      function satirCiz(r,bas){
        var hc=[],mh=0;
        for(j=0;j<n;j++){yaz((bas||j===0)?'bold':'normal',pt);var ls=doc.splitTextToSize(pdfMetin((r||[])[j]||''),gen[j]-2*ic);hc.push(ls);mh=Math.max(mh,ls.length);}
        var h=mh*sat(pt,1.3)+2*ic*.8;
        if(y+h>H-ALT){doc.addPage();y=M;if(!bas&&b.sutunlar.length)satirCiz(b.sutunlar,true);}
        var x=M;
        doc.setDrawColor(190,170,174);doc.setLineWidth(.2);
        for(j=0;j<n;j++){
          if(bas){doc.setFillColor(245,236,238);doc.rect(x,y,gen[j],h,'FD');}else doc.rect(x,y,gen[j],h);
          yaz((bas||j===0)?'bold':'normal',pt);
          for(i=0;i<hc[j].length;i++)doc.text(hc[j][i],x+ic,y+ic*.8+pt*PT*.82+i*sat(pt,1.3));
          x+=gen[j];
        }
        y+=h;
      }
      yer(34);
      par('Tablo: '+b.baslik+(b.sayfa?' (s. '+b.sayfa+')':''),10.5,'bold',M,GEN,1.2);
      if(b.sutunlar.length)satirCiz(b.sutunlar,true);
      b.satirlar.forEach(function(r){satirCiz(r,false);});
      y+=4;
    }
    B.forEach(function(b){
      if(b.tip==='baslik'){
        par(b.t,18,'bold',M,GEN,1);
        par('Şablon · '+new Date().toLocaleDateString('tr-TR'),10,'normal',M,GEN,4);
      }else if(b.tip==='bolum'){
        y+=3;yer(14);par(b.t,14,'bold',M,GEN,0);
        doc.setDrawColor(118,43,55);doc.setLineWidth(.4);doc.line(M,y,M+GEN,y);y+=2.5;
      }else if(b.tip==='grup'){yer(14);y+=1.5;par(b.t,11.5,'bold',M,GEN,.8);
      }else if(b.tip==='p'){par(b.t,11,'normal',M,GEN,2);
      }else if(b.tip==='etiket'){par(b.t,9.5,'normal',M,GEN,2);
      }else if(b.tip==='madde'){
        var t=b.t+(b.sayfa?' (s. '+b.sayfa+')':'');
        yer(sat(11)*2);yaz('normal',11);doc.text('•',M+1.2,y+11*PT*.82);
        par(t,11,'normal',M+6,GEN-6,.9);
        (b.alt||[]).forEach(function(a){yer(sat(10.5)*2);yaz('normal',10.5);doc.text('–',M+7,y+10.5*PT*.82);par(a,10.5,'normal',M+12,GEN-12,.5);});
        if((b.alt||[]).length)y+=.6;
      }else if(b.tip==='tablo'){tablo(b);}
    });
    var n=doc.getNumberOfPages(),i;
    for(i=1;i<=n;i++){
      doc.setPage(i);doc.setTextColor(110,96,99);
      if(kaynak){yaz('normal',8);var ls=doc.splitTextToSize(SB_ALT.replace('@',ad),GEN-22);doc.text(ls,M,H-ALT+10);}
      yaz('normal',9);doc.text(i+' / '+n,W-M,H-8,{align:'right'});
      doc.setTextColor(0,0,0);
    }
    return doc.output('blob');
  }
  var sbPdfCalisiyor=false;
  async function sbPdfKaydet(){
    if(!SB||!SB.m.sablon||sbPdfCalisiyor)return;
    sbNotYaz();
    var m=SB.m,btn=$('sb-pdf-git'),eski=btn.textContent;
    sbPdfCalisiyor=true;btn.disabled=true;btn.textContent='Hazırlanıyor…';
    try{
      var K=await sbPdfYukle(),blob=sbPdfYap(K,sbBelge(),$('sb-kaynak').checked,m.ad);
      var ad=guvenliAd({ad:uzantisiz(m.ad)+' - şablon',tur:'pdf'}).replace(/\.pdf$/i,'')+'.pdf';
      var so=await window.LEX_DOSYA(blob,ad,'application/pdf',null,{baslik:uzantisiz(m.ad)+' - Şablon',indir:true});
      if(so==='indirildi')bildir('Şablon PDF olarak indirildi.');
      else if(so==='hata')bildir('PDF kaydedilemedi.',true);
    }catch(e){bildir('PDF hazırlanamadı. İnternetsizken ilk kullanımda dosyalar inmemiş olabilir.',true);}
    finally{sbPdfCalisiyor=false;btn.disabled=false;btn.textContent=eski;}
  }
  (function(){
    var kb=$('sb-kaynak');
    try{kb.checked=localStorage.getItem(SB_KAY)!=='0';}catch(e){kb.checked=true;}
    kb.addEventListener('change',function(){try{localStorage.setItem(SB_KAY,kb.checked?'1':'0');}catch(e){}});
    $('sb-pay').addEventListener('click',function(){var p=$('sb-paybar');p.hidden=!p.hidden;this.setAttribute('aria-expanded',p.hidden?'false':'true');});
    $('sb-pay-git').addEventListener('click',sbPaylas);
    $('sb-pdf-git').addEventListener('click',sbPdfKaydet);
  })();

  // ---------- dışa açılan ----------
  window.LEX_KUT=function(){
    if(G)return;
    yenile();
  };
  if(window.indexedDB)yenile();else ciz();
})();
